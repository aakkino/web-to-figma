import { afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  createTestFontLoader,
  loadTestFontIntoBrowser,
  TEST_FONT_FAMILY,
} from "./__fixtures__/loaders";
import type { DomTraversalStrategy } from "./figma";
import { createFigmaConverter } from "./figma";

const ROOT_LEFT = 20;
const ROOT_TOP = 30;
const CHILD_LEFT = 32;
const CHILD_TOP = 44;

beforeAll(async () => {
  await loadTestFontIntoBrowser();
});

afterEach(() => {
  document.body.innerHTML = "";
});

describe("DOM traversal injection", () => {
  it("preserves custom classifier text-content behavior", async () => {
    const root = document.createElement("div");
    root.style.cssText = `font-family:${TEST_FONT_FAMILY};font-size:16px`;
    root.innerHTML = "prefix <strong>nested text</strong>";
    document.body.append(root);

    const result = await createFigmaConverter({
      classify(element, defaultKind) {
        return element === root ? "text" : defaultKind;
      },
      fontLoader: createTestFontLoader(),
      layout: "absolute",
    }).convert({ element: root, width: 200, height: 40 });

    const textNodes = result.document.nodeChanges.filter(
      (change) => change.type === "TEXT"
    );
    expect(textNodes.map((change) => change.characters)).toEqual([
      "prefix nested text",
    ]);
  });

  it("reads plain-text content from the selected strategy", async () => {
    const root = document.createElement("span");
    root.style.cssText = `font-family:${TEST_FONT_FAMILY};font-size:16px`;
    root.append("light text");
    document.body.append(root);
    const composedText = document.createTextNode("composed text");
    const domTraversal: DomTraversalStrategy = {
      children(parent) {
        return parent === root
          ? [{ node: composedText, composedParent: root }]
          : [];
      },
    };

    const result = await createFigmaConverter({
      domTraversal,
      fontLoader: createTestFontLoader(),
      layout: "absolute",
    }).convert({ element: root, width: 200, height: 40 });

    const textNodes = result.document.nodeChanges.filter(
      (change) => change.type === "TEXT"
    );
    expect(textNodes.map((change) => change.characters)).toEqual([
      "composed text",
    ]);
  });

  it("uses one strategy for classification and emits repeated nodes once", async () => {
    const root = document.createElement("div");
    root.style.cssText = `position:absolute;left:${ROOT_LEFT}px;top:${ROOT_TOP}px;width:200px;height:80px`;
    root.append("light-only text");

    const staging = document.createElement("div");
    const composedChild = document.createElement("span");
    composedChild.style.cssText = `position:absolute;left:${CHILD_LEFT}px;top:${CHILD_TOP}px;font-family:${TEST_FONT_FAMILY};font-size:16px`;
    composedChild.textContent = "Composed once";
    staging.append(composedChild);
    document.body.append(root, staging);

    const domTraversal: DomTraversalStrategy = {
      children(parent) {
        if (parent === root) {
          const child = { node: composedChild, composedParent: root };
          return [child, child];
        }
        return Array.from(parent.childNodes, (node) => ({
          node,
          composedParent: parent,
        }));
      },
    };

    const result = await createFigmaConverter({
      domTraversal,
      fontLoader: createTestFontLoader(),
      layout: "absolute",
    }).convert({ element: root, width: 200, height: 80 });

    const textNodes = result.document.nodeChanges.filter(
      (change) => change.type === "TEXT"
    );
    expect(textNodes.map((change) => change.characters)).toEqual([
      "Composed once",
    ]);
    expect(textNodes[0]?.transform?.m02).toBe(CHILD_LEFT - ROOT_LEFT);
    expect(textNodes[0]?.transform?.m12).toBe(CHILD_TOP - ROOT_TOP);
  });
});
