import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: [
            "shared/resource-proxy.test.ts",
            "shared/capture-settings.test.ts",
            "entrypoints/content/workspace-controller.test.ts",
            "entrypoints/content/font-fallback.test.ts",
            "entrypoints/content/font-spec-projection.test.ts",
            "entrypoints/content/font-spec.test.ts",
          ],
          environment: "node",
        },
      },
      {
        test: {
          name: "browser",
          include: ["entrypoints/content/**/*.browser.test.ts"],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
