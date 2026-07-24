import { arrayBufferToBase64 } from "./base64";
import type {
  FetchUrlResult,
  ResourceCancelRequest,
  ResourceCancelResult,
  ResourceRequest,
} from "./messaging";

const ALLOWED_SCHEMES = new Set(["http:", "https:"]);

export type ResourceProxy = {
  fetch(request: ResourceRequest): Promise<FetchUrlResult>;
  cancel(request: ResourceCancelRequest): ResourceCancelResult;
};

export function createResourceProxy(
  fetchImpl: typeof fetch = globalThis.fetch
): ResourceProxy {
  const activeRequests = new Map<string, AbortController>();

  return {
    fetch: fetchAsBase64,
    cancel: cancelResource,
  };

  async function fetchAsBase64(
    request: ResourceRequest
  ): Promise<FetchUrlResult> {
    validateResourceUrl(request.url);
    const controller = new AbortController();
    const key = requestKey(request);
    activeRequests.set(key, controller);
    try {
      const response = await fetchImpl(request.url, {
        credentials: "omit",
        cache: "force-cache",
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Fetch failed (${response.status})`);
      }
      const blob = await response.blob();
      return {
        bytesBase64: arrayBufferToBase64(await blob.arrayBuffer()),
        mimeType: blob.type || "application/octet-stream",
      };
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error("Resource fetch aborted");
      }
      throw error instanceof Error ? error : new Error("Resource fetch failed");
    } finally {
      if (activeRequests.get(key) === controller) {
        activeRequests.delete(key);
      }
    }
  }

  function cancelResource(
    request: ResourceCancelRequest
  ): ResourceCancelResult {
    const controller = activeRequests.get(requestKey(request));
    if (!controller) {
      return { canceled: false };
    }
    controller.abort();
    return { canceled: true };
  }
}

export function validateResourceUrl(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid resource URL");
  }
  if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
    throw new Error("Refused resource scheme");
  }
  return parsed;
}

export function requestKey(request: {
  sessionId: string;
  requestId: string;
}): string {
  return `${request.sessionId}:${request.requestId}`;
}
