import { describe, expect, it } from "vitest";

import { parseFontFamilyList } from "./typography";

describe("parseFontFamilyList", () => {
  it("preserves quoted commas, escaped commas, and family order", () => {
    expect(
      parseFontFamilyList(
        '"A, Display", Inter, A\\, Escaped, "Noto \\4E2D \\6587 "'
      )
    ).toEqual(["A, Display", "Inter", "A, Escaped", "Noto 中文"]);
  });
});
