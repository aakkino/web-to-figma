import type { DomTreeStrategy } from "@aakkino/composed-dom";
import { describe, expect, it, vi } from "vitest";

import type {
  CaptureClassifier,
  ImageFile,
  ImagePlaceholderReason,
  ImageRequest,
} from "../types";
import {
  assertStagedImageCapability,
  createDomToFigmaBridgeForModule,
  UnsupportedCaptureCapabilityError,
} from "./dom-to-figma";

type TestPreparation = {
  prepare(
    request: ImageRequest,
    signal?: AbortSignal
  ): Promise<
    | { kind: "image"; image: { byteLength: number } }
    | { kind: "placeholder"; reason: ImagePlaceholderReason }
  >;
  resolve(
    request: ImageRequest
  ):
    | { kind: "image"; image: { byteLength: number } }
    | { kind: "placeholder"; reason: ImagePlaceholderReason };
  setPlaceholder(
    request: Pick<ImageRequest, "src"> & Partial<Pick<ImageRequest, "element">>,
    reason: ImagePlaceholderReason
  ): void;
  clear(): void;
};

type TestConverterConfig = {
  imageLoader(request: ImageRequest): Promise<ImageFile>;
  imagePreparation?: TestPreparation;
  imageSourceResolver?: (element: HTMLImageElement) => string | null;
  backgroundImageResolver?: (element: Element) => string | null;
  onBackgroundDiagnostic?: (diagnostic: {
    mode: "native";
    reason: string;
    source?: string;
  }) => void;
  classify?: CaptureClassifier;
  domTraversal?: DomTreeStrategy;
};

function createCoreFixture(
  createImagePreparation?: () => TestPreparation,
  supportsBackgroundImages = false,
  convertError?: Error,
  onConvert?: (config: TestConverterConfig) => void
) {
  let config: TestConverterConfig | undefined;
  const clearCache = vi.fn(() => config?.imagePreparation?.clear());
  return {
    core: {
      createFigmaConverter(nextConfig: TestConverterConfig) {
        config = nextConfig;
        return {
          convert: () => {
            onConvert?.(nextConfig);
            return convertError
              ? Promise.reject(convertError)
              : Promise.resolve({
                  toClipboardHtml: () => "<meta data-figit-test>",
                });
          },
          clearCache,
        };
      },
      createDirectImageLoader: () => async () => imageFile(1),
      createFontsourceLoader: () => async () => ({ bytes: new ArrayBuffer(1) }),
      ...(supportsBackgroundImages
        ? { domToFigmaCapabilities: { cssBackgroundImages: true } }
        : {}),
      ...(createImagePreparation ? { createImagePreparation } : {}),
    },
    clearCache,
    getConfig() {
      if (!config) {
        throw new Error("converter was not created");
      }
      return config;
    },
  };
}

function imageRequest(src = "https://example.test/image.png"): ImageRequest {
  return {
    src,
    element: { src, currentSrc: src } as HTMLImageElement,
  };
}

