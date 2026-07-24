import { storage } from "#imports";
import type {
  CaptureSettings,
  CaptureSettingsRepository,
} from "./capture-settings";
import {
  DEFAULT_CAPTURE_SETTINGS,
  normalizeCaptureSettings,
} from "./capture-settings";

const captureSettings = storage.defineItem<unknown>("local:capture-settings", {
  fallback: DEFAULT_CAPTURE_SETTINGS,
});

export function createCaptureSettingsRepository(): CaptureSettingsRepository {
  return {
    async load() {
      return normalizeCaptureSettings(await captureSettings.getValue());
    },
    async save(settings: CaptureSettings) {
      await captureSettings.setValue(normalizeCaptureSettings(settings));
    },
  };
}
