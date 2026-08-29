import type {
  CaptureDiagnostics,
  CaptureSettings as EngineCaptureSettings,
  PreparedCapture,
} from "@figit/browser-capture-adapter";
import { sha256 as nobleSha256 } from "@noble/hashes/sha256";

export const CAPTURE_PACKAGE_FORMAT = "figit.capture";
export const CAPTURE_PACKAGE_VERSION = 1;
export const CAPTURE_PACKAGE_MIME = "application/vnd.figit.capture+json";
// biome-ignore lint/style/noMagicNumbers: Binary byte-unit conversion.
const BYTES_PER_MEBIBYTE = 1024 * 1024;
const CAPTURE_PACKAGE_LIMIT_MEBIBYTES = 256;
const HEX_RADIX = 16;
const HEX_BYTE_WIDTH = 2;
const ASCII_CONTROL_BOUNDARY = 32;

export const MAX_CAPTURE_PACKAGE_BYTES =
  CAPTURE_PACKAGE_LIMIT_MEBIBYTES * BYTES_PER_MEBIBYTE;

const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
const STABLE_CODE_PATTERN = /^[a-z0-9-]{1,80}$/u;
const MAX_FILENAME_BASE_LENGTH = 120;
const WINDOWS_RESERVED_FILENAME =
  /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu;
