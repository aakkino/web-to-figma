import type {
  ConvertInput,
  ConvertResult,
  FigmaConverter,
  FigmaConverterConfig,
  FontLoader,
  FontProperties,
} from "@figit/dom-to-figma";

export type {
  ConvertInput,
  ConvertResult,
  FigmaConverterConfig,
  FontFile,
  FontLoader,
  FontProperties,
} from "@figit/dom-to-figma";

export type FontTransportResult = {
  bytes: ArrayBuffer;
  mimeType?: string;
};

export type FontTransport = (
  url: string
) => Promise<ArrayBuffer | FontTransportResult>;

export type BundledFontBytes =
  | ArrayBuffer
  | (() => ArrayBuffer | Promise<ArrayBuffer>);

export type BundledFont = {
  /** The family name represented by the bytes. */
  family: string;
  /** Additional CSS family names that should use this bundled font. */
  aliases?: ReadonlyArray<string>;
  weight: number;
  italic: boolean;
  bytes: BundledFontBytes;
  /** Set when the bytes are metrics for a different requested family. */
  resolvedFamily?: string;
  source?: string;
};

export type FontResolverOptions = {
  document?: Document;
  transport?: FontTransport;
  fallbackLoader?: FontLoader | null;
  bundledFonts?: ReadonlyArray<BundledFont>;
  fetch?: typeof globalThis.fetch;
};

export type FontFailureMode = "fallback" | "strict";

export type FontDiagnosticStatus = "exact" | "fallback" | "failed";

export type FontDiagnosticSource =
  | "page"
  | "transport"
  | "bundled"
  | "fallback";

export type FontDiagnostic = {
  request: FontProperties;
  status: FontDiagnosticStatus;
  source?: FontDiagnosticSource;
  resolvedFamily?: string;
  resolvedWeight?: number;
  resolvedItalic?: boolean;
  attempts: ReadonlyArray<string>;
  reason?: string;
};

export type FontPreflightResult = {
  requests: ReadonlyArray<FontProperties>;
  failures: ReadonlyArray<FontDiagnostic>;
};

export type FontResolver = {
  loader: FontLoader;
  beginCapture(document: Document): void;
  collectRequests(root: Element): Array<FontProperties>;
  preflight(
    requests: ReadonlyArray<FontProperties>,
    failureMode: FontFailureMode
  ): Promise<FontPreflightResult>;
  getDiagnostics(): ReadonlyArray<FontDiagnostic>;
};

export type SettleTimeoutPhase =
  | "fonts"
  | "images"
  | "layout"
  | "complete"
  | "skipped";

export type PageSettleDiagnostics = {
  timeoutMs: number;
  timedOut: boolean;
  phase: SettleTimeoutPhase;
  pendingFonts: boolean;
  pendingImages: number;
  waitedForImages: number;
  frameCount: number;
  errors: ReadonlyArray<string>;
};

export type PageSettleOptions = {
  timeoutMs?: number;
};

export type MotionMode = "freeze" | "live";

export type MotionDiagnostics = {
  mode: MotionMode;
  paused: number;
  restored: number;
  restoreFailures: ReadonlyArray<string>;
};

export type LineBreakMode = "auto" | "off";

export type LineBreakDiagnostics = {
  mode: LineBreakMode;
  measuredNodes: number;
  changedNodes: number;
  insertedBreaks: number;
  skippedNodes: number;
  measurementFailures: ReadonlyArray<string>;
};

export type CaptureDiagnostics = {
  settle: PageSettleDiagnostics;
  motion: MotionDiagnostics;
  lineBreaks: LineBreakDiagnostics;
  fonts: ReadonlyArray<FontDiagnostic>;
  cleanupFailures: ReadonlyArray<string>;
};

export type CaptureElementInput = {
  element: Element;
  width?: number;
  height?: number;
  name?: string;
};

export type CaptureInput = ConvertInput | CaptureElementInput;

export type CaptureResult = ConvertResult & {
  diagnostics: CaptureDiagnostics;
};

export type BrowserCaptureAdapterOptions = {
  converter?: FigmaConverter;
  converterConfig?: FigmaConverterConfig;
  fontResolver?: FontResolver;
  fonts?: FontResolverOptions;
  settleTimeoutMs?: number;
  motion?: MotionMode;
  lineBreaks?: LineBreakMode;
  fontFailure?: FontFailureMode;
};

export type BrowserCaptureAdapter = {
  capture(input: CaptureInput): Promise<CaptureResult>;
  clearCache(): void;
};
