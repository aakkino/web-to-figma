import { openComposedDomTree } from "@aakkino/composed-dom";
// biome-ignore lint/performance/noNamespaceImport: one runtime boundary must support multiple peer API shapes.
import * as domToFigma from "@aakkino/dom-to-figma";

import type {
  BackgroundDiagnostic,
  BackgroundRasterizer,
  BridgeCaptureInput,
  BridgeCaptureResult,
  CaptureClassifier,
  ConversionBridge,
  ConversionContext,
  DomToFigmaBridgeOptions,
  FontLoader,
  ImageFile,
  ImageLoader,
  ImagePlaceholderReason,
  ImagePreparationPort,
  ImageRequest,
} from "../types";

/**
 * The only source module in the adapter that imports the upstream converter.
 * Product state, resource scheduling and returned data stay project-owned.
 */
export function createDomToFigmaBridge(
  options: DomToFigmaBridgeOptions = {}
): ConversionBridge {
  return createDomToFigmaBridgeForModule(domToFigma, options);
}

/** @internal Structural seam used to prove compatibility with released peers. */
export function createDomToFigmaBridgeForModule(
  module: unknown,
  options: DomToFigmaBridgeOptions = {}
): ConversionBridge {
  const core = assertSupportedCore(module);
  const domTraversal = options.domTraversal ?? openComposedDomTree;
  const imageLoader =
    options.imageLoader ?? toAdapterImageLoader(core.createDirectImageLoader());
  const strategy = createImageStrategy(core, imageLoader);
  const backgroundDiagnostics: Array<
    BackgroundDiagnostic & { source?: string }
  > = [];
  const fontLoader =
    options.fontLoader ?? toAdapterFontLoader(core.createFontsourceLoader());
  let activeBackgroundSources: ReadonlyMap<Element, string> | undefined;
  let conversionInProgress = false;
  const converter = core.createFigmaConverter({
    imageLoader: strategy.converterImageLoader,
    ...(strategy.upstreamPreparation
      ? { imagePreparation: strategy.upstreamPreparation }
      : {}),
    imageSourceResolver: (element: HTMLImageElement) =>
      strategy.resolveElementSource(element),
    backgroundImageResolver: (element: Element) => {
      const source = activeBackgroundSources?.get(element);
      return source ? toCssBackgroundImage(source) : null;
    },
    backgroundRasterizer: options.backgroundRasterizer,
    onBackgroundDiagnostic: (diagnostic) => {
      backgroundDiagnostics.push(diagnostic);
    },
    fontLoader: toUpstreamFontLoader(fontLoader),
    classify: options.classify
      ? toUpstreamClassifier(options.classify)
      : undefined,
    layout: options.layout,
    domTraversal,
  });

  return {
    imagePreparation: strategy.preparation,
    fontLoader,
    supportsBackgroundImages:
      core.domToFigmaCapabilities?.cssBackgroundImages === true,
    async convert(
      input,
      signal,
      context?: ConversionContext
    ): Promise<BridgeCaptureResult> {
      throwIfAborted(signal, "Capture conversion aborted");
      if (conversionInProgress) {
        throw new Error("A capture conversion is already in progress");
      }
      conversionInProgress = true;
      backgroundDiagnostics.length = 0;
      activeBackgroundSources = context?.backgroundSources;
      try {
        const result = await converter.convert(input, signal);
        throwIfAborted(signal, "Capture conversion aborted");
        return { clipboardHtml: result.toClipboardHtml() };
      } finally {
        activeBackgroundSources = undefined;
        conversionInProgress = false;
        strategy.clearBeforeConverter();
        converter.clearCache();
      }
    },
    clearCache() {
      activeBackgroundSources = undefined;
      backgroundDiagnostics.length = 0;
      strategy.clearBeforeConverter();
      converter.clearCache();
    },
    getBackgroundDiagnostics() {
      return [...backgroundDiagnostics];
    },
  };
}

/** Create the published converter's default fontsource loader at the port. */
export function createDefaultFontLoader(): FontLoader {
  const core = assertSupportedCore(domToFigma);
  return toAdapterFontLoader(core.createFontsourceLoader());
}

/** Project-owned image loader facade for extension callers. */
export function createDirectImageLoader(): ImageLoader {
  const core = assertSupportedCore(domToFigma);
  return toAdapterImageLoader(core.createDirectImageLoader());
}

export class UnsupportedCaptureCapabilityError extends Error {
  readonly code = "unsupported-capability" as const;

  constructor(capability = "the base converter API") {
    super(`The installed @aakkino/dom-to-figma does not support ${capability}`);
    this.name = "UnsupportedCaptureCapabilityError";
  }
}

/** @deprecated Missing staged preparation now selects the adapter fallback. */
export function assertStagedImageCapability(module: {
  createImagePreparation?: unknown;
}): asserts module is {
  createImagePreparation: UpstreamImagePreparationFactory;
} {
  if (typeof module.createImagePreparation !== "function") {
    throw new UnsupportedCaptureCapabilityError("staged image preparation");
  }
}

