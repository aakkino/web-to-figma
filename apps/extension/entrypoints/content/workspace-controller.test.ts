import type {
  CaptureAnalysis,
  CaptureCommand,
  CaptureEngine,
  CaptureEvent,
  CaptureInput,
  CaptureState,
  PreparedCapture,
} from "@figit/browser-capture-adapter";
import { describe, expect, it, vi } from "vitest";
import type { CaptureSettings } from "../../shared/capture-settings";
import { createMemorySettingsRepository } from "../../shared/capture-settings";
import type { CaptureSourceSnapshot, OutputArtifact } from "./capture-artifact";
import type { FontSpecCopyResult, FontSpecPort } from "./font-spec";
import type { OutputPort, OutputSinkResult } from "./workspace-controller";
import {
  createWorkspaceController,
  shouldConfirmArtifactDiscard,
} from "./workspace-controller";

const SOURCE_SNAPSHOT: CaptureSourceSnapshot = {
  url: "https://example.com/page?private=yes",
  title: "Example",
  target: { kind: "page" },
};
const SHA256_HEX_LENGTH = 64;

describe("WorkspaceController", () => {
  it("keeps settings in memory until explicitly saved", async () => {
    const engine = createFakeEngine();
    const repository = createMemorySettingsRepository();
    const controller = createWorkspaceController({
      engine,
      settingsRepository: repository,
      outputPort: createFakeOutputPort(),
      fontSpecPort: createFakeFontSpecPort(),
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
      fontSpecPort: createFakeFontSpecPort(),
    });
    const target = { element: {} as Element } as CaptureInput;

    await controller.init();
    controller.open();
    await controller.analyzeTarget(target, SOURCE_SNAPSHOT);
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

  it("does not enter ready state until immutable artifact preparation completes", async () => {
    const output = createFakeOutputPort();
    let finishPreparation: (() => void) | undefined;
    output.prepare = (capture, source) =>
      new Promise((resolve) => {
        finishPreparation = () => resolve(createFakeArtifact(capture, source));
      });
    const controller = createWorkspaceController({
      engine: createFakeEngine(),
      settingsRepository: createMemorySettingsRepository(),
      outputPort: output,
      fontSpecPort: createFakeFontSpecPort(),
    });

    await controller.init();
    await controller.analyzeTarget({ element: {} as Element }, SOURCE_SNAPSHOT);
    await controller.startCapture();
    expect(controller.getSnapshot().view).toBe("artifact-preparing");
    expect(controller.getSnapshot().artifact).toBeUndefined();

    finishPreparation?.();
    await flushArtifactPreparation();
    expect(controller.getSnapshot().view).toBe("ready-to-output");
    expect(Object.isFrozen(controller.getSnapshot().artifact)).toBe(true);
    controller.dispose();
  });

  it("preserves partial success and retries only the failed sink", async () => {
    const engine = createFakeEngine();
    const output = createFakeOutputPort();
    const retry = vi.spyOn(output, "retry");
    output.execute = () =>
      Promise.resolve({
        results: [
          { sink: "clipboard", status: "success" },
          { sink: "file", status: "failed", code: "file-test" },
        ],
      });
    const controller = createWorkspaceController({
      engine,
      settingsRepository: createMemorySettingsRepository({
        outputs: { clipboard: true, file: true },
      }),
      outputPort: output,
      fontSpecPort: createFakeFontSpecPort(),
    });

    await controller.init();
    await controller.analyzeTarget({ element: {} as Element }, SOURCE_SNAPSHOT);
    await controller.startCapture();
    await flushArtifactPreparation();
    await controller.executeOutput();
    expect(controller.getSnapshot().output.status).toBe("partial");
    expect(shouldConfirmArtifactDiscard(controller.getSnapshot())).toBe(true);

    await controller.retryOutput("file");
    expect(retry).toHaveBeenCalledOnce();
    expect(controller.getSnapshot().output.status).toBe("success");
    expect(engine.startCount).toBe(1);
    expect(output.prepareCount).toBe(1);
    controller.dispose();
  });

  it("copies a typography spec from the reviewed target without changing capture state", async () => {
    const engine = createFakeEngine();
    let finishCopy: ((result: FontSpecCopyResult) => void) | undefined;
    const fontSpecPort = createFakeFontSpecPort(
      () =>
        new Promise((resolve) => {
          finishCopy = resolve;
        })
    );
    const controller = createWorkspaceController({
      engine,
      settingsRepository: createMemorySettingsRepository(),
      outputPort: createFakeOutputPort(),
      fontSpecPort,
    });
    const target = { element: {} as Element } as CaptureInput;

    await controller.init();
    await controller.analyzeTarget(target, SOURCE_SNAPSHOT);
    const captureBefore = controller.getSnapshot().capture;
    const copyPromise = controller.copyFontSpec();

    expect(controller.getSnapshot().fontSpec.status).toBe("running");
    expect(fontSpecPort.target).toBe(target);
    await controller.startCapture();
    expect(engine.startCount).toBe(0);

    finishCopy?.({ status: "success", message: "Copied." });
    await copyPromise;
    expect(controller.getSnapshot().view).toBe("review");
    expect(controller.getSnapshot().fontSpec).toEqual({
      status: "success",
      message: "Copied.",
    });
    expect(controller.getSnapshot().capture).toBe(captureBefore);
    expect(controller.getSnapshot().artifact).toBeUndefined();
    expect(controller.getSnapshot().output.status).toBe("idle");
    controller.dispose();
  });

  it("keeps typography copy failures retryable in Review", async () => {
    let attempt = 0;
    const fontSpecPort = createFakeFontSpecPort(() => {
      attempt += 1;
      return Promise.resolve(
        attempt === 1
          ? { status: "failed", message: "Clipboard rejected." }
          : { status: "success", message: "Copied." }
      );
    });
    const controller = createWorkspaceController({
      engine: createFakeEngine(),
      settingsRepository: createMemorySettingsRepository(),
      outputPort: createFakeOutputPort(),
      fontSpecPort,
    });

    await controller.init();
    await controller.analyzeTarget({ element: {} as Element }, SOURCE_SNAPSHOT);
    await controller.copyFontSpec();
    expect(controller.getSnapshot().view).toBe("review");
    expect(controller.getSnapshot().fontSpec.status).toBe("failed");

    await controller.copyFontSpec();
    expect(controller.getSnapshot().fontSpec.status).toBe("success");
    expect(fontSpecPort.copyCount).toBe(2);
    controller.dispose();
  });

  it("resets terminal output into a fresh engine while preserving draft settings", async () => {
    const engines: Array<ReturnType<typeof createFakeEngine>> = [];
    const engineFactory = () => {
      const engine = createFakeEngine(`session-${engines.length + 1}`);
      engines.push(engine);
      return engine;
    };
    const controller = createWorkspaceController({
      engine: engineFactory(),
      engineFactory,
      settingsRepository: createMemorySettingsRepository(),
      outputPort: createFakeOutputPort(),
      fontSpecPort: createFakeFontSpecPort(),
    });

    await controller.init();
    controller.updateSettings({ font: { mode: "strict" } });
    await controller.analyzeTarget({ element: {} as Element }, SOURCE_SNAPSHOT);
    await controller.startCapture();
    await flushArtifactPreparation();
    const completedEngine = engines.at(-1);
    const firstSession = controller.getSnapshot().capture.sessionId;

    expect(shouldConfirmArtifactDiscard(controller.getSnapshot())).toBe(true);
    expect(controller.startPicker()).toBe(false);
    const readyArtifact = controller.getSnapshot().artifact;
    await controller.analyzeTarget(
      { element: {} as Element },
      { ...SOURCE_SNAPSHOT, title: "Bypass attempt" }
    );
    expect(controller.getSnapshot().artifact).toBe(readyArtifact);
    await controller.executeOutput();
    expect(shouldConfirmArtifactDiscard(controller.getSnapshot())).toBe(false);
    expect(controller.startNewCapture()).toBe(true);
    expect(controller.getSnapshot()).toMatchObject({
      view: "idle",
      draftSettings: { font: { mode: "strict" } },
      output: { status: "idle" },
    });
    expect(controller.getSnapshot().artifact).toBeUndefined();
    expect(controller.getSnapshot().sourceSnapshot).toBeUndefined();
    expect(completedEngine?.clearCount).toBeGreaterThan(0);

    completedEngine?.emitState({
      ...completedEngine.getState(),
      phase: "completed",
      sequence: 100,
    });
    expect(controller.getSnapshot().capture.sessionId).not.toBe(firstSession);
    expect(controller.getSnapshot().view).toBe("idle");

    completedEngine?.emitDetachedState({
      ...completedEngine.getState(),
      sessionId: firstSession,
      phase: "analyzing",
      sequence: 101,
    });
    expect(controller.getSnapshot().capture.sessionId).not.toBe(firstSession);
    expect(controller.getSnapshot().view).toBe("idle");
    controller.dispose();
  });

  it("blocks reset during output and ignores stale preparation after disposal", async () => {
    const output = createFakeOutputPort();
    let finishOutput: (() => void) | undefined;
    output.execute = () =>
      new Promise((resolve) => {
        finishOutput = () =>
          resolve({
            results: [{ sink: "clipboard", status: "success" }],
          });
      });
    const controller = createWorkspaceController({
      engine: createFakeEngine(),
      engineFactory: () => createFakeEngine("fresh"),
      settingsRepository: createMemorySettingsRepository(),
      outputPort: output,
      fontSpecPort: createFakeFontSpecPort(),
    });

    await controller.init();
    await controller.analyzeTarget({ element: {} as Element }, SOURCE_SNAPSHOT);
    await controller.startCapture();
    await flushArtifactPreparation();
    const outputPromise = controller.executeOutput();
    expect(controller.startNewCapture()).toBe(false);
    finishOutput?.();
    await outputPromise;
    expect(controller.startNewCapture()).toBe(true);
    controller.dispose();
  });

  it("preserves ready state when file selection is canceled", async () => {
    const output = createFakeOutputPort();
    const controller = createWorkspaceController({
      engine: createFakeEngine(),
      settingsRepository: createMemorySettingsRepository(),
      outputPort: output,
      fontSpecPort: createFakeFontSpecPort(),
    });
    await controller.init();
    await controller.analyzeTarget({ element: {} as Element }, SOURCE_SNAPSHOT);
    await controller.startCapture();
    await flushArtifactPreparation();
    const artifact = controller.getSnapshot().artifact;

    await controller.openPackage();
    expect(controller.getSnapshot().view).toBe("ready-to-output");
    expect(controller.getSnapshot().artifact).toBe(artifact);
    controller.dispose();
  });

  it("opens a file into the shared artifact output path without capture", async () => {
    const engine = createFakeEngine();
    const output = createFakeOutputPort();
    const opened = createFakeArtifact(
      createPreparedCapture(),
      SOURCE_SNAPSHOT,
      "opened-file"
    );
    output.open = () => Promise.resolve(opened);
    const controller = createWorkspaceController({
      engine,
      settingsRepository: createMemorySettingsRepository(),
      outputPort: output,
      fontSpecPort: createFakeFontSpecPort(),
    });

    await controller.init();
    await controller.openPackage();
    expect(controller.getSnapshot()).toMatchObject({
      view: "ready-to-output",
      artifact: { origin: "opened-file" },
    });
    await controller.executeOutput();
    expect(engine.startCount).toBe(0);
    expect(output.prepareCount).toBe(0);
    expect(output.executeCount).toBe(1);
    controller.dispose();
  });
});

function createTestController() {
  return createWorkspaceController({
    engine: createFakeEngine(),
    settingsRepository: createMemorySettingsRepository(),
    outputPort: createFakeOutputPort(),
    fontSpecPort: createFakeFontSpecPort(),
  });
}

function createFakeFontSpecPort(
  copyImplementation: FontSpecPort["copy"] = () =>
    Promise.resolve({ status: "success", message: "Copied." })
): FontSpecPort & { copyCount: number; target: CaptureInput | null } {
  const port = {
    copyCount: 0,
    target: null as CaptureInput | null,
    copy(target: CaptureInput, settings: CaptureSettings) {
      port.copyCount += 1;
      port.target = target;
      return copyImplementation(target, settings);
    },
  } satisfies FontSpecPort & { copyCount: number; target: CaptureInput | null };
  return port;
}

function createFakeEngine(sessionId = "session-1"): CaptureEngine & {
  startCount: number;
  clearCount: number;
  emitState(state: CaptureState): void;
  emitDetachedState(state: CaptureState): void;
} {
  const listeners = new Set<(event: CaptureEvent) => void>();
  const detachedListeners = new Set<(event: CaptureEvent) => void>();
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
  let clearCount = 0;

  const emit = (next: CaptureState) => {
    state = next;
    for (const listener of listeners) {
      listener({ type: "state", state });
    }
  };

  const engine = {
    startCount,
    clearCount,
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
          sessionId,
          phase: "analyzing",
          sequence: state.sequence + 1,
        });
        emit({
          ...state,
          sessionId,
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
      detachedListeners.add(listener);
      return () => listeners.delete(listener);
    },
    getState() {
      return state;
    },
    clearCache() {
      clearCount += 1;
      engine.clearCount = clearCount;
    },
    emitState(next: CaptureState) {
      emit(next);
    },
    emitDetachedState(next: CaptureState) {
      state = next;
      for (const listener of detachedListeners) {
        listener({ type: "state", state });
      }
    },
  } satisfies CaptureEngine & {
    startCount: number;
    clearCount: number;
    emitState(state: CaptureState): void;
    emitDetachedState(state: CaptureState): void;
  };
  return engine;
}

function createFakeOutputPort(): OutputPort & {
  executeCount: number;
  prepareCount: number;
} {
  const port = {
    capabilities: { clipboard: true, file: true },
    executeCount: 0,
    prepareCount: 0,
    prepare(
      capture: PreparedCapture,
      source: CaptureSourceSnapshot
    ): Promise<OutputArtifact> {
      port.prepareCount += 1;
      return Promise.resolve(createFakeArtifact(capture, source));
    },
    execute(
      _artifact: OutputArtifact,
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
      _artifact: OutputArtifact,
      sink: "clipboard" | "file"
    ): Promise<OutputSinkResult> {
      return Promise.resolve({ sink, status: "success" as const });
    },
    open(): Promise<null> {
      return Promise.resolve(null);
    },
  } satisfies OutputPort & { executeCount: number; prepareCount: number };
  return port;
}

function createFakeArtifact(
  capture: PreparedCapture,
  source: CaptureSourceSnapshot,
  origin: OutputArtifact["origin"] = "capture"
): OutputArtifact {
  const packageValue = Object.freeze({
    format: "figit.capture" as const,
    version: 1 as const,
    createdAt: "2026-08-01T00:00:00.000Z",
    producer: { name: "test", version: "1" },
    source,
    settings: { ...capture.settings },
    diagnostics: {
      settle: {
        timeoutMs: 0,
        timedOut: false,
        phase: "complete",
        pendingFonts: false,
        pendingImages: 0,
        waitedForImages: 0,
        frameCount: 0,
        errorCount: 0,
      },
      motion: {
        mode: "freeze",
        paused: 0,
        restored: 0,
        restoreFailureCount: 0,
      },
      lineBreaks: {
        mode: "auto",
        measuredNodes: 0,
        changedNodes: 0,
        insertedBreaks: 0,
        skippedNodes: 0,
        measurementFailureCount: 0,
      },
      fonts: {
        total: 0,
        exact: 0,
        fallback: 0,
        failed: 0,
        requestedCodePointCount: 0,
      },
      images: {
        completed: 0,
        total: 0,
        failed: 0,
        elapsedMs: 0,
        preparedBytes: 0,
        prepared: 0,
        placeholders: 0,
        softBudgetReached: false,
        hardBudgetReached: false,
        resources: [],
      },
      backgrounds: [],
      cleanupFailureCount: 0,
    },
    payload: {
      type: "figma-clipboard-html" as const,
      html: capture.clipboardHtml,
      sha256: "0".repeat(SHA256_HEX_LENGTH),
    },
  });
  return Object.freeze({
    package: packageValue,
    serializedJson: JSON.stringify(packageValue),
    clipboardHtml: capture.clipboardHtml,
    suggestedFilename: "capture.figit",
    origin,
  });
}

function createPreparedCapture(): PreparedCapture {
  return {
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
  };
}

async function flushArtifactPreparation(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
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
