import {
  composeClipboardHtml,
  encodeFigmaData,
  toClipboardItem,
} from "@aakkino/fig-kiwi";
import { BlobManager } from "./converter/blob-manager";
import type { DomTraversalStrategy } from "./converter/dom";
import { lightDomTraversal } from "./converter/dom";
import { createFontCache } from "./converter/font-cache";
import type { ImageSourceResolver } from "./converter/image-cache";
import { createImageCache } from "./converter/image-cache";
import type { ImageLoader } from "./converter/nodes/image/loader";
import { createDirectImageLoader } from "./converter/nodes/image/loader";
import {
  getMultiFrameRootTemplate,
  getRootTemplate,
  ROOT_FRAME_GUID,
} from "./converter/nodes/root";
import type { FontLoader } from "./converter/nodes/text/primitives/font/loader";
import { createFontsourceLoader } from "./converter/nodes/text/primitives/font/loader";
import type {
  BackgroundDiagnostic,
  BackgroundRasterizer,
} from "./converter/styles/background";
import type { ConvertTrace, TraceEntry } from "./converter/trace";
import type {
  FigmaClipboard,
  FigmaGuid,
  FigmaNodeChange,
} from "./converter/types";
import type { Classify, ConverterLayout, WalkContext } from "./converter/walk";
import { walkRoot } from "./converter/walk";

export type { ElementKind } from "./converter/classify";
export { defaultClassify } from "./converter/classify";
export type {
  DomTraversalChild,
  DomTraversalStrategy,
} from "./converter/dom";
export type { ImageSourceResolver } from "./converter/image-cache";
export type {
  ImageFile,
  ImageLoader,
  ImageRequest,
} from "./converter/nodes/image/loader";
export { createDirectImageLoader } from "./converter/nodes/image/loader";
export type {
  FontFile,
  FontLoader,
  FontProperties,
  FontsourceLoaderOptions,
} from "./converter/nodes/text/primitives/font/loader";
export { createFontsourceLoader } from "./converter/nodes/text/primitives/font/loader";
export type {
  BackgroundBox,
  BackgroundDiagnostic,
  BackgroundLayer,
  BackgroundRasterizer,
  BackgroundSnapshot,
} from "./converter/styles/background";
export type { ConvertTrace, TraceEntry } from "./converter/trace";
export type { FigmaClipboard } from "./converter/types";
export type { Classify, ConverterLayout } from "./converter/walk";

export const domToFigmaCapabilities = {
  cssBackgroundImages: true,
} as const;

export type FrameInput = {
  element: Element;
  width: number;
  height: number;
  x: number;
  y: number;
  name: string;
};

export type FigmaConverterConfig = {
  /** Defaults to `createFontsourceLoader()` (Google Fonts via fontsource jsDelivr CDN). */
  fontLoader?: FontLoader;
  /** Defaults to `createDirectImageLoader()` (single direct `fetch(src)`). */
  imageLoader?: ImageLoader;
  /** Resolve an already staged image source without mutating the DOM. */
  imageSourceResolver?: ImageSourceResolver;
  /** Optional host rasterizer for dynamic CSS image functions. */
  backgroundRasterizer?: BackgroundRasterizer;
  /** Receives structured background conversion outcomes. */
  onBackgroundDiagnostic?: (diagnostic: BackgroundDiagnostic) => void;
  /** Override the default DOM-element classification. */
  classify?: Classify;
  /**
   * `"auto"` (default) converts containers into Figma auto-layout frames
   * whenever the layout can be reproduced exactly, falling back to absolute
   * positioning per node when it can't. `"absolute"` positions every frame
   * absolutely, disabling auto-layout inference entirely.
   */
  layout?: ConverterLayout;
  /**
   * When `true`, `convert()` also returns a {@link ConvertTrace} mapping every
   * emitted node back to its source DOM element. Off by default and adds no
   * cost when disabled; does not change the payload bytes. Intended for the
   * visual-parity harness, not production copies.
   */
  trace?: boolean;
  /**
   * Optional DOM tree strategy. The default is light DOM; consumers that need
   * open Shadow DOM and slot projection must opt in explicitly.
   */
  domTraversal?: DomTraversalStrategy;
};

export type SingleFrameInput = {
  element: Element;
  width: number;
  height: number;
  name?: string;
};

export type CanvasInput = {
  frames: ReadonlyArray<FrameInput>;
  canvasName?: string;
};

export type ConvertInput = SingleFrameInput | CanvasInput;

