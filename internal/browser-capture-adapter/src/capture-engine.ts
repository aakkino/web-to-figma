import { openComposedDomTree } from "@aakkino/composed-dom";

import { FontPreflightError } from "./font-resolver";
import {
  createImageScheduler,
  IMAGE_HARD_LIMIT_BYTES,
  IMAGE_ITEM_TIMEOUT_MS,
  IMAGE_SOFT_LIMIT_BYTES,
  IMAGE_STAGE_CONCURRENCY,
  IMAGE_STAGE_TIMEOUT_MS,
} from "./image-scheduler";
import { freezeCaptureMotion } from "./motion-snapshot";
import { waitForPageToSettle } from "./page-stability";
import type { CaptureInventory } from "./resource-inventory";
import {
  analyzeCaptureTarget,
  revalidateCapturePlan,
} from "./resource-inventory";
import { prepareCjkLineBreaks } from "./text-line-breaks";
import type {
  BackgroundDiagnostic,
  BridgeCaptureInput,
  CaptureAnalysis,
  CaptureCommand,
  CaptureDiagnostics,
  CaptureElementInput,
  CaptureEngine,
  CaptureEngineOptions,
  CaptureEvent,
  CaptureFailure,
  CaptureInput,
  CapturePhase,
  CaptureSettings,
  CaptureState,
  FontStageProgress,
  ImageResourceDiagnostic,
  ImageStageDiagnostics,
  ImageStageProgress,
  PreparedCapture,
} from "./types";

const DEFAULT_SETTINGS: CaptureSettings = {
  layout: "auto",
  motion: "freeze",
  lineBreaks: "auto",
  settleTimeoutMs: 5000,
  images: "process",
  fontMode: "compatible",
};
const SESSION_ID_RADIX = 36;
const MAX_SETTLE_TIMEOUT_MS = 30_000;

let sessionCounter = 0;

export class CaptureError extends Error {
  readonly code: CaptureFailure["code"];
  readonly diagnostics: CaptureDiagnostics;

  constructor(
    message: string,
    diagnostics: CaptureDiagnostics,
    code: CaptureFailure["code"] = "conversion-failed"
  ) {
    super(message);
    this.name = "CaptureError";
    this.code = code;
    this.diagnostics = diagnostics;
  }
}

type RuntimeSession = {
  state: CaptureState;
  inventory?: CaptureInventory;
  controller: AbortController;
  imageDiagnostics: Map<string, ImageResourceDiagnostic>;
  preparedBytes: number;
  diagnostics: CaptureDiagnostics;
  runPromise?: Promise<void>;
  softBudgetReached: boolean;
  hardBudgetReached: boolean;
};

