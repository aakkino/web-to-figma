import { describe, expect, it } from "vitest";

import {
  analyzeCaptureTarget,
  revalidateCapturePlan,
} from "./resource-inventory";

const THREE_IMAGE_NODES = 3;
const TWO_IMAGE_RESOURCES = 2;
const THREE_RESOURCES_WITH_BACKGROUND = 3;

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
      expect(inventory.analysis.plan.unsupportedBackgroundImageCount).toBe(0);
      expect(inventory.analysis.plan.uniqueResourceCount).toBe(
        THREE_RESOURCES_WITH_BACKGROUND
      );
      expect(fetchCalls).toBe(0);
      expect(
        inventory.resources.find((resource) =>
          resource.src.endsWith("/shared.png")
        )?.nodeCount
      ).toBe(2);
      expect(
        inventory.resources.find(
          (resource) => resource.kind === "background-image"
        )
      ).toMatchObject({
        kind: "background-image",
        nodeCount: 1,
        usages: [{ kind: "background-image", layerIndex: 0, owner: root }],
      });
    } finally {
      globalThis.fetch = previousFetch;
    }
  });

  it("selects a static image-set candidate and deduplicates background usages", () => {
    document.body.innerHTML = `
      <div id="root" style="background-image:image-set(url('/one.png') 1x, url('/two.png') 2x)">
        <div style="background-image:url('/two.png'), linear-gradient(red, blue)"></div>
      </div>`;
    const root = document.querySelector("#root");
    if (!(root instanceof HTMLElement)) {
      throw new Error("root not found");
    }
    Object.defineProperty(window, "devicePixelRatio", {
      configurable: true,
      value: 2,
    });

    const inventory = analyzeCaptureTarget({ element: root });

    expect(inventory.resources).toHaveLength(1);
    expect(inventory.resources[0]).toMatchObject({
      src: new URL("/two.png", document.baseURI).toString(),
      kind: "background-image",
      nodeCount: 2,
    });
    expect(
      inventory.resources[0]?.usages.map((usage) => usage.layerIndex)
    ).toEqual([0, 0]);
    expect(inventory.analysis.plan.backgroundImageLayerCount).toBe(3);
  });

  it("freezes explicit lazy backgrounds without fetching or mutating DOM", () => {
    document.body.innerHTML = `
      <div id="root">
        <a id="card" class="lazyload"
          data-bgset="/wp-content/card-1024.jpg-xs-/wp-content/card.jpg">
          <img width="200" height="136"
            src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==">
        </a>
      </div>
    `;
    const root = document.querySelector("#root");
    const card = document.querySelector("#card");
    if (!(root instanceof HTMLElement && card instanceof HTMLElement)) {
      throw new Error("lazy background fixture not found");
    }
    const before = root.outerHTML;
    const previousFetch = globalThis.fetch;
    let fetchCalls = 0;
    globalThis.fetch = (() => {
      fetchCalls += 1;
      return Promise.reject(new Error("analysis must not fetch"));
    }) as typeof fetch;

    try {
      const inventory = analyzeCaptureTarget({ element: root });
      const source = new URL(
        "/wp-content/card-1024.jpg",
        document.baseURI
      ).toString();

      expect(inventory.backgroundSources.get(card)).toBe(source);
      expect(inventory.analysis.plan.backgroundImageLayerCount).toBe(1);
      expect(
        inventory.resources.find((resource) => resource.src === source)?.usages
      ).toEqual([
        expect.objectContaining({ kind: "background-image", owner: card }),
      ]);
      expect(fetchCalls).toBe(0);
      expect(root.outerHTML).toBe(before);
    } finally {
      globalThis.fetch = previousFetch;
    }
  });

  it("keeps computed background precedence over lazy metadata", () => {
    document.body.innerHTML = `
      <div id="root" style="background-image:url(/loaded.png)"
        data-bgset="/lazy.png-xs-/lazy-original.png"></div>
    `;
    const root = document.querySelector("#root");
    if (!(root instanceof HTMLElement)) {
      throw new Error("root not found");
    }

    const inventory = analyzeCaptureTarget({ element: root });

    expect(inventory.backgroundSources.has(root)).toBe(false);
    expect(inventory.analysis.plan.backgroundImageLayerCount).toBe(1);
    expect(inventory.resources.map((resource) => resource.src)).toEqual([
      new URL("/loaded.png", document.baseURI).toString(),
    ]);
  });

  it("deduplicates one canonical source across image and lazy background", () => {
    document.body.innerHTML = `
      <div id="root" data-bgset="/shared.png">
        <img id="image" src="/shared.png">
      </div>
    `;
    const root = document.querySelector("#root");
    const image = document.querySelector("#image");
    if (!(root instanceof HTMLElement && image instanceof HTMLImageElement)) {
      throw new Error("cross-kind fixture not found");
    }

    const inventory = analyzeCaptureTarget({ element: root });

    expect(inventory.resources).toHaveLength(1);
    expect(inventory.resources[0]?.usages.map((usage) => usage.kind)).toEqual([
      "background-image",
      "image",
    ]);
    expect(inventory.resources[0]?.nodeCount).toBe(2);
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
