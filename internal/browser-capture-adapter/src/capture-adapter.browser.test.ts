import { describe, expect, it } from "vitest";

import { createBrowserCaptureAdapter } from "./capture-adapter";
import { createFontResolver } from "./font-resolver";
import type {
  BridgeCaptureInput,
  ConversionBridge,
  ConversionContext,
  FontResolver,
} from "./types";

const LATIN_A_CODE_POINT = "A".codePointAt(0) ?? 0;
const LATIN_B_CODE_POINT = "B".codePointAt(0) ?? 0;
const CJK_CODE_POINT = "中".codePointAt(0) ?? 0;
const TINY_RED_PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC";

function createFakeBridge(
  onConvert?: (input: BridgeCaptureInput, context?: ConversionContext) => void,
  onPrepare?: (src: string) => void
): ConversionBridge {
  return {
    imagePreparation: {
      prepare: (request) => {
        onPrepare?.(request.src);
        return Promise.resolve({ status: "prepared", byteLength: 0 });
      },
      setPlaceholder() {
        // no-op test capability
      },
      clear() {
        // no-op test capability
      },
    },
    fontLoader: async () => ({ bytes: new ArrayBuffer(0) }),
    convert(input, _signal, context) {
      onConvert?.(input, context);
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
  it("collects sorted unique code points for text sharing a font style", () => {
    document.body.innerHTML = `
      <div style="font-family: Inter; font-weight: 400">
        <span>BA</span><span>中A</span>
      </div>
    `;
    const resolver = createFontResolver({ fallbackLoader: null });

    const requests = resolver.collectRequests(document.body);

    expect(requests).toEqual([
      {
        family: "Inter",
        weight: 400,
        italic: false,
        codePoints: [LATIN_A_CODE_POINT, LATIN_B_CODE_POINT, CJK_CODE_POINT],
      },
    ]);
  });

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

  it("captures real bytes from an offscreen data-bgset owner without activation", async () => {
    document.body.innerHTML = `
      <div id="target" style="width:120px;height:80px">
        <a id="card" data-bgset="${TINY_RED_PNG_DATA_URL}-xs-/card-original.jpg"
          style="position:absolute;top:5000px;width:120px;height:80px"></a>
      </div>
    `;
    const target = document.querySelector("#target");
    const card = document.querySelector("#card");
    if (!(target instanceof HTMLElement && card instanceof HTMLElement)) {
      throw new Error("data-bgset fixture not found");
    }
    const before = target.outerHTML;
    const requested: Array<string> = [];
    const adapter = createBrowserCaptureAdapter({
      bridgeOptions: {
        imageLoader: async (request) => {
          requested.push(request.src);
          const response = await fetch(request.src);
          return {
            bytes: await response.arrayBuffer(),
            mimeType: "image/png",
          };
        },
      },
      fontResolver: createNoopFontResolver(),
      settleTimeoutMs: 0,
      lineBreaks: "off",
      motion: "live",
    });

    const result = await adapter.capture({
      element: target,
      width: 120,
      height: 80,
    });

    expect(requested).toEqual([TINY_RED_PNG_DATA_URL]);
    expect(result.diagnostics.images.progress.total).toBe(1);
    expect(result.diagnostics.images.progress.preparedBytes).toBeGreaterThan(0);
    expect(result.diagnostics.backgrounds).toEqual([
      expect.objectContaining({ mode: "native", layerIndex: 0 }),
    ]);
    expect(result.clipboardHtml).toContain("figmeta");
    expect(window.scrollY).toBe(0);
    expect(target.outerHTML).toBe(before);
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
