import { describe, expect, it } from "vitest";

import { waitForPageToSettle } from "./page-stability";

describe("page settle gate", () => {
  it("skips every wait when the timeout is zero", async () => {
    document.body.innerHTML = "<div>ready</div>";

    const diagnostics = await waitForPageToSettle(document.body, {
      timeoutMs: 0,
    });

    expect(diagnostics.phase).toBe("skipped");
    expect(diagnostics.frameCount).toBe(0);
    expect(diagnostics.waitedForImages).toBe(0);
  });

  it("continues immediately after resources and two paint frames settle", async () => {
    document.body.innerHTML = "<div>ready</div>";

    const diagnostics = await waitForPageToSettle(document.body, {
      timeoutMs: 1000,
    });

    expect(diagnostics.timedOut).toBe(false);
    expect(diagnostics.phase).toBe("complete");
    expect(diagnostics.frameCount).toBe(2);
  });

  it("uses the shared timeout when a font never becomes ready", async () => {
    document.body.innerHTML = "<div>waiting for a font</div>";
    const originalFonts = Object.getOwnPropertyDescriptor(document, "fonts");
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: {
        ready: new Promise<FontFaceSet>(() => undefined),
      } as FontFaceSet,
    });

    try {
      const diagnostics = await waitForPageToSettle(document.body, {
        timeoutMs: 25,
      });

      expect(diagnostics.timedOut).toBe(true);
      expect(diagnostics.phase).toBe("fonts");
      expect(diagnostics.pendingFonts).toBe(true);
      expect(diagnostics.frameCount).toBe(0);
    } finally {
      if (originalFonts) {
        Object.defineProperty(document, "fonts", originalFonts);
      } else {
        Reflect.deleteProperty(document, "fonts");
      }
    }
  });

  it("uses the shared timeout when an image never completes", async () => {
    const image = document.createElement("img");
    Object.defineProperty(image, "complete", {
      configurable: true,
      value: false,
    });
    document.body.replaceChildren(image);

    const diagnostics = await waitForPageToSettle(document.body, {
      timeoutMs: 25,
    });

    expect(diagnostics.timedOut).toBe(true);
    expect(diagnostics.phase).toBe("images");
    expect(diagnostics.pendingImages).toBe(1);
    expect(diagnostics.waitedForImages).toBe(0);
    expect(diagnostics.frameCount).toBe(0);
  });

  it("waits for images inside an open shadow root", async () => {
    const host = document.createElement("div");
    const shadow = host.attachShadow({ mode: "open" });
    const image = document.createElement("img");
    Object.defineProperty(image, "complete", {
      configurable: true,
      value: false,
    });
    shadow.append(image);
    document.body.replaceChildren(host);

    const diagnostics = await waitForPageToSettle(document.body, {
      timeoutMs: 25,
    });

    expect(diagnostics.timedOut).toBe(true);
    expect(diagnostics.phase).toBe("images");
    expect(diagnostics.pendingImages).toBe(1);
    expect(diagnostics.waitedForImages).toBe(0);
  });
});
