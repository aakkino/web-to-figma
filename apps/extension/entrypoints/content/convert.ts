import type {
  BrowserCaptureAdapter,
  CaptureClassifier,
  CaptureElementInput,
} from "@figit/browser-capture-adapter";
import { createBrowserCaptureAdapter } from "@figit/browser-capture-adapter";
import { browser } from "#imports";

import type { CaptureSettings } from "../../shared/capture-settings";
import {
  createBackgroundFontTransport,
  createBackgroundImageLoader,
} from "../../shared/loaders";
import { SHADOW_HOST_NAME } from "../../shared/triggers";
import type { CjkFallbackVariant } from "./font-fallback";
import { createFixedCjkFallbackLoader } from "./font-fallback";
import type { FontSpecPort } from "./font-spec";
import { createFontSpecPort } from "./font-spec";

const RGBA_COLOR_PATTERN = /^rgba?\(([^)]+)\)$/;
const RGBA_COMPONENT_COUNT = 4;
const NOOP = () => {
  // intentional: default cleanup callback when no inherited background exists
};

const bundledCjkFontCache = new Map<number, Promise<ArrayBuffer>>();

export function createExtensionCaptureEngine(
  settings: CaptureSettings
): BrowserCaptureAdapter {
  return createBrowserCaptureAdapter({
    settleTimeoutMs: settings.advanced.settleTimeoutMs,
    motion: settings.advanced.motion,
    lineBreaks: settings.advanced.lineBreaks,
    fontFailure: settings.font.mode,
    fonts: {
      fallbackLoader: createFixedCjkFallbackLoader(loadBundledCjkFont),
      fallbackIsLocal: true,
      transport: createBackgroundFontTransport(),
    },
    bridgeOptions: {
      imageLoader: createBackgroundImageLoader(),
      classify: skipExtensionUiClassify,
      layout: settings.advanced.layout,
    },
    isExcluded: isExtensionUiElement,
  });
}

export function createExtensionFontSpecPort(): FontSpecPort {
  return createFontSpecPort({
    createAdapter(settings) {
      return createExtensionCaptureEngine({
        ...settings,
        image: { mode: "skip" },
        font: { mode: "compatible" },
        advanced: {
          ...settings.advanced,
          motion: "live",
          lineBreaks: "off",
          settleTimeoutMs: 0,
        },
      });
    },
    async writeClipboard(clipboardHtml) {
      const result = await writeClipboardAsync(clipboardHtml);
      return result.status === "success"
        ? {
            status: "success",
            message: "Typography spec copied to the clipboard.",
          }
        : {
            status: "failed",
            message: result.message ?? "Unable to copy the typography spec.",
          };
    },
  });
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

function loadBundledCjkFont(
  variant: CjkFallbackVariant,
  signal?: AbortSignal
): Promise<ArrayBuffer> {
  const cached = bundledCjkFontCache.get(variant.weight);
  if (cached) {
    return cached;
  }

  const request = fetch(browser.runtime.getURL(variant.path), {
    cache: "force-cache",
    signal,
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Bundled CJK font request failed: ${response.status}`);
    }
    return await response.arrayBuffer();
  });
  bundledCjkFontCache.set(variant.weight, request);
  request.catch(() => {
    if (bundledCjkFontCache.get(variant.weight) === request) {
      bundledCjkFontCache.delete(variant.weight);
    }
  });
  return request;
}

const skipExtensionUiClassify: CaptureClassifier = (element, defaultKind) => {
  if (isExtensionUiElement(element)) {
    return "skip";
  }
  if (element instanceof HTMLIFrameElement && !isSameOriginIframe(element)) {
    return "skip";
  }
  return defaultKind;
};

function isExtensionUiElement(element: Element): boolean {
  return element.localName.toLowerCase() === SHADOW_HOST_NAME;
}

function isSameOriginIframe(iframe: HTMLIFrameElement): boolean {
  try {
    return iframe.contentDocument !== null;
  } catch {
    return false;
  }
}

function clipboardAvailability(): {
  status: "success" | "failed";
  message: string;
} {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    return {
      status: "failed",
      message: "Clipboard output is unavailable on this page.",
    };
  }
  return {
    status: "success",
    message: "Clipboard output queued.",
  };
}

export async function writeClipboardAsync(
  clipboardHtml: string
): Promise<{ status: "success" | "failed"; message: string }> {
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
      status: "failed",
      message: "Clipboard write was rejected by the browser.",
    };
  }
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
