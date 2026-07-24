import { describe, expect, it } from "vitest";

import {
  analyzeCaptureTarget,
  revalidateCapturePlan,
} from "./resource-inventory";

const THREE_IMAGE_NODES = 3;
const TWO_IMAGE_RESOURCES = 2;
const ONE_UNSUPPORTED_BACKGROUND = 1;

describe("capture resource inventory", () => {
  it("counts composed img nodes and unique currentSrc resources without fetching", () => {
    document.body.innerHTML =
      '<div id="root" style="background-image: url(https://example.test/background.png)"></div>';
    const root = document.querySelector("#root");
    if (!(root instanceof HTMLElement)) {
      throw new Error("root not found");
    }
    const first = document.createElement("img");
    const second = document.createElement("img");
    const shadowHost = document.createElement("div");
    const shadow = shadowHost.attachShadow({ mode: "open" });
    const shadowImage = document.createElement("img");
    root.append(first, second, shadowHost);
    shadow.append(shadowImage);
    defineCurrentSrc(first, "https://example.test/shared.png");
    defineCurrentSrc(second, "https://example.test/shared.png");
    defineCurrentSrc(shadowImage, "https://example.test/shadow.png");

    let fetchCalls = 0;
    const previousFetch = globalThis.fetch;
    globalThis.fetch = (() => {
      fetchCalls += 1;
      return Promise.reject(new Error("analysis must not fetch"));
    }) as typeof fetch;
    try {
      const inventory = analyzeCaptureTarget({ element: root });
      expect(inventory.analysis.plan.imageNodeCount).toBe(THREE_IMAGE_NODES);
      expect(inventory.analysis.plan.uniqueImageResourceCount).toBe(
        TWO_IMAGE_RESOURCES
      );
      expect(inventory.analysis.plan.unsupportedBackgroundImageCount).toBe(
        ONE_UNSUPPORTED_BACKGROUND
      );
      expect(fetchCalls).toBe(0);
      expect(inventory.resources[0]?.nodeCount).toBe(2);
    } finally {
      globalThis.fetch = previousFetch;
    }
  });

  it("requires review when the resource set changes but only updates counts for references", () => {
    document.body.innerHTML = '<div id="root"><img src="/one.png"></div>';
    const root = document.querySelector("#root");
    if (!(root instanceof HTMLElement)) {
      throw new Error("root not found");
    }
    const original = analyzeCaptureTarget({ element: root });
    const image = root.querySelector("img");
    if (!image) {
      throw new Error("image not found");
    }
    image.setAttribute("alt", "reference count only");
    expect(revalidateCapturePlan(original).status).toBe("unchanged");
    image.setAttribute("src", "/two.png");
    expect(revalidateCapturePlan(original).status).toBe("resource-set-changed");
    root.remove();
    expect(revalidateCapturePlan(original).status).toBe("target-lost");
  });
});

function defineCurrentSrc(image: HTMLImageElement, src: string): void {
  Object.defineProperty(image, "currentSrc", {
    configurable: true,
    value: src,
  });
}
