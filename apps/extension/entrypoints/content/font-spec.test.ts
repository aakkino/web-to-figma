// @vitest-environment happy-dom

import type {
  BrowserCaptureAdapter,
  TypographyInspection,
} from "@figit/browser-capture-adapter";
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_CAPTURE_SETTINGS } from "../../shared/capture-settings";
import { buildTypographyReport, createFontSpecPort } from "./font-spec";

const DEFAULT_FONT_SIZE = 16;
const DEFAULT_LINE_HEIGHT = 24;
const INSPECTION: TypographyInspection = {
  summary: { total: 3, exact: 1, fallback: 1, failed: 1 },
  usages: [
    createUsage("Exact", "exact"),
    createUsage("Fallback", "fallback", "Noto Sans TC"),
    createUsage("Missing", "failed"),
  ],
};
const RESOLUTION_ROW_COUNT = 3;
const CORE_STYLE_ROW_COUNT = 3;

afterEach(() => {
  document.body.replaceChildren();
  document.title = "";
});

describe("typography report", () => {
  it("renders editable report text with safe page source and resolution states", () => {
    document.title = "Private design system";
    window.history.replaceState(null, "", "/private/path?token=secret#section");

    const report = buildTypographyReport(document, INSPECTION);

    expect(report.textContent).toContain("Typography");
    expect(report.textContent).toContain("Private design system - localhost");
    expect(report.textContent).not.toContain("/private/path");
    expect(report.textContent).not.toContain("token=secret");
    expect(report.textContent).toContain("Exact");
    expect(report.textContent).toContain("Fallback");
    expect(report.textContent).toContain("Missing");
    expect(report.textContent).toContain("Unavailable");
    expect(report.textContent).toContain("Font resolution");
    expect(report.textContent).toContain("Core styles");
    expect(report.textContent).toContain("Rare variants");
    expect(
      Array.from(report.children)
        .filter((child) => child.hasAttribute("data-font-spec-section"))
        .map((child) => child.getAttribute("data-font-spec-section"))
    ).toEqual(["font-resolution", "core-styles", "rare-variants"]);
    expect(report.querySelectorAll("[data-resolution]")).toHaveLength(
      RESOLUTION_ROW_COUNT
    );
    expect(report.querySelectorAll("[data-core-style]")).toHaveLength(
      CORE_STYLE_ROW_COUNT
    );
    expect(report.querySelectorAll("[data-rare-style]")).toHaveLength(0);
  });

  it("keeps fragmented metrics complete without repeating specimens", () => {
    const report = buildTypographyReport(document, {
      summary: { total: 3, exact: 0, fallback: 3, failed: 0 },
      usages: [
        createUsage("Inter", "fallback", "Noto Sans TC", {
          fontSizePx: 16,
          lineHeightPx: 20,
          usageCount: 1,
        }),
        createUsage("Inter", "fallback", "Noto Sans TC", {
          fontSizePx: 16,
          lineHeightPx: 24,
          usageCount: 1,
        }),
        createUsage("Inter", "fallback", "Noto Sans TC", {
          fontSizePx: 12,
          lineHeightPx: 16,
          usageCount: 1,
        }),
      ],
    });

    expect(report.querySelectorAll("[data-font-resolution]")).toHaveLength(1);
    expect(report.querySelectorAll("[data-core-style]")).toHaveLength(1);
    expect(report.querySelectorAll("[data-rare-style]")).toHaveLength(1);
    expect(report.textContent?.match(/Aa Bb 0123 \/ 中文字样/g)).toHaveLength(
      1
    );
    expect(report.textContent).toContain("LH 20 px / LS normal / 1 use");
    expect(report.textContent).toContain("LH 24 px / LS normal / 1 use");
    expect(report.textContent).toContain("Size 12 px");
  });

  it("renders a valid empty state", () => {
    const report = buildTypographyReport(document, {
      usages: [],
      summary: { total: 0, exact: 0, fallback: 0, failed: 0 },
    });

    expect(report.textContent).toContain(
      "No visible text was found in the selected target."
    );
  });

  it("removes the temporary report host after success and failure", async () => {
    const target = document.createElement("main");
    document.body.append(target);
    let shouldFail = false;
    const adapter = {
      inspectTypography: () => Promise.resolve(INSPECTION),
      capture: () => {
        expect(
          document.querySelector("[data-figit-font-spec-host]")
        ).not.toBeNull();
        return shouldFail
          ? Promise.reject(new Error("conversion failed"))
          : Promise.resolve({ clipboardHtml: "<figma />" });
      },
    } as unknown as BrowserCaptureAdapter;
    const port = createFontSpecPort({
      createAdapter: () => adapter,
      writeClipboard: () =>
        Promise.resolve({ status: "success", message: "Copied." }),
    });

    await expect(
      port.copy({ element: target }, DEFAULT_CAPTURE_SETTINGS)
    ).resolves.toEqual({ status: "success", message: "Copied." });
    expect(document.querySelector("[data-figit-font-spec-host]")).toBeNull();

    shouldFail = true;
    await expect(
      port.copy({ element: target }, DEFAULT_CAPTURE_SETTINGS)
    ).resolves.toEqual({ status: "failed", message: "conversion failed" });
    expect(document.querySelector("[data-figit-font-spec-host]")).toBeNull();
  });
});

function createUsage(
  family: string,
  status: "exact" | "fallback" | "failed",
  resolvedFamily?: string,
  options: {
    fontSizePx?: number;
    lineHeightPx?: number;
    usageCount?: number;
  } = {}
): TypographyInspection["usages"][number] {
  return {
    token: {
      familyStack: [family, "sans-serif"],
      family,
      weight: 500,
      style: "normal",
      fontSizePx: options.fontSizePx ?? DEFAULT_FONT_SIZE,
      lineHeight: {
        kind: "px",
        value: options.lineHeightPx ?? DEFAULT_LINE_HEIGHT,
      },
      letterSpacing: { kind: "normal" },
    },
    usageCount: options.usageCount ?? 2,
    resolution: {
      request: { family, weight: 500, italic: false },
      status,
      ...(status === "failed"
        ? {}
        : {
            source: status === "exact" ? "page" : "fallback",
            resolvedFamily: resolvedFamily ?? family,
            resolvedWeight: 500,
            resolvedItalic: false,
          }),
      attempts: [],
    },
  };
}
