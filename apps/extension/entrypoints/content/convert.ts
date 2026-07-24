import type {
  BundledFont,
  CaptureClassifier,
  CaptureElementInput,
  CaptureEngine,
  FontLoader,
} from "@figit/browser-capture-adapter";
import { createBrowserCaptureAdapter } from "@figit/browser-capture-adapter";
import { browser } from "#imports";

import type { CaptureSettings } from "../../shared/capture-settings";
import {
  createBackgroundFontTransport,
  createBackgroundImageLoader,
} from "../../shared/loaders";
import { SHADOW_HOST_NAME } from "../../shared/triggers";
import type {
  OutputPort,
  OutputRunResult,
  OutputSinkResult,
} from "./workspace-controller";

const RGBA_COLOR_PATTERN = /^rgba?\(([^)]+)\)$/;
const RGBA_COMPONENT_COUNT = 4;
const GENERIC_FALLBACK_FAMILY = "Noto Sans Arabic";
const GENERIC_FALLBACK_PATH = "/fonts/noto-sans-arabic-400.ttf";
const CJK_FALLBACK_FAMILY = "Noto Sans TC Thin";
const CJK_WEIGHT_REGULAR = 400;
const CJK_WEIGHT_MEDIUM = 500;
const CJK_WEIGHT_SEMIBOLD = 600;
const CJK_WEIGHT_BOLD = 700;
const CJK_FALLBACK_WEIGHTS = [
  CJK_WEIGHT_REGULAR,
  CJK_WEIGHT_MEDIUM,
  CJK_WEIGHT_SEMIBOLD,
  CJK_WEIGHT_BOLD,
] as const;
type CjkFallbackWeight = (typeof CJK_FALLBACK_WEIGHTS)[number];
const CJK_FONT_PATHS = {
  [CJK_WEIGHT_REGULAR]: "/fonts/noto-sans-tc-composite-400.ttf",
  [CJK_WEIGHT_MEDIUM]: "/fonts/noto-sans-tc-composite-500.ttf",
  [CJK_WEIGHT_SEMIBOLD]: "/fonts/noto-sans-tc-composite-600.ttf",
  [CJK_WEIGHT_BOLD]: "/fonts/noto-sans-tc-composite-700.ttf",
} as const;
const CJK_FONT_ALIASES = [
  "Inter",
  "ui-sans-serif",
  "PingFang TC",
  "Heiti TC",
  "Noto Sans TC",
  "Microsoft JhengHei",
  "Source Han Sans TC",
  "Noto Sans CJK TC",
  "Noto Sans SC",
  "Source Han Sans CN",
  "Roboto",
  "Arial",
  "Helvetica Neue",
  "Segoe UI",
  "system-ui",
  "-apple-system",
  "BlinkMacSystemFont",
  "sans-serif",
];
const NOOP = () => {
  // intentional: default cleanup callback when no inherited background exists
};

const bundledCjkFontCache = new Map<CjkFallbackWeight, Promise<ArrayBuffer>>();
let genericFallbackFontCache: Promise<ArrayBuffer> | null = null;

export function createExtensionCaptureEngine(
  settings: CaptureSettings
): CaptureEngine {
  return createBrowserCaptureAdapter({
    settleTimeoutMs: settings.advanced.settleTimeoutMs,
    motion: settings.advanced.motion,
    lineBreaks: settings.advanced.lineBreaks,
    fontFailure: settings.font.mode,
    fonts: {
      bundledFonts: createBundledCjkFonts(),
      fallbackLoader: createGenericFallbackLoader(),
      fallbackIsLocal: true,
      transport: createBackgroundFontTransport(),
    },
    bridgeOptions: {
      imageLoader: createBackgroundImageLoader(),
      classify: skipExtensionUiClassify,
      layout: settings.advanced.layout,
    },
  });
}

export function createClipboardOutputPort(): OutputPort {
  return {
    capabilities: { clipboard: true, file: false },
    async execute(capture, outputs): Promise<OutputRunResult> {
      const results: Array<OutputSinkResult> = [];
      if (outputs.clipboard) {
        results.push(await writeClipboardAsync(capture.clipboardHtml));
      }
      if (outputs.file) {
        results.push(unavailableFileResult());
      }
      return { results };
    },
    retry(capture, sink): Promise<OutputSinkResult> {
      if (sink === "clipboard") {
        return writeClipboardAsync(capture.clipboardHtml);
      }
      return Promise.resolve(unavailableFileResult());
    },
    open(): Promise<null> {
      return Promise.reject(
        new Error("Capture package opening is not available yet.")
      );
    },
  };
}

export function createElementCaptureTarget(element: HTMLElement): {
  input: CaptureElementInput;
  restore: () => void;
} {
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    throw new Error("Selected element has no size to capture.");
  }
  return {
    input: {
      element,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      name: deriveElementFrameName(element),
    },
    restore: applyInheritedBackgroundIfNeeded(element),
  };
}

export function createPageCaptureTarget(): CaptureElementInput {
  return {
    element: document.body,
    name: derivePageFrameName(),
  };
}

