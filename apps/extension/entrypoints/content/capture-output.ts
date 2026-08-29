import type { PreparedCapture } from "@figit/browser-capture-adapter";
import type {
  CaptureOutput,
  CaptureSettings,
} from "../../shared/capture-settings";
import type {
  ArtifactBuildOptions,
  ArtifactFile,
  CaptureProducer,
  CaptureSourceSnapshot,
  OutputArtifact,
} from "./capture-artifact";
import {
  buildCaptureArtifact,
  CAPTURE_PACKAGE_MIME,
  parseCaptureFile,
} from "./capture-artifact";

const FILE_PICKER_FOCUS_DELAY_MS = 250;
const DOWNLOAD_CLEANUP_DELAY_MS = 0;

export type OutputSinkResult = {
  sink: CaptureOutput;
  status: "success" | "failed";
  code?: string;
  message?: string;
};

export type OutputRunResult = {
  results: ReadonlyArray<OutputSinkResult>;
};

export type OutputPort = {
  capabilities: Readonly<Record<CaptureOutput, boolean>>;
  prepare(
    capture: PreparedCapture,
    source: CaptureSourceSnapshot
  ): Promise<OutputArtifact>;
  execute(
    artifact: OutputArtifact,
    outputs: CaptureSettings["outputs"]
  ): Promise<OutputRunResult>;
  retry(
    artifact: OutputArtifact,
    sink: CaptureOutput
  ): Promise<OutputSinkResult>;
  open(): Promise<OutputArtifact | null>;
};

export type CaptureOutputSink = (
  artifact: OutputArtifact
) => OutputSinkResult | Promise<OutputSinkResult>;

export type CaptureOutputPortOptions = {
  producer: CaptureProducer;
  now?: ArtifactBuildOptions["now"];
  subtle?: SubtleCrypto | null;
  selectFile?: () => Promise<ArtifactFile | null>;
  clipboardSink?: CaptureOutputSink;
  fileSink?: CaptureOutputSink;
};

export class CaptureOutputError extends Error {
  readonly code = "no-output-selected";

  constructor() {
    super("Choose at least one output before continuing.");
    this.name = "CaptureOutputError";
  }
}

export type ClipboardRuntime = {
  createItem(html: string): unknown;
  write(items: ReadonlyArray<unknown>): Promise<void>;
};

export type DownloadAnchor = {
  download: string;
  href: string;
  click(): void;
  remove(): void;
};

export type FileDownloadRuntime = {
  createObjectUrl(blob: Blob): string;
  revokeObjectUrl(url: string): void;
  createAnchor(): DownloadAnchor;
  appendAnchor(anchor: DownloadAnchor): void;
  scheduleCleanup(callback: () => void): void;
};

export function createCaptureOutputPort(
  options: CaptureOutputPortOptions
): OutputPort {
  const clipboardSink =
    options.clipboardSink ?? ((artifact) => writeClipboardArtifact(artifact));
  const fileSink =
    options.fileSink ?? ((artifact) => saveCaptureArtifact(artifact));
  const selectFile = options.selectFile ?? selectCapturePackageFile;
  return {
    capabilities: { clipboard: true, file: true },
    prepare(capture, source) {
      return buildCaptureArtifact(capture, source, {
        producer: options.producer,
        now: options.now,
        subtle: options.subtle,
      });
    },
    async execute(artifact, outputs) {
      const pending: Array<Promise<OutputSinkResult>> = [];
      if (outputs.clipboard) {
        pending.push(invokeSink("clipboard", clipboardSink, artifact));
      }
      if (outputs.file) {
        pending.push(invokeSink("file", fileSink, artifact));
      }
      if (pending.length === 0) {
        throw new CaptureOutputError();
      }
      return { results: await Promise.all(pending) };
    },
    retry(artifact, sink) {
      return invokeSink(
        sink,
        sink === "clipboard" ? clipboardSink : fileSink,
        artifact
      );
    },
    async open() {
      const file = await selectFile();
      if (!file) {
        return null;
      }
      return await parseCaptureFile(file, { subtle: options.subtle });
    },
  };
}

