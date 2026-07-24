import { describe, expect, it } from "vitest";

import { createCaptureEngine } from "./capture-engine";
import type {
  BridgeCaptureInput,
  CaptureEvent,
  ConversionBridge,
  FontResolver,
  ImagePreparationPort,
} from "./types";

const CAPTURE_WAIT_TIMEOUT_MS = 1000;

type BridgeHarness = {
  bridge: ConversionBridge;
  prepareCalls: Array<string>;
  placeholders: Array<{ src: string; reason: string; element?: Element }>;
  convertCalls: number;
  phases: Array<CaptureEvent["state"]["phase"]>;
};

function createHarness(
  options: { failFirstSource?: string; pendingImages?: boolean } = {}
): BridgeHarness {
  const prepareCalls: Array<string> = [];
  const placeholders: BridgeHarness["placeholders"] = [];
  let convertCalls = 0;
  const imagePreparation: ImagePreparationPort = {
    prepare(request, signal) {
      prepareCalls.push(request.src);
      if (options.pendingImages) {
        return new Promise<{ status: "prepared"; byteLength: number }>(
          (_, reject) => {
            signal?.addEventListener(
              "abort",
              () => reject(new Error("image request aborted")),
              { once: true }
            );
          }
        );
      }
      if (
        options.failFirstSource === request.src &&
        prepareCalls.filter((src) => src === request.src).length === 1
      ) {
        return Promise.reject(new Error("temporary image failure"));
      }
      return Promise.resolve({ status: "prepared", byteLength: 12 });
    },
    setPlaceholder(request, reason) {
      placeholders.push({
        src: request.src,
        reason,
        element: request.element,
      });
    },
    clear() {
      // no-op test capability
    },
  };

  const bridge: ConversionBridge = {
    imagePreparation,
    fontLoader: async () => ({ bytes: new ArrayBuffer(0) }),
    convert(_input: BridgeCaptureInput) {
      convertCalls += 1;
      return Promise.resolve({ clipboardHtml: "<figma>capture</figma>" });
    },
    clearCache() {
      // no-op test bridge
    },
  };
  const phases: BridgeHarness["phases"] = [];
  return {
    bridge,
    prepareCalls,
    placeholders,
    get convertCalls() {
      return convertCalls;
    },
    phases,
  };
}

function createEngine(
  harness: BridgeHarness,
  options: { fontMode?: "compatible" | "strict" } = {}
) {
  const engine = createCaptureEngine({
    bridge: harness.bridge,
    fontResolver: createHarnessFontResolver(harness, options.fontMode),
    settings: {
      settleTimeoutMs: 0,
      motion: "live",
      lineBreaks: "off",
      fontMode: options.fontMode ?? "compatible",
    },
  });
  engine.subscribe((event) => harness.phases.push(event.state.phase));
  return engine;
}

function createHarnessFontResolver(
  _harness: BridgeHarness,
  _mode: "compatible" | "strict" | undefined
): FontResolver {
  return {
    loader: async () => ({ bytes: new ArrayBuffer(0) }),
    beginCapture() {
      // no-op test resolver
    },
    collectRequests: () => [],
    preflight: async (requests) => ({ requests, failures: [] }),
    getDiagnostics: () => [],
  };
}

function createTarget(html: string): HTMLElement {
  document.body.innerHTML = html;
  const target = document.body.firstElementChild;
  if (!(target instanceof HTMLElement)) {
    throw new Error("target not found");
  }
  return target;
}

function inputFor(target: Element) {
  return { element: target, width: 240, height: 120 };
}

