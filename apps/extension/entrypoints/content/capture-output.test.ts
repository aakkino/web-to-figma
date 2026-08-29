import type { PreparedCapture } from "@figit/browser-capture-adapter";
import { describe, expect, it, vi } from "vitest";
import type { OutputArtifact } from "./capture-artifact";
import { buildCaptureArtifact, CAPTURE_PACKAGE_MIME } from "./capture-artifact";
import type {
  CaptureOutputSink,
  DownloadAnchor,
  FileDownloadRuntime,
} from "./capture-output";
import {
  createCaptureOutputPort,
  saveCaptureArtifact,
  writeClipboardArtifact,
} from "./capture-output";

const HTML_FIXTURE = '<div data-buffer="fixture">Capture</div>';

describe("capture output", () => {
  it("starts all selected sinks before awaiting and preserves partial results", async () => {
    const calls: Array<string> = [];
    let finishClipboard: (() => void) | undefined;
    const clipboardSink: CaptureOutputSink = () => {
      calls.push("clipboard-start");
      return new Promise((resolve) => {
        finishClipboard = () =>
          resolve({ sink: "clipboard", status: "success" });
      });
    };
    const fileSink: CaptureOutputSink = () => {
      calls.push("file-start");
      return { sink: "file", status: "failed", code: "file-test" };
    };
    const port = createCaptureOutputPort({
      producer: { name: "test", version: "1" },
      clipboardSink,
      fileSink,
    });

    const resultPromise = port.execute(await createArtifact(), {
      clipboard: true,
      file: true,
    });
    expect(calls).toEqual(["clipboard-start", "file-start"]);
    finishClipboard?.();
    await expect(resultPromise).resolves.toEqual({
      results: [
        { sink: "clipboard", status: "success" },
        { sink: "file", status: "failed", code: "file-test" },
      ],
    });
  });

  it("retries only the named sink without rebuilding", async () => {
    const clipboardSink = vi.fn<CaptureOutputSink>(() => ({
      sink: "clipboard",
      status: "success",
    }));
    const fileSink = vi.fn<CaptureOutputSink>(() => ({
      sink: "file",
      status: "success",
    }));
    const port = createCaptureOutputPort({
      producer: { name: "test", version: "1" },
      clipboardSink,
      fileSink,
    });
    const artifact = await createArtifact();

    await port.retry(artifact, "file");
    expect(fileSink).toHaveBeenCalledExactlyOnceWith(artifact);
    expect(clipboardSink).not.toHaveBeenCalled();
  });

  it("writes exact HTML through one text/html clipboard item", async () => {
    const items: Array<unknown> = [];
    const result = await writeClipboardArtifact(await createArtifact(), {
      createItem(html) {
        return { html, type: "text/html" };
      },
      write(nextItems) {
        items.push(...nextItems);
        return Promise.resolve();
      },
    });

    expect(result.status).toBe("success");
    expect(items).toEqual([{ html: HTML_FIXTURE, type: "text/html" }]);
  });

  it("downloads with safe metadata and cleans up object URLs", async () => {
    const artifact = await createArtifact();
    const harness = createDownloadHarness();
    const result = saveCaptureArtifact(artifact, harness.runtime);

    expect(result.status).toBe("success");
    expect(harness.anchor).toMatchObject({
      download: "Fixture.figit",
      href: "blob:figit-test",
    });
    expect(harness.removed).toBe(1);
    expect(harness.revoked).toEqual(["blob:figit-test"]);
    expect(harness.blob?.type).toBe(CAPTURE_PACKAGE_MIME);
    await expect(harness.blob?.text()).resolves.toBe(artifact.serializedJson);
  });

  it("cleans up and returns a sink failure when download click throws", async () => {
    const harness = createDownloadHarness(true);
    expect(
      saveCaptureArtifact(await createArtifact(), harness.runtime)
    ).toMatchObject({
      sink: "file",
      status: "failed",
      code: "file-download-failed",
    });
    expect(harness.removed).toBe(1);
    expect(harness.revoked).toEqual(["blob:figit-test"]);
  });

  it("opens a validated artifact without rebuilding package metadata", async () => {
    const original = await createArtifact();
    const port = createCaptureOutputPort({
      producer: { name: "new-producer", version: "2" },
      selectFile: () =>
        Promise.resolve({
          size: new TextEncoder().encode(original.serializedJson).byteLength,
          text: () => Promise.resolve(original.serializedJson),
        }),
    });

    const opened = await port.open();
    expect(opened).toMatchObject({
      origin: "opened-file",
      clipboardHtml: original.clipboardHtml,
      package: {
        createdAt: original.package.createdAt,
        producer: original.package.producer,
        payload: { sha256: original.package.payload.sha256 },
      },
    });
  });

  it("rejects invalid opened input before invoking either sink", async () => {
    const clipboardSink = vi.fn<CaptureOutputSink>();
    const fileSink = vi.fn<CaptureOutputSink>();
    const port = createCaptureOutputPort({
      producer: { name: "test", version: "1" },
      clipboardSink,
      fileSink,
      selectFile: () =>
        Promise.resolve({
          size: 2,
          text: () => Promise.resolve("{}"),
        }),
    });

    await expect(port.open()).rejects.toMatchObject({ code: "invalid-format" });
    expect(clipboardSink).not.toHaveBeenCalled();
    expect(fileSink).not.toHaveBeenCalled();
  });

  it("rejects execution with no selected sink", async () => {
    const port = createCaptureOutputPort({
      producer: { name: "test", version: "1" },
    });
    await expect(
      port.execute(await createArtifact(), {
        clipboard: false,
        file: false,
      })
    ).rejects.toMatchObject({ code: "no-output-selected" });
  });
});