export async function writeClipboardArtifact(
  artifact: OutputArtifact,
  runtime: ClipboardRuntime | null = defaultClipboardRuntime()
): Promise<OutputSinkResult> {
  if (!runtime) {
    return failedResult(
      "clipboard",
      "clipboard-unavailable",
      "Clipboard output is unavailable on this page."
    );
  }
  try {
    const item = runtime.createItem(artifact.clipboardHtml);
    await runtime.write([item]);
    return {
      sink: "clipboard",
      status: "success",
      message: "Copied to the Figma clipboard.",
    };
  } catch (error) {
    const permissionDenied =
      error instanceof DOMException && error.name === "NotAllowedError";
    return failedResult(
      "clipboard",
      permissionDenied
        ? "clipboard-permission-denied"
        : "clipboard-write-failed",
      permissionDenied
        ? "Clipboard permission or user activation was denied."
        : "Clipboard write failed."
    );
  }
}

export function saveCaptureArtifact(
  artifact: OutputArtifact,
  runtime: FileDownloadRuntime | null = defaultDownloadRuntime()
): OutputSinkResult {
  if (!runtime) {
    return failedResult(
      "file",
      "file-output-unavailable",
      "Local capture file output is unavailable on this page."
    );
  }
  let anchor: DownloadAnchor | undefined;
  let objectUrl: string | undefined;
  try {
    const blob = new Blob([artifact.serializedJson], {
      type: CAPTURE_PACKAGE_MIME,
    });
    objectUrl = runtime.createObjectUrl(blob);
    anchor = runtime.createAnchor();
    anchor.href = objectUrl;
    anchor.download = artifact.suggestedFilename;
    runtime.appendAnchor(anchor);
    anchor.click();
    return {
      sink: "file",
      status: "success",
      message: "Capture package download started.",
    };
  } catch {
    return failedResult(
      "file",
      "file-download-failed",
      "Capture package download failed."
    );
  } finally {
    anchor?.remove();
    if (objectUrl) {
      const url = objectUrl;
      runtime.scheduleCleanup(() => runtime.revokeObjectUrl(url));
    }
  }
}

export function selectCapturePackageFile(): Promise<File | null> {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return Promise.reject(new Error("File selection is unavailable."));
  }
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = `.figit,${CAPTURE_PACKAGE_MIME}`;
    input.hidden = true;
    let settled = false;
    let focusTimer: number | undefined;

    const cleanup = () => {
      if (focusTimer !== undefined) {
        window.clearTimeout(focusTimer);
      }
      window.removeEventListener("focus", onWindowFocus);
      input.remove();
    };
    const finish = (file: File | null) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve(file);
    };
    const onWindowFocus = () => {
      focusTimer = window.setTimeout(() => {
        if (!input.files?.length) {
          finish(null);
        }
      }, FILE_PICKER_FOCUS_DELAY_MS);
    };

    input.addEventListener(
      "change",
      () => finish(input.files?.item(0) ?? null),
      { once: true }
    );
    input.addEventListener("cancel", () => finish(null), { once: true });
    window.addEventListener("focus", onWindowFocus, { once: true });
    document.body.append(input);
    try {
      input.click();
    } catch (error) {
      settled = true;
      cleanup();
      reject(error);
    }
  });
}

async function invokeSink(
  sink: CaptureOutput,
  implementation: CaptureOutputSink,
  artifact: OutputArtifact
): Promise<OutputSinkResult> {
  try {
    return await implementation(artifact);
  } catch {
    return failedResult(
      sink,
      `${sink}-output-failed`,
      sink === "clipboard" ? "Clipboard write failed." : "File output failed."
    );
  }
}

function failedResult(
  sink: CaptureOutput,
  code: string,
  message: string
): OutputSinkResult {
  return { sink, status: "failed", code, message };
}

function defaultClipboardRuntime(): ClipboardRuntime | null {
  if (
    typeof navigator === "undefined" ||
    !navigator.clipboard?.write ||
    typeof ClipboardItem === "undefined"
  ) {
    return null;
  }
  return {
    createItem(html) {
      return new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
      });
    },
    write(items) {
      return navigator.clipboard.write(items as Array<ClipboardItem>);
    },
  };
}

function defaultDownloadRuntime(): FileDownloadRuntime | null {
  if (
    typeof document === "undefined" ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function"
  ) {
    return null;
  }
  return {
    createObjectUrl(blob) {
      return URL.createObjectURL(blob);
    },
    revokeObjectUrl(url) {
      URL.revokeObjectURL(url);
    },
    createAnchor() {
      return document.createElement("a");
    },
    appendAnchor(anchor) {
      document.body.append(anchor as HTMLAnchorElement);
    },
    scheduleCleanup(callback) {
      window.setTimeout(callback, DOWNLOAD_CLEANUP_DELAY_MS);
    },
  };
}
