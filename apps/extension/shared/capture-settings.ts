export type CaptureImageMode = "process" | "skip";
export type CaptureFontMode = "compatible" | "fast-local" | "strict";
export type CaptureLayout = "auto" | "absolute";
export type CaptureMotion = "freeze" | "live";
export type CaptureLineBreaks = "auto" | "off";
export type CaptureLazyActivation = "auto" | "off";
export type CaptureOutput = "clipboard" | "file";

export type CaptureSettings = {
  version: 1;
  image: {
    mode: CaptureImageMode;
  };
  font: {
    mode: CaptureFontMode;
  };
  outputs: {
    clipboard: boolean;
    file: boolean;
  };
  advanced: {
    layout: CaptureLayout;
    motion: CaptureMotion;
    lineBreaks: CaptureLineBreaks;
    lazyActivation: CaptureLazyActivation;
    settleTimeoutMs: number;
  };
};

export type CaptureSettingsPatch = {
  image?: Partial<CaptureSettings["image"]>;
  font?: Partial<CaptureSettings["font"]>;
  outputs?: Partial<CaptureSettings["outputs"]>;
  advanced?: Partial<CaptureSettings["advanced"]>;
};

export type CaptureSettingsRepository = {
  load(): Promise<CaptureSettings>;
  save(settings: CaptureSettings): Promise<void>;
};

export const MAX_SETTLE_TIMEOUT_MS = 30_000;

export const DEFAULT_CAPTURE_SETTINGS: CaptureSettings = {
  version: 1,
  image: { mode: "process" },
  font: { mode: "compatible" },
  outputs: { clipboard: true, file: false },
  advanced: {
    layout: "auto",
    motion: "freeze",
    lineBreaks: "auto",
    lazyActivation: "auto",
    settleTimeoutMs: 5000,
  },
};

export function normalizeCaptureSettings(value: unknown): CaptureSettings {
  const record = asRecord(value);
  const image = asRecord(record.image);
  const font = asRecord(record.font);
  const outputs = asRecord(record.outputs);
  const advanced = asRecord(record.advanced);

  const normalized: CaptureSettings = {
    version: 1,
    image: {
      mode: oneOf(
        image.mode,
        ["process", "skip"],
        DEFAULT_CAPTURE_SETTINGS.image.mode
      ),
    },
    font: {
      mode: oneOf(
        font.mode,
        ["compatible", "fast-local", "strict"],
        DEFAULT_CAPTURE_SETTINGS.font.mode
      ),
    },
    outputs: {
      clipboard: booleanOr(
        outputs.clipboard,
        DEFAULT_CAPTURE_SETTINGS.outputs.clipboard
      ),
      file: booleanOr(outputs.file, DEFAULT_CAPTURE_SETTINGS.outputs.file),
    },
    advanced: {
      layout: oneOf(
        advanced.layout,
        ["auto", "absolute"],
        DEFAULT_CAPTURE_SETTINGS.advanced.layout
      ),
      motion: oneOf(
        advanced.motion,
        ["freeze", "live"],
        DEFAULT_CAPTURE_SETTINGS.advanced.motion
      ),
      lineBreaks: oneOf(
        advanced.lineBreaks,
        ["auto", "off"],
        DEFAULT_CAPTURE_SETTINGS.advanced.lineBreaks
      ),
      lazyActivation: oneOf(
        advanced.lazyActivation,
        ["auto", "off"],
        DEFAULT_CAPTURE_SETTINGS.advanced.lazyActivation
      ),
      settleTimeoutMs: boundedInteger(
        advanced.settleTimeoutMs,
        DEFAULT_CAPTURE_SETTINGS.advanced.settleTimeoutMs
      ),
    },
  };

  if (!(normalized.outputs.clipboard || normalized.outputs.file)) {
    normalized.outputs.clipboard = true;
  }
  return normalized;
}

export function mergeCaptureSettings(
  current: CaptureSettings,
  patch: CaptureSettingsPatch
): CaptureSettings {
  return normalizeCaptureSettings({
    ...current,
    ...patch,
    image: { ...current.image, ...patch.image },
    font: { ...current.font, ...patch.font },
    outputs: { ...current.outputs, ...patch.outputs },
    advanced: { ...current.advanced, ...patch.advanced },
  });
}

export function hasSelectedOutput(settings: CaptureSettings): boolean {
  return settings.outputs.clipboard || settings.outputs.file;
}

export function createMemorySettingsRepository(
  initial: unknown = DEFAULT_CAPTURE_SETTINGS
): CaptureSettingsRepository {
  let value = normalizeCaptureSettings(initial);
  return {
    load() {
      return Promise.resolve(value);
    },
    save(settings) {
      value = normalizeCaptureSettings(settings);
      return Promise.resolve();
    },
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function booleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function boundedInteger(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.min(MAX_SETTLE_TIMEOUT_MS, Math.round(value)));
}

function oneOf<const T extends ReadonlyArray<string>>(
  value: unknown,
  values: T,
  fallback: T[number]
): T[number] {
  return typeof value === "string" && values.includes(value) ? value : fallback;
}