export function createCaptureEngine(
  options: CaptureEngineOptions
): CaptureEngine {
  const domTraversal = options.domTraversal ?? openComposedDomTree;
  const defaultSettings = mergeSettings(DEFAULT_SETTINGS, options.settings);
  const listeners = new Set<(event: CaptureEvent) => void>();
  let current: RuntimeSession | null = null;
  let idleState: CaptureState = {
    sessionId: "none",
    sequence: 0,
    phase: "idle",
    settings: defaultSettings,
  };

  const engine: CaptureEngine = {
    analyze,
    async start(target, settings) {
      await analyze(target);
      const session = current;
      if (!session) {
        throw new Error("Capture session was not created");
      }
      update(session, {
        settings: mergeSettings(session.state.settings, settings),
      });
      await dispatch({ type: "start", sessionId: session.state.sessionId });
      return session.state.sessionId;
    },
    dispatch,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getState() {
      return current?.state ?? idleState;
    },
    clearCache() {
      options.bridge.clearCache();
    },
    async capture(input) {
      const sessionId = await engine.start(input, { images: "best-effort" });
      let session = getSession(sessionId);
      while (
        session.state.phase === "image-recovery" ||
        session.state.phase === "image-budget-review"
      ) {
        await dispatch({
          type: "continue-with-placeholders",
          sessionId,
        });
        session = getSession(sessionId);
      }
      if (session.state.phase === "font-recovery") {
        throw new CaptureError(
          "Font preflight failed; recovery required",
          session.diagnostics,
          "font-preflight-failed"
        );
      }
      if (session.state.phase === "failed" || !session.state.prepared) {
        throw new CaptureError(
          session.state.failure?.message ?? "Capture failed",
          session.diagnostics,
          session.state.failure?.code ?? "conversion-failed"
        );
      }
      return session.state.prepared;
    },
  };

  return engine;

  async function analyze(target: CaptureInput): Promise<CaptureAnalysis> {
    if (current && !isTerminal(current.state.phase)) {
      current.controller.abort();
      await current.runPromise;
    }
    const session = createSession(mergeSettings(defaultSettings));
    current = session;
    update(session, { phase: "analyzing", decision: undefined });
    try {
      const inventory = analyzeCaptureTarget(target, {
        domTraversal,
        isExcluded: options.isExcluded,
      });
      session.inventory = inventory;
      session.diagnostics = createDiagnostics(
        session.state.settings,
        inventory
      );
      update(session, {
        phase: "review",
        analysis: inventory.analysis,
        imageStage: session.diagnostics.images,
        decision: "review",
      });
      return inventory.analysis;
    } catch (error) {
      fail(
        session,
        "target-lost",
        safeMessage(error, "Unable to analyze target")
      );
      throw new CaptureError(
        session.state.failure?.message ?? "Unable to analyze target",
        session.diagnostics,
        "target-lost"
      );
    }
  }

  async function dispatch(command: CaptureCommand): Promise<void> {
    if (command.type === "analyze") {
      const currentSessionId = current?.state.sessionId ?? "none";
      if (
        command.sessionId !== "none" &&
        command.sessionId !== currentSessionId
      ) {
        throw new Error("Capture session is stale");
      }
      await analyze(command.target);
      const session = current;
      if (!session) {
        throw new Error("Capture session was not created");
      }
      if (command.settings) {
        update(session, {
          settings: mergeSettings(session.state.settings, command.settings),
        });
      }
      return;
    }
    const session = getSession(command.sessionId);
    switch (command.type) {
      case "start":
        requirePhase(session, ["review"]);
        await run(session, () => executeStart(session));
        return;
      case "retry-failed-images":
        requirePhase(session, ["image-recovery"]);
        await run(session, () => retryImages(session));
        return;
      case "continue-with-placeholders":
        requirePhase(session, ["image-recovery", "image-budget-review"]);
        await run(session, () => continueWithImagePlaceholders(session));
        return;
      case "continue-after-soft-budget":
        requirePhase(session, ["image-budget-review"]);
        await run(session, () => continueAfterSoftBudget(session));
        return;
      case "retry-fonts":
        requirePhase(session, ["font-recovery"]);
        await run(session, () => continueAfterImages(session));
        return;
      case "switch-to-compatible":
        requirePhase(session, ["font-recovery"]);
        update(session, {
          settings: { ...session.state.settings, fontMode: "compatible" },
        });
        await run(session, () => continueAfterImages(session));
        return;
      case "cancel":
        if (isTerminal(session.state.phase)) {
          return;
        }
        update(session, { phase: "canceling", decision: "cancel" });
        session.controller.abort();
        if (session.runPromise) {
          await session.runPromise;
        }
        if (!isTerminal(session.state.phase)) {
          update(session, { phase: "canceled", decision: undefined });
        }
        return;
      default:
        throw new Error(
          `Unknown capture command: ${String(command satisfies never)}`
        );
    }
  }

  async function executeStart(session: RuntimeSession): Promise<void> {
    const inventory = session.inventory;
    if (!inventory) {
      fail(session, "target-lost", "Capture target has not been analyzed");
      return;
    }
    update(session, { phase: "revalidating", decision: undefined });
    const revalidation = revalidateCapturePlan(inventory, {
      domTraversal,
      isExcluded: options.isExcluded,
    });
    if (revalidation.status === "target-lost") {
      fail(session, "target-lost", "Capture target is no longer connected");
      return;
    }
    session.inventory = revalidation.inventory;
    if (revalidation.status === "resource-set-changed") {
      update(session, {
        phase: "review",
        analysis: revalidation.inventory.analysis,
        decision: "review",
      });
      return;
    }
    session.diagnostics = createDiagnostics(
      session.state.settings,
      revalidation.inventory
    );
    update(session, {
      analysis: revalidation.inventory.analysis,
      imageStage: session.diagnostics.images,
    });
    await runImageStage(session, revalidation.inventory, false);
  }

  async function retryImages(session: RuntimeSession): Promise<void> {
    const inventory = requireInventory(session);
    const failedIds = [...session.imageDiagnostics.entries()]
      .filter(([, diagnostic]) => diagnostic.status === "failed")
      .map(([resourceId]) => resourceId);
    const resources = inventory.resources.filter((resource) =>
      failedIds.includes(resource.resourceId)
    );
    await runImageStage(session, inventory, false, resources);
  }

  async function continueWithImagePlaceholders(
    session: RuntimeSession
  ): Promise<void> {
    const inventory = requireInventory(session);
    const failed = [...session.imageDiagnostics.entries()].filter(
      ([, diagnostic]) => diagnostic.status === "failed"
    );
    for (const [resourceId, diagnostic] of failed) {
      const resource = inventory.resources.find(
        (candidate) => candidate.resourceId === resourceId
      );
      if (!resource) {
        continue;
      }
      options.bridge.imagePreparation.setPlaceholder(
        { src: resource.src, element: resource.elements[0] },
        diagnostic.errorCode === "image-memory-limit"
          ? "budget-skipped"
          : "load-failed"
      );
      session.imageDiagnostics.set(resourceId, {
        resourceId,
        status: "placeholder",
        reason:
          diagnostic.errorCode === "image-memory-limit"
            ? "budget-skipped"
            : "load-failed",
        errorCode: diagnostic.errorCode,
      });
    }
    updateImageState(session);
    await continueAfterImages(session);
  }

  async function continueAfterSoftBudget(
    session: RuntimeSession
  ): Promise<void> {
    const inventory = requireInventory(session);
    const remaining = inventory.resources.filter((resource) => {
      const diagnostic = session.imageDiagnostics.get(resource.resourceId);
      return diagnostic?.status === "failed";
    });
    await runImageStage(session, inventory, true, remaining);
  }

  async function runImageStage(
    session: RuntimeSession,
    inventory: CaptureInventory,
    allowSoftContinue: boolean,
    selectedResources = inventory.resources
  ): Promise<void> {
    if (session.controller.signal.aborted) {
      update(session, { phase: "canceled", decision: undefined });
      return;
    }
    update(session, { phase: "preparing-images", decision: undefined });
    if (session.state.settings.images === "skip") {
      for (const resource of selectedResources) {
        options.bridge.imagePreparation.setPlaceholder(
          { src: resource.src, element: resource.elements[0] },
          "user-skipped"
        );
        session.imageDiagnostics.set(resource.resourceId, {
          resourceId: resource.resourceId,
          status: "placeholder",
          reason: "user-skipped",
        });
      }
      updateImageState(session);
      await continueAfterImages(session);
      return;
    }
    if (selectedResources.length === 0) {
      updateImageState(session);
      await continueAfterImages(session);
      return;
    }
    const scheduler = createImageScheduler({
      imagePreparation: options.bridge.imagePreparation,
      concurrency: IMAGE_STAGE_CONCURRENCY,
      itemTimeoutMs: IMAGE_ITEM_TIMEOUT_MS,
      stageTimeoutMs: IMAGE_STAGE_TIMEOUT_MS,
      softLimitBytes: IMAGE_SOFT_LIMIT_BYTES,
      hardLimitBytes: IMAGE_HARD_LIMIT_BYTES,
      initialPreparedBytes: session.preparedBytes,
      signal: session.controller.signal,
      onProgress(progress) {
        update(session, {
          phase: "preparing-images",
          progress: aggregateProgress(session, progress, selectedResources),
        });
      },
    });
    const result = await scheduler.run({
      resources: selectedResources.map((resource) => ({
        resourceId: resource.resourceId,
        src: resource.src,
        element: resource.elements[0] as HTMLImageElement,
      })),
      allowSoftContinue,
    });
    for (const diagnostic of result.resources) {
      session.imageDiagnostics.set(diagnostic.resourceId, diagnostic);
    }
    session.preparedBytes = result.progress.preparedBytes;
    session.softBudgetReached =
      session.softBudgetReached || result.softBudgetReached;
    session.hardBudgetReached =
      session.hardBudgetReached || result.hardBudgetReached;
    updateImageState(session);
    if (result.status === "canceled") {
      update(session, { phase: "canceled", decision: undefined });
      return;
    }
    if (result.status === "hard-budget" || result.status === "soft-budget") {
      update(session, {
        phase: "image-budget-review",
        decision:
          result.status === "hard-budget"
            ? "placeholders-after-hard-budget"
            : "continue-after-soft-budget",
      });
      return;
    }
    if (result.status === "failed") {
      update(session, {
        phase: "image-recovery",
        decision: "retry-failed-images",
      });
      return;
    }
    await continueAfterImages(session);
  }

  async function continueAfterImages(session: RuntimeSession): Promise<void> {
    const inventory = requireInventory(session);
    if (session.controller.signal.aborted) {
      update(session, { phase: "canceled", decision: undefined });
      return;
    }
    update(session, {
      phase: "preparing-fonts",
      decision: undefined,
      fontProgress: undefined,
    });
    const root = inventory.analysis.plan.target.root;
    const requests = options.fontResolver.collectRequests(root, domTraversal);
    const fontProgress: FontStageProgress = {
      completed: 0,
      total: requests.length,
      failed: 0,
    };
    update(session, { fontProgress });
    try {
      options.fontResolver.beginCapture(root.ownerDocument);
      const result = await options.fontResolver.preflight(
        requests,
        session.state.settings.fontMode,
        session.controller.signal
      );
      const failures = result.failures;
      update(session, {
        fontProgress: {
          completed: requests.length,
          total: requests.length,
          failed: failures.filter((failure) => failure.status === "failed")
            .length,
        },
        fontDiagnostics: options.fontResolver.getDiagnostics(),
      });
      session.diagnostics.fonts = options.fontResolver.getDiagnostics();
      if (failures.some((failure) => failure.status === "failed")) {
        update(session, {
          phase: "font-recovery",
          decision: "retry-fonts",
          failure: {
            code: "font-preflight-failed",
            message: "Font preparation failed before conversion",
          },
        });
        return;
      }
    } catch (error) {
      if (session.controller.signal.aborted) {
        update(session, { phase: "canceled", decision: undefined });
        return;
      }
      update(session, {
        phase: "font-recovery",
        decision: "retry-fonts",
        fontDiagnostics: options.fontResolver.getDiagnostics(),
        failure: {
          code: "font-preflight-failed",
          message:
            error instanceof FontPreflightError
              ? "Font matching is not exact"
              : "Font preparation failed before conversion",
        },
      });
      session.diagnostics.fonts = options.fontResolver.getDiagnostics();
      return;
    }

    await settleAndConvert(session, inventory);
  }

  async function settleAndConvert(
    session: RuntimeSession,
    inventory: CaptureInventory
  ): Promise<void> {
    const root = inventory.analysis.plan.target.root;
    const cleanup = new CleanupStack();
    let result: PreparedCapture | undefined;
    let primaryError: unknown;
    try {
      const motionSnapshot = freezeCaptureMotion(
        root,
        session.state.settings.motion
      );
      session.diagnostics.motion = motionSnapshot.diagnostics;
      cleanup.push(() => motionSnapshot.restore());
      update(session, {
        phase: "settling",
        decision: undefined,
      });
      session.diagnostics.settle = await waitForPageToSettle(root, {
        timeoutMs: session.state.settings.settleTimeoutMs,
        domTraversal,
        waitForImages: false,
        signal: session.controller.signal,
      });
      if (session.controller.signal.aborted) {
        update(session, { phase: "canceled", decision: undefined });
        return;
      }
      const lineBreakPreparation = prepareCjkLineBreaks(
        root,
        session.state.settings.lineBreaks,
        domTraversal
      );
      session.diagnostics.lineBreaks = lineBreakPreparation.diagnostics;
      cleanup.push(() => lineBreakPreparation.restore());
      update(session, { phase: "converting", decision: undefined });
      const bridgeResult = await options.bridge.convert(
        toBridgeInput(inventory.analysis.plan.target.input, root),
        session.controller.signal,
        { backgroundSources: inventory.backgroundSources }
      );
      session.diagnostics.backgrounds = collectBackgroundDiagnostics(
        inventory,
        options.bridge,
        session.imageDiagnostics
      );
      result = {
        clipboardHtml: bridgeResult.clipboardHtml,
        settings: session.state.settings,
        diagnostics: session.diagnostics,
      };
    } catch (error) {
      if (session.controller.signal.aborted) {
        update(session, { phase: "canceled", decision: undefined });
        return;
      }
      primaryError = error;
    } finally {
      session.diagnostics.cleanupFailures = cleanup.run();
      session.diagnostics.fonts = options.fontResolver.getDiagnostics();
    }
    if (primaryError || session.diagnostics.cleanupFailures.length > 0) {
      fail(
        session,
        "conversion-failed",
        primaryError
          ? safeMessage(primaryError, "DOM conversion failed")
          : "Capture cleanup failed"
      );
      return;
    }
    if (!result) {
      fail(session, "conversion-failed", "Capture did not produce a result");
      return;
    }
    session.diagnostics.images = buildImageDiagnostics(session);
    result = { ...result, diagnostics: session.diagnostics };
    update(session, {
      phase: "completed",
      prepared: result,
      imageStage: session.diagnostics.images,
      fontDiagnostics: session.diagnostics.fonts,
      decision: undefined,
      failure: undefined,
    });
  }

  async function run(
    session: RuntimeSession,
    task: () => Promise<void>
  ): Promise<void> {
    if (session.runPromise) {
      await session.runPromise;
      return;
    }
    const promise = task().catch((error: unknown) => {
      if (session.controller.signal.aborted) {
        update(session, { phase: "canceled", decision: undefined });
        return;
      }
      fail(session, "conversion-failed", safeMessage(error, "Capture failed"));
    });
    session.runPromise = promise;
    try {
      await promise;
    } finally {
      if (session.runPromise === promise) {
        session.runPromise = undefined;
      }
      if (
        session.state.phase === "failed" ||
        session.state.phase === "canceled"
      ) {
        options.bridge.clearCache();
      }
    }
  }

  function createSession(settings: CaptureSettings): RuntimeSession {
    const sessionId = `capture-${Date.now().toString(SESSION_ID_RADIX)}-${(++sessionCounter).toString(SESSION_ID_RADIX)}`;
    const diagnostics = createEmptyDiagnostics(settings);
    return {
      state: {
        sessionId,
        sequence: 0,
        phase: "idle",
        settings,
      },
      controller: new AbortController(),
      imageDiagnostics: new Map(),
      preparedBytes: 0,
      diagnostics,
      softBudgetReached: false,
      hardBudgetReached: false,
    };
  }

  function getSession(sessionId: string): RuntimeSession {
    const session = current;
    if (!session || session.state.sessionId !== sessionId) {
      throw new Error("Capture session is stale");
    }
    return session;
  }

  function requireInventory(session: RuntimeSession): CaptureInventory {
    if (!session.inventory) {
      throw new Error("Capture plan is not available");
    }
    return session.inventory;
  }

  function requirePhase(
    session: RuntimeSession,
    phases: ReadonlyArray<CapturePhase>
  ): void {
    if (!phases.includes(session.state.phase)) {
      const failure = {
        code: "invalid-command" as const,
        message: `Command is not valid during ${session.state.phase}`,
      };
      update(session, { failure });
      throw new CaptureError(
        failure.message,
        session.diagnostics,
        failure.code
      );
    }
  }

  function update(session: RuntimeSession, patch: Partial<CaptureState>): void {
    if (current !== session) {
      return;
    }
    session.state = {
      ...session.state,
      ...patch,
      sequence: session.state.sequence + 1,
    };
    idleState = session.state;
    const event: CaptureEvent = { type: "state", state: session.state };
    for (const listener of listeners) {
      listener(event);
    }
  }

  function updateImageState(session: RuntimeSession): void {
    const imageStage = buildImageDiagnostics(session);
    session.diagnostics.images = imageStage;
    update(session, {
      imageStage,
      progress: imageStage.progress,
    });
  }

  function fail(
    session: RuntimeSession,
    code: CaptureFailure["code"],
    message: string
  ): void {
    const failure = { code, message } satisfies CaptureFailure;
    update(session, { phase: "failed", failure, decision: undefined });
  }

  function aggregateProgress(
    session: RuntimeSession,
    progress: ImageStageProgress,
    selected: ReadonlyArray<{ resourceId: string }>
  ): ImageStageProgress {
    const retained = [...session.imageDiagnostics.values()].filter(
      (entry) =>
        !selected.some((resource) => resource.resourceId === entry.resourceId)
    );
    return {
      completed: retained.length + progress.completed,
      total: session.inventory?.resources.length ?? progress.total,
      failed:
        retained.filter((entry) => entry.status === "failed").length +
        progress.failed,
      elapsedMs: progress.elapsedMs,
      preparedBytes: progress.preparedBytes,
    };
  }
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
        failures.push(safeMessage(error, "cleanup failed"));
      }
    }
    return failures;
  }
}