function createArtifact(): Promise<OutputArtifact> {
  return buildCaptureArtifact(
    createPreparedCapture(),
    {
      url: "https://example.com/path?secret=yes",
      title: "Fixture",
      target: { kind: "page" },
    },
    {
      producer: { name: "figit-extension", version: "1.0.0" },
      now: () => new Date("2026-08-01T00:00:00.000Z"),
    }
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
        waitedForImages: 0,
        frameCount: 1,
        errors: [],
      },
      motion: {
        mode: "freeze",
        paused: 0,
        restored: 0,
        restoreFailures: [],
      },
      lineBreaks: {
        mode: "auto",
        measuredNodes: 0,
        changedNodes: 0,
        insertedBreaks: 0,
        skippedNodes: 0,
        measurementFailures: [],
      },
      fonts: [],
      images: {
        progress: {
          completed: 0,
          total: 0,
          failed: 0,
          elapsedMs: 0,
          preparedBytes: 0,
        },
        resources: [],
        softBudgetReached: false,
        hardBudgetReached: false,
      },
      backgrounds: [],
      cleanupFailures: [],
    },
  };
}

function createDownloadHarness(throws = false) {
  const revoked: Array<string> = [];
  let removed = 0;
  let blob: Blob | undefined;
  const anchor: DownloadAnchor = {
    download: "",
    href: "",
    click() {
      if (throws) {
        throw new Error("click failed");
      }
    },
    remove() {
      removed += 1;
    },
  };
  const runtime: FileDownloadRuntime = {
    createObjectUrl(nextBlob) {
      blob = nextBlob;
      return "blob:figit-test";
    },
    revokeObjectUrl(url) {
      revoked.push(url);
    },
    createAnchor() {
      return anchor;
    },
    appendAnchor() {
      // The anchor only needs to be connected before click.
    },
    scheduleCleanup(callback) {
      callback();
    },
  };
  return {
    runtime,
    anchor,
    revoked,
    get removed() {
      return removed;
    },
    get blob() {
      return blob;
    },
  };
}