const INVALID_FILENAME_CHARACTERS = /[<>:"/\\|?*]/gu;

export type CaptureSourceSnapshot = {
  url: string;
  title: string;
  target: {
    kind: "page" | "element";
    label?: string;
  };
};

export type CaptureProducer = {
  name: string;
  version: string;
};

export type CaptureSettingsV1 = {
  layout: "absolute" | "auto";
  motion: "freeze" | "live";
  lineBreaks: "auto" | "off";
  lazyActivation: "auto" | "off";
  settleTimeoutMs: number;
  images: "process" | "skip" | "best-effort";
  fontMode: "compatible" | "fast-local" | "strict";
};

export type CaptureDiagnosticsV1 = {
  activation?: {
    mode: "auto" | "off";
    scope: "page" | "element" | "canvas";
    status:
      | "off"
      | "not-applicable"
      | "completed"
      | "budget-exhausted"
      | "timed-out"
      | "canceled"
      | "target-lost"
      | "restore-failed"
      | "resource-set-changed";
    passes: number;
    scrollSteps: number;
    containersVisited: number;
    discoveredNodes: number;
    discoveredResources: number;
    elapsedMs: number;
    restored: boolean;
    resourceSetChanged: boolean;
    errorCount: number;
  };
  settle: {
    timeoutMs: number;
    timedOut: boolean;
    phase: string;
    pendingFonts: boolean;
    pendingImages: number;
    waitedForImages: number;
    frameCount: number;
    errorCount: number;
  };
  motion: {
    mode: string;
    paused: number;
    restored: number;
    restoreFailureCount: number;
  };
  lineBreaks: {
    mode: string;
    measuredNodes: number;
    changedNodes: number;
    insertedBreaks: number;
    skippedNodes: number;
    measurementFailureCount: number;
  };
  fonts: {
    total: number;
    exact: number;
    fallback: number;
    failed: number;
    requestedCodePointCount: number;
  };
  images: {
    completed: number;
    total: number;
    failed: number;
    elapsedMs: number;
    preparedBytes: number;
    prepared: number;
    placeholders: number;
    softBudgetReached: boolean;
    hardBudgetReached: boolean;
    resources: ReadonlyArray<{
      resourceId: string;
      status: string;
      byteLength?: number;
      errorCode?: string;
    }>;
  };
  backgrounds: ReadonlyArray<{
    mode: string;
    resourceId?: string;
    layerIndex?: number;
  }>;
  cleanupFailureCount: number;
};

export type CapturePackageV1 = {
  format: typeof CAPTURE_PACKAGE_FORMAT;
  version: typeof CAPTURE_PACKAGE_VERSION;
  createdAt: string;
  producer: CaptureProducer;
  source: CaptureSourceSnapshot;
  settings: CaptureSettingsV1;
  diagnostics: CaptureDiagnosticsV1;
  payload: {
    type: "figma-clipboard-html";
    html: string;
    sha256: string;
  };
};

export type OutputArtifact = {
  package: Readonly<CapturePackageV1>;
  serializedJson: string;
  clipboardHtml: string;
  suggestedFilename: string;
  origin: "capture" | "opened-file";
};

export type CaptureArtifactErrorCode =
  | "file-too-large"
  | "file-read"
  | "invalid-json"
  | "invalid-format"
  | "invalid-structure"
  | "unsupported-version"
  | "unsupported-payload"
  | "checksum-mismatch"
  | "artifact-too-large";

export class CaptureArtifactError extends Error {
  readonly code: CaptureArtifactErrorCode;

  constructor(code: CaptureArtifactErrorCode, message = errorMessage(code)) {
    super(message);
    this.name = "CaptureArtifactError";
    this.code = code;
  }
}

export type ArtifactFile = {
  readonly name?: string;
  readonly size: number;
  text(): Promise<string>;
};

export type ArtifactBuildOptions = {
  producer: CaptureProducer;
  now?: () => Date;
  maxBytes?: number;
  subtle?: SubtleCrypto | null;
};

export function createCaptureSourceSnapshot(
  url: string,
  title: string,
  target: CaptureSourceSnapshot["target"]
): CaptureSourceSnapshot {
  return {
    url,
    title,
    target: { ...target },
  };
}

export async function buildCaptureArtifact(
  capture: PreparedCapture,
  source: CaptureSourceSnapshot,
  options: ArtifactBuildOptions
): Promise<OutputArtifact> {
  const html = capture.clipboardHtml;
  const packageValue: CapturePackageV1 = {
    format: CAPTURE_PACKAGE_FORMAT,
    version: CAPTURE_PACKAGE_VERSION,
    createdAt: (options.now?.() ?? new Date()).toISOString(),
    producer: { ...options.producer },
    source: sanitizeSource(source),
    settings: projectSettings(capture.settings),
    diagnostics: await sanitizeDiagnostics(capture.diagnostics, options.subtle),
    payload: {
      type: "figma-clipboard-html",
      html,
      sha256: await sha256Utf8(html, options.subtle),
    },
  };
  return createOutputArtifact(
    packageValue,
    "capture",
    options.maxBytes ?? MAX_CAPTURE_PACKAGE_BYTES
  );
}

export async function parseCaptureFile(
  file: ArtifactFile,
  options: { maxBytes?: number; subtle?: SubtleCrypto | null } = {}
): Promise<OutputArtifact> {
  const maxBytes = options.maxBytes ?? MAX_CAPTURE_PACKAGE_BYTES;
  if (file.size > maxBytes) {
    throw new CaptureArtifactError("file-too-large");
  }
  let serializedJson: string;
  try {
    serializedJson = await file.text();
  } catch {
    throw new CaptureArtifactError("file-read");
  }
  if (utf8ByteLength(serializedJson) > maxBytes) {
    throw new CaptureArtifactError("file-too-large");
  }
  return await parseCapturePackage(serializedJson, {
    maxBytes,
    subtle: options.subtle,
  });
}

export async function parseCapturePackage(
  serializedJson: string,
  options: { maxBytes?: number; subtle?: SubtleCrypto | null } = {}
): Promise<OutputArtifact> {
  const maxBytes = options.maxBytes ?? MAX_CAPTURE_PACKAGE_BYTES;
  if (utf8ByteLength(serializedJson) > maxBytes) {
    throw new CaptureArtifactError("file-too-large");
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(serializedJson) as unknown;
  } catch {
    throw new CaptureArtifactError("invalid-json");
  }
  const packageValue = readCapturePackage(decoded);
  const actualChecksum = await sha256Utf8(
    packageValue.payload.html,
    options.subtle
  );
  if (actualChecksum !== packageValue.payload.sha256) {
    throw new CaptureArtifactError("checksum-mismatch");
  }
  return createOutputArtifact(packageValue, "opened-file", maxBytes);
}

export async function sha256Utf8(
  value: string,
  subtle: SubtleCrypto | null | undefined = globalThis.crypto?.subtle
): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  if (subtle) {
    try {
      const digest = await subtle.digest("SHA-256", bytes);
      return bytesToHex(new Uint8Array(digest));
    } catch {
      // HTTP pages may not expose a usable SubtleCrypto implementation.
    }
  }
  return bytesToHex(nobleSha256(bytes));
}

