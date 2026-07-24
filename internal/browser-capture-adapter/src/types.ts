import type { DomTreeStrategy } from "@figit/composed-dom";

export type { DomTreeStrategy } from "@figit/composed-dom";

export type ConverterLayout = "absolute" | "auto";

export type FontProperties = {
  family: string;
  weight: number;
  italic: boolean;
  /** Sorted unique code points needed by this text run; never contains source text. */
  codePoints?: ReadonlyArray<number>;
};

export type FontFile = {
  bytes: ArrayBuffer;
  resolvedWeight?: number;
  resolvedItalic?: boolean;
  resolvedFamily?: string;
};

export type FontLoader = (
  request: FontProperties,
  signal?: AbortSignal
) => Promise<FontFile>;

export type FontTransportResult = {
  bytes: ArrayBuffer;
  mimeType?: string;
};

export type FontTransport = (
  url: string,
  signal?: AbortSignal
) => Promise<ArrayBuffer | FontTransportResult>;

export type BundledFontBytes =
  | ArrayBuffer
  | ((signal?: AbortSignal) => ArrayBuffer | Promise<ArrayBuffer>);

export type BundledFont = {
  family: string;
  aliases?: ReadonlyArray<string>;
  weight: number;
  italic: boolean;
  bytes: BundledFontBytes;
  resolvedFamily?: string;
  source?: string;
};

export type FontResolverOptions = {
  document?: Document;
  transport?: FontTransport;
  fallbackLoader?: FontLoader | null;
  /** True when fallbackLoader is local and safe for `fast-local` mode. */
  fallbackIsLocal?: boolean;
  bundledFonts?: ReadonlyArray<BundledFont>;
  fetch?: typeof globalThis.fetch;
};

