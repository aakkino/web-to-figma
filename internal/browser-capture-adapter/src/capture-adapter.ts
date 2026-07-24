import {
  createDefaultFontLoader,
  createDomToFigmaBridge,
} from "./bridges/dom-to-figma";
import { createCaptureEngine } from "./capture-engine";
import { createFontResolver } from "./font-resolver";
import type {
  BrowserCaptureAdapter,
  BrowserCaptureAdapterOptions,
  CaptureEngineOptions,
  FontMode,
} from "./types";

// biome-ignore lint/performance/noBarrelFile: the adapter keeps its public error at the package boundary.
export { CaptureError } from "./capture-engine";

const DEFAULT_SETTLE_TIMEOUT_MS = 5000;
const DEFAULT_MOTION = "freeze" as const;
const DEFAULT_LINE_BREAKS = "auto" as const;
const DEFAULT_FONT_MODE = "compatible" as const;

export function createBrowserCaptureAdapter(
  options: BrowserCaptureAdapterOptions = {}
): BrowserCaptureAdapter {
  const domTraversal =
    options.domTraversal ?? options.bridgeOptions?.domTraversal;
  const suppliedBridge = options.bridge;
  const defaultFontLoader =
    options.fonts?.fallbackLoader ??
    options.bridgeOptions?.fontLoader ??
    suppliedBridge?.fontLoader ??
    createDefaultFontLoader();
  const fontResolver =
    options.fontResolver ??
    createFontResolver({
      ...options.fonts,
      fallbackLoader: defaultFontLoader,
    });
  const bridge =
    suppliedBridge ??
    createDomToFigmaBridge({
      ...options.bridgeOptions,
      domTraversal,
      fontLoader: fontResolver.loader,
    });
  const engineOptions: CaptureEngineOptions = {
    bridge,
    fontResolver,
    settings: {
      settleTimeoutMs: options.settleTimeoutMs ?? DEFAULT_SETTLE_TIMEOUT_MS,
      motion: options.motion ?? DEFAULT_MOTION,
      lineBreaks: options.lineBreaks ?? DEFAULT_LINE_BREAKS,
      fontMode: normalizeFontMode(options.fontFailure),
    },
    domTraversal,
    isExcluded: options.isExcluded,
  };
  return createCaptureEngine(engineOptions);
}

function normalizeFontMode(
  mode: BrowserCaptureAdapterOptions["fontFailure"]
): FontMode {
  if (mode === "strict") {
    return "strict";
  }
  if (mode === "fast-local") {
    return "fast-local";
  }
  return DEFAULT_FONT_MODE;
}
