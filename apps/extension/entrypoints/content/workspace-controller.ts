import type {
  CaptureCommand,
  CaptureEngine,
  CaptureEvent,
  CaptureInput,
  CapturePhase,
  CaptureState,
  PreparedCapture,
} from "@figit/browser-capture-adapter";
import type {
  CaptureOutput,
  CaptureSettings,
  CaptureSettingsPatch,
  CaptureSettingsRepository,
} from "../../shared/capture-settings";
import {
  DEFAULT_CAPTURE_SETTINGS,
  hasSelectedOutput,
  mergeCaptureSettings,
} from "../../shared/capture-settings";
import type { FontSpecPort } from "./font-spec";

export type WorkspaceSurface = "hidden" | "visible" | "minimized";

export type WorkspaceView =
  | "idle"
  | "picking"
  | "analyzing"
  | "review"
  | "image-progress"
  | "image-recovery"
  | "image-budget-review"
  | "font-progress"
  | "font-recovery"
  | "settling"
  | "converting"
  | "opening"
  | "ready-to-output"
  | "output"
  | "output-partial"
  | "canceled"
  | "error";

export type OutputSinkResult = {
  sink: CaptureOutput;
  status: "success" | "failed";
  code?: string;
  message?: string;
};

export type OutputRunResult = {
  results: ReadonlyArray<OutputSinkResult>;
};

export type OutputRunState = {
  status: "idle" | "running" | "success" | "partial" | "failed";
  results: Record<CaptureOutput, OutputSinkResult | null>;
};

export type FontSpecRunState = {
  status: "idle" | "running" | "success" | "failed";
  message?: string;
};

export type OutputPort = {
  capabilities: Readonly<Record<CaptureOutput, boolean>>;
  execute(
    capture: PreparedCapture,
    outputs: CaptureSettings["outputs"]
  ): Promise<OutputRunResult>;
  retry(
    capture: PreparedCapture,
    sink: CaptureOutput
  ): Promise<OutputSinkResult>;
  open(): Promise<PreparedCapture | null>;
};

export type CaptureEngineFactory = (settings: CaptureSettings) => CaptureEngine;

export type WorkspaceState = {
  surface: WorkspaceSurface;
  view: WorkspaceView;
  draftSettings: CaptureSettings;
  effectiveSettings: CaptureSettings;
  capture: CaptureState;
  prepared?: PreparedCapture;
  output: OutputRunState;
  fontSpec: FontSpecRunState;
  message?: {
    kind: "info" | "error";
    text: string;
  };
};

export type WorkspaceController = {
  getSnapshot(): WorkspaceState;
  subscribe(listener: (state: WorkspaceState) => void): () => void;
  init(): Promise<void>;
  open(): void;
  close(): void;
  minimize(): void;
  restore(): void;
  startPicker(): boolean;
  cancelPicker(): void;
  analyzeTarget(target: CaptureInput): Promise<void>;
  startCapture(): Promise<void>;
  copyFontSpec(): Promise<void>;
  dispatchCapture(
    type:
      | "retry-failed-images"
      | "continue-with-placeholders"
      | "continue-after-soft-budget"
      | "retry-fonts"
      | "switch-to-compatible"
      | "cancel"
  ): Promise<void>;
  updateSettings(patch: CaptureSettingsPatch): boolean;
  saveDefaults(): Promise<void>;
  executeOutput(): Promise<void>;
  retryOutput(sink: CaptureOutput): Promise<void>;
  openPackage(): Promise<void>;
  dispose(): void;
};

type WorkspaceControllerOptions = {
  engine: CaptureEngine;
  engineFactory?: CaptureEngineFactory;
  settingsRepository: CaptureSettingsRepository;
  outputPort: OutputPort;
  fontSpecPort: FontSpecPort;
};

const INITIAL_OUTPUT_STATE: OutputRunState = {
  status: "idle",
  results: { clipboard: null, file: null },
};