export function suggestCaptureFilename(
  packageValue: Pick<CapturePackageV1, "createdAt" | "source">
): string {
  const preferred =
    packageValue.source.title || packageValue.source.target.label || "";
  let base = preferred
    .trim()
    .replace(INVALID_FILENAME_CHARACTERS, "-")
    .split("")
    .map((character) =>
      character.charCodeAt(0) < ASCII_CONTROL_BOUNDARY ? "-" : character
    )
    .join("")
    .replace(/\s+/gu, " ")
    .replace(/[. ]+$/gu, "")
    .slice(0, MAX_FILENAME_BASE_LENGTH)
    .trim();
  if (!base) {
    base = `figit-capture-${safeTimestamp(packageValue.createdAt)}`;
  }
  if (WINDOWS_RESERVED_FILENAME.test(base)) {
    base = `capture-${base}`;
  }
  return `${base}.figit`;
}

function createOutputArtifact(
  packageValue: CapturePackageV1,
  origin: OutputArtifact["origin"],
  maxBytes: number
): OutputArtifact {
  const serializedJson = JSON.stringify(packageValue, null, 2);
  if (utf8ByteLength(serializedJson) > maxBytes) {
    throw new CaptureArtifactError("artifact-too-large");
  }
  deepFreeze(packageValue);
  return Object.freeze({
    package: packageValue,
    serializedJson,
    clipboardHtml: packageValue.payload.html,
    suggestedFilename: suggestCaptureFilename(packageValue),
    origin,
  });
}

function sanitizeSource(source: CaptureSourceSnapshot): CaptureSourceSnapshot {
  const label = source.target.label?.trim();
  return {
    url: minimizeSourceUrl(source.url),
    title: source.title,
    target: {
      kind: source.target.kind,
      ...(label ? { label } : {}),
    },
  };
}

function minimizeSourceUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return url.protocol;
    }
    return `${url.origin}${url.pathname}`;
  } catch {
    return "unknown:";
  }
}

function projectSettings(settings: EngineCaptureSettings): CaptureSettingsV1 {
  return {
    layout: settings.layout,
    motion: settings.motion,
    lineBreaks: settings.lineBreaks,
    lazyActivation: settings.lazyActivation ?? "auto",
    settleTimeoutMs: settings.settleTimeoutMs,
    images: settings.images,
    fontMode: settings.fontMode,
  };
}

async function sanitizeDiagnostics(
  diagnostics: CaptureDiagnostics,
  subtle?: SubtleCrypto | null
): Promise<CaptureDiagnosticsV1> {
  const resources = await Promise.all(
    diagnostics.images.resources.map(async (entry) => ({
      resourceId: await sha256Utf8(entry.resourceId, subtle),
      status: entry.status,
      ...(entry.byteLength === undefined
        ? {}
        : { byteLength: entry.byteLength }),
      ...(entry.errorCode ? { errorCode: entry.errorCode } : {}),
    }))
  );
  const backgrounds = await Promise.all(
    (diagnostics.backgrounds ?? []).map(async (entry) => ({
      mode: entry.mode,
      ...(entry.resourceId
        ? { resourceId: await sha256Utf8(entry.resourceId, subtle) }
        : {}),
      ...(entry.layerIndex === undefined
        ? {}
        : { layerIndex: entry.layerIndex }),
    }))
  );
  return {
    ...(diagnostics.activation
      ? {
          activation: {
            mode: diagnostics.activation.mode,
            scope: diagnostics.activation.scope,
            status: diagnostics.activation.status,
            passes: diagnostics.activation.passes,
            scrollSteps: diagnostics.activation.scrollSteps,
            containersVisited: diagnostics.activation.containersVisited,
            discoveredNodes: diagnostics.activation.discoveredNodes,
            discoveredResources: diagnostics.activation.discoveredResources,
            elapsedMs: diagnostics.activation.elapsedMs,
            restored: diagnostics.activation.restored,
            resourceSetChanged: diagnostics.activation.resourceSetChanged,
            errorCount: diagnostics.activation.errors.length,
          },
        }
      : {}),
    settle: {
      timeoutMs: diagnostics.settle.timeoutMs,
      timedOut: diagnostics.settle.timedOut,
      phase: diagnostics.settle.phase,
      pendingFonts: diagnostics.settle.pendingFonts,
      pendingImages: diagnostics.settle.pendingImages,
      waitedForImages: diagnostics.settle.waitedForImages,
      frameCount: diagnostics.settle.frameCount,
      errorCount: diagnostics.settle.errors.length,
    },
    motion: {
      mode: diagnostics.motion.mode,
      paused: diagnostics.motion.paused,
      restored: diagnostics.motion.restored,
      restoreFailureCount: diagnostics.motion.restoreFailures.length,
    },
    lineBreaks: {
      mode: diagnostics.lineBreaks.mode,
      measuredNodes: diagnostics.lineBreaks.measuredNodes,
      changedNodes: diagnostics.lineBreaks.changedNodes,
      insertedBreaks: diagnostics.lineBreaks.insertedBreaks,
      skippedNodes: diagnostics.lineBreaks.skippedNodes,
      measurementFailureCount:
        diagnostics.lineBreaks.measurementFailures.length,
    },
    fonts: {
      total: diagnostics.fonts.length,
      exact: diagnostics.fonts.filter((entry) => entry.status === "exact")
        .length,
      fallback: diagnostics.fonts.filter((entry) => entry.status === "fallback")
        .length,
      failed: diagnostics.fonts.filter((entry) => entry.status === "failed")
        .length,
      requestedCodePointCount: diagnostics.fonts.reduce(
        (total, entry) => total + (entry.request.codePoints?.length ?? 0),
        0
      ),
    },
    images: {
      completed: diagnostics.images.progress.completed,
      total: diagnostics.images.progress.total,
      failed: diagnostics.images.progress.failed,
      elapsedMs: diagnostics.images.progress.elapsedMs,
      preparedBytes: diagnostics.images.progress.preparedBytes,
      prepared: diagnostics.images.resources.filter(
        (entry) => entry.status === "prepared"
      ).length,
      placeholders: diagnostics.images.resources.filter(
        (entry) => entry.status === "placeholder"
      ).length,
      softBudgetReached: diagnostics.images.softBudgetReached,
      hardBudgetReached: diagnostics.images.hardBudgetReached,
      resources,
    },
    backgrounds,
    cleanupFailureCount: diagnostics.cleanupFailures.length,
  };
}