function createBundledCjkFonts(): ReadonlyArray<BundledFont> {
  return CJK_FALLBACK_WEIGHTS.map((weight) => ({
    family: CJK_FALLBACK_FAMILY,
    aliases: CJK_FONT_ALIASES,
    weight,
    italic: false,
    bytes: (signal) => loadBundledCjkFont(weight, signal),
    source: `extension ${CJK_FALLBACK_FAMILY} ${weight}`,
  }));
}

function createGenericFallbackLoader(): FontLoader {
  return async (_request, signal) => ({
    bytes: await loadGenericFallbackFont(signal),
    resolvedFamily: GENERIC_FALLBACK_FAMILY,
    resolvedWeight: CJK_WEIGHT_REGULAR,
    resolvedItalic: false,
  });
}

function loadGenericFallbackFont(signal?: AbortSignal): Promise<ArrayBuffer> {
  if (genericFallbackFontCache) {
    return genericFallbackFontCache;
  }

  const request = fetch(browser.runtime.getURL(GENERIC_FALLBACK_PATH), {
    cache: "force-cache",
    signal,
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(
        `Bundled generic font request failed: ${response.status}`
      );
    }
    return await response.arrayBuffer();
  });
  genericFallbackFontCache = request;
  request.catch(() => {
    if (genericFallbackFontCache === request) {
      genericFallbackFontCache = null;
    }
  });
  return request;
}

function loadBundledCjkFont(
  weight: CjkFallbackWeight,
  signal?: AbortSignal
): Promise<ArrayBuffer> {
  const cached = bundledCjkFontCache.get(weight);
  if (cached) {
    return cached;
  }

  const request = fetch(browser.runtime.getURL(CJK_FONT_PATHS[weight]), {
    cache: "force-cache",
    signal,
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Bundled CJK font request failed: ${response.status}`);
    }
    return await response.arrayBuffer();
  });
  bundledCjkFontCache.set(weight, request);
  request.catch(() => {
    if (bundledCjkFontCache.get(weight) === request) {
      bundledCjkFontCache.delete(weight);
    }
  });
  return request;
}

const skipExtensionUiClassify: CaptureClassifier = (element, defaultKind) => {
  if (
    element instanceof HTMLElement &&
    element.tagName.toLowerCase() === SHADOW_HOST_NAME
  ) {
    return "skip";
  }
  if (element instanceof HTMLIFrameElement && !isSameOriginIframe(element)) {
    return "skip";
  }
  return defaultKind;
};

function isSameOriginIframe(iframe: HTMLIFrameElement): boolean {
  try {
    return iframe.contentDocument !== null;
  } catch {
    return false;
  }
}

function clipboardAvailability(): OutputSinkResult {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    return {
      sink: "clipboard",
      status: "failed",
      code: "clipboard-unavailable",
      message: "Clipboard output is unavailable on this page.",
    };
  }
  return {
    sink: "clipboard",
    status: "success",
    message: "Clipboard output queued.",
  };
}

async function writeClipboardAsync(
  clipboardHtml: string
): Promise<OutputSinkResult> {
  const availability = clipboardAvailability();
  if (availability.status === "failed") {
    return availability;
  }
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([clipboardHtml], { type: "text/html" }),
      }),
    ]);
    return availability;
  } catch {
    return {
      sink: "clipboard",
      status: "failed",
      code: "clipboard-write-failed",
      message: "Clipboard write was rejected by the browser.",
    };
  }
}

function unavailableFileResult(): OutputSinkResult {
  return {
    sink: "file",
    status: "failed",
    code: "file-output-unavailable",
    message: "Local capture packages are not available in this build yet.",
  };
}

/**
 * Keep an inherited opaque background on a picked element until the engine
 * finishes. The assignment preserves the page's rendered pixels while giving
 * the extracted frame an explicit background.
 */
function applyInheritedBackgroundIfNeeded(element: HTMLElement): () => void {
  if (!isTransparentColor(getComputedStyle(element).backgroundColor)) {
    return NOOP;
  }
  const inherited = findInheritedBackground(element);
  if (!inherited) {
    return NOOP;
  }
  const previous = element.style.backgroundColor;
  element.style.backgroundColor = inherited;
  return () => {
    element.style.backgroundColor = previous;
  };
}

function findInheritedBackground(element: HTMLElement): string | null {
  let current = element.parentElement;
  while (current) {
    const bg = getComputedStyle(current).backgroundColor;
    if (!isTransparentColor(bg)) {
      return bg;
    }
    current = current.parentElement;
  }
  return null;
}

function isTransparentColor(color: string): boolean {
  if (!color || color === "transparent") {
    return true;
  }
  const match = color.match(RGBA_COLOR_PATTERN);
  if (!match) {
    return false;
  }
  const parts = match[1].split(",").map((part) => part.trim());
  return (
    parts.length === RGBA_COMPONENT_COUNT && Number.parseFloat(parts[3]) === 0
  );
}

function deriveElementFrameName(element: HTMLElement): string {
  const id = element.id ? `#${element.id}` : "";
  const cls = element.classList.length ? `.${element.classList[0]}` : "";
  return `${element.tagName.toLowerCase()}${id}${cls}`;
}

function derivePageFrameName(): string {
  return document.title || location.hostname || "Page";
}