type UpstreamImageRequest = {
  src: string;
  element: HTMLImageElement;
  signal?: AbortSignal;
};

type UpstreamImageLoader = (
  request: UpstreamImageRequest
) => Promise<ImageFile>;

type UpstreamFontLoader = FontLoader;

type UpstreamImageResolution =
  | { kind: "image"; image: { byteLength: number } }
  | { kind: "placeholder"; reason: ImagePlaceholderReason };

type UpstreamImagePreparation = {
  prepare(
    request: UpstreamImageRequest,
    signal?: AbortSignal
  ): Promise<UpstreamImageResolution>;
  resolve(request: UpstreamImageRequest): UpstreamImageResolution;
  setPlaceholder(
    request: Pick<UpstreamImageRequest, "src"> &
      Partial<Pick<UpstreamImageRequest, "element">>,
    reason: ImagePlaceholderReason
  ): void;
  clear(): void;
};

type UpstreamImagePreparationFactory = (
  imageLoader: UpstreamImageLoader
) => UpstreamImagePreparation;

type UpstreamConverter = {
  convert(
    input: BridgeCaptureInput,
    signal?: AbortSignal
  ): Promise<{ toClipboardHtml(): string }>;
  clearCache(): void;
};

type UpstreamCoreModule = {
  createFigmaConverter(config: {
    imageLoader: UpstreamImageLoader;
    imagePreparation?: UpstreamImagePreparation;
    fontLoader: UpstreamFontLoader;
    classify?: CaptureClassifier;
    layout?: DomToFigmaBridgeOptions["layout"];
    domTraversal?: DomToFigmaBridgeOptions["domTraversal"];
    imageSourceResolver?: (element: HTMLImageElement) => string | null;
    backgroundImageResolver?: (element: Element) => string | null;
    backgroundRasterizer?: BackgroundRasterizer;
    onBackgroundDiagnostic?: (
      diagnostic: BackgroundDiagnostic & { source?: string }
    ) => void;
  }): UpstreamConverter;
  createDirectImageLoader(): UpstreamImageLoader;
  createFontsourceLoader(): UpstreamFontLoader;
  createImagePreparation?: UpstreamImagePreparationFactory;
  domToFigmaCapabilities?: {
    cssBackgroundImages?: boolean;
  };
};

type ImageStrategy = {
  preparation: ImagePreparationPort;
  converterImageLoader: UpstreamImageLoader;
  upstreamPreparation?: UpstreamImagePreparation;
  resolveElementSource(element: HTMLImageElement): string | null;
  clearBeforeConverter(): void;
};