export type FontMode = "compatible" | "fast-local" | "strict";
/** @deprecated Use `FontMode`; retained as a source-compatible alias. */
export type FontFailureMode = FontMode | "fallback";

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
  /** Safe phase labels only; resource URLs never cross this boundary. */
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
  collectRequests(
    root: Element,
    domTraversal?: DomTreeStrategy
  ): Array<FontProperties>;
  preflight(
    requests: ReadonlyArray<FontProperties>,
    mode: FontFailureMode,
    signal?: AbortSignal
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
  domTraversal?: DomTreeStrategy;
  /** Set false after the explicit image stage has completed. */
  waitForImages?: boolean;
  signal?: AbortSignal;
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

export type ImageDecision = "process" | "skip" | "best-effort";

export type CaptureSettings = {
  layout: ConverterLayout;
  motion: MotionMode;
  lineBreaks: LineBreakMode;
  settleTimeoutMs: number;
  images: ImageDecision;
  fontMode: FontMode;
};

export type CaptureElementInput = {
  element: Element;
  width?: number;
  height?: number;
  name?: string;
};

export type CaptureFrameInput = {
  element: Element;
  width: number;
  height: number;
  x: number;
  y: number;
  name: string;
};

export type CaptureCanvasInput = {
  frames: ReadonlyArray<CaptureFrameInput>;
  canvasName?: string;
};

export type CaptureInput = CaptureElementInput | CaptureCanvasInput;

export type CaptureTarget = {
  input: CaptureInput;
  root: Element;
  kind: "element" | "canvas";
};

export type CaptureResourceSummary = {
  /** Stable in-memory identifier; this is not the source URL. */
  resourceId: string;
  nodeCount: number;
};

export type CapturePlan = {
  target: CaptureTarget;
  imageNodeCount: number;
  uniqueImageResourceCount: number;
  unsupportedBackgroundImageCount: number;
  resources: ReadonlyArray<CaptureResourceSummary>;
  revision: string;
};

export type CaptureAnalysis = {
  plan: CapturePlan;
  analyzedAt: number;
};

export type ImagePlaceholderReason =
  | "user-skipped"
  | "load-failed"
  | "budget-skipped"
  | "unplanned-late";

export type ImagePreparationResult = {
  status: "prepared";
  byteLength: number;
};

export type ImageRequest = {
  src: string;
  element: HTMLImageElement;
  signal?: AbortSignal;
};

export type ImageFile = {
  bytes: ArrayBuffer;
  mimeType: string;
};

export type ImageLoader = (request: ImageRequest) => Promise<ImageFile>;

export type ImagePreparationPort = {
  prepare(
    request: ImageRequest,
    signal?: AbortSignal
  ): Promise<ImagePreparationResult>;
  setPlaceholder(
    request: Pick<ImageRequest, "src"> & Partial<Pick<ImageRequest, "element">>,
    reason: ImagePlaceholderReason
  ): void;
  clear(): void;
};

export type CaptureElementKind =
  | "skip"
  | "group"
  | "frame"
  | "vector"
  | "image"
  | "text"
  | "form-with-placeholder";

export type CaptureClassifier = (
  element: Element,
  defaultKind: CaptureElementKind
) => CaptureElementKind;

export type BridgeCaptureInput =
  | {
      element: Element;
      width: number;
      height: number;
      name?: string;
    }
  | {
      frames: ReadonlyArray<CaptureFrameInput>;
      canvasName?: string;
    };

export type BridgeCaptureResult = {
  clipboardHtml: string;
};

export type ConversionBridge = {
  readonly imagePreparation: ImagePreparationPort;
  readonly fontLoader: FontLoader;
  convert(
    input: BridgeCaptureInput,
    signal?: AbortSignal
  ): Promise<BridgeCaptureResult>;
  clearCache(): void;
};

export type DomToFigmaBridgeOptions = {
  imageLoader?: ImageLoader;
  fontLoader?: FontLoader;
  classify?: CaptureClassifier;
  layout?: ConverterLayout;
  domTraversal?: DomTreeStrategy;
};

export type ResourceErrorCode =
  | "image-fetch-failed"
  | "image-process-failed"
  | "image-timeout"
  | "image-aborted"
  | "image-memory-limit"
  | "unsupported-capability"
  | "transport-invalid-url"
  | "transport-refused-scheme"
  | "transport-http-error"
  | "transport-timeout"
  | "transport-aborted"
  | "transport-failed";

export type ImageResourceDiagnostic = {
  resourceId: string;
  status: "prepared" | "failed" | "placeholder";
  byteLength?: number;
  reason?: ImagePlaceholderReason;
  errorCode?: ResourceErrorCode;
};

export type ImageStageProgress = {
  completed: number;
  total: number;
  failed: number;
  elapsedMs: number;
  preparedBytes: number;
};

export type FontStageProgress = {
  completed: number;
  total: number;
  failed: number;
};

export type ImageStageDiagnostics = {
  progress: ImageStageProgress;
  resources: ReadonlyArray<ImageResourceDiagnostic>;
  softBudgetReached: boolean;
  hardBudgetReached: boolean;
};

export type CaptureDiagnostics = {
  settle: PageSettleDiagnostics;
  motion: MotionDiagnostics;
  lineBreaks: LineBreakDiagnostics;
  fonts: ReadonlyArray<FontDiagnostic>;
  images: ImageStageDiagnostics;
  cleanupFailures: ReadonlyArray<string>;
};

export type PreparedCapture = {
  clipboardHtml: string;
  settings: CaptureSettings;
  diagnostics: CaptureDiagnostics;
};

export type CaptureResult = PreparedCapture;

export type CapturePhase =
  | "idle"
  | "analyzing"
  | "review"
  | "revalidating"
  | "preparing-images"
  | "image-recovery"
  | "image-budget-review"
  | "preparing-fonts"
  | "font-recovery"
  | "settling"
  | "converting"
  | "completed"
  | "failed"
  | "canceling"
  | "canceled";

export type CaptureDecision =
  | "review"
  | "retry-failed-images"
  | "continue-with-placeholders"
  | "continue-after-soft-budget"
  | "placeholders-after-hard-budget"
  | "retry-fonts"
  | "switch-to-compatible"
  | "cancel";

export type CaptureFailure = {
  code:
    | ResourceErrorCode
    | "target-lost"
    | "resource-set-changed"
    | "conversion-failed"
    | "font-preflight-failed"
    | "invalid-command";
  message: string;
};

export type CaptureState = {
  sessionId: string;
  sequence: number;
  phase: CapturePhase;
  settings: CaptureSettings;
  analysis?: CaptureAnalysis;
  progress?: ImageStageProgress;
  fontProgress?: FontStageProgress;
  imageStage?: ImageStageDiagnostics;
  fontDiagnostics?: ReadonlyArray<FontDiagnostic>;
  decision?: CaptureDecision;
  failure?: CaptureFailure;
  prepared?: PreparedCapture;
};

export type CaptureCommand =
  | {
      type: "analyze";
      /** Current session id, or `none` before the first analysis. */
      sessionId: string;
      target: CaptureInput;
      settings?: Partial<CaptureSettings>;
    }
  | { type: "start"; sessionId: string }
  | { type: "retry-failed-images"; sessionId: string }
  | { type: "continue-with-placeholders"; sessionId: string }
  | { type: "continue-after-soft-budget"; sessionId: string }
  | { type: "switch-to-compatible"; sessionId: string }
  | { type: "retry-fonts"; sessionId: string }
  | { type: "cancel"; sessionId: string };

export type CaptureEvent = {
  type: "state";
  state: CaptureState;
};

export type BrowserCaptureAdapterOptions = {
  bridge?: ConversionBridge;
  bridgeOptions?: DomToFigmaBridgeOptions;
  fontResolver?: FontResolver;
  fonts?: FontResolverOptions;
  settleTimeoutMs?: number;
  motion?: MotionMode;
  lineBreaks?: LineBreakMode;
  fontFailure?: FontFailureMode;
  domTraversal?: DomTreeStrategy;
  isExcluded?: (element: Element) => boolean;
};

export type CaptureEngineOptions = {
  bridge: ConversionBridge;
  fontResolver: FontResolver;
  settings?: Partial<CaptureSettings>;
  domTraversal?: DomTreeStrategy;
  isExcluded?: (element: Element) => boolean;
};

export type CaptureEngine = {
  capture(input: CaptureInput): Promise<CaptureResult>;
  analyze(target: CaptureInput): Promise<CaptureAnalysis>;
  start(
    target: CaptureInput,
    settings?: Partial<CaptureSettings>
  ): Promise<string>;
  dispatch(command: CaptureCommand): Promise<void>;
  subscribe(listener: (event: CaptureEvent) => void): () => void;
  getState(): CaptureState;
  clearCache(): void;
};

export type BrowserCaptureAdapter = CaptureEngine & {};
