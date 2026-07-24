import { describe, expect, it, vi } from "vitest";

import type { ResourceRequest } from "./messaging";
import { createResourceProxy } from "./resource-proxy";

const REQUEST: ResourceRequest = {
  sessionId: "session-1",
  requestId: "request-1",
  url: "https://example.test/image.png",
};
const RESPONSE_BYTES = new Uint8Array([1, 2, 3]);

describe("resource proxy", () => {
  it("validates schemes and returns bytes with the response MIME", async () => {
    let seenInit: RequestInit | undefined;
    const fetchImpl = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => {
      seenInit = init;
      return Promise.resolve(
        new Response(RESPONSE_BYTES, {
          headers: { "content-type": "image/png" },
        })
      );
    });
    const proxy = createResourceProxy(fetchImpl);

    const result = await proxy.fetch(REQUEST);

    expect(result.mimeType).toBe("image/png");
    expect(result.bytesBase64).toBe("AQID");
    expect(seenInit).toMatchObject({
      cache: "force-cache",
      credentials: "omit",
    });
    expect(seenInit?.signal).toBeInstanceOf(AbortSignal);
  });

  it("rejects invalid and privileged schemes before fetch", async () => {
    const fetchImpl = vi.fn();
    const proxy = createResourceProxy(fetchImpl);

    await expect(proxy.fetch({ ...REQUEST, url: "not a url" })).rejects.toThrow(
      "Invalid resource URL"
    );
    await expect(
      proxy.fetch({ ...REQUEST, url: "file:///private/image.png" })
    ).rejects.toThrow("Refused resource scheme");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("maps HTTP errors and removes completed requests", async () => {
    const fetchImpl = vi.fn(async () => new Response("no", { status: 503 }));
    const proxy = createResourceProxy(fetchImpl);

    await expect(proxy.fetch(REQUEST)).rejects.toThrow("Fetch failed (503)");
    expect(proxy.cancel(REQUEST)).toEqual({ canceled: false });
  });

  it("aborts active work and makes duplicate cancel idempotent", async () => {
    const fetchImpl = vi.fn(
      async (_url: RequestInfo | URL, init?: RequestInit) =>
        await new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => reject(new Error("fetch aborted")),
            { once: true }
          );
        })
    );
    const proxy = createResourceProxy(fetchImpl);
    const pending = proxy.fetch(REQUEST);
    await Promise.resolve();

    expect(proxy.cancel(REQUEST)).toEqual({ canceled: true });
    await expect(pending).rejects.toThrow("Resource fetch aborted");
    expect(proxy.cancel(REQUEST)).toEqual({ canceled: false });
  });
});
