import { afterEach, describe, expect, it } from "vitest";
import { TINY_RED_PNG_DATA_URL } from "./__fixtures__/loaders";
import type { ImageLoader } from "./figma";
import { createFigmaConverter } from "./figma";

const FRAME_WIDTH = 320;
const FRAME_HEIGHT = 200;
const RED_PNG_BYTE_COUNT = 69;
const RED_PNG_SHA1_HEX = "2732f12a8f18d27cf0fa78ef41091bfa1ccec9ce";
const HEX_RADIX = 16;
const HEX_BYTE_WIDTH = 2;
const ASYMMETRIC_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="90" height="46" viewBox="0 0 90 46"><rect width="90" height="46" fill="#fff"/><rect width="18" height="46" fill="#d22"/><circle cx="72" cy="23" r="14" fill="#25c"/></svg>';
const ASYMMETRIC_SVG_DATA_URL = `data:image/svg+xml,${encodeURIComponent(ASYMMETRIC_SVG)}`;

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
  it("emits a prepared CSS raster background as an IMAGE paint", async () => {
    const element = await mountElement(
      `<div style="width:${FRAME_WIDTH}px;height:${FRAME_HEIGHT}px;background-image:url('${TINY_RED_PNG_DATA_URL}');background-repeat:no-repeat;background-size:40px 40px;background-position:20px 30px"></div>`
    );
    const diagnostics: Array<string> = [];

    const result = await createFigmaConverter({
      onBackgroundDiagnostic: (diagnostic) => diagnostics.push(diagnostic.mode),
    }).convert({ element, width: FRAME_WIDTH, height: FRAME_HEIGHT });
    const paint = result.document.nodeChanges
      .flatMap((change) =>
        "fillPaints" in change ? (change.fillPaints ?? []) : []
      )
      .find((candidate) => candidate.type === "IMAGE");

    expect(paint).toMatchObject({
      type: "IMAGE",
      imageScaleMode: "STRETCH",
      originalImageWidth: 1,
      originalImageHeight: 1,
    });
    expect(paint?.transform?.m00).toBeCloseTo(FRAME_WIDTH / 40);
    expect(paint?.transform?.m02).toBeCloseTo(-20 / 40);
    expect(diagnostics).toContain("native");
  });

  it("rasterizes one-axis repetition into one bounded IMAGE paint", async () => {
    const element = await mountElement(
      `<div style="width:${FRAME_WIDTH}px;height:${FRAME_HEIGHT}px;background-image:url('${TINY_RED_PNG_DATA_URL}');background-repeat:repeat-x;background-size:20px 20px"></div>`
    );
    const diagnostics: Array<string> = [];

    const result = await createFigmaConverter({
      onBackgroundDiagnostic: (diagnostic) => diagnostics.push(diagnostic.mode),
    }).convert({ element, width: FRAME_WIDTH, height: FRAME_HEIGHT });
    const imagePaints = result.document.nodeChanges.flatMap((change) =>
      "fillPaints" in change
        ? (change.fillPaints ?? []).filter((paint) => paint.type === "IMAGE")
        : []
    );

    expect(imagePaints).toHaveLength(1);
    expect(imagePaints[0]).toMatchObject({
      type: "IMAGE",
      imageScaleMode: "STRETCH",
      originalImageWidth: FRAME_WIDTH,
      originalImageHeight: FRAME_HEIGHT,
    });
    expect(diagnostics).toContain("raster-fallback");
  });

  it("passes cancellation into capture-state rasterization", async () => {
    const element = await mountElement(
      `<div style="box-sizing:border-box;width:${FRAME_WIDTH}px;height:${FRAME_HEIGHT}px;border:4px solid black;background-image:url('${TINY_RED_PNG_DATA_URL}');background-repeat:no-repeat;background-size:20px 20px"></div>`
    );
    const controller = new AbortController();
    let receivedSignal: AbortSignal | undefined;

    await createFigmaConverter({
      async backgroundRasterizer(request) {
        receivedSignal = request.signal;
        return {
          bytes: await (await fetch(TINY_RED_PNG_DATA_URL)).arrayBuffer(),
          mimeType: "image/png",
        };
      },
    }).convert(
      { element, width: FRAME_WIDTH, height: FRAME_HEIGHT },
      controller.signal
    );

    expect(receivedSignal).toBe(controller.signal);
  });

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

  it("emits consumer-visible paint semantics for every object-fit mode", async () => {
    const element = await mountElement(`
      <div style="width:900px;height:700px">
        <img data-case="fill" src="${ASYMMETRIC_SVG_DATA_URL}" style="display:block;width:200px;height:100px;object-fit:fill">
        <img data-case="contain" src="${ASYMMETRIC_SVG_DATA_URL}" style="display:block;width:200px;height:100px;object-fit:contain;object-position:center">
        <img data-case="cover" src="${ASYMMETRIC_SVG_DATA_URL}" style="display:block;width:100px;height:100px;object-fit:cover;object-position:center">
        <img data-case="none" src="${ASYMMETRIC_SVG_DATA_URL}" style="display:block;width:200px;height:100px;object-fit:none;object-position:right bottom">
        <img data-case="scale-down" src="${ASYMMETRIC_SVG_DATA_URL}" style="display:block;width:200px;height:100px;object-fit:scale-down;object-position:left top">
        <img data-case="cover-positioned" src="${ASYMMETRIC_SVG_DATA_URL}" style="display:block;width:100px;height:100px;object-fit:cover;object-position:right top">
      </div>
    `);

    const result = await createFigmaConverter().convert({
      element,
      width: 900,
      height: 700,
    });
    const paints = imagePaints(result.document.nodeChanges);

    expect(paints).toHaveLength(6);
    expect(paints[0]).toMatchObject({
      imageScaleMode: "STRETCH",
      transform: { m00: 1, m02: 0, m11: 1, m12: 0 },
      originalImageWidth: 90,
      originalImageHeight: 46,
    });
    expect(paints[1]).toMatchObject({ imageScaleMode: "FIT" });
    expect(paints[2]).toMatchObject({ imageScaleMode: "FILL" });
    expect(paints[3]?.imageScaleMode).toBe("STRETCH");
    expect(paints[3]?.transform?.m00).toBeCloseTo(200 / 90);
    expect(paints[3]?.transform?.m02).toBeCloseTo(-110 / 90);
    expect(paints[3]?.transform?.m11).toBeCloseTo(100 / 46);
    expect(paints[3]?.transform?.m12).toBeCloseTo(-54 / 46);
    expect(paints[4]).toMatchObject({
      imageScaleMode: "STRETCH",
      transform: { m00: 200 / 90, m02: 0, m11: 100 / 46, m12: 0 },
    });
    expect(paints[5]?.imageScaleMode).toBe("STRETCH");
    expect(paints[5]?.transform?.m00).toBeCloseTo(46 / 90);
    expect(paints[5]?.transform?.m02).toBeCloseTo(1 - 46 / 90);
  });

  it("keeps a 90 by 46 contain image complete and left-aligned in a 273 by 52 box", async () => {
    const element = await mountElement(
      `<div style="width:320px;height:100px"><img src="${ASYMMETRIC_SVG_DATA_URL}" style="display:block;width:273px;height:52px;object-fit:contain;object-position:left center"></div>`
    );

    const result = await createFigmaConverter().convert({
      element,
      width: 320,
      height: 100,
    });
    const paint = imagePaints(result.document.nodeChanges)[0];

    expect(paint).toMatchObject({
      imageScaleMode: "STRETCH",
      originalImageWidth: 90,
      originalImageHeight: 46,
    });
    expect(paint?.transform?.m00).toBeCloseTo(273 / (90 * (52 / 46)));
    expect(paint?.transform?.m02).toBe(0);
    expect(paint?.transform?.m11).toBeCloseTo(1);
    expect(paint?.transform?.m12).toBe(0);
  });

  it("deduplicates one source while preserving per-node presentation", async () => {
    const element = await mountElement(`
      <div style="width:500px;height:200px">
        <img src="https://example.test/asymmetric.svg" style="display:block;width:200px;height:100px;object-fit:contain;object-position:left center">
        <img src="https://example.test/asymmetric.svg" style="display:block;width:100px;height:100px;object-fit:cover;object-position:right center">
      </div>
    `);
    const bytes = new TextEncoder().encode(ASYMMETRIC_SVG).buffer;
    let directLoads = 0;
    const directLoader: ImageLoader = () => {
      directLoads += 1;
      return Promise.resolve({ bytes, mimeType: "image/svg+xml" });
    };
    const direct = await createFigmaConverter({
      imageLoader: directLoader,
    }).convert({ element, width: 500, height: 200 });

    expect(directLoads).toBe(1);
    expect(imagePaints(direct.document.nodeChanges)).toHaveLength(2);
    expect(direct.document.blobs).toHaveLength(1);
  });

  it("uses a frozen background resolver only when computed style has no image", async () => {
    const element = await mountElement(
      '<div data-bg-source="https://example.test/lazy-background.png" style="width:120px;height:80px"></div>'
    );
    const bytes = await (await fetch(TINY_RED_PNG_DATA_URL)).arrayBuffer();
    let requested = "";
    const result = await createFigmaConverter({
      imageLoader: (request) => {
        requested = request.src;
        return Promise.resolve({ bytes, mimeType: "image/png" });
      },
      backgroundImageResolver: (candidate) => {
        const source = candidate.getAttribute("data-bg-source");
        return source ? `url("${source}")` : null;
      },
    }).convert({ element, width: 120, height: 80 });

    const paint = result.document.nodeChanges
      .filter((change) => change.type === "FRAME")
      .flatMap((change) => change.fillPaints ?? [])
      .find((candidate) => candidate.type === "IMAGE");

    expect(requested).toBe("https://example.test/lazy-background.png");
    expect(paint?.type).toBe("IMAGE");
    expect(element.style.backgroundImage).toBe("");

    const loadedElement = await mountElement(
      '<div style="width:120px;height:80px;background-image:url(https://example.test/loaded.png)" data-bg-source="https://example.test/lazy-background.png"></div>'
    );
    let resolverCalls = 0;
    await createFigmaConverter({
      backgroundImageResolver: () => {
        resolverCalls += 1;
        return 'url("https://example.test/lazy-background.png")';
      },
      imageLoader: () => Promise.resolve({ bytes, mimeType: "image/png" }),
    }).convert({ element: loadedElement, width: 120, height: 80 });
    expect(resolverCalls).toBe(0);
  });
});

function imagePaints(
  nodeChanges: Awaited<
    ReturnType<ReturnType<typeof createFigmaConverter>["convert"]>
  >["document"]["nodeChanges"]
) {
  return nodeChanges.flatMap((change) => {
    if (change.type !== "ROUNDED_RECTANGLE" || change.name !== "Image") {
      return [];
    }
    return change.fillPaints?.filter((paint) => paint.type === "IMAGE") ?? [];
  });
}
