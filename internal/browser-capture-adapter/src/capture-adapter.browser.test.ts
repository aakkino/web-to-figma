import { describe, expect, it } from "vitest";

import { createBrowserCaptureAdapter } from "./capture-adapter";
import { createFontResolver } from "./font-resolver";
import type {
  BridgeCaptureInput,
  ConversionBridge,
  FontResolver,
} from "./types";

function createFakeBridge(
  onConvert?: (input: BridgeCaptureInput) => void
): ConversionBridge {
  return {
    imagePreparation: {
      prepare: async () => ({ status: "prepared", byteLength: 0 }),
      setPlaceholder() {
        // no-op test capability
      },
      clear() {
        // no-op test capability
      },
    },
    fontLoader: async () => ({ bytes: new ArrayBuffer(0) }),
    convert(input) {
      onConvert?.(input);
      return Promise.resolve({ clipboardHtml: "" });
    },
    clearCache() {
      // no-op test bridge
    },
  };
}

function createNoopFontResolver(): FontResolver {
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

describe("browser capture adapter", () => {
  it("restores temporary text changes after conversion", async () => {
    document.body.innerHTML =
      '<div id="target" style="width: 90px; font: 16px Arial; white-space: normal;">這是一段連續的中文文字用來測試瀏覽器換行</div>';
    const target = document.querySelector("#target");
    if (!(target instanceof HTMLElement)) {
      throw new Error("target not found");
    }
    const originalText = target.textContent;
    const observed: Array<string | null> = [];
    const adapter = createBrowserCaptureAdapter({
      bridge: createFakeBridge(() => {
        observed.push(target.textContent);
      }),
      fontResolver: createNoopFontResolver(),
      settleTimeoutMs: 0,
      motion: "live",
    });

    const result = await adapter.capture({
      element: target,
      width: 90,
      height: 100,
      name: "test",
    });

    expect(observed[0]).toContain("\n");
    expect(target.textContent).toBe(originalText);
    expect(result.diagnostics.lineBreaks.changedNodes).toBeGreaterThanOrEqual(
      1
    );
  });

  it("fails before conversion when strict font preflight is not exact", async () => {
    document.body.innerHTML =
      '<div style="font-family: Arial; font-weight: 700;">Hello</div>';
    const target = document.body.firstElementChild;
    if (!(target instanceof HTMLElement)) {
      throw new Error("target not found");
    }
    let convertCalls = 0;
    const resolver = createFontResolver({
      fallbackLoader: () => Promise.reject(new Error("no font")),
    });
    const adapter = createBrowserCaptureAdapter({
      bridge: createFakeBridge(() => {
        convertCalls += 1;
      }),
      fontResolver: resolver,
      fontFailure: "strict",
      settleTimeoutMs: 0,
      lineBreaks: "off",
      motion: "live",
    });

    await expect(
      adapter.capture({ element: target, width: 100, height: 30 })
    ).rejects.toThrow("Font preflight failed");
    expect(convertCalls).toBe(0);
  });

  it("restores temporary text changes when conversion fails", async () => {
    document.body.innerHTML =
      '<div id="target" style="width: 90px; font: 16px Arial; white-space: normal;">這是一段連續的中文文字用來測試瀏覽器換行</div>';
    const target = document.querySelector("#target");
    if (!(target instanceof HTMLElement)) {
      throw new Error("target not found");
    }
    const originalText = target.textContent;
    const adapter = createBrowserCaptureAdapter({
      bridge: createFakeBridge(() => {
        expect(target.textContent).toContain("\n");
        throw new Error("conversion unavailable");
      }),
      fontResolver: createNoopFontResolver(),
      settleTimeoutMs: 0,
      motion: "live",
    });

    await expect(
      adapter.capture({ element: target, width: 90, height: 100 })
    ).rejects.toThrow("conversion unavailable");
    expect(target.textContent).toBe(originalText);
  });
});
