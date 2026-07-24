// biome-ignore-all lint/style/noMagicNumbers: Typography fixture values are intentionally explicit.
import type { TypographyInspection } from "@figit/browser-capture-adapter";
import { createBrowserCaptureAdapter } from "@figit/browser-capture-adapter";
import { decodeFigmaData, parseClipboardHtml } from "@figit/fig-kiwi";
import { afterEach, describe, expect, it } from "vitest";
import { commands } from "vitest/browser";
import { buildTypographyReport } from "./font-spec";

const REPORT_WIDTH = 1200;
const REPORT_FONT_URL = "/fonts/noto-sans-tc-composite-400.ttf";
const SMOKE_PAYLOAD_PATH = import.meta.env.VITE_FIGMA_SMOKE_PAYLOAD_PATH;

afterEach(() => {
  document.body.replaceChildren();
});

describe("typography report Figma output", () => {
  it("emits one Typography root with editable text and clipboard HTML", async () => {
    const inspection: TypographyInspection = {
      summary: { total: 8, exact: 1, fallback: 6, failed: 1 },
      usages: [
        {
          token: {
            familyStack: ["Source Sans", "system-ui", "sans-serif"],
            family: "Source Sans",
            weight: 400,
            style: "normal",
            fontSizePx: 16,
            lineHeight: { kind: "px", value: 24 },
            letterSpacing: { kind: "normal" },
          },
          usageCount: 12,
          resolution: {
            request: { family: "Source Sans", weight: 400, italic: false },
            status: "fallback",
            source: "fallback",
            resolvedFamily: "Noto Sans TC Thin",
            resolvedWeight: 400,
            resolvedItalic: false,
            attempts: [],
          },
        },
        createUsage("Source Sans", 16, 20, 7, "fallback"),
        createUsage("Source Sans", 14, 20, 5, "fallback"),
        createUsage("Source Sans", 11, 16, 1, "fallback"),
        createUsage("Source Sans", 12, 18, 1, "fallback"),
        createUsage("Source Sans", 13, 20, 1, "fallback"),
        createUsage("Arial", 32, 40, 2, "exact"),
        createUsage("IBM Plex Mono", 12, 16, 1, "failed"),
      ],
    };
    const report = buildTypographyReport(document, inspection);
    document.body.append(report);
    expect(
      Array.from(report.children)
        .filter((child) => child.hasAttribute("data-font-spec-section"))
        .map((child) => child.getAttribute("data-font-spec-section"))
    ).toEqual(["font-resolution", "core-styles", "rare-variants"]);
    expect(report.querySelectorAll("[data-font-resolution]")).toHaveLength(3);
    expect(report.querySelectorAll("[data-core-style]")).toHaveLength(3);
    expect(report.querySelectorAll("[data-rare-style]")).toHaveLength(4);
    expect(report.textContent).toContain(
      "8 tokens / 3 font mappings / 3 core styles / 4 rare variants"
    );
    const reportRect = report.getBoundingClientRect();
    for (const row of report.querySelectorAll(
      "[data-font-resolution], [data-core-style], [data-rare-style]"
    )) {
      const rowRect = row.getBoundingClientRect();
      expect(rowRect.left).toBeGreaterThanOrEqual(reportRect.left);
      expect(rowRect.right).toBeLessThanOrEqual(reportRect.right);
    }
    const fontResponse = await fetch(REPORT_FONT_URL);
    if (!fontResponse.ok) {
      throw new Error(`Unable to load font fixture: ${fontResponse.status}`);
    }
    const fontBytes = await fontResponse.arrayBuffer();
    const adapter = createBrowserCaptureAdapter({
      bridgeOptions: {
        fontLoader: async () => ({
          bytes: fontBytes.slice(0),
          resolvedFamily: "Noto Sans TC Thin",
          resolvedWeight: 400,
          resolvedItalic: false,
        }),
      },
      settleTimeoutMs: 0,
      motion: "live",
      lineBreaks: "off",
    });

    const result = await adapter.capture({
      element: report,
      width: REPORT_WIDTH,
      height: Math.ceil(reportRect.height),
      name: "Typography",
    });

    const message = decodeFigmaData(
      parseClipboardHtml(result.clipboardHtml).fig
    ).message as {
      type: string;
      nodeChanges: Array<{
        type: string;
        name: string;
        textData?: { characters?: string };
      }>;
    };
    expect(message.type).toBe("NODE_CHANGES");
    const typographyRoots = message.nodeChanges.filter(
      (change) => change.type === "FRAME" && change.name === "Typography"
    );
    expect(typographyRoots).toHaveLength(1);
    const textNodes = message.nodeChanges.filter(
      (change) => change.type === "TEXT"
    );
    expect(textNodes.length).toBeGreaterThan(0);
    expect(textNodes.map((node) => node.textData?.characters)).toContain(
      "Typography"
    );
    expect(textNodes.map((node) => node.textData?.characters)).toContain(
      "Font resolution"
    );
    expect(textNodes.map((node) => node.textData?.characters)).toContain(
      "Core styles"
    );
    expect(
      textNodes.some(
        (node) => node.textData?.characters?.toLowerCase() === "fallback"
      )
    ).toBe(true);
    const clipboardHtml = result.clipboardHtml;
    expect(clipboardHtml).toContain("data-buffer=");
    expect(clipboardHtml).toContain("(figma)");
    if (SMOKE_PAYLOAD_PATH) {
      await commands.writeFile(SMOKE_PAYLOAD_PATH, clipboardHtml, "utf8");
    }
  });
});

function createUsage(
  family: string,
  fontSizePx: number,
  lineHeightPx: number,
  usageCount: number,
  status: "exact" | "fallback" | "failed"
): TypographyInspection["usages"][number] {
  return {
    token: {
      familyStack: [family, "system-ui", "sans-serif"],
      family,
      weight: status === "exact" ? 700 : 400,
      style: "normal",
      fontSizePx,
      lineHeight: { kind: "px", value: lineHeightPx },
      letterSpacing: { kind: "normal" },
    },
    usageCount,
    resolution: {
      request: {
        family,
        weight: status === "exact" ? 700 : 400,
        italic: false,
      },
      status,
      ...(status === "failed"
        ? {}
        : {
            source: status === "exact" ? "page" : "fallback",
            resolvedFamily: status === "exact" ? family : "Noto Sans TC Thin",
            resolvedWeight: status === "exact" ? 700 : 400,
            resolvedItalic: false,
          }),
      attempts: [],
    },
  };
}
