import type {
  ImagePreparationPort,
  ImageResourceDiagnostic,
  ImageStageProgress,
  ResourceErrorCode,
} from "./types";

export const IMAGE_STAGE_CONCURRENCY = 4;
export const IMAGE_ITEM_TIMEOUT_MS = 15_000;
export const IMAGE_STAGE_TIMEOUT_MS = 60_000;
const BYTES_PER_MEBIBYTE = 1_048_576;
const SOFT_LIMIT_MEBIBYTES = 64;
const HARD_LIMIT_MEBIBYTES = 128;
export const IMAGE_SOFT_LIMIT_BYTES = SOFT_LIMIT_MEBIBYTES * BYTES_PER_MEBIBYTE;
export const IMAGE_HARD_LIMIT_BYTES = HARD_LIMIT_MEBIBYTES * BYTES_PER_MEBIBYTE;

export type ImageSchedulerResource = {
  resourceId: string;
  src: string;
  element: HTMLImageElement;
};

export type ImageSchedulerOptions = {
  imagePreparation: ImagePreparationPort;
  concurrency?: number;
  itemTimeoutMs?: number;
  stageTimeoutMs?: number;
  softLimitBytes?: number;
  hardLimitBytes?: number;
  initialPreparedBytes?: number;
  signal?: AbortSignal;
  now?: () => number;
  onProgress?: (progress: ImageStageProgress) => void;
};

export type ImageSchedulerRunOptions = {
  resources: ReadonlyArray<ImageSchedulerResource>;
  allowSoftContinue?: boolean;
};

export type ImageSchedulerRunResult = {
  status: "completed" | "failed" | "soft-budget" | "hard-budget" | "canceled";
  progress: ImageStageProgress;
  resources: ReadonlyArray<ImageResourceDiagnostic>;
  softBudgetReached: boolean;
  hardBudgetReached: boolean;
};

type SchedulerFailure = {
  code: ResourceErrorCode;
  message: string;
};

type InternalOutcome =
  | { status: "prepared"; byteLength: number }
  | { status: "failed"; failure: SchedulerFailure };

export type ImageScheduler = {
  run(options: ImageSchedulerRunOptions): Promise<ImageSchedulerRunResult>;
};