export function createWorkspaceController(
  options: WorkspaceControllerOptions
): WorkspaceController {
  let activeEngine = options.engine;
  let removeEngineListener = activeEngine.subscribe(handleCaptureEvent);
  let disposed = false;
  const listeners = new Set<(state: WorkspaceState) => void>();
  let state: WorkspaceState = {
    surface: "hidden",
    view: "idle",
    draftSettings: DEFAULT_CAPTURE_SETTINGS,
    effectiveSettings: DEFAULT_CAPTURE_SETTINGS,
    capture: activeEngine.getState(),
    output: createOutputState(),
    fontSpec: { status: "idle" },
  };

  const controller: WorkspaceController = {
    getSnapshot() {
      return state;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async init() {
      const settings = await options.settingsRepository.load();
      if (disposed) {
        return;
      }
      if (options.engineFactory) {
        replaceEngine(settings);
      }
      update({
        draftSettings: settings,
        effectiveSettings: settings,
        capture: activeEngine.getState(),
      });
    },
    open() {
      if (state.view === "picking") {
        update({ surface: "minimized" });
        return;
      }
      update({ surface: "visible" });
    },
    close() {
      update({ surface: "hidden" });
    },
    minimize() {
      if (state.surface === "visible") {
        update({ surface: "minimized" });
      }
    },
    restore() {
      if (state.view === "picking") {
        update({ surface: "minimized" });
        return;
      }
      update({ surface: "visible" });
    },
    startPicker() {
      if (
        isCaptureBusy(state.capture.phase) ||
        state.fontSpec.status === "running"
      ) {
        return false;
      }
      update({
        surface: "minimized",
        view: "picking",
        message: undefined,
      });
      return true;
    },
    cancelPicker() {
      if (state.view !== "picking") {
        return;
      }
      update({ surface: "visible", view: "idle" });
    },
    async analyzeTarget(target) {
      if (isCaptureBusy(state.capture.phase)) {
        return;
      }
      const settings = state.draftSettings;
      replaceEngine(settings);
      update({
        surface: "visible",
        view: "analyzing",
        effectiveSettings: settings,
        prepared: undefined,
        output: createOutputState(),
        fontSpec: { status: "idle" },
        message: undefined,
      });
      try {
        await activeEngine.dispatch({
          type: "analyze",
          sessionId: "none",
          target,
          settings: toEngineSettings(settings),
        });
      } catch (error) {
        reportError(error, "Unable to analyze the selected target.");
      }
    },
    async startCapture() {
      if (
        state.capture.phase !== "review" ||
        state.fontSpec.status === "running"
      ) {
        return;
      }
      await dispatchCaptureCommand({
        type: "start",
        sessionId: state.capture.sessionId,
      });
    },
    async copyFontSpec() {
      const target = state.capture.analysis?.plan.target.input;
      if (
        state.capture.phase !== "review" ||
        state.fontSpec.status === "running" ||
        !target
      ) {
        return;
      }
      update({
        fontSpec: { status: "running" },
        message: undefined,
      });
      try {
        const result = await options.fontSpecPort.copy(
          target,
          state.draftSettings
        );
        update({
          view: "review",
          fontSpec: result,
          message: {
            kind: result.status === "success" ? "info" : "error",
            text: result.message,
          },
        });
      } catch (error) {
        const text =
          error instanceof Error && error.message
            ? error.message
            : "Unable to copy the typography spec.";
        update({
          view: "review",
          fontSpec: { status: "failed", message: text },
          message: { kind: "error", text },
        });
      }
    },
    async dispatchCapture(type) {
      const sessionId = state.capture.sessionId;
      if (sessionId === "none") {
        return;
      }
      await dispatchCaptureCommand({ type, sessionId });
    },
    updateSettings(patch) {
      const candidate = {
        ...state.draftSettings,
        ...patch,
        image: { ...state.draftSettings.image, ...patch.image },
        font: { ...state.draftSettings.font, ...patch.font },
        outputs: { ...state.draftSettings.outputs, ...patch.outputs },
        advanced: { ...state.draftSettings.advanced, ...patch.advanced },
      };
      if (!(candidate.outputs.clipboard || candidate.outputs.file)) {
        update({
          message: {
            kind: "error",
            text: "Keep at least one output selected.",
          },
        });
        return false;
      }
      update({
        draftSettings: mergeCaptureSettings(state.draftSettings, patch),
        message: undefined,
      });
      return true;
    },
    async saveDefaults() {
      try {
        await options.settingsRepository.save(state.draftSettings);
        update({
          message: { kind: "info", text: "Defaults saved for new tabs." },
        });
      } catch (error) {
        reportError(error, "Unable to save capture defaults.");
      }
    },
    async executeOutput() {
      const capture = state.prepared;
      if (!capture || state.output.status === "running") {
        return;
      }
      const outputs = state.effectiveSettings.outputs;
      if (!hasSelectedOutput(state.effectiveSettings)) {
        update({
          message: { kind: "error", text: "Choose at least one output." },
        });
        return;
      }
      update({
        view: "output",
        output: { ...createOutputState(), status: "running" },
        message: undefined,
      });
      try {
        const result = await options.outputPort.execute(capture, outputs);
        applyOutputResult(result);
      } catch (error) {
        reportError(error, "Output failed. The capture is still ready.");
        update({ view: "output-partial", output: markOutputFailed() });
      }
    },
    async retryOutput(sink) {
      const capture = state.prepared;
      const previous = state.output.results[sink];
      if (!(capture && previous) || previous.status !== "failed") {
        return;
      }
      update({
        view: "output",
        output: { ...state.output, status: "running" },
        message: undefined,
      });
      try {
        const result = await options.outputPort.retry(capture, sink);
        const results = { ...state.output.results, [sink]: result };
        const status = outputStatus(results, state.effectiveSettings.outputs);
        update({
          view: status === "partial" ? "output-partial" : "output",
          output: { status, results },
        });
      } catch (error) {
        reportError(error, "Output retry failed. The capture is still ready.");
        update({ view: "output-partial", output: markOutputFailed(sink) });
      }
    },
    async openPackage() {
      if (state.view === "opening") {
        return;
      }
      const previousView = state.view;
      update({ view: "opening", message: undefined });
      try {
        const capture = await options.outputPort.open();
        if (disposed || !capture) {
          update({ view: previousView });
          return;
        }
        update({
          view: "ready-to-output",
          prepared: capture,
          output: createOutputState(),
          message: undefined,
        });
      } catch (error) {
        reportError(error, "Unable to open that capture package.");
        update({ view: previousView });
      }
    },
    dispose() {
      disposed = true;
      removeEngineListener();
      listeners.clear();
    },
  };

  return controller;

  function replaceEngine(settings: CaptureSettings): void {
    if (!options.engineFactory) {
      return;
    }
    removeEngineListener();
    activeEngine = options.engineFactory(settings);
    removeEngineListener = activeEngine.subscribe(handleCaptureEvent);
    update({ capture: activeEngine.getState() });
  }

  function handleCaptureEvent(event: CaptureEvent): void {
    if (disposed) {
      return;
    }
    const next = event.state;
    const current = state.capture;
    if (
      next.sessionId === current.sessionId &&
      next.sequence < current.sequence
    ) {
      return;
    }
    if (
      next.sessionId !== current.sessionId &&
      next.phase !== "analyzing" &&
      current.sessionId !== "none"
    ) {
      return;
    }
    const patch: Partial<WorkspaceState> = {
      capture: next,
      view: viewForCapturePhase(next.phase),
      message:
        next.failure && next.phase === "failed"
          ? { kind: "error", text: next.failure.message }
          : undefined,
    };
    if (next.phase === "completed" && next.prepared) {
      patch.prepared = next.prepared;
      patch.output = createOutputState();
    }
    update(patch);
  }

  async function dispatchCaptureCommand(
    command: CaptureCommand
  ): Promise<void> {
    try {
      await activeEngine.dispatch(command);
    } catch (error) {
      reportError(error, "That capture action is no longer available.");
    }
  }

  function applyOutputResult(result: OutputRunResult): void {
    const results = { ...state.output.results };
    for (const sinkResult of result.results) {
      results[sinkResult.sink] = sinkResult;
    }
    const status = outputStatus(results, state.effectiveSettings.outputs);
    update({
      view: status === "partial" ? "output-partial" : "output",
      output: { status, results },
      message:
        status === "success"
          ? { kind: "info", text: "Output complete." }
          : undefined,
    });
  }

  function markOutputFailed(sink?: CaptureOutput): OutputRunState {
    const results = { ...state.output.results };
    const failedSink =
      sink ?? firstSelectedOutput(state.effectiveSettings.outputs);
    if (failedSink) {
      results[failedSink] = {
        sink: failedSink,
        status: "failed",
        code: "output-failed",
        message: "Output failed",
      };
    }
    return { status: "failed", results };
  }

  function reportError(error: unknown, fallback: string): void {
    const text =
      error instanceof Error && error.message ? error.message : fallback;
    update({ message: { kind: "error", text } });
  }

  function update(patch: Partial<WorkspaceState>): void {
    if (disposed) {
      return;
    }
    state = { ...state, ...patch };
    for (const listener of listeners) {
      listener(state);
    }
  }
}

function createOutputState(): OutputRunState {
  return {
    status: INITIAL_OUTPUT_STATE.status,
    results: { ...INITIAL_OUTPUT_STATE.results },
  };
}

function firstSelectedOutput(
  outputs: CaptureSettings["outputs"]
): CaptureOutput | null {
  if (outputs.clipboard) {
    return "clipboard";
  }
  if (outputs.file) {
    return "file";
  }
  return null;
}

function outputStatus(
  results: Record<CaptureOutput, OutputSinkResult | null>,
  outputs: CaptureSettings["outputs"]
): OutputRunState["status"] {
  const selected = (Object.keys(outputs) as Array<CaptureOutput>).filter(
    (sink) => outputs[sink]
  );
  const completed = selected
    .map((sink) => results[sink])
    .filter((result): result is OutputSinkResult => result !== null);
  if (completed.length < selected.length) {
    return "failed";
  }
  const successes = completed.filter((result) => result.status === "success");
  if (successes.length === completed.length) {
    return "success";
  }
  return successes.length > 0 ? "partial" : "failed";
}

function toEngineSettings(settings: CaptureSettings): {
  layout: CaptureSettings["advanced"]["layout"];
  motion: CaptureSettings["advanced"]["motion"];
  lineBreaks: CaptureSettings["advanced"]["lineBreaks"];
  settleTimeoutMs: number;
  images: CaptureSettings["image"]["mode"];
  fontMode: CaptureSettings["font"]["mode"];
} {
  return {
    layout: settings.advanced.layout,
    motion: settings.advanced.motion,
    lineBreaks: settings.advanced.lineBreaks,
    settleTimeoutMs: settings.advanced.settleTimeoutMs,
    images: settings.image.mode,
    fontMode: settings.font.mode,
  };
}

function viewForCapturePhase(phase: CapturePhase): WorkspaceView {
  switch (phase) {
    case "idle":
      return "idle";
    case "analyzing":
    case "revalidating":
      return "analyzing";
    case "review":
      return "review";
    case "preparing-images":
      return "image-progress";
    case "image-recovery":
      return "image-recovery";
    case "image-budget-review":
      return "image-budget-review";
    case "preparing-fonts":
      return "font-progress";
    case "font-recovery":
      return "font-recovery";
    case "settling":
      return "settling";
    case "converting":
      return "converting";
    case "completed":
      return "ready-to-output";
    case "canceled":
    case "canceling":
      return "canceled";
    case "failed":
      return "error";
    default:
      return "error";
  }
}

function isCaptureBusy(phase: CapturePhase): boolean {
  return (
    phase === "analyzing" ||
    phase === "revalidating" ||
    phase === "preparing-images" ||
    phase === "image-recovery" ||
    phase === "image-budget-review" ||
    phase === "preparing-fonts" ||
    phase === "font-recovery" ||
    phase === "settling" ||
    phase === "converting" ||
    phase === "canceling"
  );
}
