import { describe, expect, it } from "vitest";

import { createBrowserCaptureAdapter } from "./capture-adapter";
import type {
  ConversionBridge,
  FontDiagnostic,
  FontProperties,
  FontResolver,
} from "./types";

const BASE_USAGE_COUNT = 3;
const LARGE_FONT_SIZE = 20;

describe("typography inspection", () => {
  it("collects stable, private typography usage from the selected composed tree", async () => {
    document.body.innerHTML = `
      <main id="target" style='font-family: "A, Display", Inter, sans-serif; font-size: 16px; font-weight: 500; line-height: 24px; letter-spacing: 1px'>
        <span style="color: red">Private alpha</span>
        <span style="color: blue">Private beta</span>
        <span style="font-size: 20px">Private gamma</span>
        <span style="display: none">Hidden private text</span>
        <aside data-extension-ui><span>Extension private text</span></aside>
        <div id="shadow-host"></div>
      </main>
    `;
    const target = requireElement("#target");
    const shadowHost = requireElement("#shadow-host");
    const shadowRoot = shadowHost.attachShadow({ mode: "open" });
    shadowRoot.innerHTML = "<span>Shadow private text</span>";
    const adapter = createBrowserCaptureAdapter({
      bridge: createFakeBridge(),
      fontResolver: createDiagnosticResolver(),
      isExcluded: (element) => element.hasAttribute("data-extension-ui"),
    });

    const inspection = await adapter.inspectTypography({ element: target });

    expect(inspection.summary).toEqual({
      total: 2,
      exact: 2,
      fallback: 0,
      failed: 0,
    });
    expect(inspection.usages.map((usage) => usage.usageCount)).toEqual([
      BASE_USAGE_COUNT,
      1,
    ]);
    expect(inspection.usages[0]?.token).toMatchObject({
      familyStack: ["A, Display", "Inter", "sans-serif"],
      family: "A, Display",
      weight: 500,
      style: "normal",
      fontSizePx: 16,
      lineHeight: { kind: "px", value: 24 },
      letterSpacing: { kind: "px", value: 1 },
    });
    expect(inspection.usages[1]?.token.fontSizePx).toBe(LARGE_FONT_SIZE);
    const serialized = JSON.stringify(inspection);
    expect(serialized).not.toContain("Private");
    expect(serialized).not.toContain("codePoints");
    expect(serialized).not.toContain("http");
  });

  it("reports exact, fallback, and failed resolutions without inventing a font", async () => {
    document.body.innerHTML = `
      <main id="target">
        <span style="font-family: Exact; font-size: 12px">Exact text</span>
        <span style="font-family: Fallback; font-size: 13px">Fallback text</span>
        <span style="font-family: Missing; font-size: 14px">Missing text</span>
      </main>
    `;
    const adapter = createBrowserCaptureAdapter({
      bridge: createFakeBridge(),
      fontResolver: createDiagnosticResolver(),
    });

    const inspection = await adapter.inspectTypography({
      element: requireElement("#target"),
    });

    expect(inspection.summary).toEqual({
      total: 3,
      exact: 1,
      fallback: 1,
      failed: 1,
    });
    const fallback = inspection.usages.find(
      (usage) => usage.token.family === "Fallback"
    );
    const missing = inspection.usages.find(
      (usage) => usage.token.family === "Missing"
    );
    expect(fallback?.resolution).toMatchObject({
      status: "fallback",
      resolvedFamily: "Noto Sans TC",
      resolvedWeight: 400,
      resolvedItalic: false,
    });
    expect(missing?.resolution.status).toBe("failed");
    expect(missing?.resolution.resolvedFamily).toBeUndefined();
  });
});

function createDiagnosticResolver(): FontResolver {
  let diagnostics: Array<FontDiagnostic> = [];
  return {
    loader: async () => ({ bytes: new ArrayBuffer(0) }),
    beginCapture() {
      diagnostics = [];
    },
    collectRequests: () => [],
    preflight(requests) {
      diagnostics = requests.map(createDiagnostic);
      return Promise.resolve({
        requests,
        failures: diagnostics.filter((item) => item.status !== "exact"),
      });
    },
    getDiagnostics: () => diagnostics,
  };
}

function createDiagnostic(request: FontProperties): FontDiagnostic {
  const safeRequest = {
    family: request.family,
    weight: request.weight,
    italic: request.italic,
  };
  if (request.family === "Fallback") {
    return {
      request: safeRequest,
      status: "fallback",
      source: "fallback",
      resolvedFamily: "Noto Sans TC",
      resolvedWeight: 400,
      resolvedItalic: false,
      attempts: ["fallback loader"],
    };
  }
  if (request.family === "Missing") {
    return {
      request: safeRequest,
      status: "failed",
      attempts: ["fallback: unavailable"],
      reason: "No compatible font could be loaded",
    };
  }
  return {
    request: safeRequest,
    status: "exact",
    source: "page",
    resolvedFamily: request.family,
    resolvedWeight: request.weight,
    resolvedItalic: request.italic,
    attempts: ["page @font-face"],
  };
}

function createFakeBridge(): ConversionBridge {
  return {
    imagePreparation: {
      prepare: async () => ({ status: "prepared", byteLength: 0 }),
      setPlaceholder() {
        // no-op test port
      },
      clear() {
        // no-op test port
      },
    },
    fontLoader: async () => ({ bytes: new ArrayBuffer(0) }),
    convert: async () => ({ clipboardHtml: "" }),
    clearCache() {
      // no-op test port
    },
  };
}

function requireElement(selector: string): HTMLElement {
  const element = document.querySelector(selector);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Missing fixture: ${selector}`);
  }
  return element;
}
