import { describe, expect, it } from "vitest";

import { prepareCjkLineBreaks } from "./text-line-breaks";

describe("CJK line break preparation", () => {
  it("records the browser's current wrapped lines and restores the node", () => {
    document.body.innerHTML =
      '<div id="target" style="width: 90px; font: 16px Arial; white-space: normal;">這是一段連續的中文文字用來測試瀏覽器換行</div>';
    const target = document.querySelector("#target");
    if (!(target instanceof HTMLElement)) {
      throw new Error("target not found");
    }
    const textNode = target.firstChild;
    if (!(textNode instanceof Text)) {
      throw new Error("text node not found");
    }
    const originalText = textNode.data;
    const originalWhiteSpace = target.style.whiteSpace;

    const preparation = prepareCjkLineBreaks(target);

    expect(preparation.diagnostics.measuredNodes).toBe(1);
    expect(preparation.diagnostics.changedNodes).toBeGreaterThanOrEqual(1);
    expect(textNode.data).toContain("\n");
    expect(target.style.whiteSpace).toBe("pre-line");

    preparation.restore();

    expect(textNode.data).toBe(originalText);
    expect(target.style.whiteSpace).toBe(originalWhiteSpace);
  });

  it("does not call Range measurement when disabled", () => {
    document.body.innerHTML =
      '<div style="width: 90px; font: 16px Arial;">這是一段連續的中文文字</div>';
    const originalCreateRange = document.createRange.bind(document);
    let rangeCalls = 0;
    document.createRange = (() => {
      rangeCalls += 1;
      return originalCreateRange();
    }) as typeof document.createRange;

    try {
      const preparation = prepareCjkLineBreaks(document.body, "off");
      expect(rangeCalls).toBe(0);
      expect(preparation.diagnostics.measuredNodes).toBe(0);
    } finally {
      document.createRange = originalCreateRange;
    }
  });

  it("leaves explicit newlines untouched", () => {
    document.body.innerHTML =
      '<div style="font: 16px Arial; white-space: pre-line;">中文\n第二行</div>';
    const element = document.body.firstElementChild;
    if (!(element instanceof HTMLElement)) {
      throw new Error("element not found");
    }
    const original = element.textContent;

    const preparation = prepareCjkLineBreaks(element);

    expect(element.textContent).toBe(original);
    expect(preparation.diagnostics.changedNodes).toBe(0);
  });
});
