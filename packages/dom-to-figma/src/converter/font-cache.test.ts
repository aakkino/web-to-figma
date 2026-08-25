import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import type { FontLoader } from "../figma";
import { createFontCache } from "./font-cache";

describe("createFontCache", () => {
  it("normalizes glyph demand while separating different coverage requests", async () => {
    const fixture = await readFile(
      new URL("../__fixtures__/fonts/open-sans-latin-400.ttf", import.meta.url)
    );
    let loadCount = 0;
    const legacyLoader: FontLoader = ({ weight, italic }) => {
      loadCount += 1;
      return Promise.resolve({
        bytes: Uint8Array.from(fixture).buffer,
        resolvedWeight: weight,
        resolvedItalic: italic,
      });
    };
    const cache = createFontCache(legacyLoader);
    const baseRequest = {
      family: "Open Sans",
      weight: 400,
      italic: false,
    };

    const latinA = "A".codePointAt(0) ?? 0;
    const latinB = "B".codePointAt(0) ?? 0;
    const cjkCharacter = "\u6f22".codePointAt(0) ?? 0;

    await cache.get({
      ...baseRequest,
      codePoints: [latinB, latinA, latinA],
    });
    await cache.get({ ...baseRequest, codePoints: [latinA, latinB] });
    await cache.get({ ...baseRequest, codePoints: [latinA, cjkCharacter] });

    expect(loadCount).toBe(2);
  });
});
