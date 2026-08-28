import { describe, expect, it } from "vitest";
import {
  createBackgroundSnapshot,
  cssBlendModeToFigmaBlendMode,
  resolveBackgroundImagePresentation,
  splitCssTopLevelList,
} from "./background";

describe("background style model", () => {
  it("splits nested gradient commas without splitting URL strings", () => {
    expect(
      splitCssTopLevelList(
        'linear-gradient(rgb(0, 0, 0), rgb(255, 255, 255)), url("photo,a.png")'
      )
    ).toEqual([
      "linear-gradient(rgb(0, 0, 0), rgb(255, 255, 255))",
      'url("photo,a.png")',
    ]);
  });

  it("resolves image-set density and document-relative URLs", () => {
    const snapshot = createBackgroundSnapshot({
      backgroundImage:
        'image-set(url("low.png") 1x, url("high.png") 2x), url("plain.png")',
      width: 200,
      height: 100,
      baseUrl: "https://example.test/design/index.html",
      devicePixelRatio: 1.5,
    });

    expect(snapshot.layers).toMatchObject([
      { kind: "image", source: "https://example.test/design/high.png" },
      { kind: "image", source: "https://example.test/design/plain.png" },
    ]);
  });

  it("accepts computed-style dppx image-set densities", () => {
    const snapshot = createBackgroundSnapshot({
      backgroundImage: 'image-set(url("one.png") 1dppx, url("two.png") 2dppx)',
      width: 100,
      height: 100,
      baseUrl: "https://example.test/",
      devicePixelRatio: 2,
    });

    expect(snapshot.layers[0]?.source).toBe("https://example.test/two.png");
  });

  it("preserves CSS layer order and list repetition", () => {
    const snapshot = createBackgroundSnapshot({
      backgroundImage: "url(first.png), url(second.png)",
      backgroundSize: "20px 10px",
      backgroundPosition: "right bottom",
      backgroundRepeat: "no-repeat",
      backgroundBlendMode: "multiply",
      width: 200,
      height: 100,
      baseUrl: "https://example.test/",
    });

    expect(snapshot.layers).toMatchObject([
      {
        index: 0,
        repeat: "no-repeat",
        size: { kind: "explicit", width: "20px", height: "10px" },
        position: { x: "right", y: "bottom" },
        blendMode: "multiply",
      },
      {
        index: 1,
        repeat: "no-repeat",
        size: { kind: "explicit", width: "20px", height: "10px" },
      },
    ]);
  });

  it("marks one-axis repetition and non-border clipping for raster fallback", () => {
    const snapshot = createBackgroundSnapshot({
      backgroundImage: "url(photo.png)",
      backgroundRepeat: "repeat-x",
      backgroundClip: "content-box",
      width: 200,
      height: 100,
      baseUrl: "https://example.test/",
    });
    const layer = snapshot.layers[0];
    if (!layer) {
      throw new Error("background layer not found");
    }

    const presentation = resolveBackgroundImagePresentation(
      layer,
      { width: 200, height: 100 },
      { width: 40, height: 20 }
    );

    expect(presentation.native).toBe(false);
    expect(presentation.reason).toContain("repeat-x");
  });

  it("classifies fixed attachment and dynamic image functions explicitly", () => {
    const snapshot = createBackgroundSnapshot({
      backgroundImage: "url(photo.png), paint(checkerboard)",
      backgroundAttachment: "fixed, scroll",
      backgroundBlendMode: "multiply, screen",
      width: 200,
      height: 100,
      baseUrl: "https://example.test/",
    });
    const imageLayer = snapshot.layers[0];
    if (!imageLayer) {
      throw new Error("image background layer not found");
    }

    const presentation = resolveBackgroundImagePresentation(
      imageLayer,
      { width: 200, height: 100 },
      { width: 40, height: 20 }
    );

    expect(presentation.native).toBe(false);
    expect(presentation.reason).toContain("attachment fixed");
    expect(snapshot.layers[1]).toMatchObject({
      kind: "unsupported",
      blendMode: "screen",
    });
    expect(cssBlendModeToFigmaBlendMode(imageLayer.blendMode)).toBe("MULTIPLY");
  });

  it("preserves non-centered cover positioning in the native transform", () => {
    const [layer] = createBackgroundSnapshot({
      backgroundImage: "url(photo.png)",
      backgroundSize: "cover",
      backgroundPosition: "left top",
      backgroundRepeat: "no-repeat",
      width: 200,
      height: 100,
      baseUrl: "https://example.test/",
    }).layers;
    if (!layer) {
      throw new Error("background layer not found");
    }

    const presentation = resolveBackgroundImagePresentation(
      layer,
      { width: 200, height: 100 },
      { width: 100, height: 200 }
    );

    expect(presentation.imageScaleMode).toBe("STRETCH");
    expect(presentation.transform.m02).toBeCloseTo(0);
    expect(presentation.transform.m12).toBeCloseTo(0);
  });

  it("resolves edge offsets and calc lengths without silently changing geometry", () => {
    const [layer] = createBackgroundSnapshot({
      backgroundImage: "url(photo.png)",
      backgroundSize: "calc(10% + 20px) 20px",
      backgroundPosition: "right 10px bottom 20px",
      backgroundRepeat: "no-repeat",
      width: 200,
      height: 100,
      baseUrl: "https://example.test/",
    }).layers;
    if (!layer) {
      throw new Error("background layer not found");
    }

    const presentation = resolveBackgroundImagePresentation(
      layer,
      { width: 200, height: 100 },
      { width: 40, height: 20 }
    );

    expect(layer.position.supported).toBe(true);
    expect(layer.size.supported).toBe(true);
    expect(presentation.renderedWidth).toBe(40);
    expect(presentation.offsetX).toBe(150);
    expect(presentation.offsetY).toBe(60);
  });
});