describe("capture engine", () => {
  it("prepares unique images before fonts and retries only failed resources", async () => {
    const target = createTarget(
      '<div><img src="https://example.test/good.png"><img src="https://example.test/good.png"><img src="https://example.test/retry.png"></div>'
    );
    const retrySource = new URL(
      "https://example.test/retry.png",
      document.baseURI
    ).toString();
    const harness = createHarness({ failFirstSource: retrySource });
    const engine = createCaptureEngine({
      bridge: harness.bridge,
      fontResolver: {
        loader: async () => ({ bytes: new ArrayBuffer(0) }),
        beginCapture() {
          // no-op test resolver
        },
        collectRequests: () => [],
        preflight: async (requests) => ({ requests, failures: [] }),
        getDiagnostics: () => [],
      },
      settings: { settleTimeoutMs: 0, motion: "live", lineBreaks: "off" },
    });
    const phases: Array<string> = [];
    engine.subscribe((event) => phases.push(event.state.phase));

    const sessionId = await engine.start(inputFor(target));

    expect(engine.getState().phase).toBe("image-recovery");
    expect(new Set(harness.prepareCalls).size).toBe(2);
    expect(
      harness.prepareCalls.filter((source) => source === retrySource)
    ).toHaveLength(1);
    expect(phases).not.toContain("converting");

    await engine.dispatch({ type: "retry-failed-images", sessionId });

    expect(engine.getState().phase).toBe("completed");
    expect(
      harness.prepareCalls.filter((source) => source === retrySource)
    ).toHaveLength(2);
    expect(phases.indexOf("preparing-images")).toBeLessThan(
      phases.indexOf("preparing-fonts")
    );
  });

  it("skips image preparation and emits user placeholders", async () => {
    const target = createTarget(
      '<div><img src="https://example.test/skip.png" width="40" height="30"></div>'
    );
    const harness = createHarness();
    const engine = createEngine(harness);

    await engine.start(inputFor(target), { images: "skip" });

    expect(harness.prepareCalls).toHaveLength(0);
    expect(harness.placeholders).toEqual([
      expect.objectContaining({
        reason: "user-skipped",
        element: target.querySelector("img"),
      }),
    ]);
    expect(engine.getState().phase).toBe("completed");
  });

  it("returns to review when the locked resource set changes before start", async () => {
    const target = createTarget(
      '<div><img src="https://example.test/one.png"></div>'
    );
    const harness = createHarness();
    const engine = createEngine(harness);
    await engine.analyze(inputFor(target));
    const sessionId = engine.getState().sessionId;
    target
      .querySelector("img")
      ?.setAttribute("src", "https://example.test/two.png");

    await engine.dispatch({ type: "start", sessionId });

    expect(engine.getState().phase).toBe("review");
    expect(engine.getState().decision).toBe("review");
    expect(harness.prepareCalls).toHaveLength(0);
  });

  it("cancels active image work and never enters conversion", async () => {
    const target = createTarget(
      '<div><img src="https://example.test/pending.png"></div>'
    );
    const harness = createHarness({ pendingImages: true });
    const engine = createEngine(harness);
    await engine.analyze(inputFor(target));
    const sessionId = engine.getState().sessionId;
    const starting = engine.dispatch({ type: "start", sessionId });
    await waitFor(() => harness.prepareCalls.length === 1);

    await engine.dispatch({ type: "cancel", sessionId });
    await starting;

    expect(engine.getState().phase).toBe("canceled");
    expect(harness.convertCalls).toBe(0);
  });

  it("pauses strict font failure and resumes after switching to compatible", async () => {
    const target = createTarget("<div>Text</div>");
    const harness = createHarness();
    const fontResolver: FontResolver = {
      loader: async () => ({ bytes: new ArrayBuffer(0) }),
      beginCapture() {
        // no-op test resolver
      },
      collectRequests: () => [
        { family: "Test Sans", weight: 400, italic: false },
      ],
      preflight: (requests, mode) => {
        if (mode === "strict") {
          const request = requests[0] ?? {
            family: "Test Sans",
            weight: 400,
            italic: false,
          };
          return Promise.resolve({
            requests,
            failures: [
              {
                request,
                status: "failed" as const,
                attempts: ["test: failed"],
                reason: "test mismatch",
              },
            ],
          });
        }
        return Promise.resolve({ requests, failures: [] });
      },
      getDiagnostics: () => [],
    };
    const engine = createCaptureEngine({
      bridge: harness.bridge,
      fontResolver,
      settings: {
        settleTimeoutMs: 0,
        motion: "live",
        lineBreaks: "off",
        fontMode: "strict",
      },
    });
    const phases: Array<string> = [];
    engine.subscribe((event) => phases.push(event.state.phase));

    const sessionId = await engine.start(inputFor(target), { images: "skip" });

    expect(engine.getState().phase).toBe("font-recovery");
    expect(harness.convertCalls).toBe(0);
    await engine.dispatch({ type: "switch-to-compatible", sessionId });

    expect(engine.getState().phase).toBe("completed");
    expect(harness.convertCalls).toBe(1);
    expect(phases).toContain("font-recovery");
  });
});

async function waitFor(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + CAPTURE_WAIT_TIMEOUT_MS;
  while (!predicate()) {
    if (Date.now() >= deadline) {
      throw new Error("Timed out waiting for capture state");
    }
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
}
