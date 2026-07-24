import { afterEach, describe, expect, it } from "vitest";
import { TINY_RED_PNG_DATA_URL } from "./__fixtures__/loaders";
import type { ImageLoader } from "./figma";
import { createFigmaConverter, createImagePreparation } from "./figma";

const FRAME_WIDTH = 320;
const FRAME_HEIGHT = 200;
const RED_PNG_BYTE_COUNT = 69;
const RED_PNG_SHA1_HEX = "2732f12a8f18d27cf0fa78ef41091bfa1ccec9ce";
const HEX_RADIX = 16;
const HEX_BYTE_WIDTH = 2;

const mountElement = (html: string): Promise<HTMLElement> => {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);
  const element = wrapper.firstElementChild as HTMLElement;

  // Wait for any nested <img> elements to load before assertions hit
  // `getBoundingClientRect`, otherwise width/height come back as 0.
  const images = Array.from(element.querySelectorAll("img"));
  const pending = images
    .filter((img) => !img.complete)
    .map(
      (img) =>
        new Promise<void>((resolve) => {
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        })
    );
  return Promise.all(pending).then(() => element);
};

const toHex = (bytes: ReadonlyArray<number>): string =>
  bytes
    .map((byte) => byte.toString(HEX_RADIX).padStart(HEX_BYTE_WIDTH, "0"))
    .join("");

afterEach(() => {
  document.body.innerHTML = "";
});

describe("image rendering with inline PNG", () => {
  it("emits an IMAGE fillPaint and registers the image bytes as a blob", async () => {
    const element = await mountElement(
      `<div style="width:${FRAME_WIDTH}px;height:${FRAME_HEIGHT}px"><img src="${TINY_RED_PNG_DATA_URL}" width="40" height="40" alt="red"></div>`
    );

    const figma = createFigmaConverter();
    const result = await figma.convert({
      element,
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
    });

    const imageNode = result.document.nodeChanges.find(
      (change) => change.type === "ROUNDED_RECTANGLE" && change.name === "Image"
    );
    expect(imageNode?.type).toBe("ROUNDED_RECTANGLE");
    if (imageNode?.type !== "ROUNDED_RECTANGLE") {
      return;
    }

    const imageFill = imageNode.fillPaints?.find(
      (paint) => paint.type === "IMAGE"
    );
    expect(imageFill?.type).toBe("IMAGE");
    if (imageFill?.type !== "IMAGE") {
      return;
    }

    expect(imageFill.image.dataBlob).toBeTypeOf("number");
    expect(toHex(imageFill.image.hash)).toBe(RED_PNG_SHA1_HEX);

    const blob = result.document.blobs[imageFill.image.dataBlob ?? -1];
    expect(blob).toBeDefined();
    expect(blob?.bytes).toHaveLength(RED_PNG_BYTE_COUNT);
  });

  it("preserves the rendered image dimensions on the node", async () => {
    const element = await mountElement(
      `<div style="width:${FRAME_WIDTH}px;height:${FRAME_HEIGHT}px"><img src="${TINY_RED_PNG_DATA_URL}" width="50" height="30" alt="red"></div>`
    );

    const figma = createFigmaConverter();
    const result = await figma.convert({
      element,
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
    });

    const imageNode = result.document.nodeChanges.find(
      (change) => change.type === "ROUNDED_RECTANGLE" && change.name === "Image"
    );
    expect(imageNode?.size).toEqual({ x: 50, y: 30 });
  });

  it("reuses a fully prepared image and does not load it during conversion", async () => {
    const element = await mountElement(
      `<div style="width:${FRAME_WIDTH}px;height:${FRAME_HEIGHT}px"><img src="${TINY_RED_PNG_DATA_URL}" width="40" height="40" alt="red"></div>`
    );
    const image = element.querySelector("img");
    if (!image) {
      throw new Error("image not found");
    }
    const bytes = decodeDataUrl(TINY_RED_PNG_DATA_URL);
    let loadCount = 0;
    const imageLoader: ImageLoader = () => {
      loadCount += 1;
      return Promise.resolve({ bytes, mimeType: "image/png" });
    };
    const imagePreparation = createImagePreparation(imageLoader);
    await imagePreparation.prepare({
      src: image.currentSrc || image.src,
      element: image,
    });
    const figma = createFigmaConverter({ imageLoader, imagePreparation });

    await figma.convert({
      element,
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
    });

    expect(loadCount).toBe(1);
  });

  it("uses the frozen element mapping when an image source changes late", async () => {
    const element = await mountElement(
      `<div style="width:${FRAME_WIDTH}px;height:${FRAME_HEIGHT}px"><img src="${TINY_RED_PNG_DATA_URL}" width="40" height="40" alt="red"></div>`
    );
    const image = element.querySelector("img");
    if (!image) {
      throw new Error("image not found");
    }
    const imagePreparation = createImagePreparation(async () => ({
      bytes: decodeDataUrl(TINY_RED_PNG_DATA_URL),
      mimeType: "image/png",
    }));
    await imagePreparation.prepare({
      src: image.currentSrc || image.src,
      element: image,
    });
    image.src = "https://example.test/late-change.png";

    const result = await createFigmaConverter({ imagePreparation }).convert({
      element,
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
    });

    expect(
      result.document.nodeChanges.some(
        (change) =>
          change.type === "ROUNDED_RECTANGLE" && change.name === "Image"
      )
    ).toBe(true);
    expect(result.document.blobs).toHaveLength(1);
  });

  it("renders a transparent named placeholder without registering a blob", async () => {
    const element = await mountElement(
      `<div style="width:${FRAME_WIDTH}px;height:${FRAME_HEIGHT}px"><img src="${TINY_RED_PNG_DATA_URL}" width="50" height="30" alt="red"></div>`
    );
    const image = element.querySelector("img");
    if (!image) {
      throw new Error("image not found");
    }
    const imageLoader: ImageLoader = () =>
      Promise.reject(new Error("placeholder must not load"));
    const imagePreparation = createImagePreparation(imageLoader);
    imagePreparation.setPlaceholder(
      { src: image.currentSrc || image.src },
      "user-skipped"
    );
    const figma = createFigmaConverter({ imageLoader, imagePreparation });
    const result = await figma.convert({
      element,
      width: FRAME_WIDTH,
      height: FRAME_HEIGHT,
    });

    const imageNode = result.document.nodeChanges.find(
      (change) =>
        change.type === "ROUNDED_RECTANGLE" && change.name === "Image (skipped)"
    );
    expect(imageNode?.type).toBe("ROUNDED_RECTANGLE");
    if (imageNode?.type !== "ROUNDED_RECTANGLE") {
      return;
    }
    expect(imageNode?.size).toEqual({ x: 50, y: 30 });
    expect(imageNode.fillPaints).toBeUndefined();
    expect(result.document.blobs).toHaveLength(0);
  });
});

function decodeDataUrl(dataUrl: string): ArrayBuffer {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}