export type ConvertResult = {
  /** Raw Figma node-change document. */
  document: FigmaClipboard;
  /** Encoded `.fig`-style binary. */
  bytes: Uint8Array;
  /** Base64-encoded representation of `bytes`. */
  base64: string;
  /** Construct a browser `ClipboardItem` for `navigator.clipboard.write([...])`. */
  toClipboardItem(): ClipboardItem;
  /** Get the raw HTML envelope Figma reads on paste. */
  toClipboardHtml(): string;
  /** DOM-to-node trace, present only when created with `{ trace: true }`. */
  trace?: ConvertTrace;
};

export type FigmaConverter = {
  convert(input: ConvertInput, signal?: AbortSignal): Promise<ConvertResult>;
  /** Drop cached fonts and images. Useful in long-running processes. */
  clearCache(): void;
};

const ROOT_RESERVED_GUIDS = 3;

export function createFigmaConverter(
  config: FigmaConverterConfig = {}
): FigmaConverter {
  const fontLoader = config.fontLoader ?? createFontsourceLoader();
  const imageLoader = config.imageLoader ?? createDirectImageLoader();
  const { classify } = config;
  const layout = config.layout ?? "auto";
  const traceEnabled = config.trace ?? false;
  const domTraversal = config.domTraversal ?? lightDomTraversal;

  const fontCache = createFontCache(fontLoader);
  const imageCache = createImageCache(imageLoader, config.imageSourceResolver);

  const convert = async (
    input: ConvertInput,
    signal?: AbortSignal
  ): Promise<ConvertResult> => {
    const nodeChanges: Array<FigmaNodeChange> = [];
    const blobManager = new BlobManager();
    let idCounter = ROOT_RESERVED_GUIDS;

    const createGuid = (): FigmaGuid => {
      const localID = idCounter;
      idCounter += 1;
      return { sessionID: 0, localID };
    };

    const trace: ConvertTrace | undefined = traceEnabled
      ? { rootGuid: ROOT_FRAME_GUID, entries: [] as Array<TraceEntry> }
      : undefined;

    const walkContext: WalkContext = {
      classify,
      layout,
      domTraversal,
      createGuid,
      registerBlob: (blob) => blobManager.registerBlob(blob),
      fontCache,
      imageCache,
      backgroundRasterizer: config.backgroundRasterizer,
      onBackgroundDiagnostic: config.onBackgroundDiagnostic,
      signal,
      appendChanges: (changes) => {
        for (const change of changes) {
          nodeChanges.push(change);
        }
      },
      recordTrace: trace
        ? (entry) => {
            trace.entries.push(entry);
          }
        : undefined,
    };

    const document =
      "frames" in input
        ? await buildCanvas(input, walkContext, blobManager, createGuid)
        : await buildSingle(input, walkContext, blobManager);

    document.nodeChanges.push(...nodeChanges);

    const encoded = encodeFigmaData(document);

    return {
      document,
      bytes: encoded.figBytes,
      base64: encoded.base64,
      toClipboardItem: () =>
        toClipboardItem(composeClipboardHtml(encoded.base64)),
      toClipboardHtml: () => composeClipboardHtml(encoded.base64),
      trace,
    };
  };

  return {
    convert,
    clearCache() {
      fontCache.clear();
      imageCache.clear();
    },
  };
}

async function buildSingle(
  input: SingleFrameInput,
  walkContext: WalkContext,
  blobManager: BlobManager
): Promise<FigmaClipboard> {
  await walkRoot(input.element, ROOT_FRAME_GUID, walkContext, {
    width: input.width,
    height: input.height,
  });
  return getRootTemplate({
    width: input.width,
    height: input.height,
    blobs: blobManager.getBlobs(),
    name: input.name,
  });
}

async function buildCanvas(
  input: CanvasInput,
  walkContext: WalkContext,
  blobManager: BlobManager,
  createGuid: () => FigmaGuid
): Promise<FigmaClipboard> {
  const frameConfigs: Array<{
    width: number;
    height: number;
    x: number;
    y: number;
    name: string;
    localId: number;
  }> = [];

  for (const frame of input.frames) {
    const frameGuid = createGuid();
    frameConfigs.push({
      width: frame.width,
      height: frame.height,
      x: frame.x,
      y: frame.y,
      name: frame.name,
      localId: frameGuid.localID,
    });
    await walkRoot(frame.element, frameGuid, walkContext, {
      width: frame.width,
      height: frame.height,
    });
  }

  return getMultiFrameRootTemplate({
    frames: frameConfigs,
    blobs: blobManager.getBlobs(),
    canvasName: input.canvasName,
  });
}
