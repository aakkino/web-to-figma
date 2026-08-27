import { openComposedDomTree } from "@aakkino/composed-dom";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  createTestFontLoader,
  loadTestFontIntoBrowser,
  TEST_FONT_FAMILY,
  TINY_RED_PNG_DATA_URL,
} from "./__fixtures__/loaders";
import { createFigmaConverter } from "./figma";

const FRAME_WIDTH = 320;
const FRAME_HEIGHT = 180;
const SHADOW_PADDING = 12;
const RAW_TEXT_HEIGHT = 40;

beforeAll(async () => {
  await loadTestFontIntoBrowser();
});

afterEach(() => {
  document.body.innerHTML = "";
});

async function mountShadowHost(): Promise<HTMLElement> {
  const host = document.createElement("article");
  host.style.cssText = `width:${FRAME_WIDTH}px;height:${FRAME_HEIGHT}px;`;
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <div style="display:flex;width:100%;height:100%;gap:${SHADOW_PADDING}px;padding:${SHADOW_PADDING}px;box-sizing:border-box;background:#f3f4f6">
      <div style="width:96px;height:96px;flex:none">
        <img src="${TINY_RED_PNG_DATA_URL}" width="96" height="96" alt="red" />
      </div>
      <div style="font-family:${TEST_FONT_FAMILY};font-size:16px;line-height:24px">
        <slot name="title"></slot>
      </div>
    </div>`;

  const projected = document.createElement("span");
  projected.slot = "title";
  projected.textContent = "Projected title";
  host.append(projected, document.createTextNode('bottom-title-name="date"'));
  document.body.append(host);

  const image = shadow.querySelector("img");
  if (image && !image.complete) {
    await new Promise<void>((resolve) => {
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener("error", () => resolve(), { once: true });
    });
  }
  return host;
}

describe("Shadow DOM conversion", () => {
  it("keeps light DOM as the default traversal", async () => {
    const element = await mountShadowHost();
    const result = await createFigmaConverter({
      fontLoader: createTestFontLoader(),
    }).convert({
      element,
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
    });

    const imageNodes = result.document.nodeChanges.filter(
      (change) =>
        change.type === "ROUNDED_RECTANGLE" &&
        change.fillPaints?.some((paint) => paint.type === "IMAGE")
    );
    const textCharacters = result.document.nodeChanges
      .filter((change) => change.type === "TEXT")
      .map((change) => change.characters)
      .join(" ");

    expect(imageNodes).toHaveLength(0);
    expect(textCharacters).toContain('bottom-title-name="date"');
  });

  it("walks open shadow roots and projects assigned slot content", async () => {
    const element = await mountShadowHost();
    const result = await createFigmaConverter({
      fontLoader: createTestFontLoader(),
      domTraversal: openComposedDomTree,
    }).convert({
      element,
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
    });

    const changes = result.document.nodeChanges;
    const imageNodes = changes.filter(
      (change) =>
        change.type === "ROUNDED_RECTANGLE" &&
        change.fillPaints?.some((paint) => paint.type === "IMAGE")
    );
    const textCharacters = changes
      .filter((change) => change.type === "TEXT")
      .map((change) => change.characters)
      .join(" ");

    expect(imageNodes).toHaveLength(1);
    expect(textCharacters).toContain("Projected title");
    expect(textCharacters).not.toContain("bottom-title-name");

    const image = imageNodes[0];
    const imageParent = changes.find(
      (change) => change.guid.localID === image?.parentIndex?.guid.localID
    );
    const shadowLayout = changes.find(
      (change) =>
        change.guid.localID === imageParent?.parentIndex?.guid.localID &&
        change.type === "FRAME"
    );
    expect(image?.transform?.m02).toBe(0);
    expect(image?.transform?.m12).toBe(0);
    expect(imageParent?.transform?.m02).toBe(SHADOW_PADDING);
    expect(imageParent?.transform?.m12).toBe(SHADOW_PADDING);
    expect(
      shadowLayout?.type === "FRAME" ? shadowLayout.stackMode : undefined
    ).toBe("HORIZONTAL");
  });

  it("styles raw slotted text from its composed parent", async () => {
    const host = document.createElement("article");
    host.style.cssText = `width:${FRAME_WIDTH}px;height:${RAW_TEXT_HEIGHT}px;color:rgb(0,0,255);font-family:${TEST_FONT_FAMILY}`;
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML =
      '<div style="color:rgb(255,0,0);font-size:16px"><slot></slot></div>';
    host.append(document.createTextNode("raw slotted text"));
    document.body.append(host);

    const result = await createFigmaConverter({
      fontLoader: createTestFontLoader(),
      domTraversal: openComposedDomTree,
    }).convert({
      element: host,
      width: FRAME_WIDTH,
      height: RAW_TEXT_HEIGHT,
    });

    const text = result.document.nodeChanges.find(
      (change) => change.type === "TEXT"
    );
    const solid = text?.fillPaints?.find((paint) => paint.type === "SOLID");
    expect(solid?.type === "SOLID" ? solid.color.r : undefined).toBeCloseTo(1);
    expect(solid?.type === "SOLID" ? solid.color.b : undefined).toBeCloseTo(0);
  });
});
