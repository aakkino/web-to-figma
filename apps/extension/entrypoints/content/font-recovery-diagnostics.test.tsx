// @vitest-environment happy-dom

import type { FontDiagnostic } from "@figit/browser-capture-adapter";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import {
  FontRecoveryDiagnostics,
  summarizeFontDiagnostics,
} from "./font-recovery-diagnostics";

const NON_EXACT_DIAGNOSTIC_COUNT = 3;
const PRIVATE_CODE_POINT = 12_345;
const CONTROL_OR_FORMAT_PATTERN = /[\p{Cc}\p{Cf}]/u;

afterEach(() => {
  document.body.replaceChildren();
});

describe("FontRecoveryDiagnostics", () => {
  it("summarizes mixed outcomes and renders only non-exact requests", () => {
    renderDiagnostics(MIXED_DIAGNOSTICS);

    expect(document.body.textContent).toContain(
      "4 font requests: 1 exact, 2 fallback, 1 unavailable."
    );
    expect(document.body.textContent).toContain(
      "Requested: Display Sans / 700 / italic"
    );
    expect(document.body.textContent).toContain(
      "Resolved: Noto Sans TC Thin SemiBold / 600 / normal"
    );
    expect(document.body.textContent).toContain(
      "Requested: Unavailable Sans / 400 / normal"
    );
    expect(document.body.textContent).toContain(
      "Reason: No usable font data was available."
    );
    expect(document.body.textContent).not.toContain("Exact Sans");
    expect(document.querySelectorAll("article")).toHaveLength(
      NON_EXACT_DIAGNOSTIC_COUNT
    );
    expect(document.querySelectorAll("details")).toHaveLength(
      NON_EXACT_DIAGNOSTIC_COUNT
    );
    expect(
      Array.from(document.querySelectorAll("details")).every(
        (details) => !details.hasAttribute("open")
      )
    ).toBe(true);
    expect(document.body.textContent).toContain("page: resource unavailable");
    expect(document.body.textContent).toContain("fallback: ok");
  });

  it("keeps exact-only diagnostics compact", () => {
    renderDiagnostics([MIXED_DIAGNOSTICS[0] as FontDiagnostic]);

    expect(document.body.textContent).toBe(
      "1 font request: 1 exact, 0 fallback, 0 unavailable."
    );
    expect(document.querySelector("article")).toBeNull();
    expect(document.querySelector("details")).toBeNull();
  });

  it("keeps fallback metadata readable when resolved fields are absent", () => {
    renderDiagnostics([
      {
        request: { family: "Partial Fallback", weight: 500, italic: false },
        status: "fallback",
        attempts: ["fallback loader: ok"],
      },
    ]);

    expect(document.body.textContent).toContain(
      "Resolved: family unavailable / weight unavailable / style unavailable"
    );
  });

  it("projects attempts to safe labels without raw diagnostic details", () => {
    renderDiagnostics([
      {
        request: {
          family: "Privacy Sans",
          weight: 400,
          italic: false,
          codePoints: [PRIVATE_CODE_POINT],
        },
        status: "failed",
        attempts: [
          "page: https://fonts.example.test/private.woff2",
          "fallback: http-error",
          "bundled Secret Family: private parser exception",
          "U+3039",
          "source text: confidential",
        ],
        reason: "https://fonts.example.test/private.woff2",
      },
    ]);

    expect(document.body.textContent).toContain(
      "Reason: A font resource could not be loaded."
    );
    expect(document.body.textContent).toContain(
      "fallback: resource unavailable"
    );
    expect(document.body.textContent).toContain("bundled: failed");
    expect(document.body.textContent).not.toContain("https://");
    expect(document.body.textContent).not.toContain("private.woff2");
    expect(document.body.textContent).not.toContain("parser exception");
    expect(document.body.textContent).not.toContain("U+3039");
    expect(document.body.textContent).not.toContain("confidential");
    expect(document.body.textContent).not.toContain(String(PRIVATE_CODE_POINT));
  });

  it("rejects control and format characters from displayed labels", () => {
    renderDiagnostics([
      {
        request: {
          family: "Private\u202eFamily",
          weight: 400,
          italic: false,
        },
        status: "fallback",
        resolvedFamily: "Resolved\u0085Family",
        resolvedWeight: 400,
        resolvedItalic: false,
        attempts: ["page: failed\u200bsecret"],
      },
    ]);

    expect(document.body.textContent).toContain(
      "Requested: family unavailable / 400 / normal"
    );
    expect(document.body.textContent).toContain(
      "Resolved: family unavailable / 400 / normal"
    );
    expect(document.body.textContent).toContain(
      "No safe diagnostic attempts were recorded."
    );
    expect(document.body.textContent).not.toContain("Private");
    expect(document.body.textContent).not.toContain("Family");
    expect(document.body.textContent).not.toContain("secret");
    expect(document.body.textContent).not.toMatch(CONTROL_OR_FORMAT_PATTERN);
  });

  it("counts each diagnostic status", () => {
    expect(summarizeFontDiagnostics(MIXED_DIAGNOSTICS)).toEqual({
      total: 4,
      exact: 1,
      fallback: 2,
      unavailable: 1,
    });
  });
});

const MIXED_DIAGNOSTICS: ReadonlyArray<FontDiagnostic> = [
  {
    request: { family: "Exact Sans", weight: 400, italic: false },
    status: "exact",
    resolvedFamily: "Exact Sans",
    resolvedWeight: 400,
    resolvedItalic: false,
    attempts: ["page: ok"],
  },
  {
    request: { family: "Display Sans", weight: 700, italic: true },
    status: "fallback",
    resolvedFamily: "Noto Sans TC Thin SemiBold",
    resolvedWeight: 600,
    resolvedItalic: false,
    attempts: ["page: http-error", "fallback loader: ok"],
  },
  {
    request: { family: "Unavailable Sans", weight: 400, italic: false },
    status: "failed",
    attempts: ["page: failed", "fallback: failed"],
    reason: "No parseable font bytes were available",
  },
  {
    request: { family: "Text Serif", weight: 500, italic: false },
    status: "fallback",
    resolvedFamily: "Noto Sans TC Thin Medium",
    resolvedWeight: 500,
    resolvedItalic: false,
    attempts: ["fallback loader: ok"],
  },
];

function renderDiagnostics(diagnostics: ReadonlyArray<FontDiagnostic>): void {
  document.body.innerHTML = renderToStaticMarkup(
    <FontRecoveryDiagnostics diagnostics={diagnostics} />
  );
}
