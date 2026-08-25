import { describe, expect, it } from "vitest";
import { collectFontCodePoints } from "./loader";

describe("collectFontCodePoints", () => {
  it("returns sorted unique Unicode code points without whitespace", () => {
    const latinA = "A".codePointAt(0) ?? 0;
    const latinB = "B".codePointAt(0) ?? 0;
    const cjkCharacter = "\u6f22".codePointAt(0) ?? 0;
    const supplementaryCharacter = "\ud83d\ude00".codePointAt(0) ?? 0;

    expect(
      collectFontCodePoints(" B\tA B\n\u00a0\u6f22 \ud83d\ude00 ")
    ).toEqual([latinA, latinB, cjkCharacter, supplementaryCharacter]);
  });

  it("does not expose source text through its result", () => {
    const result = collectFontCodePoints("secret");

    expect(result).toEqual(
      ["c", "e", "r", "s", "t"].map(
        (character) => character.codePointAt(0) ?? 0
      )
    );
    expect(JSON.stringify(result)).not.toContain("secret");
  });
});
