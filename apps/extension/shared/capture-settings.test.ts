import { describe, expect, it } from "vitest";

import {
  createMemorySettingsRepository,
  DEFAULT_CAPTURE_SETTINGS,
  mergeCaptureSettings,
  normalizeCaptureSettings,
} from "./capture-settings";

describe("capture settings", () => {
  it("fills defaults and repairs invalid persisted values", () => {
    expect(
      normalizeCaptureSettings({
        version: 99,
        image: { mode: "unknown" },
        font: { mode: "strict" },
        outputs: { clipboard: false, file: false },
        advanced: { settleTimeoutMs: 99_999 },
      })
    ).toEqual({
      ...DEFAULT_CAPTURE_SETTINGS,
      font: { mode: "strict" },
      advanced: {
        ...DEFAULT_CAPTURE_SETTINGS.advanced,
        settleTimeoutMs: 30_000,
      },
    });
  });

  it("rejects a zero-output edit without changing the current value", () => {
    const next = mergeCaptureSettings(DEFAULT_CAPTURE_SETTINGS, {
      outputs: { clipboard: false, file: false },
    });
    expect(next.outputs).toEqual({ clipboard: true, file: false });
  });

  it("persists only normalized settings in the repository", async () => {
    const repository = createMemorySettingsRepository({
      outputs: { clipboard: true, file: false },
    });
    await repository.save(
      mergeCaptureSettings(DEFAULT_CAPTURE_SETTINGS, {
        advanced: { settleTimeoutMs: 0 },
      })
    );
    await expect(repository.load()).resolves.toMatchObject({
      advanced: { settleTimeoutMs: 0 },
    });
  });
});
