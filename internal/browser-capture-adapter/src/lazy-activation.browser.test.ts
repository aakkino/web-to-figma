import { openComposedDomTree } from "@aakkino/composed-dom";
import { afterEach, describe, expect, it } from "vitest";

import { activateLazyResources } from "./lazy-activation";
import { analyzeCaptureTarget } from "./resource-inventory";

const PAGE_HEIGHT = 2200;
const ACTIVATION_THRESHOLD = 100;
const INITIAL_PAGE_SCROLL = 23;
const INITIAL_CANCEL_SCROLL = 17;
const INITIAL_RESTORE_SCROLL = 5;
const NESTED_ACTIVATION_THRESHOLD = 20;
const FIRST_DELAYED_MUTATION_MS = 30;
const FINAL_DELAYED_MUTATION_MS = 90;
const PAGE_GROWTH_PX = 100;
const FAILING_TRAVERSAL_WALK = 3;
const TARGET_RANGE_ACTIVATION_THRESHOLD = 800;
const INITIAL_FIXED_TARGET_SCROLL = 500;

afterEach(() => {
  document.body.replaceChildren();
  document.body.removeAttribute("style");
  document.documentElement.removeAttribute("style");
  const scrollingElement =
    document.scrollingElement ?? document.documentElement;
  scrollingElement.scrollLeft = 0;
  scrollingElement.scrollTop = 0;
});