export function createImageScheduler(
  options: ImageSchedulerOptions
): ImageScheduler {
  const concurrency = Math.max(
    1,
    Math.min(
      IMAGE_STAGE_CONCURRENCY,
      options.concurrency ?? IMAGE_STAGE_CONCURRENCY
    )
  );
  const itemTimeoutMs = options.itemTimeoutMs ?? IMAGE_ITEM_TIMEOUT_MS;
  const stageTimeoutMs = options.stageTimeoutMs ?? IMAGE_STAGE_TIMEOUT_MS;
  const softLimitBytes = options.softLimitBytes ?? IMAGE_SOFT_LIMIT_BYTES;
  const hardLimitBytes = options.hardLimitBytes ?? IMAGE_HARD_LIMIT_BYTES;
  const now = options.now ?? (() => Date.now());

  return { run };

  async function run({
    resources,
    allowSoftContinue = false,
  }: ImageSchedulerRunOptions): Promise<ImageSchedulerRunResult> {
    const startedAt = now();
    const outcomes = new Map<string, InternalOutcome>();
    const activeControllers = new Set<AbortController>();
    const stageController = new AbortController();
    let cursor = 0;
    let preparedBytes = options.initialPreparedBytes ?? 0;
    let softBudgetReached = false;
    let hardBudgetReached = false;
    let stageTimedOut = false;
    let canceled = false;
    let stageTimeoutId: ReturnType<typeof setTimeout> | undefined;

    if (preparedBytes >= hardLimitBytes && resources.length > 0) {
      hardBudgetReached = true;
    } else if (preparedBytes >= softLimitBytes && resources.length > 0) {
      softBudgetReached = true;
    }

    const removeParentAbort = linkAbortSignal(
      options.signal,
      stageController,
      () => {
        canceled = true;
      }
    );
    stageTimeoutId = setTimeout(() => {
      stageTimedOut = true;
      stageController.abort();
    }, stageTimeoutMs);

    try {
      if (options.signal?.aborted) {
        canceled = true;
      } else {
        await Promise.all(Array.from({ length: concurrency }, () => worker()));
      }
    } finally {
      if (stageTimeoutId !== undefined) {
        clearTimeout(stageTimeoutId);
      }
      removeParentAbort();
      stageController.abort();
      for (const controller of activeControllers) {
        controller.abort();
      }
    }

    if (stageTimedOut) {
      for (const resource of resources) {
        if (!outcomes.has(resource.resourceId)) {
          outcomes.set(resource.resourceId, {
            status: "failed",
            failure: {
              code: "image-timeout",
              message: "Image preparation stage timed out",
            },
          });
        }
      }
    } else if (softBudgetReached || hardBudgetReached) {
      for (const resource of resources) {
        if (!outcomes.has(resource.resourceId)) {
          outcomes.set(resource.resourceId, {
            status: "failed",
            failure: {
              code: "image-memory-limit",
              message: "Image preparation stopped at the memory budget",
            },
          });
        }
      }
    }

    const diagnostics = createDiagnostics(resources, outcomes);
    const progress = createProgress(
      resources,
      diagnostics,
      preparedBytes,
      now() - startedAt
    );
    const hasFailures = diagnostics.some((entry) => entry.status === "failed");
    let status: ImageSchedulerRunResult["status"] = "completed";
    if (canceled) {
      status = "canceled";
    } else if (hardBudgetReached) {
      status = "hard-budget";
    } else if (softBudgetReached && hasFailures) {
      status = "soft-budget";
    } else if (hasFailures) {
      status = "failed";
    }

    return {
      status,
      progress,
      resources: diagnostics,
      softBudgetReached,
      hardBudgetReached,
    };

    async function worker(): Promise<void> {
      while (true) {
        const resource = takeNext();
        if (!resource) {
          return;
        }
        const controller = new AbortController();
        activeControllers.add(controller);
        const removeStageAbort = linkAbortSignal(
          stageController.signal,
          controller
        );
        try {
          const result = await prepareWithDeadline(resource, controller);
          if (stageController.signal.aborted) {
            if (canceled || options.signal?.aborted) {
              canceled = true;
            } else if (stageTimedOut) {
              outcomes.set(resource.resourceId, {
                status: "failed",
                failure: {
                  code: "image-timeout",
                  message: "Image preparation timed out",
                },
              });
            } else if (hardBudgetReached) {
              outcomes.set(resource.resourceId, {
                status: "failed",
                failure: {
                  code: "image-memory-limit",
                  message: "Image preparation stopped at the hard memory limit",
                },
              });
            } else {
              canceled = true;
            }
          } else {
            outcomes.set(resource.resourceId, result);
            if (result.status === "prepared") {
              preparedBytes += result.byteLength;
              if (preparedBytes >= hardLimitBytes) {
                hardBudgetReached = true;
                stageController.abort();
              } else if (
                preparedBytes >= softLimitBytes &&
                cursor < resources.length
              ) {
                softBudgetReached = true;
              }
            }
          }
        } catch (error) {
          if (canceled || options.signal?.aborted) {
            canceled = true;
          } else if (stageTimedOut) {
            outcomes.set(resource.resourceId, {
              status: "failed",
              failure: {
                code: "image-timeout",
                message: "Image preparation timed out",
              },
            });
          } else if (hardBudgetReached) {
            outcomes.set(resource.resourceId, {
              status: "failed",
              failure: {
                code: "image-memory-limit",
                message: "Image preparation stopped at the hard memory limit",
              },
            });
          } else {
            outcomes.set(resource.resourceId, {
              status: "failed",
              failure: toSchedulerFailure(error, controller.signal),
            });
          }
        } finally {
          emitProgress();
          removeStageAbort();
          activeControllers.delete(controller);
        }
      }
    }

    function takeNext(): ImageSchedulerResource | undefined {
      if (
        stageController.signal.aborted ||
        canceled ||
        hardBudgetReached ||
        (softBudgetReached && !allowSoftContinue)
      ) {
        return;
      }
      const resource = resources[cursor];
      cursor += 1;
      return resource;
    }

    function emitProgress(): void {
      try {
        options.onProgress?.(
          createProgress(
            resources,
            createDiagnostics(resources, outcomes),
            preparedBytes,
            now() - startedAt
          )
        );
      } catch {
        // Progress listeners are observers and cannot change resource results.
      }
    }

    async function prepareWithDeadline(
      resource: ImageSchedulerResource,
      controller: AbortController
    ): Promise<InternalOutcome> {
      let itemTimeoutId: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_resolve, reject) => {
        itemTimeoutId = setTimeout(() => {
          controller.abort();
          reject({
            code: "image-timeout",
            message: "Image preparation timed out",
          } satisfies SchedulerFailure);
        }, itemTimeoutMs);
      });
      try {
        const result = await Promise.race([
          options.imagePreparation.prepare(
            { src: resource.src, element: resource.element },
            controller.signal
          ),
          timeout,
        ]);
        return { status: "prepared", byteLength: result.byteLength };
      } finally {
        if (itemTimeoutId !== undefined) {
          clearTimeout(itemTimeoutId);
        }
      }
    }
  }
}

