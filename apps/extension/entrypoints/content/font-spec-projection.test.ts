import type { TypographyInspection } from "@figit/browser-capture-adapter";
import { describe, expect, it } from "vitest";

import { projectTypographyInspection } from "./font-spec-projection";

const BODY_SIZE = 16;
const BODY_COMPACT_SIZE = 12;
const LABEL_SIZE = 14;
const TIGHT_LINE_HEIGHT = 16;
const LABEL_LINE_HEIGHT = 20;
const RELAXED_LINE_HEIGHT = 24;
const SINGLE_USE = 1;
const DOUBLE_USE = 2;
const TRIPLE_USE = 3;
const INTER_TOTAL_USAGE = 4;

describe("projectTypographyInspection", () => {
  it("deduplicates font mappings and folds metric differences into style variants", () => {
    const projection = projectTypographyInspection({
      summary: { total: 4, exact: 1, fallback: 3, failed: 0 },
      usages: [
        createUsage(
          "Inter",
          BODY_SIZE,
          LABEL_LINE_HEIGHT,
          SINGLE_USE,
          "fallback"
        ),
        createUsage(
          "Inter",
          BODY_SIZE,
          RELAXED_LINE_HEIGHT,
          DOUBLE_USE,
          "fallback"
        ),
        createUsage(
          "Inter",
          BODY_COMPACT_SIZE,
          TIGHT_LINE_HEIGHT,
          SINGLE_USE,
          "fallback"
        ),
        createUsage(
          "Arial",
          LABEL_SIZE,
          LABEL_LINE_HEIGHT,
          TRIPLE_USE,
          "exact"
        ),
      ],
    });

    expect(projection.resolutions).toHaveLength(2);
    expect(projection.resolutions.map((group) => group.usageCount)).toEqual([
      INTER_TOTAL_USAGE,
      TRIPLE_USE,
    ]);
    expect(projection.resolutions.map((group) => group.id)).toEqual([
      "F01",
      "F02",
    ]);
    expect(projection.coreStyles).toHaveLength(2);
    expect(projection.coreStyles[0]).toMatchObject({
      family: "Inter",
      fontSizePx: BODY_SIZE,
      resolutionId: "F01",
      usageCount: TRIPLE_USE,
    });
    expect(projection.coreStyles[0]?.variants).toEqual([
      {
        lineHeight: { kind: "px", value: RELAXED_LINE_HEIGHT },
        letterSpacing: { kind: "normal" },
        usageCount: DOUBLE_USE,
      },
      {
        lineHeight: { kind: "px", value: LABEL_LINE_HEIGHT },
        letterSpacing: { kind: "normal" },
        usageCount: SINGLE_USE,
      },
    ]);
    expect(projection.coreStyles[1]).toMatchObject({
      family: "Arial",
      fontSizePx: LABEL_SIZE,
      resolutionId: "F02",
      usageCount: TRIPLE_USE,
    });
    expect(projection.rareStyles).toHaveLength(1);
    expect(projection.rareStyles[0]).toMatchObject({
      family: "Inter",
      fontSizePx: BODY_COMPACT_SIZE,
      usageCount: SINGLE_USE,
    });
  });

  it("does not merge different resolution results", () => {
    const projection = projectTypographyInspection({
      summary: { total: 2, exact: 1, fallback: 1, failed: 0 },
      usages: [
        createUsage(
          "Inter",
          BODY_SIZE,
          RELAXED_LINE_HEIGHT,
          SINGLE_USE,
          "exact"
        ),
        createUsage(
          "Inter",
          BODY_SIZE,
          RELAXED_LINE_HEIGHT,
          SINGLE_USE,
          "fallback"
        ),
      ],
    });

    expect(projection.resolutions).toHaveLength(2);
    expect(projection.coreStyles).toHaveLength(0);
    expect(projection.rareStyles).toHaveLength(2);
  });
});

function createUsage(
  family: string,
  fontSizePx: number,
  lineHeightPx: number,
  usageCount: number,
  status: "exact" | "fallback"
): TypographyInspection["usages"][number] {
  return {
    token: {
      familyStack: [family, "sans-serif"],
      family,
      weight: 400,
      style: "normal",
      fontSizePx,
      lineHeight: { kind: "px", value: lineHeightPx },
      letterSpacing: { kind: "normal" },
    },
    usageCount,
    resolution: {
      request: { family, weight: 400, italic: false },
      status,
      source: status === "exact" ? "page" : "fallback",
      resolvedFamily: status === "exact" ? family : "Noto Sans TC Thin",
      resolvedWeight: 400,
      resolvedItalic: false,
      attempts: [],
    },
  };
}