function readCapturePackage(value: unknown): CapturePackageV1 {
  const record = requireRecord(value);
  if (record.format !== CAPTURE_PACKAGE_FORMAT) {
    throw new CaptureArtifactError("invalid-format");
  }
  if (!Number.isInteger(record.version)) {
    throw new CaptureArtifactError("invalid-structure");
  }
  if (record.version !== CAPTURE_PACKAGE_VERSION) {
    throw new CaptureArtifactError("unsupported-version");
  }

  const createdAt = requireString(record.createdAt);
  if (Number.isNaN(Date.parse(createdAt))) {
    throw new CaptureArtifactError("invalid-structure");
  }
  const producer = readProducer(record.producer);
  const source = readSource(record.source);
  const settings = readSettings(record.settings);
  const diagnostics = readDiagnostics(record.diagnostics);
  const payload = requireRecord(record.payload);
  const html = requireString(payload.html);
  const checksum = requireString(payload.sha256);
  if (!SHA256_PATTERN.test(checksum)) {
    throw new CaptureArtifactError("invalid-structure");
  }
  if (payload.type !== "figma-clipboard-html") {
    throw new CaptureArtifactError("unsupported-payload");
  }
  return {
    format: CAPTURE_PACKAGE_FORMAT,
    version: CAPTURE_PACKAGE_VERSION,
    createdAt,
    producer,
    source,
    settings,
    diagnostics,
    payload: { type: "figma-clipboard-html", html, sha256: checksum },
  };
}

function readProducer(value: unknown): CaptureProducer {
  const record = requireRecord(value);
  return {
    name: requireString(record.name),
    version: requireString(record.version),
  };
}

function readSource(value: unknown): CaptureSourceSnapshot {
  const record = requireRecord(value);
  const target = requireRecord(record.target);
  const kind = requireEnum(target.kind, ["page", "element"]);
  const label = optionalString(target.label);
  const url = requireString(record.url);
  if (url !== minimizeSourceUrl(url) || label?.trim() !== label) {
    throw new CaptureArtifactError("invalid-structure");
  }
  return {
    url,
    title: requireString(record.title),
    target: { kind, ...(label === undefined ? {} : { label }) },
  };
}

