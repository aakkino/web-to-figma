import type {
  FontTransport,
  ImageLoader,
} from "@figit/browser-capture-adapter";
import { createDirectImageLoader } from "@figit/browser-capture-adapter";

import { base64ToArrayBuffer } from "./base64";
import { sendMessage } from "./messaging";

/**
 * Try the page's own `fetch(src)` first via dom-to-figma's direct loader.
 * On any failure (CORS, opaque response, network) fall back to the
 * background service worker, which has `<all_urls>` host permissions and
 * can read public bytes from any origin.
 */
export function createBackgroundImageLoader(): ImageLoader {
  const direct = createDirectImageLoader();
  const sessionId = createResourceSessionId();
  return async (request) => {
    try {
      return await direct(request);
    } catch {
      if (request.signal?.aborted) {
        throw new Error("Image request aborted");
      }
      const pending = createResourceRequest(
        request.src,
        request.signal,
        sessionId
      );
      try {
        const result = await sendMessage("fetchImage", pending.request);
        if (request.signal?.aborted) {
          throw new Error("Image request aborted");
        }
        return {
          bytes: base64ToArrayBuffer(result.bytesBase64),
          mimeType: result.mimeType,
        };
      } finally {
        pending.cleanup();
      }
    }
  };
}

/**
 * Font bytes use the same least-privileged page-first strategy as images.
 * The adapter calls this transport only after direct page fetch fails.
 */
export function createBackgroundFontTransport(): FontTransport {
  const sessionId = createResourceSessionId();
  return async (url, signal) => {
    if (signal?.aborted) {
      throw new Error("Font request aborted");
    }
    const pending = createResourceRequest(url, signal, sessionId);
    try {
      const result = await sendMessage("fetchFont", pending.request);
      if (signal?.aborted) {
        throw new Error("Font request aborted");
      }
      return {
        bytes: base64ToArrayBuffer(result.bytesBase64),
        mimeType: result.mimeType,
      };
    } finally {
      pending.cleanup();
    }
  };
}

let resourceSequence = 0;
const REQUEST_ID_RADIX = 36;
let resourceSessionSequence = 0;

function createResourceRequest(
  url: string,
  signal: AbortSignal | undefined,
  sessionId: string
): {
  request: { sessionId: string; requestId: string; url: string };
  cleanup: () => void;
} {
  const requestId = `resource-${Date.now().toString(REQUEST_ID_RADIX)}-${(++resourceSequence).toString(REQUEST_ID_RADIX)}`;
  const request = { sessionId, requestId, url };
  let cancel: (() => void) | undefined;
  if (signal) {
    cancel = () => {
      sendMessage("cancelResource", { sessionId, requestId }).catch(
        () => undefined
      );
    };
    if (signal.aborted) {
      cancel();
    } else {
      signal.addEventListener("abort", cancel, { once: true });
    }
  }
  return {
    request,
    cleanup() {
      if (cancel) {
        signal?.removeEventListener("abort", cancel);
      }
    },
  };
}

function createResourceSessionId(): string {
  return `content-resource-${Date.now().toString(REQUEST_ID_RADIX)}-${(++resourceSessionSequence).toString(REQUEST_ID_RADIX)}`;
}
