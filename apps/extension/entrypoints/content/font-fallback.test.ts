import { describe, expect, it, vi } from "vitest";

import {
  CJK_FALLBACK_VARIANTS,
  createFixedCjkFallbackLoader,
  selectCjkFallbackVariant,
} from "./font-fallback";

const THIN_WEIGHT = 100;
const REGULAR_WEIGHT = 400;
const REGULAR_MEDIUM_MIDPOINT = 450;
const ABOVE_REGULAR_MEDIUM_MIDPOINT = 451;
const MEDIUM_WEIGHT = 500;
const MEDIUM_SEMIBOLD_MIDPOINT = 550;
const ABOVE_MEDIUM_SEMIBOLD_MIDPOINT = 551;
const SEMIBOLD_WEIGHT = 600;
const SEMIBOLD_BOLD_MIDPOINT = 650;
const ABOVE_SEMIBOLD_BOLD_MIDPOINT = 651;
const BOLD_WEIGHT = 700;
const BLACK_WEIGHT = 900;
const LATIN_A_CODE_POINT = "A".codePointAt(0) ?? 0;
const CJK_CODE_POINT = "中".codePointAt(0) ?? 0;

describe("fixed CJK font fallback", () => {
  it("declares each file's real family", () => {
    expect(
      CJK_FALLBACK_VARIANTS.map(({ family, weight }) => ({ family, weight }))
    ).toEqual([
      { family: "Noto Sans TC Thin", weight: REGULAR_WEIGHT },
      { family: "Noto Sans TC Thin Medium", weight: MEDIUM_WEIGHT },
      { family: "Noto Sans TC Thin SemiBold", weight: SEMIBOLD_WEIGHT },
      { family: "Noto Sans TC Thin", weight: BOLD_WEIGHT },
    ]);
  });

  it.each([
    [THIN_WEIGHT, REGULAR_WEIGHT],
    [REGULAR_WEIGHT, REGULAR_WEIGHT],
    [REGULAR_MEDIUM_MIDPOINT, REGULAR_WEIGHT],
    [ABOVE_REGULAR_MEDIUM_MIDPOINT, MEDIUM_WEIGHT],
    [MEDIUM_WEIGHT, MEDIUM_WEIGHT],
    [MEDIUM_SEMIBOLD_MIDPOINT, MEDIUM_WEIGHT],
    [ABOVE_MEDIUM_SEMIBOLD_MIDPOINT, SEMIBOLD_WEIGHT],
    [SEMIBOLD_WEIGHT, SEMIBOLD_WEIGHT],
    [SEMIBOLD_BOLD_MIDPOINT, SEMIBOLD_WEIGHT],
    [ABOVE_SEMIBOLD_BOLD_MIDPOINT, BOLD_WEIGHT],
    [BOLD_WEIGHT, BOLD_WEIGHT],
    [BLACK_WEIGHT, BOLD_WEIGHT],
  ])("maps weight %i to %i", (requested, expected) => {
    expect(selectCjkFallbackVariant(requested).weight).toBe(expected);
  });

  it("returns the selected file's real family and drops italic", async () => {
    const bytes = new ArrayBuffer(Uint32Array.BYTES_PER_ELEMENT);
    const loadBytes = vi.fn(async () => bytes);
    const loader = createFixedCjkFallbackLoader(loadBytes);

    const result = await loader({
      family: "Inter",
      weight: MEDIUM_WEIGHT,
      italic: true,
      codePoints: [LATIN_A_CODE_POINT, CJK_CODE_POINT],
    });

    expect(result).toEqual({
      bytes,
      resolvedFamily: "Noto Sans TC Thin Medium",
      resolvedWeight: MEDIUM_WEIGHT,
      resolvedItalic: false,
    });
    expect(loadBytes).toHaveBeenCalledWith(
      expect.objectContaining({
        family: "Noto Sans TC Thin Medium",
        weight: MEDIUM_WEIGHT,
      }),
      undefined
    );
  });
});