function readSettings(value: unknown): CaptureSettingsV1 {
  const record = requireRecord(value);
  return {
    layout: requireEnum(record.layout, ["absolute", "auto"]),
    motion: requireEnum(record.motion, ["freeze", "live"]),
    lineBreaks: requireEnum(record.lineBreaks, ["auto", "off"]),
    lazyActivation: requireEnum(record.lazyActivation, ["auto", "off"]),
    settleTimeoutMs: requireNonNegativeNumber(record.settleTimeoutMs),
    images: requireEnum(record.images, ["process", "skip", "best-effort"]),
    fontMode: requireEnum(record.fontMode, [
      "compatible",
      "fast-local",
      "strict",
    ]),
  };
}

function readDiagnostics(value: unknown): CaptureDiagnosticsV1 {
  const record = requireRecord(value);
  const activation =
    record.activation === undefined
      ? undefined
      : readActivationDiagnostics(record.activation);
  const settle = requireRecord(record.settle);
  const motion = requireRecord(record.motion);
  const lineBreaks = requireRecord(record.lineBreaks);
  const fonts = requireRecord(record.fonts);
  const images = requireRecord(record.images);
  const resources = requireArray(images.resources).map((entry) => {
    const resource = requireRecord(entry);
    const resourceId = requireString(resource.resourceId);
    if (!SHA256_PATTERN.test(resourceId)) {
      throw new CaptureArtifactError("invalid-structure");
    }
    const errorCode = optionalStableCode(resource.errorCode);
    const byteLength = optionalNonNegativeNumber(resource.byteLength);
    return {
      resourceId,
      status: requireEnum(resource.status, [
        "prepared",
        "failed",
        "placeholder",
      ]),
      ...(byteLength === undefined ? {} : { byteLength }),
      ...(errorCode === undefined ? {} : { errorCode }),
    };
  });
  const backgrounds = requireArray(record.backgrounds).map((entry) => {
    const background = requireRecord(entry);
    const resourceId = optionalString(background.resourceId);
    if (resourceId !== undefined && !SHA256_PATTERN.test(resourceId)) {
      throw new CaptureArtifactError("invalid-structure");
    }
    const layerIndex = optionalNonNegativeNumber(background.layerIndex);
    return {
      mode: requireEnum(background.mode, [
        "native",
        "raster-fallback",
        "unsupported",
        "failed",
        "placeholder",
      ]),
      ...(resourceId === undefined ? {} : { resourceId }),
      ...(layerIndex === undefined ? {} : { layerIndex }),
    };
  });
  return {
    ...(activation === undefined ? {} : { activation }),
    settle: {
      timeoutMs: requireNonNegativeNumber(settle.timeoutMs),
      timedOut: requireBoolean(settle.timedOut),
      phase: requireEnum(settle.phase, [
        "fonts",
        "images",
        "layout",
        "complete",
        "skipped",
      ]),
      pendingFonts: requireBoolean(settle.pendingFonts),
      pendingImages: requireNonNegativeNumber(settle.pendingImages),
      waitedForImages: requireNonNegativeNumber(settle.waitedForImages),
      frameCount: requireNonNegativeNumber(settle.frameCount),
      errorCount: requireNonNegativeNumber(settle.errorCount),
    },
    motion: {
      mode: requireEnum(motion.mode, ["freeze", "live"]),
      paused: requireNonNegativeNumber(motion.paused),
      restored: requireNonNegativeNumber(motion.restored),
      restoreFailureCount: requireNonNegativeNumber(motion.restoreFailureCount),
    },
    lineBreaks: {
      mode: requireEnum(lineBreaks.mode, ["auto", "off"]),
      measuredNodes: requireNonNegativeNumber(lineBreaks.measuredNodes),
      changedNodes: requireNonNegativeNumber(lineBreaks.changedNodes),
      insertedBreaks: requireNonNegativeNumber(lineBreaks.insertedBreaks),
      skippedNodes: requireNonNegativeNumber(lineBreaks.skippedNodes),
      measurementFailureCount: requireNonNegativeNumber(
        lineBreaks.measurementFailureCount
      ),
    },
    fonts: {
      total: requireNonNegativeNumber(fonts.total),
      exact: requireNonNegativeNumber(fonts.exact),
      fallback: requireNonNegativeNumber(fonts.fallback),
      failed: requireNonNegativeNumber(fonts.failed),
      requestedCodePointCount: requireNonNegativeNumber(
        fonts.requestedCodePointCount
      ),
    },
    images: {
      completed: requireNonNegativeNumber(images.completed),
      total: requireNonNegativeNumber(images.total),
      failed: requireNonNegativeNumber(images.failed),
      elapsedMs: requireNonNegativeNumber(images.elapsedMs),
      preparedBytes: requireNonNegativeNumber(images.preparedBytes),
      prepared: requireNonNegativeNumber(images.prepared),
      placeholders: requireNonNegativeNumber(images.placeholders),
      softBudgetReached: requireBoolean(images.softBudgetReached),
      hardBudgetReached: requireBoolean(images.hardBudgetReached),
      resources,
    },
    backgrounds,
    cleanupFailureCount: requireNonNegativeNumber(record.cleanupFailureCount),
  };
}

