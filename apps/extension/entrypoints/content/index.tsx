import { createRoot } from "react-dom/client";
import { browser, createShadowRootUi, defineContentScript } from "#imports";
import { DEFAULT_CAPTURE_SETTINGS } from "../../shared/capture-settings";
import { createCaptureSettingsRepository } from "../../shared/capture-settings-storage";
import { onMessage } from "../../shared/messaging";
import { SHADOW_HOST_NAME } from "../../shared/triggers";
import { App } from "./app";
import { createCaptureOutputPort } from "./capture-output";
import {
  createExtensionCaptureEngine,
  createExtensionFontSpecPort,
} from "./convert";
import type { WorkspaceController } from "./workspace-controller";
import { createWorkspaceController } from "./workspace-controller";

import "./style.css";
import "sonner/dist/styles.css";

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",
  cssInjectionMode: "ui",
  async main(ctx) {
    let controller: WorkspaceController | null = null;
    const ui = await createShadowRootUi(ctx, {
      name: SHADOW_HOST_NAME,
      position: "overlay",
      anchor: "html",
      // Picker hot keys must not leak into the page underneath.
      isolateEvents: ["keydown", "keyup", "keypress"],
      onMount(container, _shadow, shadowHost) {
        const outputPort = createCaptureOutputPort({
          producer: {
            name: "figit-extension",
            version: browser.runtime.getManifest().version,
          },
        });
        const workspaceController = createWorkspaceController({
          engine: createExtensionCaptureEngine(DEFAULT_CAPTURE_SETTINGS),
          engineFactory: createExtensionCaptureEngine,
          settingsRepository: createCaptureSettingsRepository(),
          outputPort,
          fontSpecPort: createExtensionFontSpecPort(),
        });
        controller = workspaceController;
        const root = createRoot(container);
        root.render(
          <App
            controller={workspaceController}
            ctx={ctx}
            outputCapabilities={outputPort.capabilities}
            shadowHost={shadowHost}
          />
        );
        return root;
      },
      onRemove(root) {
        root?.unmount();
      },
    });
    ui.mount();

    const removeMessageListener = onMessage("openWorkspace", () => {
      controller?.open();
      return { opened: controller !== null };
    });
    ctx.signal.addEventListener("abort", removeMessageListener, { once: true });
  },
});
