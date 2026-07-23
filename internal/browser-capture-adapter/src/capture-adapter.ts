import type {
  ConvertInput,
  ConvertResult,
  FigmaConverter,
} from "@figit/dom-to-figma";
import { createFigmaConverter } from "@figit/dom-to-figma";

import { createFontResolver, FontPreflightError } from "./font-resolver";
import { freezeCaptureMotion } from "./motion-snapshot";
import { waitForPageToSettle } from "./page-stability";
import { prepareCjkLineBreaks } from "./text-line-breaks";
import type {
  BrowserCaptureAdapter,
  BrowserCaptureAdapterOptions,
  CaptureDiagnostics,
  CaptureElementInput,
  CaptureInput,
  CaptureResult,
  FontResolver,
  LineBreakDiagnostics,
  MotionDiagnostics,
  PageSettleDiagnostics,
} from "./types";

const DEFAULT_SETTLE_TIMEOUT_MS = 5000;
const DEFAULT_MOTION = "freeze" as const;
const DEFAULT_LINE_BREAKS = "auto" as const;
const DEFAULT_FONT_FAILURE = "fallback" as const;

export class CaptureError extends Error {
  readonly diagnostics: CaptureDiagnostics;
  override readonly cause: unknown;

  constructor(
    message: string,
    diagnostics: CaptureDiagnostics,
    cause?: unknown
  ) {
    super(message);
    this.name = "CaptureError";
    this.diagnostics = diagnostics;
    this.cause = cause;
  }
}

export function createBrowserCaptureAdapter(
  options: BrowserCaptureAdapterOptions = {}
): BrowserCaptureAdapter {
  const fontResolver =
    options.fontResolver ?? createFontResolver(options.fonts ?? {});
  const converter = options.converter ?? createConverter(options, fontResolver);
  const settleTimeoutMs = options.settleTimeoutMs ?? DEFAULT_SETTLE_TIMEOUT_MS;
  const motion = options.motion ?? DEFAULT_MOTION;
  const lineBreaks = options.lineBreaks ?? DEFAULT_LINE_BREAKS;
  const fontFailure = options.fontFailure ?? DEFAULT_FONT_FAILURE;

  return {
    capture(input): Promise<CaptureResult> {
      return captureInput(input);
    },
    clearCache() {
      converter.clearCache();
    },
  };

  async function captureInput(input: CaptureInput): Promise<CaptureResult> {
    const root = getCaptureRoot(input);
    const emptySettle = createEmptySettleDiagnostics(settleTimeoutMs);
    const emptyMotion = createEmptyMotionDiagnostics(motion);
    const emptyLineBreaks = createEmptyLineBreakDiagnostics(lineBreaks);
    const diagnostics: CaptureDiagnostics = {
      settle: emptySettle,
      motion: emptyMotion,
      lineBreaks: emptyLineBreaks,
      fonts: [],
      cleanupFailures: [],
    };
    const cleanup = new CleanupStack();
    let result: ConvertResult | undefined;
    let primaryError: unknown;

    try {
      const motionSnapshot = freezeCaptureMotion(root, motion);
      diagnostics.motion = motionSnapshot.diagnostics;
      cleanup.push(() => {
        motionSnapshot.restore();
      });

      diagnostics.settle = await waitForPageToSettle(root, {
        timeoutMs: settleTimeoutMs,
      });
      fontResolver.beginCapture(root.ownerDocument);
      const fontRequests = fontResolver.collectRequests(root);
      await fontResolver.preflight(fontRequests, fontFailure);

      const lineBreakPreparation = prepareCjkLineBreaks(root, lineBreaks);
      diagnostics.lineBreaks = lineBreakPreparation.diagnostics;
      cleanup.push(() => {
        lineBreakPreparation.restore();
      });

      result = await converter.convert(toConvertInput(input, root));
    } catch (error) {
      primaryError = error;
    } finally {
      const cleanupFailures = cleanup.run();
      diagnostics.cleanupFailures = cleanupFailures;
      diagnostics.fonts = fontResolver.getDiagnostics();
    }

    if (primaryError) {
      const details = toErrorMessage(primaryError);
      const cleanupDetails = diagnostics.cleanupFailures.join("; ");
      throw new CaptureError(
        cleanupDetails
          ? `Capture failed: ${details}; cleanup failed: ${cleanupDetails}`
          : `Capture failed: ${details}`,
        diagnostics,
        primaryError
      );
    }
    if (diagnostics.cleanupFailures.length > 0) {
      throw new CaptureError(
        `Capture cleanup failed: ${diagnostics.cleanupFailures.join("; ")}`,
        diagnostics
      );
    }
    if (!result) {
      throw new CaptureError("Capture did not produce a result", diagnostics);
    }
    return {
      ...result,
      diagnostics,
    };
  }
}

