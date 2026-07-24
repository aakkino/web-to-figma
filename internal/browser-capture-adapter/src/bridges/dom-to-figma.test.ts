import { describe, expect, it } from "vitest";

import {
  assertStagedImageCapability,
  UnsupportedCaptureCapabilityError,
} from "./dom-to-figma";

describe("dom-to-figma capability boundary", () => {
  it("reports a stable unsupported capability error for older cores", () => {
    expect(() => assertStagedImageCapability({})).toThrow(
      UnsupportedCaptureCapabilityError
    );
    try {
      assertStagedImageCapability({});
    } catch (error) {
      expect(error).toMatchObject({ code: "unsupported-capability" });
    }
  });

  it("accepts a structurally compatible preparation factory", () => {
    expect(() =>
      assertStagedImageCapability({
        createImagePreparation: () => ({
          prepare: async () => ({
            kind: "placeholder",
            reason: "user-skipped",
          }),
          resolve: () => ({ kind: "placeholder", reason: "user-skipped" }),
          setPlaceholder() {
            // no-op capability fixture
          },
          clear() {
            // no-op capability fixture
          },
        }),
      })
    ).not.toThrow();
  });
});
