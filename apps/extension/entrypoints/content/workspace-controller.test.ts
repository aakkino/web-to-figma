import type {
  CaptureAnalysis,
  CaptureCommand,
  CaptureEngine,
  CaptureEvent,
  CaptureInput,
  CaptureState,
  PreparedCapture,
} from "@figit/browser-capture-adapter";
import { describe, expect, it } from "vitest";
import type { CaptureSettings } from "../../shared/capture-settings";
import { createMemorySettingsRepository } from "../../shared/capture-settings";
import type { OutputPort, OutputSinkResult } from "./workspace-controller";
import { createWorkspaceController } from "./workspace-controller";

describe("WorkspaceController", () => {
  it("keeps settings in memory until explicitly saved", async () => {
    const engine = createFakeEngine();
    const repository = createMemorySettingsRepository();
    const controller = createWorkspaceController({
      engine,
      settingsRepository: repository,
      outputPort: createFakeOutputPort(),
    });

    await controller.init();
    expect(controller.updateSettings({ font: { mode: "strict" } })).toBe(true);
    expect((await repository.load()).font.mode).toBe("compatible");
    await controller.saveDefaults();
    expect((await repository.load()).font.mode).toBe("strict");
    controller.dispose();
  });

  it("rejects removing the last output", async () => {
    const controller = createTestController();
    await controller.init();

    expect(
      controller.updateSettings({ outputs: { clipboard: false, file: false } })
    ).toBe(false);
    expect(controller.getSnapshot().draftSettings.outputs).toEqual({
      clipboard: true,
      file: false,
    });
    expect(controller.getSnapshot().message?.kind).toBe("error");
    controller.dispose();
  });

  it("does not recapture when a ready output is retried or written", async () => {
    const engine = createFakeEngine();
    const output = createFakeOutputPort();
    const controller = createWorkspaceController({
      engine,
      settingsRepository: createMemorySettingsRepository(),
      outputPort: output,
    });
    const target = { element: {} as Element } as CaptureInput;

    await controller.init();
    controller.open();
    await controller.analyzeTarget(target);
    expect(controller.getSnapshot().view).toBe("review");
    await controller.startCapture();
    expect(controller.getSnapshot().view).toBe("ready-to-output");
    expect(engine.startCount).toBe(1);

    await controller.executeOutput();
    expect(output.executeCount).toBe(1);
    expect(engine.startCount).toBe(1);
    expect(controller.getSnapshot().output.status).toBe("success");

    engine.emitState({
      ...controller.getSnapshot().capture,
      sessionId: "old-session",
      phase: "preparing-images",
      sequence: 100,
    });
    expect(controller.getSnapshot().view).toBe("output");
    controller.dispose();
  });
});

function createTestController() {
  return createWorkspaceController({
    engine: createFakeEngine(),
    settingsRepository: createMemorySettingsRepository(),
    outputPort: createFakeOutputPort(),
  });
}

function createFakeEngine(): CaptureEngine & {
  startCount: number;
  emitState(state: CaptureState): void;
} {
  const listeners = new Set<(event: CaptureEvent) => void>();
  const target = { element: {} as Element } as CaptureInput;
  const prepared = {
    clipboardHtml: '<div data-figit="fixture">Ready</div>',
    settings: {
      layout: "auto",
      motion: "freeze",
      lineBreaks: "auto",
      settleTimeoutMs: 5000,
      images: "process",
      fontMode: "compatible",
    },
    diagnostics: {} as PreparedCapture["diagnostics"],
  } as PreparedCapture;
  let state: CaptureState = {
    sessionId: "none",
    sequence: 0,
    phase: "idle",
    settings: {
      layout: "auto",
      motion: "freeze",
      lineBreaks: "auto",
      settleTimeoutMs: 5000,
      images: "process",
      fontMode: "compatible",
    },
  };
  let startCount = 0;

  const emit = (next: CaptureState) => {
    state = next;
    for (const listener of listeners) {
      listener({ type: "state", state });
    }
  };

  const engine = {
    startCount,
    capture() {
      return Promise.resolve(prepared);
    },
    analyze() {
      return Promise.resolve(createAnalysis(target));
    },
    start(_target: CaptureInput, _settings?: unknown) {
      startCount += 1;
      emit({
        ...state,
        phase: "completed",
        sequence: state.sequence + 1,
        prepared,
      });
      engine.startCount = startCount;
      return Promise.resolve(state.sessionId);
    },
    dispatch(command: CaptureCommand): Promise<void> {
      if (command.type === "analyze") {
        const analysis = createAnalysis(command.target);
        emit({
          ...state,
          sessionId: "session-1",
          phase: "analyzing",
          sequence: state.sequence + 1,
        });
        emit({
          ...state,
          sessionId: "session-1",
          phase: "review",
          analysis,
          decision: "review",
          sequence: state.sequence + 1,
        });
        return Promise.resolve();
      }
      if (command.type === "start") {
        startCount += 1;
        emit({
          ...state,
          phase: "completed",
          sequence: state.sequence + 1,
          prepared,
        });
        engine.startCount = startCount;
        return Promise.resolve();
      }
      if (command.type === "cancel") {
        emit({ ...state, phase: "canceled", sequence: state.sequence + 1 });
      }
      return Promise.resolve();
    },
    subscribe(listener: (event: CaptureEvent) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getState() {
      return state;
    },
    clearCache() {
      // No cache is needed for the fake engine.
    },
    emitState(next: CaptureState) {
      emit(next);
    },
  } satisfies CaptureEngine & {
    startCount: number;
    emitState(state: CaptureState): void;
  };
  return engine;
}

function createFakeOutputPort(): OutputPort & {
  executeCount: number;
} {
  const port = {
    capabilities: { clipboard: true, file: false },
    executeCount: 0,
    execute(
      _capture: PreparedCapture,
      outputs: CaptureSettings["outputs"]
    ): Promise<Awaited<ReturnType<OutputPort["execute"]>>> {
      port.executeCount += 1;
      return Promise.resolve({
        results: outputs.clipboard
          ? [{ sink: "clipboard" as const, status: "success" as const }]
          : [],
      });
    },
    retry(
      _capture: PreparedCapture,
      sink: "clipboard" | "file"
    ): Promise<OutputSinkResult> {
      return Promise.resolve({ sink, status: "success" as const });
    },
    open(): Promise<null> {
      return Promise.resolve(null);
    },
  } satisfies OutputPort & { executeCount: number };
  return port;
}

function createAnalysis(target: CaptureInput): CaptureAnalysis {
  const root = "element" in target ? target.element : document.body;
  return {
    analyzedAt: 1,
    plan: {
      target: { input: target, root, kind: "element" },
      imageNodeCount: 2,
      uniqueImageResourceCount: 1,
      unsupportedBackgroundImageCount: 0,
      resources: [{ resourceId: "resource-1", nodeCount: 2 }],
      revision: "revision-1",
    },
  };
}
