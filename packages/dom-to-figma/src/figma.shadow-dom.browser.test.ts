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
  it("walks open shadow roots and projects assigned slot content", async () => {
    const element = await mountShadowHost();
    const result = await createFigmaConverter({
      fontLoader: createTestFontLoader(),
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
    expect(image?.transform?.m02).toBe(0);
    expect(image?.transform?.m12).toBe(0);
    expect(imageParent?.transform?.m02).toBe(SHADOW_PADDING);
    expect(imageParent?.transform?.m12).toBe(SHADOW_PADDING);
  });
});