function toCssBackgroundImage(source: string): string {
  const escaped = source.replace(
    /["\\\n\r]/gu,
    (character) => `\\${character}`
  );
  return `url("${escaped}")`;
}

function assertSupportedCore(module: unknown): UpstreamCoreModule {
  if (!isRecord(module)) {
    throw new UnsupportedCaptureCapabilityError();
  }
  for (const exportName of [
    "createFigmaConverter",
    "createDirectImageLoader",
    "createFontsourceLoader",
  ] as const) {
    if (typeof module[exportName] !== "function") {
      throw new UnsupportedCaptureCapabilityError(exportName);
    }
  }
  return module as UpstreamCoreModule;
}

function createImageStrategy(
  core: UpstreamCoreModule,
  imageLoader: ImageLoader
): ImageStrategy {
  const upstreamLoader = toUpstreamImageLoader(imageLoader);
  let elementSources = new WeakMap<HTMLImageElement, string>();
  if (typeof core.createImagePreparation !== "function") {
    return createAdapterImageStrategy(imageLoader);
  }

  const upstreamPreparation = core.createImagePreparation(upstreamLoader);
  assertImagePreparation(upstreamPreparation);
  const preparation: ImagePreparationPort = {
    async prepare(request, signal) {
      elementSources.set(request.element, request.src);
      const resolution = await upstreamPreparation.prepare(
        toUpstreamImageRequest(request, signal),
        signal
      );
      return {
        status: "prepared",
        byteLength:
          resolution.kind === "image" ? resolution.image.byteLength : 0,
      };
    },
    setPlaceholder(request, reason) {
      if (request.element) {
        elementSources.set(request.element, request.src);
      }
      upstreamPreparation.setPlaceholder(request, reason);
    },
    clear() {
      elementSources = new WeakMap();
      upstreamPreparation.clear();
    },
  };

  return {
    preparation,
    converterImageLoader: upstreamLoader,
    upstreamPreparation,
    resolveElementSource(element) {
      return elementSources.get(element) ?? null;
    },
    clearBeforeConverter() {
      // Native converters own and clear the preparation passed in their config.
    },
  };
}

type AdapterImageResolution =
  | { kind: "image"; file: ImageFile }
  | { kind: "placeholder"; reason: ImagePlaceholderReason };

function createAdapterImageStrategy(imageLoader: ImageLoader): ImageStrategy {
  const resolutions = new Map<string, AdapterImageResolution>();
  const inFlight = new Map<string, Promise<AdapterImageResolution>>();
  let elementSources = new WeakMap<HTMLImageElement, string>();
  let generation = 0;

  const preparation: ImagePreparationPort = {
    async prepare(request, signal) {
      const key = imageKey(request);
      const effectiveSignal = signal ?? request.signal;
      elementSources.set(request.element, key);
      throwIfAborted(effectiveSignal, "Image preparation aborted");

      const cached = resolutions.get(key);
      if (cached) {
        return toPreparationResult(cached);
      }
      const existing = inFlight.get(key);
      if (existing) {
        return toPreparationResult(await existing);
      }

      const startedInGeneration = generation;
      const pending = Promise.resolve()
        .then(() => imageLoader({ ...request, signal: effectiveSignal }))
        .then((file): AdapterImageResolution => {
          throwIfAborted(effectiveSignal, "Image preparation aborted");
          const resolution: AdapterImageResolution = { kind: "image", file };
          if (
            generation === startedInGeneration &&
            resolutions.get(key)?.kind !== "placeholder"
          ) {
            resolutions.set(key, resolution);
          }
          return resolution;
        })
        .finally(() => {
          if (inFlight.get(key) === pending) {
            inFlight.delete(key);
          }
        });
      inFlight.set(key, pending);
      return toPreparationResult(await pending);
    },
    setPlaceholder(request, reason) {
      const key = imageKey(request);
      if (request.element) {
        elementSources.set(request.element, key);
      }
      resolutions.set(key, { kind: "placeholder", reason });
    },
    clear() {
      generation += 1;
      resolutions.clear();
      inFlight.clear();
      elementSources = new WeakMap();
    },
  };

  const converterImageLoader: UpstreamImageLoader = (request) => {
    const key = elementSources.get(request.element) ?? imageKey(request);
    const resolution = resolutions.get(key);
    if (resolution?.kind === "image") {
      return Promise.resolve(resolution.file);
    }
    if (!resolution) {
      elementSources.set(request.element, key);
      resolutions.set(key, {
        kind: "placeholder",
        reason: "unplanned-late",
      });
    }
    return Promise.resolve(createTransparentPlaceholder());
  };

  return {
    preparation,
    converterImageLoader,
    resolveElementSource(element) {
      return elementSources.get(element) ?? null;
    },
    clearBeforeConverter() {
      preparation.clear();
    },
  };
}

function assertImagePreparation(
  preparation: unknown
): asserts preparation is UpstreamImagePreparation {
  if (
    !isRecord(preparation) ||
    typeof preparation.prepare !== "function" ||
    typeof preparation.resolve !== "function" ||
    typeof preparation.setPlaceholder !== "function" ||
    typeof preparation.clear !== "function"
  ) {
    throw new UnsupportedCaptureCapabilityError(
      "a structurally compatible staged image preparation API"
    );
  }
}

function toPreparationResult(resolution: AdapterImageResolution) {
  return {
    status: "prepared" as const,
    byteLength:
      resolution.kind === "image" ? resolution.file.bytes.byteLength : 0,
  };
}

function toUpstreamImageLoader(imageLoader: ImageLoader): UpstreamImageLoader {
  return (request) => imageLoader(request);
}

function toAdapterImageLoader(imageLoader: UpstreamImageLoader): ImageLoader {
  return (request) => imageLoader(request);
}

function toUpstreamFontLoader(fontLoader: FontLoader): UpstreamFontLoader {
  return (request) => fontLoader(request);
}

function toAdapterFontLoader(fontLoader: UpstreamFontLoader): FontLoader {
  return async (request, signal) => {
    throwIfAborted(signal, "Font preparation aborted");
    const result = await fontLoader(request, signal);
    throwIfAborted(signal, "Font preparation aborted");
    return result;
  };
}

function toUpstreamClassifier(classify: CaptureClassifier): CaptureClassifier {
  return (element, defaultKind) => classify(element, defaultKind);
}

function toUpstreamImageRequest(
  request: ImageRequest,
  signal?: AbortSignal
): UpstreamImageRequest {
  return { ...request, signal: signal ?? request.signal };
}

function imageKey(request: Pick<ImageRequest, "src">): string {
  return request.src;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function throwIfAborted(
  signal: AbortSignal | undefined,
  message: string
): void {
  if (signal?.aborted) {
    throw new Error(message);
  }
}

function createTransparentPlaceholder(): ImageFile {
  return {
    bytes: Uint8Array.from(TRANSPARENT_PNG_BYTES).buffer,
    mimeType: "image/png",
  };
}

const TRANSPARENT_PNG_BYTES = [
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0,
  0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137, 0, 0, 0, 13, 73, 68, 65, 84, 8, 215,
  99, 248, 207, 192, 240, 31, 0, 5, 0, 1, 255, 137, 153, 61, 29, 0, 0, 0, 0, 73,
  69, 78, 68, 174, 66, 96, 130,
] as const;