function createEmptyDiagnostics(
  settings: CaptureSettings,
  inventory?: CaptureInventory
): CaptureDiagnostics {
  return {
    settle: {
      timeoutMs: settings.settleTimeoutMs,
      timedOut: false,
      phase: "skipped",
      pendingFonts: false,
      pendingImages: 0,
      waitedForImages: 0,
      frameCount: 0,
      errors: [],
    },
    motion: {
      mode: settings.motion,
      paused: 0,
      restored: 0,
      restoreFailures: [],
    },
    lineBreaks: {
      mode: settings.lineBreaks,
      measuredNodes: 0,
      changedNodes: 0,
      insertedBreaks: 0,
      skippedNodes: 0,
      measurementFailures: [],
    },
    fonts: [],
    images: {
      progress: {
        completed: 0,
        total: inventory?.resources.length ?? 0,
        failed: 0,
        elapsedMs: 0,
        preparedBytes: 0,
      },
      resources: [],
      softBudgetReached: false,
      hardBudgetReached: false,
    },
    backgrounds: [],
    cleanupFailures: [],
  };
}

function createDiagnostics(
  settings: CaptureSettings,
  inventory: CaptureInventory
): CaptureDiagnostics {
  return createEmptyDiagnostics(settings, inventory);
}

function buildImageDiagnostics(session: RuntimeSession): ImageStageDiagnostics {
  const resources = [...session.imageDiagnostics.values()];
  return {
    progress: {
      completed: resources.length,
      total: session.inventory?.resources.length ?? resources.length,
      failed: resources.filter((entry) => entry.status === "failed").length,
      elapsedMs: session.state.progress?.elapsedMs ?? 0,
      preparedBytes: session.preparedBytes,
    },
    resources,
    softBudgetReached:
      session.softBudgetReached ||
      resources.some((entry) => entry.errorCode === "image-memory-limit"),
    hardBudgetReached: session.hardBudgetReached,
  };
}