function createDiagnostics(
  resources: ReadonlyArray<ImageSchedulerResource>,
  outcomes: ReadonlyMap<string, InternalOutcome>
): Array<ImageResourceDiagnostic> {
  return resources.map((resource) => {
    const outcome = outcomes.get(resource.resourceId);
    if (outcome?.status === "prepared") {
      return {
        resourceId: resource.resourceId,
        status: "prepared" as const,
        byteLength: outcome.byteLength,
      };
    }
    const failure =
      outcome?.status === "failed"
        ? outcome.failure
        : {
            code: "image-aborted" as const,
            message: "Image preparation was canceled",
          };
    return {
      resourceId: resource.resourceId,
      status: "failed" as const,
      errorCode: failure.code,
    };
  });
}

function createProgress(
  resources: ReadonlyArray<ImageSchedulerResource>,
  diagnostics: ReadonlyArray<ImageResourceDiagnostic>,
  preparedBytes: number,
  elapsedMs: number
): ImageStageProgress {
  return {
    completed: diagnostics.length,
    total: resources.length,
    failed: diagnostics.filter((entry) => entry.status === "failed").length,
    elapsedMs,
    preparedBytes,
  };
}

function toSchedulerFailure(
  error: unknown,
  signal: AbortSignal
): SchedulerFailure {
  if (isSchedulerFailure(error)) {
    return error;
  }
  if (signal.aborted || isAbortError(error)) {
    return {
      code: "image-aborted",
      message: "Image preparation was aborted",
    };
  }
  const message = error instanceof Error ? error.message : String(error);
  return {
    code: message.toLowerCase().includes("process")
      ? "image-process-failed"
      : "image-fetch-failed",
    message,
  };
}

function isSchedulerFailure(value: unknown): value is SchedulerFailure {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    typeof (value as { code?: unknown }).code === "string"
  );
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error && error.message.toLowerCase().includes("abort")
  );
}

function linkAbortSignal(
  source: AbortSignal | undefined,
  target: AbortController,
  onAbort?: () => void
): () => void {
  if (!source) {
    return () => undefined;
  }
  const abort = () => {
    onAbort?.();
    target.abort();
  };
  if (source.aborted) {
    abort();
    return () => undefined;
  }
  source.addEventListener("abort", abort, { once: true });
  return () => source.removeEventListener("abort", abort);
}
