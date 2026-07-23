import type { FontTransport } from "@figit/browser-capture-adapter";
import type { ImageLoader as DomToFigmaImageLoader } from "@figit/dom-to-figma";
import { createDirectImageLoader } from "@figit/dom-to-figma";

import { base64ToArrayBuffer } from "./base64";
import { sendMessage } from "./messaging";

/**
 * Try the page's own `fetch(src)` first via dom-to-figma's direct loader.
 * On any failure (CORS, opaque response, network) fall back to the
 * background service worker, which has `<all_urls>` host permissions and
 * can read public bytes from any origin.
 */
export function createBackgroundImageLoader(): DomToFigmaImageLoader {
  const direct = createDirectImageLoader();
  return async (request) => {
    try {
      return await direct(request);
    } catch {
      const result = await sendMessage("fetchImage", request.src);
      return {
        bytes: base64ToArrayBuffer(result.bytesBase64),
        mimeType: result.mimeType,
      };
    }
  };
}

/**
 * Font bytes use the same least-privileged page-first strategy as images.
 * The adapter calls this transport only after direct page fetch fails.
 */
export function createBackgroundFontTransport(): FontTransport {
  return async (url) => {
    const result = await sendMessage("fetchFont", url);
    return {
      bytes: base64ToArrayBuffer(result.bytesBase64),
      mimeType: result.mimeType,
    };
  };
}
