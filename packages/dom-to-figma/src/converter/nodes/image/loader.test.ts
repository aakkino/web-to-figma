import { afterEach, describe, expect, it, vi } from "vitest";
import { processImageFile } from "./loader";

// The fixture PNG from __fixtures__/loaders.ts (1x1 red, 69 bytes) and its
// known SHA-1 — the same digest asserted by the browser image test.
const RED_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC";
const RED_PNG_SHA1_HEX = "2732f12a8f18d27cf0fa78ef41091bfa1ccec9ce";

function pngBytes(): ArrayBuffer {
  const buf = Buffer.from(RED_PNG_BASE64, "base64");
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

const toHex = (bytes: ReadonlyArray<number>): string =>
  bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("processImageFile SHA-1 hashing", () => {
  it("hashes a PNG via crypto.subtle when it is available", async () => {
    const { hash, bytes, width, height } = await processImageFile({
      bytes: pngBytes(),
      mimeType: "image/png",
    });

    expect(toHex(hash)).toBe(RED_PNG_SHA1_HEX);
    expect(bytes).toHaveLength(69);
    expect({ width, height }).toEqual({ width: 1, height: 1 });
  });

  it("hashes identically when crypto.subtle is absent (non-secure context)", async () => {
    // The harness renders scenes on an about:blank page, where crypto.subtle is
    // undefined; without a fallback the image node threw and was dropped.
    vi.stubGlobal("crypto", {});

    const { hash } = await processImageFile({
      bytes: pngBytes(),
      mimeType: "image/png",
    });

    expect(toHex(hash)).toBe(RED_PNG_SHA1_HEX);
  });

  it("reads intrinsic dimensions from supported GIF and JPEG bytes", async () => {
    const gif = new Uint8Array([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x5a, 0x00, 0x2e, 0x00,
    ]).buffer;
    const jpeg = new Uint8Array([
      0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x2e, 0x00, 0x5a, 0x03,
      0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00,
    ]).buffer;

    const gifInfo = await processImageFile({
      bytes: gif,
      mimeType: "image/gif",
    });
    const jpegInfo = await processImageFile({
      bytes: jpeg,
      mimeType: "image/jpeg",
    });

    expect({ width: gifInfo.width, height: gifInfo.height }).toEqual({
      width: 90,
      height: 46,
    });
    expect({ width: jpegInfo.width, height: jpegInfo.height }).toEqual({
      width: 90,
      height: 46,
    });
  });
});
