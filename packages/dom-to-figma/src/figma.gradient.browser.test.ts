import { afterEach, describe, expect, it } from "vitest";
import type { FigmaFrameNodeChange } from "./converter/types";
import { createFigmaConverter } from "./figma";

const mountElement = (html: string): HTMLElement => {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);
  return wrapper.firstElementChild as HTMLElement;
};

afterEach(() => {
  document.body.innerHTML = "";
});

describe("gradient frame paint", () => {
  it("emits conic and repeating gradients in the browser payload", async () => {
    const element = mountElement(
      `<div style="width:240px;height:160px">
        <div style="width:120px;height:60px;background-image:conic-gradient(red 0deg, blue 360deg)"></div>
        <div style="width:120px;height:60px;background-image:repeating-linear-gradient(90deg, red 0px, red 10px, blue 10px, blue 20px)"></div>
      </div>`
    );
    const result = await createFigmaConverter({ layout: "absolute" }).convert({
      element,
      width: 240,
      height: 160,
    });
    const frames = result.document.nodeChanges.filter(
      (change): change is FigmaFrameNodeChange => change.type === "FRAME"
    );
    const paints = frames.flatMap((frame) => frame.fillPaints ?? []);
    const angular = paints.find((paint) => paint.type === "GRADIENT_ANGULAR");
    const repeating = paints.find(
      (paint) => paint.type === "GRADIENT_LINEAR" && paint.stops.length > 4
    );

    expect(angular?.type).toBe("GRADIENT_ANGULAR");
    expect(repeating?.type).toBe("GRADIENT_LINEAR");
    if (repeating?.type === "GRADIENT_LINEAR") {
      expect(repeating.stops[0]?.position).toBe(0);
      expect(repeating.stops.at(-1)?.position).toBeCloseTo(1, 10);
    }
  });
});
