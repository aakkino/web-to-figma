/**
 * Border conversion regressions that need a real browser's computed styles
 * (e.g. `border-style: double`, which Chromium resolves the same way the
 * oracle ground truth is captured).
 */

import { openComposedDomTree } from "@figit/composed-dom";
import { describe, expect, it } from "vitest";
import type { FigmaFrameNodeChange, FigmaNodeChange } from "./converter/types";
import { createFigmaConverter } from "./figma";

type AnyNode = FigmaNodeChange & Record<string, unknown>;

async function convert(html: string): Promise<Array<AnyNode>> {
  const wrapper = document.createElement("div");
  wrapper.style.width = "240px";
  wrapper.style.height = "160px";
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);
  try {
    const figma = createFigmaConverter({ layout: "auto" });
    const result = await figma.convert({
      element: wrapper,
      width: 240,
      height: 160,
      name: "border",
    });
    return result.document.nodeChanges as Array<AnyNode>;
  } finally {
    wrapper.remove();
  }
}

const OUTER = "background:#fff;box-sizing:border-box;padding:20px";
const INNER = "width:160px;height:80px;background:#fef3c7";
const scene = (border: string) =>
  `<div style="width:240px;height:160px;${OUTER}"><div style="${INNER};border:${border}"></div></div>`;

describe("double border conversion", () => {
  it("splits a uniform 8px double border into two concentric 3px strokes", async () => {
    const nodes = await convert(scene("8px double #b45309"));

    const inner = nodes.find((n) => n.name === "Border (inner)") as
      | FigmaFrameNodeChange
      | undefined;
    expect(inner, "synthetic inner-line node emitted").toBeDefined();
    if (!inner) {
      return;
    }

    // Chrome renders 8px double as 3px line / 2px gap / 3px line.
    expect(inner.type).toBe("FRAME");
    expect(inner.strokeWeight).toBe(3);
    expect(inner.strokeAlign).toBe("INSIDE");
    expect(inner.fillPaints).toEqual([]);
    // Inset by outer line + gap = 8 - 3 = 5 on every side.
    expect(inner.size).toEqual({ x: 166, y: 86 });
    expect(inner.transform?.m02).toBe(5);
    expect(inner.transform?.m12).toBe(5);

    // The bordered frame keeps only the outer 3px line and parents the inner.
    const frame = nodes.find(
      (n) => n.guid.localID === inner.parentIndex?.guid.localID
    ) as FigmaFrameNodeChange | undefined;
    expect(frame, "inner line is parented to the bordered frame").toBeDefined();
    expect(frame?.strokeWeight).toBe(3);
    expect(frame?.size).toEqual({ x: 176, y: 96 });
    // Both lines share the same border color.
    expect(inner.strokePaints).toEqual(frame?.strokePaints);
    expect(inner.strokePaints?.length).toBe(1);
  });

  it("leaves a solid border as a single full-width stroke", async () => {
    const nodes = await convert(scene("8px solid #b45309"));

    expect(nodes.some((n) => n.name === "Border (inner)")).toBe(false);
    const frame = nodes.find(
      (n): n is FigmaFrameNodeChange =>
        n.type === "FRAME" &&
        (n as FigmaFrameNodeChange).size?.x === 176 &&
        Boolean((n as FigmaFrameNodeChange).strokePaints?.length)
    );
    expect(frame?.strokeWeight).toBe(8);
  });

  it("keeps the inner line absolute and reserves real-child ordering in Auto Layout", async () => {
    const nodes = await convert(
      `<div style="display:flex;width:220px;height:140px;border:8px double #b45309;border-radius:16px;box-sizing:border-box;padding:12px">
        <div style="width:40px;height:30px;background:#2563eb"></div>
      </div>`
    );
    const inner = nodes.find((node) => node.name === "Border (inner)") as
      | FigmaFrameNodeChange
      | undefined;
    const parent = nodes.find(
      (node) => node.guid.localID === inner?.parentIndex?.guid.localID
    ) as FigmaFrameNodeChange | undefined;
    const realChild = nodes.find(
      (node) =>
        node.parentIndex?.guid.localID === parent?.guid.localID &&
        node.name !== "Border (inner)"
    );

    expect(parent?.stackMode).toBe("HORIZONTAL");
    expect(inner?.stackPositioning).toBe("ABSOLUTE");
    expect(inner?.cornerRadius).toBe(11);
    expect(inner?.parentIndex?.position).toBe("0");
    expect(realChild?.parentIndex?.position).toBe("1");
  });

  it("does not synthesize an inner line for non-uniform per-side borders", async () => {
    const nodes = await convert(
      scene(
        "8px double #b45309;border-right-style:solid;border-right-color:#2563eb"
      )
    );

    expect(nodes.some((node) => node.name === "Border (inner)")).toBe(false);
  });

  it("reserves the synthetic slot when real children come from Shadow DOM", async () => {
    const host = document.createElement("div");
    host.style.cssText =
      "display:flex;width:200px;height:100px;border:8px double #b45309;box-sizing:border-box";
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML =
      '<div style="width:40px;height:30px;background:#2563eb"></div>';
    document.body.append(host);

    try {
      const result = await createFigmaConverter({
        domTraversal: openComposedDomTree,
        layout: "auto",
      }).convert({ element: host, width: 200, height: 100 });
      const nodes = result.document.nodeChanges as Array<AnyNode>;
      const inner = nodes.find((node) => node.name === "Border (inner)");
      const parent = nodes.find(
        (node) => node.guid.localID === inner?.parentIndex?.guid.localID
      );
      const realChild = nodes.find(
        (node) =>
          node.parentIndex?.guid.localID === parent?.guid.localID &&
          node.name !== "Border (inner)"
      );

      expect(inner?.parentIndex?.position).toBe("0");
      expect(realChild?.parentIndex?.position).toBe("1");
    } finally {
      host.remove();
    }
  });
});