function readActivationDiagnostics(
  value: unknown
): NonNullable<CaptureDiagnosticsV1["activation"]> {
  const activation = requireRecord(value);
  return {
    mode: requireEnum(activation.mode, ["auto", "off"]),
    scope: requireEnum(activation.scope, ["page", "element", "canvas"]),
    status: requireEnum(activation.status, [
      "off",
      "not-applicable",
      "completed",
      "budget-exhausted",
      "timed-out",
      "canceled",
      "target-lost",
      "restore-failed",
      "resource-set-changed",
    ]),
    passes: requireNonNegativeNumber(activation.passes),
    scrollSteps: requireNonNegativeNumber(activation.scrollSteps),
    containersVisited: requireNonNegativeNumber(activation.containersVisited),
    discoveredNodes: requireNonNegativeNumber(activation.discoveredNodes),
    discoveredResources: requireNonNegativeNumber(
      activation.discoveredResources
    ),
    elapsedMs: requireNonNegativeNumber(activation.elapsedMs),
    restored: requireBoolean(activation.restored),
    resourceSetChanged: requireBoolean(activation.resourceSetChanged),
    errorCount: requireNonNegativeNumber(activation.errorCount),
  };
}

function requireRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new CaptureArtifactError("invalid-structure");
  }
  return value as Record<string, unknown>;
}

function requireArray(value: unknown): ReadonlyArray<unknown> {
  if (!Array.isArray(value)) {
    throw new CaptureArtifactError("invalid-structure");
  }
  return value;
}

function requireString(value: unknown): string {
  if (typeof value !== "string") {
    throw new CaptureArtifactError("invalid-structure");
  }
  return value;
}

function optionalString(value: unknown): string | undefined {
  return value === undefined ? undefined : requireString(value);
}

function requireBoolean(value: unknown): boolean {
  if (typeof value !== "boolean") {
    throw new CaptureArtifactError("invalid-structure");
  }
  return value;
}

function requireNonNegativeNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new CaptureArtifactError("invalid-structure");
  }
  return value;
}

function optionalNonNegativeNumber(value: unknown): number | undefined {
  return value === undefined ? undefined : requireNonNegativeNumber(value);
}

function requireStableCode(value: unknown): string {
  const code = requireString(value);
  if (!STABLE_CODE_PATTERN.test(code)) {
    throw new CaptureArtifactError("invalid-structure");
  }
  return code;
}

function optionalStableCode(value: unknown): string | undefined {
  return value === undefined ? undefined : requireStableCode(value);
}

function requireEnum<const T extends ReadonlyArray<string>>(
  value: unknown,
  accepted: T
): T[number] {
  if (typeof value !== "string" || !accepted.includes(value)) {
    throw new CaptureArtifactError("invalid-structure");
  }
  return value;
}

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) =>
    byte.toString(HEX_RADIX).padStart(HEX_BYTE_WIDTH, "0")
  ).join("");
}

function safeTimestamp(value: string): string {
  const parsed = new Date(value);
  const date = Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
  return date.toISOString().replace(/[:.]/gu, "-");
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}

function errorMessage(code: CaptureArtifactErrorCode): string {
  switch (code) {
    case "file-too-large":
      return "The capture package is larger than 256 MiB.";
    case "file-read":
      return "The capture package could not be read.";
    case "invalid-json":
      return "The selected file is not valid JSON.";
    case "invalid-format":
      return "The selected file is not a Figit capture package.";
    case "invalid-structure":
      return "The capture package structure is invalid.";
    case "unsupported-version":
      return "This capture package version is not supported.";
    case "unsupported-payload":
      return "This capture package payload is not supported.";
    case "checksum-mismatch":
      return "The capture package checksum does not match its payload.";
    case "artifact-too-large":
      return "The prepared capture is too large to save safely.";
    default:
      return "The capture package could not be processed.";
  }
}
