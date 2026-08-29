import type { PreparedCapture } from "@figit/browser-capture-adapter";
import { describe, expect, it, vi } from "vitest";
import type { CaptureArtifactError } from "./capture-artifact";
import {
  buildCaptureArtifact,
  CAPTURE_PACKAGE_MIME,
  MAX_CAPTURE_PACKAGE_BYTES,
  parseCaptureFile,
  parseCapturePackage,
  sha256Utf8,
  suggestCaptureFilename,
} from "./capture-artifact";

const HTML_FIXTURE =
  '<meta charset="utf-8"><div data-buffer="<!--(figma)5L2g5aW9(/figma)-->">你好, Figma</div>';
const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/u;
const LATIN_CAPITAL_A = 65;
const LATIN_CAPITAL_B = 66;

describe("capture artifact codec", () => {
  it("round-trips one exact UTF-8 clipboard payload and logical metadata", async () => {
    const artifact = await buildCaptureArtifact(
      createPreparedCapture(),
      {
        url: "https://user:secret@example.com/path/page?token=secret#private",
        title: "Example capture",
        target: { kind: "page" },
      },
      buildOptions()
    );

    expect(artifact.package).toMatchObject({
      format: "figit.capture",
      version: 1,
      source: { url: "https://example.com/path/page" },
      payload: { type: "figma-clipboard-html", html: HTML_FIXTURE },
    });
    expect(artifact.package.payload.sha256).toMatch(SHA256_HEX_PATTERN);
    expect(artifact.serializedJson.match(/data-buffer/gu)).toHaveLength(1);
    expect(artifact.serializedJson).not.toContain('"bytes"');
    expect(artifact.serializedJson).not.toContain('"base64"');
    expect(Object.isFrozen(artifact)).toBe(true);
    expect(Object.isFrozen(artifact.package.diagnostics.images)).toBe(true);

    const reopened = await parseCapturePackage(artifact.serializedJson);
    expect(reopened.origin).toBe("opened-file");
    expect(reopened.clipboardHtml).toBe(artifact.clipboardHtml);
    expect(reopened.package.payload.sha256).toBe(
      artifact.package.payload.sha256
    );
    expect(reopened.package.createdAt).toBe(artifact.package.createdAt);
    expect(reopened.package.producer).toEqual(artifact.package.producer);
  });

  it("uses identical Web Crypto and fallback SHA-256 for non-ASCII input", async () => {
    expect(await sha256Utf8("abc", globalThis.crypto.subtle)).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
    const expected =
      "9c947b8c4baf827088c0dcea03b3103fe13dec1b6078388cc8ab91f7ec3c51f1";
    expect(await sha256Utf8("你好, Figma", globalThis.crypto.subtle)).toBe(
      expected
    );
    expect(await sha256Utf8("你好, Figma", null)).toBe(expected);
  });

  it("returns stable boundary errors before checksum validation", async () => {
    const artifact = await createArtifact();
    await expectArtifactError(parseCapturePackage("{"), "invalid-json");
    await expectArtifactError(
      parseCapturePackage(JSON.stringify({})),
      "invalid-format"
    );

    const wrongVersion = decodeArtifact(artifact.serializedJson);
    wrongVersion.version = 2;
    await expectArtifactError(
      parseCapturePackage(JSON.stringify(wrongVersion)),
      "unsupported-version"
    );

    const wrongPayload = decodeArtifact(artifact.serializedJson);
    (wrongPayload.payload as Record<string, unknown>).type = "other";
    await expectArtifactError(
      parseCapturePackage(JSON.stringify(wrongPayload)),
      "unsupported-payload"
    );

    const tampered = decodeArtifact(artifact.serializedJson);
    (tampered.payload as Record<string, unknown>).html = `${HTML_FIXTURE}!`;
    await expectArtifactError(
      parseCapturePackage(JSON.stringify(tampered)),
      "checksum-mismatch"
    );

    const unsafeSource = decodeArtifact(artifact.serializedJson);
    (unsafeSource.source as Record<string, unknown>).url =
      "https://example.com/path?secret=yes";
    await expectArtifactError(
      parseCapturePackage(JSON.stringify(unsafeSource)),
      "invalid-structure"
    );
  });

  it("rejects oversized input before File.text and oversized builds", async () => {
    const text = vi.fn(() => Promise.resolve("{}"));
    await expectArtifactError(
      parseCaptureFile({ size: MAX_CAPTURE_PACKAGE_BYTES + 1, text }),
      "file-too-large"
    );
    expect(text).not.toHaveBeenCalled();

    await expectArtifactError(
      buildCaptureArtifact(createPreparedCapture(), sourceSnapshot(), {
        ...buildOptions(),
        maxBytes: 64,
      }),
      "artifact-too-large"
    );
  });

  it("persists only aggregate diagnostics and hashed resource identities", async () => {
    const artifact = await createArtifact();
    const serialized = JSON.stringify(artifact.package.diagnostics);

    expect(serialized).not.toContain("private.example");
    expect(serialized).not.toContain("Secret Font");
    expect(serialized).not.toContain("image-source-1");
    expect(serialized).not.toContain("cleanup failed at");
    expect(artifact.package.diagnostics.cleanupFailureCount).toBe(1);
    expect(
      artifact.package.diagnostics.images.resources[0]?.resourceId
    ).toMatch(SHA256_HEX_PATTERN);
  });

  it("ignores unknown fields and produces safe filenames", async () => {
    const artifact = await createArtifact();
    const decoded = decodeArtifact(artifact.serializedJson);
    decoded.future = { ignored: true };
    const reopened = await parseCapturePackage(JSON.stringify(decoded));
    expect("future" in reopened.package).toBe(false);

    expect(
      suggestCaptureFilename({
        createdAt: "2026-08-01T00:00:00.000Z",
        source: {
          url: "https://example.com/",
          title: "CON",
          target: { kind: "page" },
        },
      })
    ).toBe("capture-CON.figit");
    expect(
      suggestCaptureFilename({
        createdAt: "2026-08-01T00:00:00.000Z",
        source: {
          url: "https://example.com/",
          title: "",
          target: { kind: "page" },
        },
      })
    ).toBe("figit-capture-2026-08-01T00-00-00-000Z.figit");
    expect(CAPTURE_PACKAGE_MIME).toBe("application/vnd.figit.capture+json");
  });
});

