import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import { createFontResolver, FontPreflightError } from "./font-resolver";

const TEST_WEIGHT = 400;
const LATIN_A_CODE_POINT = "A".codePointAt(0) ?? 0;
const LATIN_B_CODE_POINT = "B".codePointAt(0) ?? 0;
const CJK_CODE_POINT = "中".codePointAt(0) ?? 0;
const OPEN_SANS_URL = new URL(
  "../../../packages/dom-to-figma/src/__fixtures__/fonts/open-sans-latin-400.ttf",
  import.meta.url
);
const CJK_FALLBACK_URL = new URL(
  "../../../apps/extension/public/fonts/noto-sans-tc-composite-400.ttf",
  import.meta.url
);

async function loadFixtureBytes(): Promise<ArrayBuffer> {
  const buffer = await readFile(OPEN_SANS_URL);
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  );
}

async function loadCjkFallbackBytes(): Promise<ArrayBuffer> {
  const buffer = await readFile(CJK_FALLBACK_URL);
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  );
}

describe("createFontResolver", () => {
  it("loads a matching readable @font-face URL directly", async () => {
    const bytes = await loadFixtureBytes();
    const style = {
      getPropertyValue(property: string) {
        const values: Record<string, string> = {
          "font-family": "Open Sans",
          src: 'url("/fonts/open-sans.ttf") format("truetype")',
          "font-weight": "400",
          "font-style": "normal",
        };
        return values[property] ?? "";
      },
    };
    const rule = {
      type: 5,
      style,
    };
    const document = {
      baseURI: "https://example.test/page.html",
      styleSheets: [
        {
          href: "https://example.test/styles.css",
          cssRules: {
            length: 1,
            item: () => rule,
          },
        },
      ],
    } as unknown as Document;
    let requestedUrl = "";
    const resolver = createFontResolver({
      document,
      fallbackLoader: null,
      fetch: (url) => {
        requestedUrl = String(url);
        return Promise.resolve(new Response(bytes, { status: 200 }));
      },
    });

    await resolver.loader({
      family: "Open Sans",
      weight: TEST_WEIGHT,
      italic: false,
    });

    expect(requestedUrl).toBe("https://example.test/fonts/open-sans.ttf");
    expect(resolver.getDiagnostics()[0]?.source).toBe("page");
    expect(resolver.getDiagnostics()[0]?.status).toBe("exact");
  });

  it("uses the injected transport after direct page fetch fails", async () => {
    const bytes = await loadFixtureBytes();
    const style = {
      getPropertyValue(property: string) {
        const values: Record<string, string> = {
          "font-family": "Open Sans",
          src: "url(https://cdn.example.test/open-sans.woff2) format(woff2)",
          "font-weight": "400",
          "font-style": "normal",
        };
        return values[property] ?? "";
      },
    };
    const rule = { type: 5, style };
    const document = {
      baseURI: "https://example.test/page.html",
      styleSheets: [
        {
          href: "https://example.test/styles.css",
          cssRules: { length: 1, item: () => rule },
        },
      ],
    } as unknown as Document;
    let transportCalls = 0;
    const resolver = createFontResolver({
      document,
      fetch: () => Promise.reject(new Error("CORS")),
      transport: () => {
        transportCalls += 1;
        return Promise.resolve({ bytes, mimeType: "font/woff2" });
      },
      fallbackLoader: null,
    });

    await resolver.loader({
      family: "Open Sans",
      weight: TEST_WEIGHT,
      italic: false,
    });

    expect(transportCalls).toBe(1);
    expect(resolver.getDiagnostics()[0]?.source).toBe("transport");
  });

  it("deduplicates concurrent fallback loads", async () => {
    const bytes = await loadFixtureBytes();
    let loadCount = 0;
    const resolver = createFontResolver({
      fallbackLoader: (fontRequest) => {
        loadCount += 1;
        return Promise.resolve({
          bytes,
          resolvedWeight: fontRequest.weight,
          resolvedItalic: fontRequest.italic,
        });
      },
    });
    const request = { family: "Open Sans", weight: TEST_WEIGHT, italic: false };

    await Promise.all([resolver.loader(request), resolver.loader(request)]);

    expect(loadCount).toBe(1);
    expect(resolver.getDiagnostics()[0]?.status).toBe("exact");
  });

  it("reports an explicit family fallback", async () => {
    const bytes = await loadFixtureBytes();
    const resolver = createFontResolver({
      fallbackLoader: async () => ({
        bytes,
        resolvedFamily: "Open Sans",
        resolvedWeight: TEST_WEIGHT,
        resolvedItalic: false,
      }),
    });

    await resolver.loader({ family: "Arial", weight: 700, italic: true });

    const diagnostic = resolver.getDiagnostics()[0];
    expect(diagnostic?.status).toBe("fallback");
    expect(diagnostic?.resolvedFamily).toBe("Open Sans");
    expect(diagnostic?.resolvedWeight).toBe(TEST_WEIGHT);
    expect(diagnostic?.resolvedItalic).toBe(false);
  });

  it("rejects parseable page bytes that miss a required CJK glyph", async () => {
    const pageBytes = await loadFixtureBytes();
    const fallbackBytes = await loadCjkFallbackBytes();
    const style = {
      getPropertyValue(property: string) {
        const values: Record<string, string> = {
          "font-family": "Open Sans",
          src: 'url("/fonts/open-sans.ttf") format("truetype")',
          "font-weight": "400",
          "font-style": "normal",
        };
        return values[property] ?? "";
      },
    };
    const document = {
      baseURI: "https://example.test/page.html",
      styleSheets: [
        {
          href: "https://example.test/styles.css",
          cssRules: {
            length: 1,
            item: () => ({ type: 5, style }),
          },
        },
      ],
    } as unknown as Document;
    const resolver = createFontResolver({
      document,
      fetch: () => Promise.resolve(new Response(pageBytes, { status: 200 })),
      fallbackLoader: async () => ({
        bytes: fallbackBytes,
        resolvedFamily: "Noto Sans TC Thin",
        resolvedWeight: TEST_WEIGHT,
        resolvedItalic: false,
      }),
    });

    const result = await resolver.preflight(
      [
        {
          family: "Open Sans",
          weight: TEST_WEIGHT,
          italic: false,
          codePoints: [LATIN_A_CODE_POINT, CJK_CODE_POINT],
        },
      ],
      "compatible"
    );

    expect(result.failures).toHaveLength(1);
    expect(resolver.getDiagnostics()[0]).toMatchObject({
      request: { family: "Open Sans", weight: TEST_WEIGHT, italic: false },
      status: "fallback",
      source: "fallback",
      resolvedFamily: "Noto Sans TC Thin",
    });
    expect(resolver.getDiagnostics()[0]?.request.codePoints).toBeUndefined();
    expect(resolver.getDiagnostics()[0]?.attempts).toContain(
      "page bytes: glyph-coverage-miss"
    );

    const latinOnlyFile = await resolver.loader({
      family: "Open Sans",
      weight: TEST_WEIGHT,
      italic: false,
      codePoints: [LATIN_A_CODE_POINT],
    });
    expect(latinOnlyFile.resolvedFamily).toBe("Noto Sans TC Thin");
  });

  it("merges code points for duplicate style requests", async () => {
    const fallbackBytes = await loadCjkFallbackBytes();
    const resolver = createFontResolver({
      fallbackLoader: async () => ({
        bytes: fallbackBytes,
        resolvedFamily: "Noto Sans TC Thin",
        resolvedWeight: TEST_WEIGHT,
        resolvedItalic: false,
      }),
    });

    const result = await resolver.preflight(
      [
        {
          family: "Missing Sans",
          weight: TEST_WEIGHT,
          italic: false,
          codePoints: [CJK_CODE_POINT, LATIN_A_CODE_POINT],
        },
        {
          family: "Missing Sans",
          weight: TEST_WEIGHT,
          italic: false,
          codePoints: [LATIN_B_CODE_POINT, CJK_CODE_POINT],
        },
      ],
      "compatible"
    );

    expect(result.requests).toEqual([
      {
        family: "Missing Sans",
        weight: TEST_WEIGHT,
        italic: false,
        codePoints: [LATIN_A_CODE_POINT, LATIN_B_CODE_POINT, CJK_CODE_POINT],
      },
    ]);
  });

  it("selects an aliased bundled font at the nearest available weight", async () => {
    const bytes = await loadFixtureBytes();
    const resolver = createFontResolver({
      bundledFonts: [
        {
          family: "Open Sans",
          aliases: ["PingFang TC"],
          weight: TEST_WEIGHT,
          italic: false,
          bytes,
        },
      ],
      fallbackLoader: null,
    });

    await resolver.loader({
      family: "PingFang TC",
      weight: 700,
      italic: false,
    });

    const diagnostic = resolver.getDiagnostics()[0];
    expect(diagnostic?.source).toBe("bundled");
    expect(diagnostic?.status).toBe("fallback");
    expect(diagnostic?.resolvedFamily).toBe("Open Sans");
    expect(diagnostic?.resolvedWeight).toBe(TEST_WEIGHT);
  });

  it("rejects non-exact fonts in strict preflight", async () => {
    const bytes = await loadFixtureBytes();
    const resolver = createFontResolver({
      fallbackLoader: async () => ({
        bytes,
        resolvedFamily: "Open Sans",
        resolvedWeight: TEST_WEIGHT,
        resolvedItalic: false,
      }),
    });

    await expect(
      resolver.preflight(
        [{ family: "Arial", weight: 700, italic: true }],
        "strict"
      )
    ).rejects.toBeInstanceOf(FontPreflightError);
  });

  it("keeps fast-local preflight free of page, transport, and remote fallback calls", async () => {
    let pageCalls = 0;
    let transportCalls = 0;
    let fallbackCalls = 0;
    const style = {
      getPropertyValue(property: string) {
        const values: Record<string, string> = {
          "font-family": "Open Sans",
          src: "url(https://cdn.example.test/open-sans.woff2) format(woff2)",
          "font-weight": "400",
          "font-style": "normal",
        };
        return values[property] ?? "";
      },
    };
    const document = {
      baseURI: "https://example.test/page.html",
      styleSheets: [
        {
          href: "https://example.test/styles.css",
          cssRules: { length: 1, item: () => ({ type: 5, style }) },
        },
      ],
    } as unknown as Document;
    const resolver = createFontResolver({
      document,
      fetch: () => {
        pageCalls += 1;
        return Promise.reject(new Error("must not fetch"));
      },
      transport: () => {
        transportCalls += 1;
        return Promise.reject(new Error("must not transport"));
      },
      fallbackLoader: () => {
        fallbackCalls += 1;
        throw new Error("remote fallback is disabled");
      },
    });

    const result = await resolver.preflight(
      [{ family: "Open Sans", weight: TEST_WEIGHT, italic: false }],
      "fast-local"
    );

    expect(result.failures[0]?.status).toBe("failed");
    expect(pageCalls).toBe(0);
    expect(transportCalls).toBe(0);
    expect(fallbackCalls).toBe(0);
  });

  it("re-records cached outcomes after a new capture begins", async () => {
    const bytes = await loadFixtureBytes();
    const request = { family: "Arial", weight: 700, italic: true };
    const resolver = createFontResolver({
      fallbackLoader: async () => ({
        bytes,
        resolvedFamily: "Open Sans",
        resolvedWeight: TEST_WEIGHT,
        resolvedItalic: false,
      }),
    });

    await resolver.loader(request);
    resolver.beginCapture({
      styleSheets: [],
      baseURI: "https://example.test/page.html",
    } as unknown as Document);

    await expect(
      resolver.preflight([request], "strict")
    ).rejects.toBeInstanceOf(FontPreflightError);
  });

  it("does not permanently cache a failed request", async () => {
    const bytes = await loadFixtureBytes();
    let attempts = 0;
    const resolver = createFontResolver({
      fallbackLoader: (fontRequest) => {
        attempts += 1;
        if (attempts === 1) {
          return Promise.reject(new Error("temporary failure"));
        }
        return Promise.resolve({
          bytes,
          resolvedWeight: fontRequest.weight,
          resolvedItalic: false,
        });
      },
    });
    const request = { family: "Open Sans", weight: TEST_WEIGHT, italic: false };

    await expect(resolver.loader(request)).rejects.toThrow("Unable to resolve");
    await expect(resolver.loader(request)).resolves.toMatchObject({ bytes });
    expect(attempts).toBe(2);
  });
});