describe("lazy activation", () => {
  it("discovers a below-fold page image and restores window scroll", async () => {
    document.body.style.height = `${PAGE_HEIGHT}px`;
    document.body.innerHTML = '<img id="lazy" style="margin-top:1800px">';
    const image = document.querySelector("#lazy");
    if (!(image instanceof HTMLImageElement)) {
      throw new Error("page fixture not found");
    }
    const scrollingElement =
      document.scrollingElement ?? document.documentElement;
    scrollingElement.scrollTop = INITIAL_PAGE_SCROLL;
    const onScroll = () => {
      if (scrollingElement.scrollTop > ACTIVATION_THRESHOLD) {
        image.src = "https://example.test/page.png";
      }
    };
    window.addEventListener("scroll", onScroll);

    const result = await activateLazyResources(
      analyzeCaptureTarget({ element: document.body }),
      {
        mode: "auto",
        domTraversal: openComposedDomTree,
        quietWindowMs: 0,
        trailingWindowMs: 0,
        maxScrollSteps: 10,
      }
    );

    window.removeEventListener("scroll", onScroll);
    expect(result.inventory.resources.map(({ src }) => src)).toEqual([
      "https://example.test/page.png",
    ]);
    expect(result.diagnostics).toMatchObject({
      scope: "page",
      restored: true,
      discoveredResources: 1,
    });
    expect(scrollingElement.scrollTop).toBe(INITIAL_PAGE_SCROLL);
  });

  it("limits element activation to ancestors and its composed subtree", async () => {
    document.body.innerHTML = `
      <div id="target">
        <div id="owned" style="height:50px;overflow-y:auto">
          <div style="height:320px"><img id="owned-image"></div>
        </div>
      </div>
      <div id="unrelated" style="height:50px;overflow-y:auto">
        <div style="height:320px"><img id="unrelated-image"></div>
      </div>
    `;
    const target = document.querySelector("#target");
    const owned = document.querySelector("#owned");
    const unrelated = document.querySelector("#unrelated");
    const ownedImage = document.querySelector("#owned-image");
    const unrelatedImage = document.querySelector("#unrelated-image");
    if (
      !(
        target instanceof HTMLElement &&
        owned instanceof HTMLElement &&
        unrelated instanceof HTMLElement &&
        ownedImage instanceof HTMLImageElement &&
        unrelatedImage instanceof HTMLImageElement
      )
    ) {
      throw new Error("element fixture not found");
    }
    owned.addEventListener("scroll", () => {
      if (owned.scrollTop > NESTED_ACTIVATION_THRESHOLD) {
        ownedImage.src = "https://example.test/owned.png";
      }
    });
    unrelated.addEventListener("scroll", () => {
      unrelatedImage.src = "https://example.test/unrelated.png";
    });

    const result = await activateLazyResources(
      analyzeCaptureTarget({ element: target }),
      {
        mode: "auto",
        domTraversal: openComposedDomTree,
        quietWindowMs: 0,
        trailingWindowMs: 0,
        maxScrollSteps: 8,
      }
    );

    expect(result.inventory.resources.map(({ src }) => src)).toEqual([
      "https://example.test/owned.png",
    ]);
    expect(result.diagnostics.scope).toBe("element");
    expect(owned.scrollTop).toBe(0);
    expect(unrelated.scrollTop).toBe(0);
    expect(unrelatedImage.hasAttribute("src")).toBe(false);
  });

  it("covers only the selected target range in ancestor scroll contexts", async () => {
    document.body.style.height = "3200px";
    document.body.innerHTML = `
      <div id="target" style="margin-top:600px;height:1500px">
        <img id="target-image" style="display:block;margin-top:1100px">
      </div>
      <img id="unrelated-image" style="display:block;margin-top:900px">
    `;
    const target = document.querySelector("#target");
    const targetImage = document.querySelector("#target-image");
    const unrelatedImage = document.querySelector("#unrelated-image");
    if (
      !(
        target instanceof HTMLElement &&
        targetImage instanceof HTMLImageElement &&
        unrelatedImage instanceof HTMLImageElement
      )
    ) {
      throw new Error("target range fixture not found");
    }
    const scrollingElement =
      document.scrollingElement ?? document.documentElement;
    const targetDocumentBottom =
      target.getBoundingClientRect().bottom + scrollingElement.scrollTop;
    const onScroll = () => {
      if (scrollingElement.scrollTop > TARGET_RANGE_ACTIVATION_THRESHOLD) {
        targetImage.src = "https://example.test/target-range.png";
      }
      if (scrollingElement.scrollTop > targetDocumentBottom) {
        unrelatedImage.src = "https://example.test/unrelated-range.png";
      }
    };
    window.addEventListener("scroll", onScroll);

    const result = await activateLazyResources(
      analyzeCaptureTarget({ element: target }),
      {
        mode: "auto",
        domTraversal: openComposedDomTree,
        quietWindowMs: 0,
        trailingWindowMs: 0,
        maxScrollSteps: 8,
      }
    );

    window.removeEventListener("scroll", onScroll);
    expect(result.inventory.resources.map(({ src }) => src)).toEqual([
      "https://example.test/target-range.png",
    ]);
    expect(unrelatedImage.hasAttribute("src")).toBe(false);
    expect(scrollingElement.scrollTop).toBe(0);
  });

  it("does not move the page for a visible fixed element target", async () => {
    document.body.style.height = `${PAGE_HEIGHT}px`;
    document.body.innerHTML =
      '<div id="target" style="position:fixed;top:20px;left:20px;width:100px;height:100px"></div>';
    const target = document.querySelector("#target");
    if (!(target instanceof HTMLElement)) {
      throw new Error("fixed target fixture not found");
    }
    const scrollingElement =
      document.scrollingElement ?? document.documentElement;
    scrollingElement.scrollTop = INITIAL_FIXED_TARGET_SCROLL;
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
    let scrollEvents = 0;
    const onScroll = () => {
      scrollEvents += 1;
    };
    window.addEventListener("scroll", onScroll);

    const result = await activateLazyResources(
      analyzeCaptureTarget({ element: target }),
      {
        mode: "auto",
        domTraversal: openComposedDomTree,
        quietWindowMs: 0,
        trailingWindowMs: 0,
        maxScrollSteps: 4,
      }
    );
    await new Promise((resolve) => window.requestAnimationFrame(resolve));

    window.removeEventListener("scroll", onScroll);
    expect(result.diagnostics.scope).toBe("element");
    expect(scrollingElement.scrollTop).toBe(INITIAL_FIXED_TARGET_SCROLL);
    expect(scrollEvents).toBe(0);
  });

  it("finds nested scrollers in open shadow DOM", async () => {
    const target = document.createElement("div");
    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <div id="scroller" style="height:50px;overflow-y:auto">
        <div style="height:300px"><img id="image"></div>
      </div>
    `;
    target.append(host);
    document.body.append(target);
    const scroller = shadow.querySelector("#scroller");
    const image = shadow.querySelector("#image");
    if (
      !(scroller instanceof HTMLElement && image instanceof HTMLImageElement)
    ) {
      throw new Error("shadow fixture not found");
    }
    scroller.addEventListener("scroll", () => {
      if (scroller.scrollTop > NESTED_ACTIVATION_THRESHOLD) {
        image.src = "https://example.test/shadow.png";
      }
    });

    const result = await activateLazyResources(
      analyzeCaptureTarget({ element: target }),
      {
        mode: "auto",
        domTraversal: openComposedDomTree,
        quietWindowMs: 0,
        trailingWindowMs: 0,
        maxScrollSteps: 8,
      }
    );

    expect(result.inventory.resources.map(({ src }) => src)).toEqual([
      "https://example.test/shadow.png",
    ]);
    expect(scroller.scrollTop).toBe(0);
  });

  it("keeps the trailing edge active across delayed mutations", async () => {
    document.body.style.height = `${PAGE_HEIGHT}px`;
    const image = document.createElement("img");
    image.style.marginTop = "1800px";
    document.body.append(image);
    const scrollingElement =
      document.scrollingElement ?? document.documentElement;
    let scheduled = false;
    const onScroll = () => {
      if (scheduled || scrollingElement.scrollTop <= ACTIVATION_THRESHOLD) {
        return;
      }
      scheduled = true;
      window.setTimeout(() => {
        image.dataset.state = "loading";
      }, FIRST_DELAYED_MUTATION_MS);
      window.setTimeout(() => {
        image.src = "https://example.test/delayed.png";
      }, FINAL_DELAYED_MUTATION_MS);
    };
    window.addEventListener("scroll", onScroll);

    const result = await activateLazyResources(
      analyzeCaptureTarget({ element: document.body }),
      {
        mode: "auto",
        domTraversal: openComposedDomTree,
        quietWindowMs: 20,
        trailingWindowMs: 140,
        maxScrollSteps: 8,
      }
    );

    window.removeEventListener("scroll", onScroll);
    expect(result.inventory.resources.map(({ src }) => src)).toContain(
      "https://example.test/delayed.png"
    );
  });

  it("performs no scroll writes when activation is off", async () => {
    document.body.style.height = `${PAGE_HEIGHT}px`;
    let scrollEvents = 0;
    const onScroll = () => {
      scrollEvents += 1;
    };
    window.addEventListener("scroll", onScroll);

    const result = await activateLazyResources(
      analyzeCaptureTarget({ element: document.body }),
      { mode: "off", domTraversal: openComposedDomTree }
    );
    await new Promise((resolve) => window.requestAnimationFrame(resolve));

    window.removeEventListener("scroll", onScroll);
    expect(result.diagnostics.status).toBe("off");
    expect(result.diagnostics.scrollSteps).toBe(0);
    expect(scrollEvents).toBe(0);
  });

  it("terminates at the scroll-step budget and keeps discoveries", async () => {
    document.body.style.height = `${PAGE_HEIGHT}px`;
    const image = document.createElement("img");
    document.body.append(image);
    const onScroll = () => {
      image.src = "https://example.test/budget.png";
      document.body.style.height = `${document.body.scrollHeight + PAGE_GROWTH_PX}px`;
    };
    window.addEventListener("scroll", onScroll, { once: true });

    const result = await activateLazyResources(
      analyzeCaptureTarget({ element: document.body }),
      {
        mode: "auto",
        domTraversal: openComposedDomTree,
        quietWindowMs: 0,
        trailingWindowMs: 0,
        maxPasses: 2,
        maxScrollSteps: 1,
      }
    );

    window.removeEventListener("scroll", onScroll);

    expect(result.diagnostics.status).toBe("budget-exhausted");
    expect(result.diagnostics.scrollSteps).toBe(1);
    expect(result.inventory.resources.map(({ src }) => src)).toContain(
      "https://example.test/budget.png"
    );
  });

  it("does not snapshot or restore containers outside the container budget", async () => {
    document.body.innerHTML = `
      <div id="first" style="height:50px;overflow-y:auto"><div style="height:300px"></div></div>
      <div id="outside" style="height:50px;overflow-y:auto"><div style="height:300px"></div></div>
    `;
    const outside = document.querySelector("#outside");
    if (!(outside instanceof HTMLElement)) {
      throw new Error("container budget fixture not found");
    }
    let writes = 0;
    let position = 0;
    Object.defineProperty(outside, "scrollTop", {
      configurable: true,
      get: () => position,
      set: (value: number) => {
        writes += 1;
        position = value;
      },
    });

    const result = await activateLazyResources(
      analyzeCaptureTarget({ element: document.body }),
      {
        mode: "auto",
        domTraversal: openComposedDomTree,
        quietWindowMs: 0,
        trailingWindowMs: 0,
        maxContainers: 1,
        maxScrollSteps: 1,
      }
    );

    expect(result.diagnostics).toMatchObject({
      status: "budget-exhausted",
      containersVisited: 1,
    });
    expect(writes).toBe(0);
  });

  it("counts virtualized replacements by identity and tracks source changes", async () => {
    document.body.innerHTML = `
      <div id="scroller" style="height:50px;overflow-y:auto">
        <div style="height:300px"><img src="https://example.test/old.png"></div>
      </div>
    `;
    const scroller = document.querySelector("#scroller");
    if (!(scroller instanceof HTMLElement)) {
      throw new Error("virtual list fixture not found");
    }
    scroller.addEventListener(
      "scroll",
      () => {
        const previous = scroller.querySelector("img");
        const replacement = document.createElement("img");
        replacement.src = "https://example.test/new.png";
        previous?.replaceWith(replacement);
      },
      { once: true }
    );

    const result = await activateLazyResources(
      analyzeCaptureTarget({ element: scroller }),
      {
        mode: "auto",
        domTraversal: openComposedDomTree,
        quietWindowMs: 0,
        trailingWindowMs: 0,
        maxScrollSteps: 4,
      }
    );

    expect(result.inventory.resources).toMatchObject([
      { resourceId: "image-1", src: "https://example.test/new.png" },
    ]);
    expect(result.diagnostics).toMatchObject({
      discoveredNodes: 1,
      discoveredResources: 1,
    });
  });

  it("restores touched scroll state when the shared deadline expires", async () => {
    document.body.style.height = `${PAGE_HEIGHT}px`;
    const scrollingElement =
      document.scrollingElement ?? document.documentElement;
    scrollingElement.scrollTop = INITIAL_CANCEL_SCROLL;

    const result = await activateLazyResources(
      analyzeCaptureTarget({ element: document.body }),
      {
        mode: "auto",
        domTraversal: openComposedDomTree,
        timeoutMs: 20,
        quietWindowMs: 100,
        trailingWindowMs: 100,
        maxScrollSteps: 8,
      }
    );

    expect(result.diagnostics).toMatchObject({
      status: "timed-out",
      restored: true,
      scrollSteps: 1,
    });
    expect(scrollingElement.scrollTop).toBe(INITIAL_CANCEL_SCROLL);
  });

  it("restores touched scroll state after an internal activation failure", async () => {
    document.body.style.height = `${PAGE_HEIGHT}px`;
    const scrollingElement =
      document.scrollingElement ?? document.documentElement;
    scrollingElement.scrollTop = INITIAL_RESTORE_SCROLL;
    let walks = 0;
    const failingTraversal = {
      ...openComposedDomTree,
      walk(root: Element) {
        walks += 1;
        if (walks === FAILING_TRAVERSAL_WALK) {
          throw new Error("synthetic traversal failure");
        }
        return openComposedDomTree.walk(root);
      },
    };

    const result = await activateLazyResources(
      analyzeCaptureTarget({ element: document.body }),
      {
        mode: "auto",
        domTraversal: failingTraversal,
        quietWindowMs: 10,
        trailingWindowMs: 10,
        maxScrollSteps: 4,
      }
    );

    expect(result.diagnostics).toMatchObject({
      status: "budget-exhausted",
      restored: true,
    });
    expect(result.diagnostics.errors).toContain("activation-failed");
    expect(scrollingElement.scrollTop).toBe(INITIAL_RESTORE_SCROLL);
  });

  it("restores touched scroll state when canceled", async () => {
    document.body.style.height = `${PAGE_HEIGHT}px`;
    const scrollingElement =
      document.scrollingElement ?? document.documentElement;
    scrollingElement.scrollTop = INITIAL_CANCEL_SCROLL;
    const controller = new AbortController();
    const onScroll = () => {
      if (scrollingElement.scrollTop > ACTIVATION_THRESHOLD) {
        controller.abort();
      }
    };
    window.addEventListener("scroll", onScroll);

    const result = await activateLazyResources(
      analyzeCaptureTarget({ element: document.body }),
      {
        mode: "auto",
        domTraversal: openComposedDomTree,
        signal: controller.signal,
        quietWindowMs: 100,
        trailingWindowMs: 100,
        maxScrollSteps: 8,
      }
    );

    window.removeEventListener("scroll", onScroll);

    expect(result.diagnostics.status).toBe("canceled");
    expect(result.diagnostics.restored).toBe(true);
    expect(scrollingElement.scrollTop).toBe(INITIAL_CANCEL_SCROLL);
  });

  it("reports target loss and still restores ancestor scroll state", async () => {
    const target = document.createElement("div");
    target.style.cssText = "height:50px;overflow-y:auto";
    target.innerHTML = '<div style="height:300px"></div>';
    document.body.append(target);
    target.addEventListener(
      "scroll",
      () => {
        if (target.scrollTop > NESTED_ACTIVATION_THRESHOLD) {
          target.remove();
        }
      },
      { once: true }
    );

    const result = await activateLazyResources(
      analyzeCaptureTarget({ element: target }),
      {
        mode: "auto",
        domTraversal: openComposedDomTree,
        quietWindowMs: 0,
        trailingWindowMs: 0,
        maxScrollSteps: 8,
      }
    );

    expect(result.diagnostics.status).toBe("target-lost");
    expect(result.diagnostics.restored).toBe(true);
  });

  it("reports restoration failure without discarding the final inventory", async () => {
    const target = document.createElement("div");
    target.style.cssText = "height:50px;overflow-y:auto";
    target.innerHTML =
      '<div style="height:300px"><img src="https://example.test/restored.png"></div>';
    document.body.append(target);
    let position = INITIAL_RESTORE_SCROLL;
    let moved = false;
    Object.defineProperty(target, "scrollTop", {
      configurable: true,
      get: () => position,
      set: (value: number) => {
        if (moved && value === INITIAL_RESTORE_SCROLL) {
          return;
        }
        position = value;
        moved ||= value !== INITIAL_RESTORE_SCROLL;
      },
    });

    const result = await activateLazyResources(
      analyzeCaptureTarget({ element: target }),
      {
        mode: "auto",
        domTraversal: openComposedDomTree,
        quietWindowMs: 0,
        trailingWindowMs: 0,
        maxScrollSteps: 8,
      }
    );

    expect(result.diagnostics).toMatchObject({
      status: "restore-failed",
      restored: false,
    });
    expect(result.diagnostics.errors).toContain("scroll-restore-incomplete");
    expect(result.inventory.resources.map(({ src }) => src)).toEqual([
      "https://example.test/restored.png",
    ]);
  });

  it("marks canvas captures as not applicable", async () => {
    const frame = document.createElement("div");
    document.body.append(frame);
    const result = await activateLazyResources(
      analyzeCaptureTarget({
        frames: [
          { element: frame, width: 10, height: 10, x: 0, y: 0, name: "Frame" },
        ],
      }),
      { mode: "auto", domTraversal: openComposedDomTree }
    );

    expect(result.diagnostics).toMatchObject({
      scope: "canvas",
      status: "not-applicable",
      scrollSteps: 0,
    });
  });
});