function collectBackgroundDiagnostics(
  inventory: CaptureInventory,
  bridge: CaptureEngineOptions["bridge"],
  imageDiagnostics: ReadonlyMap<string, ImageResourceDiagnostic>
): ReadonlyArray<BackgroundDiagnostic> {
  const resourceBySource = new Map(
    inventory.resources.map((resource) => [resource.src, resource.resourceId])
  );
  const blockedSources = new Set(
    inventory.resources
      .filter((resource) => {
        const status = imageDiagnostics.get(resource.resourceId)?.status;
        return status === "placeholder" || status === "failed";
      })
      .map((resource) => resource.src)
  );
  const native = (bridge.getBackgroundDiagnostics?.() ?? [])
    .filter(
      (diagnostic) =>
        !(diagnostic.source && blockedSources.has(diagnostic.source))
    )
    .map(({ source, ...diagnostic }) => ({
      ...diagnostic,
      reason: redactResourceMessage(diagnostic.reason),
      ...(source && { resourceId: resourceBySource.get(source) }),
    }));
  const blocked = inventory.resources.flatMap((resource) => {
    const status = imageDiagnostics.get(resource.resourceId);
    if (status?.status !== "placeholder" && status?.status !== "failed") {
      return [];
    }
    return resource.usages
      .filter((usage) => usage.kind === "background-image")
      .map((usage) => ({
        mode:
          status.status === "placeholder"
            ? ("placeholder" as const)
            : ("failed" as const),
        reason: status.reason ?? status.errorCode ?? "resource unavailable",
        resourceId: resource.resourceId,
        layerIndex: usage.layerIndex,
      }));
  });
  if (bridge.supportsBackgroundImages !== false) {
    return [...native, ...blocked];
  }
  const unsupported = inventory.resources.flatMap((resource) =>
    blockedSources.has(resource.src)
      ? []
      : resource.usages
          .filter((usage) => usage.kind === "background-image")
          .map((usage) => ({
            mode: "unsupported" as const,
            reason: "installed core lacks CSS background image capability",
            resourceId: resource.resourceId,
            layerIndex: usage.layerIndex,
          }))
  );
  return [...native, ...blocked, ...unsupported];
}

