import type {
  BrowserCaptureAdapter,
  BundledFont,
  CaptureClassifier,
  FontLoader,
} from "@figit/browser-capture-adapter";
import { createBrowserCaptureAdapter } from "@figit/browser-capture-adapter";
import { toast } from "sonner";
import { browser } from "#imports";

import { toErrorMessage } from "../../shared/errors";
import {
  createBackgroundFontTransport,
  createBackgroundImageLoader,
} from "../../shared/loaders";
import { SHADOW_HOST_NAME } from "../../shared/triggers";

const COPY_TOAST_ID = "copy-to-figma";
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
  "PingFang TC",
  "黑體-繁",
  "Heiti TC",
  "Noto Sans TC",
  "微軟正黑體",
  "Microsoft JhengHei",
  "Source Han Sans TC",
  "思源黑體",
  "Noto Sans CJK TC",
  "Noto Sans SC",
  "Source Han Sans CN",
  "思源黑体",
  "Noto Sans Simplified Chinese",
  "Google Sans Text",
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
  // intentional: default cleanup callback when nothing was set up
};

const bundledCjkFontCache = new Map<CjkFallbackWeight, Promise<ArrayBuffer>>();
let genericFallbackFontCache: Promise<ArrayBuffer> | null = null;

const getAdapter: () => BrowserCaptureAdapter = (() => {
  let instance: BrowserCaptureAdapter | null = null;
  return () => {
    if (!instance) {
      instance = createBrowserCaptureAdapter({
        fonts: {
          bundledFonts: createBundledCjkFonts(),
          fallbackLoader: createGenericFallbackLoader(),
          fallbackIsLocal: true,
          transport: createBackgroundFontTransport(),
        },
        bridgeOptions: {
          imageLoader: createBackgroundImageLoader(),
          classify: skipExtensionUiClassify,
        },
      });
    }
    return instance;
  };
})();

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
  // Cross-origin iframes can't be inspected from the parent context (security
  // error on `contentDocument`), so the converter has nothing to walk.
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

export function copyWholePage(): void {
  // Measure after the adapter's settle gate so late layout and horizontal
  // overflow are included in the page frame.
  runConversion({
    element: document.body,
    name: derivePageFrameName(),
  });
}

export function copyElement(element: HTMLElement): void {
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) {
    toast.error("Selected element has no size to copy.", { id: COPY_TOAST_ID });
    return;
  }
  const restoreBackground = applyInheritedBackgroundIfNeeded(element);
  runConversion(
    {
      element,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      name: deriveElementFrameName(element),
    },
    restoreBackground
  );
}

type ConversionInput = {
  element: Element;
  width?: number;
  height?: number;
  name: string;
};

function runConversion(
  input: ConversionInput,
  onComplete: () => void = NOOP
): void {
  // toast.promise shows a loading toast, then swaps it in place to a success
  // or error toast — the same { id } guarantees no stacking.
  toast.promise(convertAndCopy(input).finally(onComplete), {
    id: COPY_TOAST_ID,
    loading: "Copying to Figma…",
    success: "Copied. Paste in Figma with ⌘V / Ctrl+V.",
    error: (error) => `Copy failed: ${toErrorMessage(error, "unknown error")}`,
  });
}

async function convertAndCopy(input: ConversionInput): Promise<void> {
  const result = await getAdapter().capture(input);
  await navigator.clipboard.write([createClipboardItem(result.clipboardHtml)]);
}

function createClipboardItem(clipboardHtml: string): ClipboardItem {
  return new ClipboardItem({
    "text/html": new Blob([clipboardHtml], { type: "text/html" }),
  });
}

/**
 * If the picked element has no background of its own, walk up the parent
 * chain to find the first opaque ancestor and apply its color inline for
 * the duration of the conversion. The page already shows that color through
 * the transparent element, so the assignment doesn't change a single
 * rendered pixel — but it gives dom-to-figma the right fill for the
 * extracted Figma frame, which would otherwise sit on a transparent
 * canvas. Returns a no-op when no inheritance is needed.
 *
 * Limitations: only solid colors are carried over. Background images,
 * gradients, and semi-transparent stacks on parents are dropped — composing
 * those into a single fill would require sampling rendered pixels.
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
  const parts = match[1].split(",").map((s) => s.trim());
  if (parts.length !== RGBA_COMPONENT_COUNT) {
    return false;
  }
  return Number.parseFloat(parts[3]) === 0;
}

function deriveElementFrameName(element: HTMLElement): string {
  const id = element.id ? `#${element.id}` : "";
  const cls = element.classList.length ? `.${element.classList[0]}` : "";
  return `${element.tagName.toLowerCase()}${id}${cls}`;
}

function derivePageFrameName(): string {
  return document.title || location.hostname || "Page";
}
