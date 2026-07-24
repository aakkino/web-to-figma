import { describe, expect, it } from "vitest";
import { resolveImagePresentation } from "./presentation";

const IDENTITY = {
  m00: 1,
  m01: 0,
  m02: 0,
  m10: 0,
  m11: 1,
  m12: 0,
};

describe("resolveImagePresentation", () => {
  it("maps CSS fill to a non-uniform stretch", () => {
    expect(
      resolveImagePresentation({
        fit: "fill",
        position: "50% 50%",
        box: { width: 200, height: 100 },
        intrinsic: { width: 90, height: 46 },
      })
    ).toEqual({ imageScaleMode: "STRETCH", transform: IDENTITY });
  });

  it("keeps centered contain and cover on native Figma modes", () => {
    expect(
      resolveImagePresentation({
        fit: "contain",
        position: "center center",
        box: { width: 200, height: 100 },
        intrinsic: { width: 90, height: 46 },
      })
    ).toEqual({ imageScaleMode: "FIT", transform: IDENTITY });
    expect(
      resolveImagePresentation({
        fit: "cover",
        position: "50% 50%",
        box: { width: 200, height: 100 },
        intrinsic: { width: 90, height: 46 },
      })
    ).toEqual({ imageScaleMode: "FILL", transform: IDENTITY });
  });

  it("preserves the reported contain left-center geometry", () => {
    const result = resolveImagePresentation({
      fit: "contain",
      position: "0% 50%",
      box: { width: 273, height: 52 },
      intrinsic: { width: 90, height: 46 },
    });

    expect(result.imageScaleMode).toBe("STRETCH");
    expect(result.transform.m00).toBeCloseTo(2.683_333_333, 8);
    expect(result.transform.m02).toBe(0);
    expect(result.transform.m11).toBeCloseTo(1);
    expect(result.transform.m12).toBe(0);
  });

  it("uses negative free space to anchor cover crops", () => {
    const left = resolveImagePresentation({
      fit: "cover",
      position: "left top",
      box: { width: 100, height: 100 },
      intrinsic: { width: 200, height: 100 },
    });
    const right = resolveImagePresentation({
      fit: "cover",
      position: "right bottom",
      box: { width: 100, height: 100 },
      intrinsic: { width: 200, height: 100 },
    });

    expect(left.transform).toMatchObject({ m00: 0.5, m02: 0 });
    expect(right.transform).toMatchObject({ m00: 0.5, m02: 0.5 });
  });

  it("keeps intrinsic size for none and the smaller scale-down branch", () => {
    const none = resolveImagePresentation({
      fit: "none",
      position: "right 10px bottom 2px",
      box: { width: 200, height: 120 },
      intrinsic: { width: 100, height: 80 },
    });
    const scaleDownNone = resolveImagePresentation({
      fit: "scale-down",
      position: "left top",
      box: { width: 200, height: 120 },
      intrinsic: { width: 100, height: 80 },
    });
    const scaleDownContain = resolveImagePresentation({
      fit: "scale-down",
      position: "left top",
      box: { width: 50, height: 40 },
      intrinsic: { width: 100, height: 80 },
    });

    expect(none.transform).toMatchObject({
      m00: 2,
      m02: -0.9,
      m11: 1.5,
      m12: -0.475,
    });
    expect(scaleDownNone.transform).toMatchObject({ m00: 2, m11: 1.5 });
    expect(scaleDownContain.transform).toEqual(IDENTITY);
  });

  it("resolves percentages, computed pixel lengths, calc, and keyword order", () => {
    const percentage = resolveImagePresentation({
      fit: "contain",
      position: "25% 20px",
      box: { width: 200, height: 100 },
      intrinsic: { width: 100, height: 100 },
    });
    const calculated = resolveImagePresentation({
      fit: "contain",
      position: "calc(100% - 12px) top",
      box: { width: 200, height: 100 },
      intrinsic: { width: 100, height: 100 },
    });
    const reordered = resolveImagePresentation({
      fit: "contain",
      position: "top right",
      box: { width: 200, height: 100 },
      intrinsic: { width: 100, height: 100 },
    });

    expect(percentage.transform).toMatchObject({ m02: -0.25, m12: -0.2 });
    expect(calculated.transform).toMatchObject({ m02: -0.88, m12: 0 });
    expect(reordered.transform).toMatchObject({ m02: -1, m12: 0 });
  });

  it("uses the browser fill default for unknown values and zero dimensions", () => {
    expect(
      resolveImagePresentation({
        fit: "unexpected",
        position: "center",
        box: { width: 0, height: 0 },
        intrinsic: { width: 0, height: 0 },
      })
    ).toEqual({ imageScaleMode: "STRETCH", transform: IDENTITY });
  });
});