function redactResourceMessage(message: string): string {
  return message
    .replace(/https?:\/\/[^\s)]+/gi, "[resource]")
    .replace(/(?:data|blob):[^\s)]+/gi, "[resource]");
}

function mergeSettings(
  base: CaptureSettings,
  override?: Partial<CaptureSettings>
): CaptureSettings {
  const settleTimeoutMs = override?.settleTimeoutMs ?? base.settleTimeoutMs;
  return {
    ...base,
    ...override,
    settleTimeoutMs: Math.max(
      0,
      Math.min(MAX_SETTLE_TIMEOUT_MS, settleTimeoutMs)
    ),
  };
}

function toBridgeInput(input: CaptureInput, root: Element): BridgeCaptureInput {
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
    return {
      width: Math.max(
        Math.ceil(rect.width),
        document.body?.scrollWidth ?? 0,
        document.documentElement?.scrollWidth ?? 0
      ),
      height: Math.max(
        Math.ceil(rect.height),
        document.body?.scrollHeight ?? 0,
        document.documentElement?.scrollHeight ?? 0,
        1
      ),
    };
  }
  return {
    width: Math.max(0, Math.round(rect.width)),
    height: Math.max(0, Math.round(rect.height)),
  };
}

function safeMessage(error: unknown, fallback: string): string {
  if (error instanceof FontPreflightError) {
    return "Font preparation failed";
  }
  if (error instanceof Error && error.message) {
    return error.message.replace(/https?:\/\/[^\s)]+/gi, "[resource]");
  }
  return fallback;
}

function isTerminal(phase: CapturePhase): boolean {
  return phase === "completed" || phase === "failed" || phase === "canceled";
}
