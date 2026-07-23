// biome-ignore lint/performance/noBarrelFile: this file is the package's deliberate public API boundary.
export {
  CaptureError,
  createBrowserCaptureAdapter,
} from "./capture-adapter";
export {
  createCaptureFontLoader,
  createFontResolver,
  createPageFontLoader,
  FontPreflightError,
} from "./font-resolver";
export type { MotionSnapshot } from "./motion-snapshot";
export { freezeCaptureMotion } from "./motion-snapshot";
export { waitForPageToSettle } from "./page-stability";
export type { LineBreakPreparation } from "./text-line-breaks";
export {
  getBrowserLineBreakIndexes,
  prepareCjkLineBreaks,
} from "./text-line-breaks";
export type {
  BrowserCaptureAdapter,
  BrowserCaptureAdapterOptions,
  BundledFont,
  BundledFontBytes,
  CaptureDiagnostics,
  CaptureElementInput,
  CaptureInput,
  CaptureResult,
  FontDiagnostic,
  FontDiagnosticSource,
  FontDiagnosticStatus,
  FontFailureMode,
  FontFile,
  FontLoader,
  FontPreflightResult,
  FontProperties,
  FontResolver,
  FontResolverOptions,
  FontTransport,
  FontTransportResult,
  LineBreakDiagnostics,
  LineBreakMode,
  MotionDiagnostics,
  MotionMode,
  PageSettleDiagnostics,
  PageSettleOptions,
  SettleTimeoutPhase,
} from "./types";