function createConverter(
  options: BrowserCaptureAdapterOptions,
  fontResolver: FontResolver
): FigmaConverter {
  return createFigmaConverter({
    ...options.converterConfig,
    fontLoader: options.converterConfig?.fontLoader ?? fontResolver.loader,
  });
}

function getCaptureRoot(input: CaptureInput): Element {
  return "frames" in input
    ? (input.frames[0]?.element ?? throwNoFrame())
    : input.element;
}

function throwNoFrame(): never {
  throw new Error("Capture input must contain at least one frame");
}

function toConvertInput(input: CaptureInput, root: Element): ConvertInput {
  if ("frames" in input) {
    return input;
  }
  const capture = input as CaptureElementInput;
  const size = measureElement(root);
  return {
    element: root,
    width: capture.width ?? size.width,
    height: capture.height ?? size.height,
    name: capture.name,
  };
}

function measureElement(element: Element): { width: number; height: number } {
  const document = element.ownerDocument;
  const rect = element.getBoundingClientRect();
  if (element === document.body || element === document.documentElement) {
    const body = document.body;
    const root = document.documentElement;
    return {
      width: Math.max(
        Math.ceil(rect.width),
        body?.scrollWidth ?? 0,
        root?.scrollWidth ?? 0
      ),
      height: Math.max(
        Math.ceil(rect.height),
        body?.scrollHeight ?? 0,
        root?.scrollHeight ?? 0,
        1
      ),
    };
  }
  return {
    width: Math.max(0, Math.round(rect.width)),
    height: Math.max(0, Math.round(rect.height)),
  };
}

class CleanupStack {
  private readonly callbacks: Array<() => void> = [];

  push(callback: () => void): void {
    this.callbacks.push(callback);
  }

  run(): Array<string> {
    const failures: Array<string> = [];
    for (const callback of [...this.callbacks].reverse()) {
      try {
        callback();
      } catch (error) {
        failures.push(toErrorMessage(error));
      }
    }
    return failures;
  }
}

function createEmptySettleDiagnostics(
  timeoutMs: number
): PageSettleDiagnostics {
  return {
    timeoutMs,
    timedOut: false,
    phase: "skipped",
    pendingFonts: false,
    pendingImages: 0,
    waitedForImages: 0,
    frameCount: 0,
    errors: [],
  };
}

function createEmptyMotionDiagnostics(
  mode: "freeze" | "live"
): MotionDiagnostics {
  return {
    mode,
    paused: 0,
    restored: 0,
    restoreFailures: [],
  };
}

function createEmptyLineBreakDiagnostics(
  mode: "auto" | "off"
): LineBreakDiagnostics {
  return {
    mode,
    measuredNodes: 0,
    changedNodes: 0,
    insertedBreaks: 0,
    skippedNodes: 0,
    measurementFailures: [],
  };
}

function toErrorMessage(error: unknown): string {
  if (error instanceof FontPreflightError) {
    return `${error.message}: ${error.failures
      .map((failure) => formatFontFailure(failure))
      .join(", ")}`;
  }
  return error instanceof Error ? error.message : String(error);
}

function formatFontFailure(failure: {
  request: { family: string; weight: number; italic: boolean };
}): string {
  return `${failure.request.family} ${failure.request.weight} ${failure.request.italic ? "italic" : "normal"}`;
}
