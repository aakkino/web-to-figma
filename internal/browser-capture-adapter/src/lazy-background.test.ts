import { describe, expect, it } from "vitest";

import { resolveLazyBackgroundSource } from "./lazy-background";

const BASE_OPTIONS = {
  baseUrl: "https://example.test/articles/page/",
  renderedWidth: 700,
  devicePixelRatio: 1,
};

describe("lazy background source resolution", () => {
  it("resolves plain and url() sources against the owner document base", () => {
    expect(
      resolveLazyBackgroundSource("../images/card.jpg", BASE_OPTIONS)?.source
    ).toBe("https://example.test/articles/images/card.jpg");
    expect(
      resolveLazyBackgroundSource('url("/images/card.jpg")', BASE_OPTIONS)
        ?.source
    ).toBe("https://example.test/images/card.jpg");
    expect(
      resolveLazyBackgroundSource(
        "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'></svg>",
        BASE_OPTIONS
      )?.source
    ).toBe("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'></svg>");
  });

  it("decodes the evidenced -xs- source encoding", () => {
    expect(
      resolveLazyBackgroundSource(
        "/wp-content/card-1024.jpg-xs-/wp-content/card.jpg",
        BASE_OPTIONS
      )
    ).toEqual({
      source: "https://example.test/wp-content/card-1024.jpg",
      sourceAttribute: "data-bgset",
    });
  });

  it("selects width candidates using rendered width and DPR", () => {
    expect(
      resolveLazyBackgroundSource(
        "/small.jpg [400w], /medium.jpg [800w], /large.jpg [1200w]",
        BASE_OPTIONS
      )?.source
    ).toBe("https://example.test/medium.jpg");
    expect(
      resolveLazyBackgroundSource(
        "/small.jpg 400w, /medium.jpg 800w, /large.jpg 1200w",
        { ...BASE_OPTIONS, devicePixelRatio: 2 }
      )?.source
    ).toBe("https://example.test/large.jpg");
  });

  it("selects density candidates deterministically", () => {
    expect(
      resolveLazyBackgroundSource("/one.png 1x, /two.png 2x, /three.png 3x", {
        ...BASE_OPTIONS,
        devicePixelRatio: 1.5,
      })?.source
    ).toBe("https://example.test/two.png");
    expect(
      resolveLazyBackgroundSource("/one.png 1x, /two.png 2x, /three.png 3x", {
        ...BASE_OPTIONS,
        devicePixelRatio: 4,
      })?.source
    ).toBe("https://example.test/three.png");
  });

  it("rejects empty, malformed, and disallowed sources", () => {
    expect(resolveLazyBackgroundSource(null, BASE_OPTIONS)).toBeNull();
    expect(resolveLazyBackgroundSource("url(", BASE_OPTIONS)).toBeNull();
    expect(
      resolveLazyBackgroundSource("javascript:alert(1)", BASE_OPTIONS)
    ).toBeNull();
    expect(
      resolveLazyBackgroundSource("/image.png 2q extra", BASE_OPTIONS)
    ).toBeNull();
    expect(
      resolveLazyBackgroundSource("/image.png 2q", BASE_OPTIONS)
    ).toBeNull();
    expect(
      resolveLazyBackgroundSource(
        "/valid.png 1x, /invalid.png 2q",
        BASE_OPTIONS
      )
    ).toBeNull();
    expect(
      resolveLazyBackgroundSource(
        "/width.png 400w, /density.png 2x",
        BASE_OPTIONS
      )
    ).toBeNull();
  });
});
