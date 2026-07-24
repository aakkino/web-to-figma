import { describe, expect, it } from "vitest";
import type { ImageSchedulerResource } from "./image-scheduler";
import {
  createImageScheduler,
  IMAGE_STAGE_CONCURRENCY,
} from "./image-scheduler";
import type { ImagePreparationPort } from "./types";

const THREE_RESOURCES = 3;
const TEN_RESOURCES = 10;
const SOFT_TEST_LIMIT_BYTES = 10;
const HARD_TEST_LIMIT_BYTES = 100;
const PREPARED_BYTES_PER_SOFT_IMAGE = 6;
const PREPARED_BYTES_PER_HARD_IMAGE = 70;
const PREPARED_BYTES_PER_CONCURRENCY_IMAGE = 10;
const EXPECTED_SOFT_BYTES = 12;
const ABORT_WAIT_MS = 5;
const PREPARATION_DELAY_MS = 2;
const ITEM_TIMEOUT_MS = 5;
const STAGE_TIMEOUT_MS = 100;
const CANCEL_STAGE_TIMEOUT_MS = 1000;
const ONE_RESOURCE = 1;

function resources(count: number): Array<ImageSchedulerResource> {
  return Array.from({ length: count }, (_, index) => ({
    resourceId: `image-${index}`,
    src: `https://example.test/${index}.png`,
    element: {} as HTMLImageElement,
  }));
}

describe("image scheduler", () => {
  it("never exceeds four concurrent preparations", async () => {
    let active = 0;
    let maximum = 0;
    const preparation: ImagePreparationPort = {
      async prepare() {
        active += 1;
        maximum = Math.max(maximum, active);
        await new Promise((resolve) =>
          setTimeout(resolve, PREPARATION_DELAY_MS)
        );
        active -= 1;
        return {
          status: "prepared",
          byteLength: PREPARED_BYTES_PER_CONCURRENCY_IMAGE,
        };
      },
      setPlaceholder() {
        // no-op
      },
      clear() {
        // no-op
      },
    };
    const scheduler = createImageScheduler({ imagePreparation: preparation });

    const result = await scheduler.run({ resources: resources(TEN_RESOURCES) });

    expect(maximum).toBeLessThanOrEqual(IMAGE_STAGE_CONCURRENCY);
    expect(result.status).toBe("completed");
    expect(result.progress.completed).toBe(10);
  });

  it("pauses at the soft byte budget without assigning more work", async () => {
    let calls = 0;
    const preparation: ImagePreparationPort = {
      prepare() {
        calls += 1;
        return Promise.resolve({
          status: "prepared" as const,
          byteLength: PREPARED_BYTES_PER_SOFT_IMAGE,
        });
      },
      setPlaceholder() {
        // no-op
      },
      clear() {
        // no-op
      },
    };
    const scheduler = createImageScheduler({
      imagePreparation: preparation,
      concurrency: 1,
      softLimitBytes: SOFT_TEST_LIMIT_BYTES,
      hardLimitBytes: HARD_TEST_LIMIT_BYTES,
    });

    const result = await scheduler.run({
      resources: resources(THREE_RESOURCES),
    });

    expect(calls).toBe(2);
    expect(result.status).toBe("soft-budget");
    expect(result.progress.preparedBytes).toBe(EXPECTED_SOFT_BYTES);
    expect(
      result.resources.filter((entry) => entry.status === "failed")
    ).toHaveLength(1);
  });

  it("aborts active work and suppresses queued work", async () => {
    const session = new AbortController();
    let calls = 0;
    const preparation: ImagePreparationPort = {
      prepare(_request, signal) {
        calls += 1;
        return new Promise<never>((_, reject) => {
          signal?.addEventListener(
            "abort",
            () => reject(new Error("aborted")),
            { once: true }
          );
        });
      },
      setPlaceholder() {
        // no-op
      },
      clear() {
        // no-op
      },
    };
    const scheduler = createImageScheduler({
      imagePreparation: preparation,
      signal: session.signal,
      stageTimeoutMs: CANCEL_STAGE_TIMEOUT_MS,
    });
    const running = scheduler.run({ resources: resources(TEN_RESOURCES) });
    await new Promise((resolve) => setTimeout(resolve, ABORT_WAIT_MS));
    session.abort();

    const result = await running;
    expect(result.status).toBe("canceled");
    expect(calls).toBeLessThanOrEqual(IMAGE_STAGE_CONCURRENCY);
  });

  it("stops assigning resources at the hard byte budget", async () => {
    let calls = 0;
    const preparation: ImagePreparationPort = {
      prepare() {
        calls += 1;
        return Promise.resolve({
          status: "prepared" as const,
          byteLength: PREPARED_BYTES_PER_HARD_IMAGE,
        });
      },
      setPlaceholder() {
        // no-op
      },
      clear() {
        // no-op
      },
    };
    const scheduler = createImageScheduler({
      imagePreparation: preparation,
      concurrency: 1,
      softLimitBytes: SOFT_TEST_LIMIT_BYTES,
      hardLimitBytes: HARD_TEST_LIMIT_BYTES,
    });

    const result = await scheduler.run({
      resources: resources(THREE_RESOURCES),
      allowSoftContinue: true,
    });

    expect(calls).toBe(2);
    expect(result.status).toBe("hard-budget");
    expect(result.hardBudgetReached).toBe(true);
    expect(
      result.resources.filter((entry) => entry.status === "failed")
    ).toHaveLength(1);
  });

  it("reports a stable timeout for an item that ignores cancellation", async () => {
    const preparation: ImagePreparationPort = {
      prepare() {
        return new Promise<{ status: "prepared"; byteLength: number }>(() => {
          // Intentionally unresolved: the scheduler owns the item deadline.
        });
      },
      setPlaceholder() {
        // no-op
      },
      clear() {
        // no-op
      },
    };
    const scheduler = createImageScheduler({
      imagePreparation: preparation,
      concurrency: 1,
      itemTimeoutMs: ITEM_TIMEOUT_MS,
      stageTimeoutMs: STAGE_TIMEOUT_MS,
    });

    const result = await scheduler.run({ resources: resources(ONE_RESOURCE) });

    expect(result.status).toBe("failed");
    expect(result.resources[0]?.errorCode).toBe("image-timeout");
  });
});
