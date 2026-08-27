import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  ALT_TEST_FONT_FAMILY,
  createInterFontLoader,
  createTestFontLoader,
  loadInterIntoBrowser,
  loadTestFontIntoBrowser,
  TEST_FONT_FAMILY,
} from "./__fixtures__/loaders";
import type { FigmaNodeChange, FigmaTextNodeChange } from "./converter/types";
import { createFigmaConverter } from "./figma";

const FRAME_WIDTH = 320;
const FRAME_HEIGHT = 80;

const mountElement = (html: string): HTMLElement => {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);
  return wrapper.firstElementChild as HTMLElement;
};

const findTextChange = (
  changes: ReadonlyArray<FigmaNodeChange>
): FigmaTextNodeChange => {
  const textChange = changes.find((change) => change.type === "TEXT");
  if (textChange?.type !== "TEXT") {
    throw new Error("expected TEXT node");
  }
  return textChange;
};

beforeAll(async () => {
  await loadTestFontIntoBrowser();
  await loadInterIntoBrowser();
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("text rendering with bundled font", () => {
  it("emits a TEXT node with characters, font family, and computed font size", async () => {
    const element = mountElement(
      `<div style="width:${FRAME_WIDTH}px;height:${FRAME_HEIGHT}px;font-family:'${TEST_FONT_FAMILY}',sans-serif;font-size:24px;color:rgb(0,0,0)">Hello world</div>`
    );

    const figma = createFigmaConverter({ fontLoader: createTestFontLoader() });
    const result = await figma.convert({
      element,
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
    });

    const textChange = result.document.nodeChanges.find(
      (change) => change.type === "TEXT"
    );
    expect(textChange).toBeDefined();
    expect(textChange?.type).toBe("TEXT");
    if (textChange?.type !== "TEXT") {
      return;
    }
    expect(textChange.characters).toBe("Hello world");
    expect(textChange.fontSize).toBe(24);
    expect(textChange.fontName?.family).toBe(TEST_FONT_FAMILY);
    expect(textChange.fontName?.style).toBe("Regular");
  });

  it("derives glyph data from real font bytes", async () => {
    const element = mountElement(
      `<div style="width:${FRAME_WIDTH}px;height:${FRAME_HEIGHT}px;font-family:'${TEST_FONT_FAMILY}',sans-serif;font-size:16px">abc</div>`
    );

    const figma = createFigmaConverter({ fontLoader: createTestFontLoader() });
    const result = await figma.convert({
      element,
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
    });

    const textChange = result.document.nodeChanges.find(
      (change) => change.type === "TEXT"
    );
    if (textChange?.type !== "TEXT") {
      throw new Error("expected TEXT node");
    }

    // fontLineHeight is the font's intrinsic line-height ratio
    // ((asc - desc + gap) / upm), not the user's CSS line-height. Real fonts
    // always have an em ratio >= 1.0 (the box covers a full em plus leading);
    // 2.0 is a comfortable upper bound for display faces.
    const fontMeta = textChange.derivedTextData?.fontMetaData?.[0];
    expect(fontMeta?.fontLineHeight).toBeGreaterThanOrEqual(1);
    expect(fontMeta?.fontLineHeight).toBeLessThan(2);
    // Match Figma's wire format: empty postscript on the meta key, real
    // postscript on the top-level fontName.
    expect(fontMeta?.key.postscript).toBe("");
    expect(textChange.fontName?.postscript).not.toBe("");

    const glyphs = textChange.derivedTextData?.glyphs ?? [];
    expect(glyphs).toHaveLength(3);
    for (const glyph of glyphs) {
      expect(glyph.fontSize).toBe(16);
      expect(glyph.advance).toBeGreaterThan(0);
    }

    // Baselines use [start, end) half-open ranges — endCharacter equals
    // the character count, not count - 1.
    const baseline = textChange.derivedTextData?.baselines?.[0];
    expect(baseline?.firstCharacter).toBe(0);
    expect(baseline?.endCharacter).toBe(3);
  });

  it("emits fixed Figma wire fields and keeps normal text fixed width", async () => {
    // Pin the constants we send unconditionally on the wire. These match
    // what Figma writes itself when copying a TEXT node — see the
    // text-correctness-fixes changeset for the full rationale.
    const element = mountElement(
      `<div style="width:${FRAME_WIDTH}px;height:${FRAME_HEIGHT}px;font-family:'${TEST_FONT_FAMILY}',sans-serif;font-size:16px">abc</div>`
    );

    const figma = createFigmaConverter({ fontLoader: createTestFontLoader() });
    const result = await figma.convert({
      element,
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
    });

    const textChange = result.document.nodeChanges.find(
      (change) => change.type === "TEXT"
    );
    if (textChange?.type !== "TEXT") {
      throw new Error("expected TEXT node");
    }

    // A normal single line can still depend on its fixed box at another
    // viewport, so only explicit pre/nowrap text opts into auto width.
    expect(textChange.textAutoResize).toBeUndefined();
    // Pinned to match Figma's own clipboard output.
    expect(textChange.textBidiVersion).toBe(1);
    expect(textChange.textExplicitLayoutVersion).toBe(1);
    expect(textChange.textUserLayoutVersion).toBe(4);
    // CSS `font-variant-ligatures: normal` enables common+contextual only.
    expect(textChange.fontVariantCommonLigatures).toBe(true);
    expect(textChange.fontVariantContextualLigatures).toBe(true);
    expect(textChange.fontVariantDiscretionaryLigatures).toBe(false);
    // We no longer compute a SHA-1 of the font bytes — see changeset.
    const fontMeta = textChange.derivedTextData?.fontMetaData?.[0];
    expect(fontMeta?.fontDigest).toBeUndefined();
  });

  it("splits multi-line text into per-line baselines with non-overlapping [start, end) ranges", async () => {
    // Force the browser to wrap by clamping the container to roughly one
    // word's worth of width. The baselines pipeline only enters its
    // multi-line branch when the browser itself produced multiple lines.
    const element = mountElement(
      `<div style="width:40px;height:200px;font-family:'${TEST_FONT_FAMILY}',sans-serif;font-size:16px;line-height:20px">abc def ghi</div>`
    );

    const figma = createFigmaConverter({ fontLoader: createTestFontLoader() });
    const result = await figma.convert({
      element,
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
    });

    const textChange = result.document.nodeChanges.find(
      (change) => change.type === "TEXT"
    );
    if (textChange?.type !== "TEXT") {
      throw new Error("expected TEXT node");
    }

    const baselines = textChange.derivedTextData?.baselines ?? [];
    const totalGlyphs = textChange.derivedTextData?.glyphs?.length ?? 0;
    expect(baselines.length).toBeGreaterThanOrEqual(2);

    // Half-open intervals partition the glyph index space: each line's
    // endCharacter is the next line's firstCharacter, and the last line
    // ends at the total glyph count. With the previous off-by-one bug, the
    // gap between consecutive baselines would be 1 instead of 0.
    expect(baselines[0]?.firstCharacter).toBe(0);
    for (let i = 1; i < baselines.length; i += 1) {
      expect(baselines[i]?.firstCharacter).toBe(baselines[i - 1]?.endCharacter);
    }
    expect(baselines.at(-1)?.endCharacter).toBe(totalGlyphs);
  });

  it("propagates font weight into the resolved style name", async () => {
    const element = mountElement(
      `<div style="width:${FRAME_WIDTH}px;height:${FRAME_HEIGHT}px;font-family:'${TEST_FONT_FAMILY}',sans-serif;font-size:16px;font-weight:700">Bold text</div>`
    );

    const figma = createFigmaConverter({ fontLoader: createTestFontLoader() });
    const result = await figma.convert({
      element,
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
    });

    const textChange = result.document.nodeChanges.find(
      (change) => change.type === "TEXT"
    );
    if (textChange?.type !== "TEXT") {
      throw new Error("expected TEXT node");
    }
    expect(textChange.fontName?.style).toBe("Bold");
  });
});

describe("single-line text auto resize", () => {
  for (const whiteSpace of ["pre", "nowrap"] as const) {
    it(`emits WIDTH_AND_HEIGHT for browser-single-line ${whiteSpace} text`, async () => {
      const element = mountElement(
        `<div style="font-family:'${TEST_FONT_FAMILY}',sans-serif;font-size:16px;line-height:20px;white-space:${whiteSpace}">Join beta</div>`
      );
      const range = element.ownerDocument.createRange();
      range.selectNodeContents(element);
      expect(range.getClientRects()).toHaveLength(1);

      const figma = createFigmaConverter({
        fontLoader: createTestFontLoader(),
      });
      const result = await figma.convert({
        element,
        width: FRAME_WIDTH,
        height: FRAME_HEIGHT,
      });

      expect(findTextChange(result.document.nodeChanges).textAutoResize).toBe(
        "WIDTH_AND_HEIGHT"
      );
    });
  }

  it("preserves Portal-style button geometry while making its label auto width", async () => {
    const element = mountElement(
      `<div style="width:141.078px;height:48px;padding:0 36px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;background:rgb(0,0,0)">
        <span style="font-family:'${ALT_TEST_FONT_FAMILY}',sans-serif;font-size:16px;font-weight:600;line-height:20.8px;white-space:pre;color:rgb(255,255,255)">Join beta</span>
      </div>`
    );
    const label = element.querySelector("span");
    if (!label) {
      throw new Error("expected label");
    }
    const elementRect = element.getBoundingClientRect();
    const labelRect = label.getBoundingClientRect();

    const figma = createFigmaConverter({ fontLoader: createInterFontLoader() });
    const result = await figma.convert({
      element,
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
    });
    const changes = result.document.nodeChanges;
    const buttonChange = changes.find((change) => change.guid.localID === 3);
    const textChange = findTextChange(changes);

    expect(elementRect.width).toBeCloseTo(141.078, 1);
    expect(buttonChange?.size?.x).toBeCloseTo(elementRect.width, 3);
    expect(buttonChange?.size?.y).toBeCloseTo(elementRect.height, 3);
    expect(buttonChange).toMatchObject({
      stackMode: "HORIZONTAL",
      stackPrimaryAlignItems: "CENTER",
      stackCounterAlignItems: "CENTER",
    });
    expect(textChange).toMatchObject({
      characters: "Join beta",
      fontSize: 16,
      lineHeight: { value: 20.8, units: "PIXELS" },
      textAutoResize: "WIDTH_AND_HEIGHT",
    });
    expect(textChange.fontName?.family).toBe(ALT_TEST_FONT_FAMILY);
    expect(textChange.transform?.m02).toBeCloseTo(labelRect.left, 3);
    expect(textChange.transform?.m12).toBeCloseTo(labelRect.top, 3);
    const textStackFields = textChange as FigmaTextNodeChange & {
      stackChildPrimaryGrow?: number;
      stackChildAlignSelf?: string;
    };
    expect(textStackFields.stackChildPrimaryGrow).toBeUndefined();
    expect(textStackFields.stackChildAlignSelf).toBe("AUTO");
  });

  it("measures text through the element's iframe realm", async () => {
    const iframe = document.createElement("iframe");
    iframe.srcdoc = `<div style="font-size:16px;line-height:20px;white-space:nowrap">Join beta</div>`;
    document.body.appendChild(iframe);
    await new Promise<void>((resolve) => {
      iframe.addEventListener("load", () => resolve(), { once: true });
    });
    const iframeWindow = iframe.contentWindow;
    const element = iframe.contentDocument?.querySelector("div");
    if (!(iframeWindow && element)) {
      throw new Error("expected iframe text element");
    }
    expect(element.ownerDocument.defaultView).not.toBe(window);

    const figma = createFigmaConverter({ fontLoader: createTestFontLoader() });
    const result = await figma.convert({
      element,
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
    });

    expect(findTextChange(result.document.nodeChanges).textAutoResize).toBe(
      "WIDTH_AND_HEIGHT"
    );
  });

  it.each([
    ["normal single line", "white-space:normal", "Join beta"],
    ["explicit pre newline", "white-space:pre", "Join beta\nNow"],
    [
      "browser-wrapped text",
      "width:40px;white-space:pre-wrap",
      "Join beta now",
    ],
    [
      "ellipsis text",
      "width:40px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis",
      "Join beta now",
    ],
  ])("keeps %s fixed width", async (_name, style, text) => {
    const element = mountElement(
      `<div style="${style};font-family:'${TEST_FONT_FAMILY}',sans-serif;font-size:16px;line-height:20px">${text}</div>`
    );
    const figma = createFigmaConverter({ fontLoader: createTestFontLoader() });
    const result = await figma.convert({
      element,
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
    });

    expect(
      findTextChange(result.document.nodeChanges).textAutoResize
    ).toBeUndefined();
  });
});

describe("text rendering with Inter", () => {
  it("emits a loader's resolved family and requests the text code points", async () => {
    const element = mountElement(
      `<div style="width:${FRAME_WIDTH}px;height:${FRAME_HEIGHT}px;font-family:'${ALT_TEST_FONT_FAMILY}',sans-serif;font-size:16px;font-weight:700;font-style:italic;text-transform:uppercase">baa</div>`
    );
    const fixtureLoader = createTestFontLoader();
    const requests: Array<ReadonlyArray<number> | undefined> = [];
    const figma = createFigmaConverter({
      fontLoader: async (request) => {
        requests.push(request.codePoints);
        return {
          ...(await fixtureLoader(request)),
          resolvedFamily: TEST_FONT_FAMILY,
          resolvedWeight: 400,
          resolvedItalic: false,
        };
      },
    });

    const result = await figma.convert({
      element,
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
    });

    const textChange = result.document.nodeChanges.find(
      (change) => change.type === "TEXT"
    );
    if (textChange?.type !== "TEXT") {
      throw new Error("expected TEXT node");
    }
    expect(requests).toEqual([["A".codePointAt(0), "B".codePointAt(0)]]);
    expect(textChange.fontName?.family).toBe(TEST_FONT_FAMILY);
    expect(textChange.fontName?.style).toBe("Regular");
    expect(textChange.fontName?.postscript).toBe("OpenSans-Regular");
    expect(textChange.derivedTextData?.fontMetaData?.[0]?.key.family).toBe(
      TEST_FONT_FAMILY
    );
  });

  it("emits a TEXT node with one glyph per character", async () => {
    const element = mountElement(
      `<div style="width:${FRAME_WIDTH}px;height:${FRAME_HEIGHT}px;font-family:'${ALT_TEST_FONT_FAMILY}',sans-serif;font-size:16px">office affinity</div>`
    );

    const figma = createFigmaConverter({ fontLoader: createInterFontLoader() });
    const result = await figma.convert({
      element,
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
    });

    const textChange = result.document.nodeChanges.find(
      (change) => change.type === "TEXT"
    );
    if (textChange?.type !== "TEXT") {
      throw new Error("expected TEXT node");
    }
    expect(textChange.characters).toBe("office affinity");
    expect(textChange.fontName?.family).toBe(ALT_TEST_FONT_FAMILY);

    // One glyph per character — no ligature collapsing. The pipeline keys
    // blobs by character (see processGlyphs), so any shaped output would be
    // silently corrupted.
    const glyphs = textChange.derivedTextData?.glyphs ?? [];
    expect(glyphs).toHaveLength("office affinity".length);
  });
});

describe("text-shadow → TEXT node DROP_SHADOW effect", () => {
  it("attaches a drop shadow parsed from the computed text-shadow", async () => {
    const element = mountElement(
      `<div style="width:${FRAME_WIDTH}px;height:${FRAME_HEIGHT}px;font-family:'${TEST_FONT_FAMILY}',sans-serif;font-size:32px;font-weight:700;color:#1d4ed8;text-shadow:5px 5px 0 #f59e0b">Shadow</div>`
    );

    const figma = createFigmaConverter({ fontLoader: createTestFontLoader() });
    const result = await figma.convert({
      element,
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
    });

    const textChange = result.document.nodeChanges.find(
      (change) => change.type === "TEXT"
    );
    if (textChange?.type !== "TEXT") {
      throw new Error("expected TEXT node");
    }

    const effects = textChange.effects ?? [];
    expect(effects).toHaveLength(1);
    const shadow = effects[0];
    expect(shadow?.type).toBe("DROP_SHADOW");
    expect(shadow?.offset).toEqual({ x: 5, y: 5 });
    expect(shadow?.radius).toBe(0);
    // #f59e0b in sRGB 0-1.
    if (shadow?.type === "DROP_SHADOW") {
      expect(shadow.color.r).toBeCloseTo(0.961, 2);
      expect(shadow.color.g).toBeCloseTo(0.62, 2);
      expect(shadow.color.b).toBeCloseTo(0.043, 2);
    }
  });

  it("emits no effects field when the text has no shadow", async () => {
    const element = mountElement(
      `<div style="width:${FRAME_WIDTH}px;height:${FRAME_HEIGHT}px;font-family:'${TEST_FONT_FAMILY}',sans-serif;font-size:32px;color:#1d4ed8">Plain</div>`
    );

    const figma = createFigmaConverter({ fontLoader: createTestFontLoader() });
    const result = await figma.convert({
      element,
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
    });

    const textChange = result.document.nodeChanges.find(
      (change) => change.type === "TEXT"
    );
    if (textChange?.type !== "TEXT") {
      throw new Error("expected TEXT node");
    }
    expect(textChange.effects ?? []).toHaveLength(0);
  });
});

describe("gradient text paint", () => {
  it("uses the measured text box for an angular gradient fill", async () => {
    const element = mountElement(
      `<div style="width:${FRAME_WIDTH}px;height:${FRAME_HEIGHT}px;font-family:'${TEST_FONT_FAMILY}',sans-serif;font-size:32px;color:transparent;background-image:conic-gradient(red 0deg, blue 360deg);background-clip:text">Gradient</div>`
    );

    const result = await createFigmaConverter({
      fontLoader: createTestFontLoader(),
    }).convert({
      element,
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
    });
    const textChange = findTextChange(result.document.nodeChanges);

    expect(textChange.fillPaints).toHaveLength(1);
    expect(textChange.fillPaints?.[0]?.type).toBe("GRADIENT_ANGULAR");
  });
});