function buildOptions() {
  return {
    producer: { name: "figit-extension", version: "1.2.3" },
    now: () => new Date("2026-08-01T00:00:00.000Z"),
  };
}

function sourceSnapshot() {
  return {
    url: "https://example.com/path?secret=yes#fragment",
    title: "Fixture",
    target: { kind: "element" as const, label: "main#content" },
  };
}

function createArtifact() {
  return buildCaptureArtifact(
    createPreparedCapture(),
    sourceSnapshot(),
    buildOptions()
  );
}

function createPreparedCapture(): PreparedCapture {
  return {
    clipboardHtml: HTML_FIXTURE,
    settings: {
      layout: "auto",
      motion: "freeze",
      lineBreaks: "auto",
      settleTimeoutMs: 5000,
      images: "process",
      fontMode: "compatible",
    },
    diagnostics: {
      settle: {
        timeoutMs: 5000,
        timedOut: false,
        phase: "complete",
        pendingFonts: false,
        pendingImages: 0,
        waitedForImages: 1,
        frameCount: 2,
        errors: ["https://private.example/font.woff2"],
      },
      motion: {
        mode: "freeze",
        paused: 1,
        restored: 1,
        restoreFailures: [],
      },
      lineBreaks: {
        mode: "auto",
        measuredNodes: 3,
        changedNodes: 1,
        insertedBreaks: 1,
        skippedNodes: 0,
        measurementFailures: [],
      },
      fonts: [
        {
          request: {
            family: "Secret Font",
            weight: 400,
            italic: false,
            codePoints: [LATIN_CAPITAL_A, LATIN_CAPITAL_B],
          },
          status: "exact",
          source: "page",
          attempts: ["page-font-face"],
          reason: "https://private.example/font.woff2",
        },
      ],
      images: {
        progress: {
          completed: 1,
          total: 1,
          failed: 0,
          elapsedMs: 12,
          preparedBytes: 128,
        },
        resources: [
          {
            resourceId: "image-source-1",
            status: "prepared",
            byteLength: 128,
          },
        ],
        softBudgetReached: false,
        hardBudgetReached: false,
      },
      backgrounds: [
        { mode: "native", reason: "loaded", resourceId: "image-source-1" },
      ],
      cleanupFailures: ["cleanup failed at https://private.example"],
    },
  };
}

function decodeArtifact(serializedJson: string): Record<string, unknown> {
  return JSON.parse(serializedJson) as Record<string, unknown>;
}

async function expectArtifactError(
  promise: Promise<unknown>,
  code: CaptureArtifactError["code"]
): Promise<void> {
  await expect(promise).rejects.toMatchObject({
    name: "CaptureArtifactError",
    code,
  });
}
