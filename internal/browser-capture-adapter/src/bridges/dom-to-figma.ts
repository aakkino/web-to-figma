import { openComposedDomTree } from "@figit/composed-dom";
import type {
  Classify,
  ConvertInput,
  FontLoader as UpstreamFontLoader,
  ImageLoader as UpstreamImageLoader,
  ImagePreparation as UpstreamImagePreparation,
} from "@figit/dom-to-figma";
// biome-ignore lint/performance/noNamespaceImport: runtime capability detection must tolerate older peer exports.
import * as domToFigma from "@figit/dom-to-figma";

import type {
  BridgeCaptureInput,
  BridgeCaptureResult,
  CaptureClassifier,
  ConversionBridge,
  DomToFigmaBridgeOptions,
  FontLoader,
  ImageLoader,
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
  const domTraversal = options.domTraversal ?? openComposedDomTree;
  const imageLoader = options.imageLoader ?? createDirectImageLoader();
  const upstreamImageLoader = toUpstreamImageLoader(imageLoader);
  assertStagedImageCapability(domToFigma);
  const imagePreparation =
    domToFigma.createImagePreparation(upstreamImageLoader);
  const fontLoader = options.fontLoader ?? createDefaultFontLoader();
  const upstreamFontLoader = toUpstreamFontLoader(fontLoader);
  const classify = options.classify
    ? toUpstreamClassifier(options.classify)
    : undefined;
  const converter = domToFigma.createFigmaConverter({
    imageLoader: upstreamImageLoader,
    imagePreparation,
    fontLoader: upstreamFontLoader,
    classify,
    layout: options.layout,
    domTraversal,
  });

  const preparation: ImagePreparationPort = {
    async prepare(request, signal) {
      const resolution = await imagePreparation.prepare(
        toUpstreamImageRequest(request),
        signal
      );
      return {
        status: "prepared",
        byteLength:
          resolution.kind === "image" ? resolution.image.byteLength : 0,
      };
    },
    setPlaceholder(request, reason) {
      imagePreparation.setPlaceholder(request, reason);
    },
    clear() {
      imagePreparation.clear();
    },
  };

  return {
    imagePreparation: preparation,
    fontLoader,
    async convert(input, signal): Promise<BridgeCaptureResult> {
      if (signal?.aborted) {
        throw new Error("Capture conversion aborted");
      }
      const result = await converter.convert(toUpstreamInput(input));
      if (signal?.aborted) {
        throw new Error("Capture conversion aborted");
      }
      return { clipboardHtml: result.toClipboardHtml() };
    },
    clearCache() {
      converter.clearCache();
    },
  };
}

/** Create the published converter's default fontsource loader at the port. */
export function createDefaultFontLoader(): FontLoader {
  const loader = domToFigma.createFontsourceLoader();
  return async (request, signal) => {
    if (signal?.aborted) {
      throw new Error("Font preparation aborted");
    }
    const result = await loader(request);
    if (signal?.aborted) {
      throw new Error("Font preparation aborted");
    }
    return result;
  };
}

/** Project-owned image loader facade for extension callers. */
export function createDirectImageLoader(): ImageLoader {
  const loader = createDirectImageLoaderFromCore();
  return (request) => loader(request);
}

function toUpstreamImageLoader(imageLoader: ImageLoader): UpstreamImageLoader {
  return (request) => imageLoader(request);
}

function createDirectImageLoaderFromCore(): UpstreamImageLoader {
  return domToFigma.createDirectImageLoader();
}

export class UnsupportedCaptureCapabilityError extends Error {
  readonly code = "unsupported-capability" as const;

  constructor() {
    super(
      "The installed @figit/dom-to-figma does not support staged image preparation"
    );
    this.name = "UnsupportedCaptureCapabilityError";
  }
}

type UpstreamImagePreparationFactory = (
  imageLoader: UpstreamImageLoader
) => UpstreamImagePreparation;

export function assertStagedImageCapability(module: {
  createImagePreparation?: unknown;
}): asserts module is {
  createImagePreparation: UpstreamImagePreparationFactory;
} {
  const factory = module.createImagePreparation;
  if (typeof factory !== "function") {
    throw new UnsupportedCaptureCapabilityError();
  }
}

function toUpstreamFontLoader(fontLoader: FontLoader): UpstreamFontLoader {
  return (request) => fontLoader(request);
}

function toUpstreamClassifier(classify: CaptureClassifier): Classify {
  return (element, defaultKind) => classify(element, defaultKind);
}

function toUpstreamImageRequest(request: ImageRequest) {
  return {
    src: request.src,
    element: request.element,
    signal: request.signal,
  };
}

function toUpstreamInput(input: BridgeCaptureInput): ConvertInput {
  if ("frames" in input) {
    return input;
  }
  return input;
}