function imageFile(byteLength: number): ImageFile {
  return {
    bytes: new ArrayBuffer(byteLength),
    mimeType: "image/png",
  };
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

describe("dom-to-figma capability boundary", () => {
  it("negotiates CSS background support structurally", () => {
    const stable = createCoreFixture();
    const current = createCoreFixture(undefined, true);

    expect(
      createDomToFigmaBridgeForModule(stable.core).supportsBackgroundImages
    ).toBe(false);
    expect(
      createDomToFigmaBridgeForModule(current.core).supportsBackgroundImages
    ).toBe(true);
  });

  it("passes the selected DOM traversal strategy to the converter", () => {
    const fixture = createCoreFixture();
    const domTraversal: DomTreeStrategy = {
      children: () => [],
      walk: () => [],
    };

    createDomToFigmaBridgeForModule(fixture.core, { domTraversal });

    expect(fixture.getConfig().domTraversal).toBe(domTraversal);
  });

  it("scopes frozen background sources to one conversion and reset", async () => {
    const owner = {} as Element;
    const source = 'https://example.test/lazy"background.png';
    let observedDuringConversion: string | null | undefined;
    const fixture = createCoreFixture(undefined, true, undefined, (config) => {
      observedDuringConversion = config.backgroundImageResolver?.(owner);
    });
    const bridge = createDomToFigmaBridgeForModule(fixture.core);

    await bridge.convert({ element: owner, width: 10, height: 10 }, undefined, {
      backgroundSources: new Map([[owner, source]]),
    });

    expect(observedDuringConversion).toBe(
      'url("https://example.test/lazy\\"background.png")'
    );
    expect(fixture.getConfig().backgroundImageResolver?.(owner)).toBeNull();
    bridge.clearCache();
    expect(fixture.getConfig().backgroundImageResolver?.(owner)).toBeNull();
  });

  it("rejects overlapping conversions without replacing active context", async () => {
    const firstOwner = {} as Element;
    const secondOwner = {} as Element;
    let releaseFirst: (() => void) | undefined;
    let resolver: TestConverterConfig["backgroundImageResolver"];
    const bridge = createDomToFigmaBridgeForModule({
      createFigmaConverter(config: TestConverterConfig) {
        resolver = config.backgroundImageResolver;
        return {
          convert: () =>
            new Promise((resolve) => {
              releaseFirst = () =>
                resolve({ toClipboardHtml: () => "<meta data-figit-test>" });
            }),
          clearCache() {
            // no-op test cache
          },
        };
      },
      createDirectImageLoader: () => async () => imageFile(1),
      createFontsourceLoader: () => async () => ({
        bytes: new ArrayBuffer(0),
      }),
    });
    const first = bridge.convert(
      { element: firstOwner, width: 10, height: 10 },
      undefined,
      {
        backgroundSources: new Map([
          [firstOwner, "https://example.test/first.png"],
        ]),
      }
    );

    await expect(
      bridge.convert(
        { element: secondOwner, width: 10, height: 10 },
        undefined,
        {
          backgroundSources: new Map([
            [secondOwner, "https://example.test/second.png"],
          ]),
        }
      )
    ).rejects.toThrow("already in progress");

    expect(resolver?.(firstOwner)).toBe(
      'url("https://example.test/first.png")'
    );
    releaseFirst?.();
    await first;
  });

  it("uses adapter staging when the optional preparation export is absent", async () => {
    const fixture = createCoreFixture();
    const loader = vi.fn(async () => imageFile(7));
    const bridge = createDomToFigmaBridgeForModule(fixture.core, {
      imageLoader: loader,
    });
    const request = imageRequest();

    await expect(bridge.imagePreparation.prepare(request)).resolves.toEqual({
      status: "prepared",
      byteLength: 7,
    });
    await expect(fixture.getConfig().imageLoader(request)).resolves.toBe(
      await loader.mock.results[0]?.value
    );
    expect(loader).toHaveBeenCalledOnce();
    await expect(
      bridge.convert({ element: request.element, width: 10, height: 10 })
    ).resolves.toEqual({ clipboardHtml: "<meta data-figit-test>" });
    expect(fixture.clearCache).toHaveBeenCalledOnce();
    expect(
      (await fixture.getConfig().imageLoader(request)).bytes.byteLength
    ).not.toBe(7);
  });

  it("maps skipped and failed fallback resources to a transparent image", async () => {
    const fixture = createCoreFixture();
    const loader = vi.fn(() => Promise.reject(new Error("network failed")));
    const bridge = createDomToFigmaBridgeForModule(fixture.core, {
      imageLoader: loader,
    });
    const skipped = imageRequest("https://example.test/skipped.png");
    bridge.imagePreparation.setPlaceholder(skipped, "user-skipped");

    const skippedFile = await fixture.getConfig().imageLoader(skipped);
    expect(skippedFile.mimeType).toBe("image/png");
    expect(skippedFile.bytes.byteLength).toBeGreaterThan(24);
    expect(loader).not.toHaveBeenCalled();

    const failed = imageRequest("https://example.test/failed.png");
    await expect(bridge.imagePreparation.prepare(failed)).rejects.toThrow(
      "network failed"
    );
    bridge.imagePreparation.setPlaceholder(failed, "load-failed");
    await expect(
      fixture.getConfig().imageLoader(failed)
    ).resolves.toMatchObject({
      mimeType: "image/png",
    });
  });

  it("clears session resources when conversion fails", async () => {
    const fixture = createCoreFixture(
      undefined,
      true,
      new Error("conversion failed")
    );
    const bridge = createDomToFigmaBridgeForModule(fixture.core);
    const owner = imageRequest().element;

    await expect(
      bridge.convert({ element: owner, width: 10, height: 10 }, undefined, {
        backgroundSources: new Map([
          [owner, "https://example.test/failure.png"],
        ]),
      })
    ).rejects.toThrow("conversion failed");
    expect(fixture.getConfig().backgroundImageResolver?.(owner)).toBeNull();
    expect(fixture.clearCache).toHaveBeenCalledOnce();
  });

  it("honours cancellation and does not publish late fallback results", async () => {
    const fixture = createCoreFixture();
    const pending = deferred<ImageFile>();
    const loader = vi.fn(() => pending.promise);
    const bridge = createDomToFigmaBridgeForModule(fixture.core, {
      imageLoader: loader,
    });
    const request = imageRequest();
    const controller = new AbortController();
    const preparation = bridge.imagePreparation.prepare(
      request,
      controller.signal
    );
    controller.abort();
    pending.resolve(imageFile(9));

    await expect(preparation).rejects.toThrow("Image preparation aborted");
    const conversionFile = await fixture.getConfig().imageLoader(request);
    expect(conversionFile.bytes.byteLength).not.toBe(9);
  });

  it("clears fallback and converter caches without late repopulation", async () => {
    const fixture = createCoreFixture();
    const pending = deferred<ImageFile>();
    const bridge = createDomToFigmaBridgeForModule(fixture.core, {
      imageLoader: () => pending.promise,
    });
    const request = imageRequest();
    const preparation = bridge.imagePreparation.prepare(request);

    bridge.clearCache();
    pending.resolve(imageFile(11));
    await expect(preparation).resolves.toEqual({
      status: "prepared",
      byteLength: 11,
    });
    const conversionFile = await fixture.getConfig().imageLoader(request);
    expect(conversionFile.bytes.byteLength).not.toBe(11);
    expect(fixture.clearCache).toHaveBeenCalledOnce();
  });

  it("keeps native staged preparation when the fork capability exists", async () => {
    const prepare = vi.fn(async () => ({
      kind: "image" as const,
      image: { byteLength: 13 },
    }));
    const setPlaceholder = vi.fn();
    const clear = vi.fn();
    const nativePreparation: TestPreparation = {
      prepare,
      resolve: () => ({ kind: "placeholder", reason: "unplanned-late" }),
      setPlaceholder,
      clear,
    };
    const fixture = createCoreFixture(() => nativePreparation);
    const bridge = createDomToFigmaBridgeForModule(fixture.core);
    const request = imageRequest();

    await expect(bridge.imagePreparation.prepare(request)).resolves.toEqual({
      status: "prepared",
      byteLength: 13,
    });
    bridge.imagePreparation.setPlaceholder(request, "budget-skipped");
    bridge.clearCache();
    expect(fixture.getConfig().imagePreparation).toBe(nativePreparation);
    expect(prepare).toHaveBeenCalledOnce();
    expect(setPlaceholder).toHaveBeenCalledWith(request, "budget-skipped");
    expect(clear).toHaveBeenCalledOnce();
    expect(fixture.clearCache).toHaveBeenCalledOnce();
  });

  it("preserves native placeholder, failure, and cancellation outcomes", async () => {
    const controller = new AbortController();
    controller.abort();
    const prepare = vi
      .fn<TestPreparation["prepare"]>()
      .mockResolvedValueOnce({
        kind: "placeholder",
        reason: "user-skipped",
      })
      .mockRejectedValueOnce(new Error("native processing failed"))
      .mockImplementationOnce((_request, signal) => {
        if (signal?.aborted) {
          return Promise.reject(new Error("Image preparation aborted"));
        }
        return Promise.resolve({
          kind: "placeholder",
          reason: "unplanned-late",
        });
      });
    const fixture = createCoreFixture(() => ({
      prepare,
      resolve: () => ({ kind: "placeholder", reason: "unplanned-late" }),
      setPlaceholder() {
        // Covered by the native delegation test above.
      },
      clear() {
        // Covered by the native delegation test above.
      },
    }));
    const bridge = createDomToFigmaBridgeForModule(fixture.core);
    const request = imageRequest();

    await expect(bridge.imagePreparation.prepare(request)).resolves.toEqual({
      status: "prepared",
      byteLength: 0,
    });
    await expect(bridge.imagePreparation.prepare(request)).rejects.toThrow(
      "native processing failed"
    );
    await expect(
      bridge.imagePreparation.prepare(request, controller.signal)
    ).rejects.toThrow("Image preparation aborted");
  });

  it("retains stable errors for missing required base exports", () => {
    expect(() => createDomToFigmaBridgeForModule({})).toThrow(
      UnsupportedCaptureCapabilityError
    );
    expect(() => createDomToFigmaBridgeForModule({})).toThrow(
      "createFigmaConverter"
    );
  });

  it("keeps the deprecated staged assertion for migration", () => {
    expect(() => assertStagedImageCapability({})).toThrow(
      UnsupportedCaptureCapabilityError
    );
    expect(() =>
      assertStagedImageCapability({ createImagePreparation: () => undefined })
    ).not.toThrow();
  });
});
