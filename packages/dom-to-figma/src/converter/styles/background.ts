import type { ImageCache } from "../image-cache";
import type { ImageBlobInfo, ImageFile } from "../nodes/image/loader";
import { processImageFile } from "../nodes/image/loader";
import type { FigmaBlob, FigmaPaint, FigmaTransform } from "../types";
import { cssBackgroundToFigmaPaints } from "./gradient";

const IMAGE_PROTOCOLS = new Set(["data:", "blob:", "http:", "https:"]);
const URL_PATTERN = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi;
const DEFAULT_DEVICE_PIXEL_RATIO = 1;
const CENTER_POSITION_PERCENT = 50;
const PERCENT_SCALE = 100;
const WHITESPACE_PATTERN = /\s+/u;
const DENSITY_PATTERN = /^(?:\s*)(\d+(?:\.\d+)?)(?:x|dppx)/i;
const IMAGE_SET_PATTERN = /image-set\s*\(/i;

export type BackgroundLayerKind = "gradient" | "image" | "unsupported";

export type BackgroundRepeat =
  | "repeat"
  | "repeat-x"
  | "repeat-y"
  | "no-repeat"
  | "round"
  | "space";

export type BackgroundSize = {
  kind: "auto" | "cover" | "contain" | "explicit";
  width?: string;
  height?: string;
  supported: boolean;
};

export type BackgroundPosition = {
  x: string;
  y: string;
  supported: boolean;
};

export type BackgroundLayer = {
  index: number;
  raw: string;
  kind: BackgroundLayerKind;
  source?: string;
  repeat: BackgroundRepeat;
  size: BackgroundSize;
  position: BackgroundPosition;
  blendMode: string;
  origin: string;
  clip: string;
  attachment: string;
};

export type BackgroundSnapshot = {
  backgroundColor: string;
  backgroundImage: string;
  width: number;
  height: number;
  baseUrl: string;
  devicePixelRatio: number;
  box?: BackgroundBox;
  layers: ReadonlyArray<BackgroundLayer>;
};

export type BackgroundBox = {
  borderTop: number;
  borderRight: number;
  borderBottom: number;
  borderLeft: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
};

export type BackgroundSnapshotOptions = {
  backgroundColor?: string;
  backgroundImage: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  backgroundRepeat?: string;
  backgroundBlendMode?: string;
  backgroundOrigin?: string;
  backgroundClip?: string;
  backgroundAttachment?: string;
  width: number;
  height: number;
  baseUrl: string;
  devicePixelRatio?: number;
  box?: BackgroundBox;
};

export type BackgroundRasterizerRequest = {
  element: Element;
  snapshot: BackgroundSnapshot;
  loadImage(source: string): Promise<ImageBlobInfo>;
  signal?: AbortSignal;
};

export type BackgroundRasterizer = (
  request: BackgroundRasterizerRequest
) => Promise<ImageFile>;

export type BackgroundDiagnostic = {
  mode: "native" | "raster-fallback" | "unsupported" | "failed";
  reason: string;
  layerIndex?: number;
  source?: string;
};

export type BackgroundImagePresentation = {
  imageScaleMode: "FILL" | "FIT" | "STRETCH" | "TILE";
  transform: FigmaTransform;
  renderedWidth: number;
  renderedHeight: number;
  offsetX: number;
  offsetY: number;
  native: boolean;
  reason?: string;
};

/** Split a CSS comma list without splitting function arguments or strings. */
export function splitCssTopLevelList(value: string): Array<string> {
  const parts: Array<string> = [];
  let start = 0;
  let depth = 0;
  let quote = "";
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (character === quote && value[index - 1] !== "\\") {
        quote = "";
      }
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === "(") {
      depth += 1;
    } else if (character === ")") {
      depth = Math.max(0, depth - 1);
    } else if (character === "," && depth === 0) {
      parts.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(value.slice(start).trim());
  return parts.filter(Boolean);
}

export function createBackgroundSnapshot(
  options: BackgroundSnapshotOptions
): BackgroundSnapshot {
  const layers = splitCssTopLevelList(options.backgroundImage)
    .filter((raw) => raw !== "none")
    .map((raw, index) => {
      const gradient =
        cssBackgroundToFigmaPaints(raw, {
          width: options.width,
          height: options.height,
        }).length > 0;
      const source = extractBackgroundSource(
        raw,
        options.baseUrl,
        options.devicePixelRatio ?? DEFAULT_DEVICE_PIXEL_RATIO
      );
      const repeat = parseRepeat(
        listValue(options.backgroundRepeat, index, "repeat")
      );
      const size = parseSize(listValue(options.backgroundSize, index, "auto"));
      const position = parsePosition(
        listValue(options.backgroundPosition, index, "0% 0%")
      );
      let kind: BackgroundLayerKind;
      if (source) {
        kind = "image";
      } else if (gradient) {
        kind = "gradient";
      } else {
        kind = "unsupported";
      }
      return {
        index,
        raw,
        kind,
        ...(source && { source }),
        repeat,
        size,
        position,
        blendMode: listValue(options.backgroundBlendMode, index, "normal"),
        origin: listValue(options.backgroundOrigin, index, "padding-box"),
        clip: listValue(options.backgroundClip, index, "border-box"),
        attachment: listValue(options.backgroundAttachment, index, "scroll"),
      } satisfies BackgroundLayer;
    });

  return {
    backgroundColor: options.backgroundColor ?? "transparent",
    backgroundImage: options.backgroundImage,
    width: options.width,
    height: options.height,
    baseUrl: options.baseUrl,
    devicePixelRatio: options.devicePixelRatio ?? DEFAULT_DEVICE_PIXEL_RATIO,
    ...(options.box && { box: options.box }),
    layers,
  };
}

export function resolveBackgroundImagePresentation(
  layer: BackgroundLayer,
  box: { width: number; height: number },
  intrinsic: { width: number; height: number }
): BackgroundImagePresentation {
  const boxWidth = positiveOrOne(box.width);
  const boxHeight = positiveOrOne(box.height);
  const imageWidth = positiveOrOne(intrinsic.width);
  const imageHeight = positiveOrOne(intrinsic.height);
  const imageRatio = imageWidth / imageHeight;

  const rendered = resolveRenderedSize(layer.size, {
    width: boxWidth,
    height: boxHeight,
    imageRatio,
    imageWidth,
    imageHeight,
  });
  const freeX = boxWidth - rendered.width;
  const freeY = boxHeight - rendered.height;
  const offsetX = resolvePosition(layer.position.x, freeX, "x");
  const offsetY = resolvePosition(layer.position.y, freeY, "y");
  const repeat = layer.repeat;
  const hasNativeRepeat = repeat === "repeat" || repeat === "no-repeat";
  const reason = hasNativeRepeat
    ? nativeBackgroundReason(layer)
    : `${repeat} repetition`;
  const native = hasNativeRepeat && !reason;

  if (layer.size.kind === "cover" && isCenteredPosition(layer.position)) {
    return {
      imageScaleMode: "FILL",
      transform: identityTransform(),
      renderedWidth: rendered.width,
      renderedHeight: rendered.height,
      offsetX,
      offsetY,
      native,
      ...(reason && { reason }),
    };
  }
  if (layer.size.kind === "contain" && isCenteredPosition(layer.position)) {
    return {
      imageScaleMode: "FIT",
      transform: identityTransform(),
      renderedWidth: rendered.width,
      renderedHeight: rendered.height,
      offsetX,
      offsetY,
      native,
      ...(reason && { reason }),
    };
  }

  const transform = {
    m00: boxWidth / positiveOrOne(rendered.width),
    m01: 0,
    m02: -offsetX / positiveOrOne(rendered.width),
    m10: 0,
    m11: boxHeight / positiveOrOne(rendered.height),
    m12: -offsetY / positiveOrOne(rendered.height),
  };

  return {
    imageScaleMode: repeat === "repeat" ? "TILE" : "STRETCH",
    transform,
    renderedWidth: rendered.width,
    renderedHeight: rendered.height,
    offsetX,
    offsetY,
    native,
    ...(reason && { reason }),
  };
}

export function cssBlendModeToFigmaBlendMode(value: string): string {
  const normalized = value.trim().toLowerCase();
  const map: Record<string, string> = {
    normal: "NORMAL",
    multiply: "MULTIPLY",
    screen: "SCREEN",
    overlay: "OVERLAY",
    darken: "DARKEN",
    lighten: "LIGHTEN",
    "color-dodge": "COLOR_DODGE",
    "color-burn": "COLOR_BURN",
    "hard-light": "HARD_LIGHT",
    "soft-light": "SOFT_LIGHT",
    difference: "DIFFERENCE",
    exclusion: "EXCLUSION",
    hue: "HUE",
    saturation: "SATURATION",
    color: "COLOR",
    luminosity: "LUMINOSITY",
  };
  return map[normalized] ?? "NORMAL";
}

export function extractBackgroundSources(
  backgroundImage: string,
  baseUrl: string,
  devicePixelRatio = DEFAULT_DEVICE_PIXEL_RATIO
): Array<string> {
  return splitCssTopLevelList(backgroundImage)
    .map((layer) => extractBackgroundSource(layer, baseUrl, devicePixelRatio))
    .filter((source): source is string => source !== null);
}

function extractBackgroundSource(
  raw: string,
  baseUrl: string,
  devicePixelRatio: number
): string | null {
  const matches: Array<{ source: string; density: number; order: number }> = [];
  const pattern = new RegExp(URL_PATTERN.source, URL_PATTERN.flags);
  let match = pattern.exec(raw);
  while (match) {
    const candidate = (match[1] ?? match[2] ?? match[3] ?? "").trim();
    const resolved = resolveBackgroundUrl(candidate, baseUrl);
    if (resolved) {
      const after = raw.slice(pattern.lastIndex);
      const density = Number.parseFloat(
        DENSITY_PATTERN.exec(after)?.[1] ?? "1"
      );
      matches.push({ source: resolved, density, order: matches.length });
    }
    match = pattern.exec(raw);
  }
  if (matches.length === 0) {
    return null;
  }
  if (IMAGE_SET_PATTERN.test(raw) && matches.length > 1) {
    const sorted = [...matches].sort((left, right) => {
      const leftDistance =
        left.density >= devicePixelRatio
          ? left.density - devicePixelRatio
          : Number.POSITIVE_INFINITY;
      const rightDistance =
        right.density >= devicePixelRatio
          ? right.density - devicePixelRatio
          : Number.POSITIVE_INFINITY;
      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance;
      }
      if (left.density !== right.density) {
        return right.density - left.density;
      }
      return left.order - right.order;
    });
    return sorted[0]?.source ?? null;
  }
  return matches[0]?.source ?? null;
}

function resolveBackgroundUrl(raw: string, baseUrl: string): string | null {
  if (!raw) {
    return null;
  }
  try {
    const resolved = new URL(raw, baseUrl);
    return IMAGE_PROTOCOLS.has(resolved.protocol) ? resolved.toString() : null;
  } catch {
    return null;
  }
}

function listValue(
  value: string | undefined,
  index: number,
  fallback: string
): string {
  const values = splitCssTopLevelList(value ?? "");
  return values[index] ?? values.at(-1) ?? fallback;
}

function parseRepeat(value: string): BackgroundRepeat {
  const tokens = value.trim().toLowerCase().split(WHITESPACE_PATTERN);
  const first = tokens[0] ?? "repeat";
  if (first === "repeat" && tokens[1] === "no-repeat") {
    return "repeat-x";
  }
  if (first === "no-repeat" && tokens[1] === "repeat") {
    return "repeat-y";
  }
  if (
    first === "repeat-x" ||
    first === "repeat-y" ||
    first === "no-repeat" ||
    first === "round" ||
    first === "space"
  ) {
    return first;
  }
  return "repeat";
}

function parseSize(value: string): BackgroundSize {
  const normalized = value.trim().toLowerCase();
  if (normalized === "cover" || normalized === "contain") {
    return { kind: normalized, supported: true };
  }
  if (!normalized || normalized === "auto") {
    return { kind: "auto", supported: true };
  }
  const tokens = splitCssWhitespace(normalized);
  const width = tokens[0] ?? "auto";
  const height = tokens[1] ?? "auto";
  return {
    kind: "explicit",
    width,
    height,
    supported:
      tokens.length <= 2 &&
      isBackgroundSizeToken(width) &&
      isBackgroundSizeToken(height),
  };
}

function isBackgroundSizeToken(value: string): boolean {
  return value === "auto" || parseLengthPercentage(value) !== null;
}

function parsePosition(value: string): BackgroundPosition {
  const tokens = splitCssWhitespace(value.trim().toLowerCase());
  if (tokens.length === 0) {
    return { x: "0%", y: "0%", supported: true };
  }
  if (tokens.length === 1) {
    const token = tokens[0] ?? "0%";
    if (token === "top" || token === "bottom") {
      return { x: "50%", y: token, supported: true };
    }
    return { x: token, y: "50%", supported: isPositionToken(token) };
  }
  if (tokens.length > 2) {
    const resolved = parseEdgeOffsetPosition(tokens);
    return resolved ?? { x: "0%", y: "0%", supported: false };
  }
  const first = tokens[0] ?? "0%";
  const second = tokens[1] ?? "0%";
  if (first === "top" || first === "bottom") {
    return {
      x: second,
      y: first,
      supported: isPositionToken(first) && isPositionToken(second),
    };
  }
  return {
    x: first,
    y: second,
    supported: isPositionToken(first) && isPositionToken(second),
  };
}

function splitCssWhitespace(value: string): Array<string> {
  const tokens: Array<string> = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index <= value.length; index += 1) {
    const character = value[index];
    if (character === "(") {
      depth += 1;
    } else if (character === ")") {
      depth = Math.max(0, depth - 1);
    }
    if ((character === undefined || /\s/u.test(character)) && depth === 0) {
      const token = value.slice(start, index).trim();
      if (token) {
        tokens.push(token);
      }
      start = index + 1;
    }
  }
  return tokens;
}

function parseEdgeOffsetPosition(
  tokens: ReadonlyArray<string>
): BackgroundPosition | null {
  let x: string | undefined;
  let y: string | undefined;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index] ?? "";
    const axis = positionKeywordAxis(token);
    if (!axis || token === "center") {
      return null;
    }
    const offset = tokens[index + 1];
    if (!offset || positionKeywordAxis(offset)) {
      return null;
    }
    const value = `${token} ${offset}`;
    if (axis === "x") {
      if (x) {
        return null;
      }
      x = value;
    } else {
      if (y) {
        return null;
      }
      y = value;
    }
    index += 1;
  }
  return x && y ? { x, y, supported: true } : null;
}

function positionKeywordAxis(value: string): "x" | "y" | null {
  if (value === "left" || value === "right") {
    return "x";
  }
  if (value === "top" || value === "bottom") {
    return "y";
  }
  return null;
}

function isPositionToken(value: string): boolean {
  return (
    value === "center" ||
    positionKeywordAxis(value) !== null ||
    parseLengthPercentage(value) !== null
  );
}

function isCenteredPosition(position: BackgroundPosition): boolean {
  return (
    isCenteredPositionToken(position.x) && isCenteredPositionToken(position.y)
  );
}

function isCenteredPositionToken(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (normalized === "center") {
    return true;
  }
  return (
    normalized.endsWith("%") &&
    Number.parseFloat(normalized) === CENTER_POSITION_PERCENT
  );
}

function resolveRenderedSize(
  size: BackgroundSize,
  input: {
    width: number;
    height: number;
    imageRatio: number;
    imageWidth: number;
    imageHeight: number;
  }
): { width: number; height: number } {
  if (size.kind === "cover" || size.kind === "contain") {
    const scale =
      size.kind === "cover"
        ? Math.max(
            input.width / input.imageWidth,
            input.height / input.imageHeight
          )
        : Math.min(
            input.width / input.imageWidth,
            input.height / input.imageHeight
          );
    return {
      width: input.imageWidth * scale,
      height: input.imageHeight * scale,
    };
  }
  const width = resolveSizeToken(size.width ?? "auto", input.width);
  const height = resolveSizeToken(size.height ?? "auto", input.height);
  if (width !== null && height !== null) {
    return { width, height };
  }
  if (width !== null) {
    return { width, height: width / input.imageRatio };
  }
  if (height !== null) {
    return { width: height * input.imageRatio, height };
  }
  return { width: input.imageWidth, height: input.imageHeight };
}

function resolveSizeToken(value: string, container: number): number | null {
  if (value === "auto") {
    return null;
  }
  const parsed = parseLengthPercentage(value);
  return parsed ? parsed.pixels + parsed.percentage * container : null;
}

function resolvePosition(
  value: string,
  freeSpace: number,
  axis: "x" | "y"
): number {
  const normalized = value.toLowerCase().trim();
  if (normalized === "center") {
    return freeSpace / 2;
  }
  const edge = axis === "x" ? "right" : "bottom";
  if (normalized.startsWith(`${edge} `)) {
    const offset = parseLengthPercentage(normalized.slice(edge.length + 1));
    return offset
      ? freeSpace - offset.percentage * freeSpace - offset.pixels
      : 0;
  }
  const start = axis === "x" ? "left" : "top";
  if (normalized.startsWith(`${start} `)) {
    const offset = parseLengthPercentage(normalized.slice(start.length + 1));
    return offset ? offset.percentage * freeSpace + offset.pixels : 0;
  }
  if (normalized === edge) {
    return freeSpace;
  }
  if (normalized === start) {
    return 0;
  }
  const parsed = parseLengthPercentage(normalized);
  return parsed ? parsed.percentage * freeSpace + parsed.pixels : 0;
}

function parseLengthPercentage(
  value: string
): { percentage: number; pixels: number } | null {
  const compact = value.toLowerCase().replaceAll(" ", "");
  const expression =
    compact.startsWith("calc(") && compact.endsWith(")")
      ? compact.slice(5, -1)
      : compact;
  if (/^[+-]?0(?:\.0+)?$/u.test(expression)) {
    return { percentage: 0, pixels: 0 };
  }
  const terms = expression.match(/[+-]?\d*\.?\d+(?:%|px)/g);
  if (!terms || terms.join("") !== expression) {
    return null;
  }
  let percentage = 0;
  let pixels = 0;
  for (const term of terms) {
    if (term.endsWith("%")) {
      percentage += Number.parseFloat(term) / PERCENT_SCALE;
    } else {
      pixels += Number.parseFloat(term);
    }
  }
  return { percentage, pixels };
}

function nativeBackgroundReason(layer: BackgroundLayer): string | undefined {
  if (!(layer.position.supported && layer.size.supported)) {
    return "background size or position cannot be represented safely";
  }
  if (layer.origin !== "padding-box" || layer.clip !== "border-box") {
    return "background origin or clip is not frame-border-box compatible";
  }
  if (layer.attachment === "fixed" || layer.attachment === "local") {
    return `background attachment ${layer.attachment} requires capture-state rasterization`;
  }
  return;
}

function identityTransform(): FigmaTransform {
  return { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 };
}

function positiveOrOne(value: number): number {
  return value > 0 && Number.isFinite(value) ? value : 1;
}

const MAX_BACKGROUND_DIMENSION = 4096;
const MAX_BACKGROUND_PIXELS = 16_777_216;
const DEFAULT_IMAGE_MIME = "image/png";
const COLOR_CHANNEL_MAX = 255;
// biome-ignore lint/style/noMagicNumbers: byte signatures are protocol constants.
const PNG_SIGNATURE = [0x89, 0x50, 0x4e] as const;
// biome-ignore lint/style/noMagicNumbers: byte signatures are protocol constants.
const JPEG_SIGNATURE = [0xff, 0xd8] as const;
// biome-ignore lint/style/noMagicNumbers: byte signatures are protocol constants.
const GIF_SIGNATURE = [0x47, 0x49, 0x46] as const;
const MIN_SPACE_TILE_COUNT = 2;

/**
 * Rasterize a static background snapshot in the owner's browser realm. The
 * renderer only reads already prepared image bytes; it never performs a URL
 * fetch itself.
 */
export const createCanvasBackgroundRasterizer =
  (): BackgroundRasterizer => async (request) => {
    const { element, snapshot, signal } = request;
    throwIfAborted(signal);
    const width = clampCanvasDimension(snapshot.width);
    const height = clampCanvasDimension(snapshot.height);
    if (width * height > MAX_BACKGROUND_PIXELS) {
      throw new Error("Background raster exceeds the pixel budget");
    }

    const canvas = element.ownerDocument.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Background canvas context is unavailable");
    }

    drawBackgroundColor(context, snapshot);
    const decoded: Array<DecodedImage> = [];
    try {
      // CSS lists are ordered front-to-back. Canvas is painted back-to-front.
      for (const layer of [...snapshot.layers].reverse()) {
        throwIfAborted(signal);
        context.save();
        clipBackgroundRegion(
          context,
          getBackgroundRegion(snapshot, layer.clip)
        );
        context.globalCompositeOperation = toCanvasBlendMode(layer.blendMode);
        if (layer.kind === "image" && layer.source) {
          const image = await request.loadImage(layer.source);
          const decodedImage = await decodeImage(element, image.bytes, signal);
          decoded.push(decodedImage);
          drawImageLayer(
            context,
            decodedImage.image,
            layer,
            getBackgroundRegion(snapshot, layer.origin)
          );
        } else if (layer.kind === "gradient") {
          drawGradientLayer(
            context,
            layer,
            getBackgroundRegion(snapshot, layer.origin)
          );
        } else if (layer.kind === "unsupported") {
          throw new Error(`Unsupported static background layer: ${layer.raw}`);
        }
        context.restore();
      }
      const blob = await canvasToBlob(canvas, DEFAULT_IMAGE_MIME);
      throwIfAborted(signal);
      return {
        bytes: await blob.arrayBuffer(),
        mimeType: blob.type || DEFAULT_IMAGE_MIME,
      };
    } finally {
      for (const image of decoded) {
        image.close();
      }
    }
  };

type DecodedImage = {
  image: CanvasImageSource;
  close(): void;
};

function drawBackgroundColor(
  context: CanvasRenderingContext2D,
  snapshot: BackgroundSnapshot
): void {
  const color = snapshot.backgroundColor.trim();
  if (!color || color === "transparent" || color === "rgba(0, 0, 0, 0)") {
    return;
  }
  context.fillStyle = color;
  context.save();
  clipBackgroundRegion(
    context,
    getBackgroundRegion(snapshot, snapshot.layers.at(-1)?.clip ?? "border-box")
  );
  context.fillRect(0, 0, snapshot.width, snapshot.height);
  context.restore();
}

function drawImageLayer(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  layer: BackgroundLayer,
  region: BackgroundRegion
): void {
  if (!(layer.position.supported && layer.size.supported)) {
    throw new Error("Unsupported background size or position syntax");
  }
  const intrinsicWidth = imageWidth(image);
  const intrinsicHeight = imageHeight(image);
  const presentation = resolveBackgroundImagePresentation(
    layer,
    { width: region.width, height: region.height },
    { width: intrinsicWidth, height: intrinsicHeight }
  );

  if (layer.repeat !== "no-repeat") {
    drawTiledImage(context, image, presentation, region, layer.repeat);
    return;
  }

  context.drawImage(
    image,
    region.x + presentation.offsetX,
    region.y + presentation.offsetY,
    presentation.renderedWidth,
    presentation.renderedHeight
  );
}

function drawTiledImage(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  presentation: ReturnType<typeof resolveBackgroundImagePresentation>,
  region: BackgroundRegion,
  repeat: BackgroundLayer["repeat"]
): void {
  const horizontal = repeat !== "repeat-y";
  const vertical = repeat !== "repeat-x";
  const isRound = repeat === "round";
  const isSpace = repeat === "space";
  const baseTileWidth = Math.max(1, presentation.renderedWidth);
  const baseTileHeight = Math.max(1, presentation.renderedHeight);
  const tileWidth = isRound
    ? roundedTileSize(region.width, baseTileWidth)
    : baseTileWidth;
  const tileHeight = isRound
    ? roundedTileSize(region.height, baseTileHeight)
    : baseTileHeight;
  const columns = horizontal
    ? Math.max(1, Math.floor(region.width / tileWidth))
    : 1;
  const rows = vertical
    ? Math.max(1, Math.floor(region.height / tileHeight))
    : 1;
  const gapX =
    isSpace && columns >= MIN_SPACE_TILE_COUNT
      ? (region.width - columns * tileWidth) / (columns - 1)
      : 0;
  const gapY =
    isSpace && rows >= MIN_SPACE_TILE_COUNT
      ? (region.height - rows * tileHeight) / (rows - 1)
      : 0;
  const stepX = tileWidth + gapX;
  const stepY = tileHeight + gapY;
  const startX = isSpace
    ? region.x
    : region.x + positiveModulo(presentation.offsetX, tileWidth) - tileWidth;
  const startY = isSpace
    ? region.y
    : region.y + positiveModulo(presentation.offsetY, tileHeight) - tileHeight;
  let endX: number;
  if (isSpace) {
    endX = region.x + region.width + 1;
  } else if (horizontal) {
    endX = region.x + region.width;
  } else {
    endX = startX + 1;
  }
  let endY: number;
  if (isSpace) {
    endY = region.y + region.height + 1;
  } else if (vertical) {
    endY = region.y + region.height;
  } else {
    endY = startY + 1;
  }
  for (let y = startY; y < endY; y += stepY) {
    for (let x = startX; x < endX; x += stepX) {
      context.drawImage(image, x, y, tileWidth, tileHeight);
    }
  }
}

function roundedTileSize(span: number, tile: number): number {
  const count = Math.max(1, Math.round(span / tile));
  return span / count;
}

function drawGradientLayer(
  context: CanvasRenderingContext2D,
  layer: BackgroundLayer,
  region: BackgroundRegion
): void {
  const [paint] = cssBackgroundToFigmaPaints(layer.raw, {
    width: region.width,
    height: region.height,
  });
  if (!(paint && "stops" in paint)) {
    throw new Error(`Unsupported gradient background layer: ${layer.raw}`);
  }

  if (paint.type === "GRADIENT_RADIAL") {
    const gradient = context.createRadialGradient(
      region.x + region.width / 2,
      region.y + region.height / 2,
      0,
      region.x + region.width / 2,
      region.y + region.height / 2,
      Math.max(region.width, region.height) / 2
    );
    for (const stop of paint.stops) {
      gradient.addColorStop(stop.position, toCssColor(stop.color));
    }
    context.fillStyle = gradient;
    context.fillRect(region.x, region.y, region.width, region.height);
    return;
  }

  const transform = paint.transform;
  const x0 = region.x + (transform ? transform.m02 * region.width : 0);
  const y0 = region.y + (transform ? transform.m12 * region.height : 0);
  const x1 = x0 + (transform?.m00 ?? 0) * region.width;
  const y1 = y0 + (transform?.m01 ?? 1) * region.height;
  const gradient = context.createLinearGradient(x0, y0, x1, y1);
  for (const stop of paint.stops) {
    gradient.addColorStop(stop.position, toCssColor(stop.color));
  }
  context.fillStyle = gradient;
  context.fillRect(region.x, region.y, region.width, region.height);
}

type BackgroundRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function getBackgroundRegion(
  snapshot: BackgroundSnapshot,
  boxName: string
): BackgroundRegion {
  if (boxName === "text") {
    throw new Error("background-clip:text requires a text-aware rasterizer");
  }
  const box = snapshot.box;
  if (!box || boxName === "border-box") {
    return { x: 0, y: 0, width: snapshot.width, height: snapshot.height };
  }
  const borderWidth = box.borderLeft + box.borderRight;
  const borderHeight = box.borderTop + box.borderBottom;
  if (boxName === "content-box") {
    return {
      x: box.borderLeft + box.paddingLeft,
      y: box.borderTop + box.paddingTop,
      width: Math.max(
        1,
        snapshot.width - borderWidth - box.paddingLeft - box.paddingRight
      ),
      height: Math.max(
        1,
        snapshot.height - borderHeight - box.paddingTop - box.paddingBottom
      ),
    };
  }
  return {
    x: box.borderLeft,
    y: box.borderTop,
    width: Math.max(1, snapshot.width - borderWidth),
    height: Math.max(1, snapshot.height - borderHeight),
  };
}

function clipBackgroundRegion(
  context: CanvasRenderingContext2D,
  region: BackgroundRegion
): void {
  context.beginPath();
  context.rect(region.x, region.y, region.width, region.height);
  context.clip();
}

async function decodeImage(
  element: Element,
  bytes: ReadonlyArray<number>,
  signal?: AbortSignal
): Promise<DecodedImage> {
  throwIfAborted(signal);
  const blob = new Blob([Uint8Array.from(bytes)], {
    type: sniffMimeType(bytes),
  });
  const createBitmap = globalThis.createImageBitmap;
  if (typeof createBitmap === "function") {
    const bitmap = await createBitmap(blob);
    throwIfAborted(signal);
    return { image: bitmap, close: () => bitmap.close() };
  }

  const url = URL.createObjectURL(blob);
  const image = element.ownerDocument.createElement("img");
  try {
    await loadImageElement(image, url, signal);
    return {
      image,
      close: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function loadImageElement(
  image: HTMLImageElement,
  src: string,
  signal?: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      image.onload = null;
      image.onerror = null;
      signal?.removeEventListener("abort", onAbort);
    };
    const finish = (error?: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    };
    const onAbort = () => finish(new Error("Background image decode aborted"));
    image.onload = () => finish();
    image.onerror = () => finish(new Error("Background image decode failed"));
    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener("abort", onAbort, { once: true });
    image.src = src;
  });
}

function imageWidth(image: CanvasImageSource): number {
  if (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap) {
    return image.width;
  }
  return image instanceof HTMLImageElement ? image.naturalWidth : 1;
}

function imageHeight(image: CanvasImageSource): number {
  if (typeof ImageBitmap !== "undefined" && image instanceof ImageBitmap) {
    return image.height;
  }
  return image instanceof HTMLImageElement ? image.naturalHeight : 1;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Background canvas did not produce a blob"));
      }
    }, mimeType);
  });
}

function toCssColor(color: {
  r: number;
  g: number;
  b: number;
  a: number;
}): string {
  return `rgba(${Math.round(color.r * COLOR_CHANNEL_MAX)}, ${Math.round(
    color.g * COLOR_CHANNEL_MAX
  )}, ${Math.round(color.b * COLOR_CHANNEL_MAX)}, ${color.a})`;
}

function toCanvasBlendMode(value: string): GlobalCompositeOperation {
  const normalized = value.trim().toLowerCase();
  const supported = new Set<GlobalCompositeOperation>([
    "source-over",
    "multiply",
    "screen",
    "overlay",
    "darken",
    "lighten",
    "color-dodge",
    "color-burn",
    "hard-light",
    "soft-light",
    "difference",
    "exclusion",
    "hue",
    "saturation",
    "color",
    "luminosity",
  ]);
  if (normalized === "normal") {
    return "source-over";
  }
  return supported.has(normalized as GlobalCompositeOperation)
    ? (normalized as GlobalCompositeOperation)
    : "source-over";
}

function sniffMimeType(bytes: ReadonlyArray<number>): string {
  if (
    bytes[0] === PNG_SIGNATURE[0] &&
    bytes[1] === PNG_SIGNATURE[1] &&
    bytes[2] === PNG_SIGNATURE[2]
  ) {
    return "image/png";
  }
  if (bytes[0] === JPEG_SIGNATURE[0] && bytes[1] === JPEG_SIGNATURE[1]) {
    return "image/jpeg";
  }
  if (
    bytes[0] === GIF_SIGNATURE[0] &&
    bytes[1] === GIF_SIGNATURE[1] &&
    bytes[2] === GIF_SIGNATURE[2]
  ) {
    return "image/gif";
  }
  return "application/octet-stream";
}

function clampCanvasDimension(value: number): number {
  return Math.min(
    MAX_BACKGROUND_DIMENSION,
    Math.max(1, Math.ceil(Number.isFinite(value) ? value : 1))
  );
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new Error("Background rasterization aborted");
  }
}

type ResolveBackgroundPaintsOptions = {
  element: Element;
  snapshot: BackgroundSnapshot;
  imageCache: ImageCache;
  registerBlob: (blob: FigmaBlob) => number;
  backgroundRasterizer?: BackgroundRasterizer;
  onDiagnostic?: (diagnostic: BackgroundDiagnostic) => void;
  signal?: AbortSignal;
};

type ResolvedBackgroundPaints = {
  paints: Array<FigmaPaint>;
  containsRasterFallback?: boolean;
};

type BackgroundLayerResolution =
  | { kind: "paint"; paints: Array<FigmaPaint> }
  | {
      kind: "raster";
      layerIndex: number;
      reason: string;
      source?: string;
    }
  | { kind: "empty" };

export async function resolveBackgroundPaints(
  options: ResolveBackgroundPaintsOptions
): Promise<ResolvedBackgroundPaints> {
  const { snapshot } = options;
  if (snapshot.layers.length === 0) {
    return { paints: [] };
  }

  const snapshotRaster = await trySnapshotRaster(options);
  if (snapshotRaster) {
    return { paints: [snapshotRaster.paint], containsRasterFallback: true };
  }

  const paints: Array<FigmaPaint> = [];
  // CSS background layers are front-to-back; Figma's paint list is composed
  // bottom-to-top, so reverse the source order here.
  for (const layer of [...snapshot.layers].reverse()) {
    const resolution = await resolveBackgroundLayer(options, layer);
    if (resolution.kind === "paint") {
      paints.push(...resolution.paints);
      continue;
    }
    if (resolution.kind === "raster") {
      const raster = await tryRasterize(options, options.backgroundRasterizer);
      if (raster) {
        return { paints: [raster.paint], containsRasterFallback: true };
      }
      emit(options, {
        mode: "unsupported",
        reason: resolution.reason,
        layerIndex: resolution.layerIndex,
        source: resolution.source,
      });
    }
  }

  return { paints };
}

export function makeBackgroundSnapshotFromStyle(
  element: Element,
  computedStyle: CSSStyleDeclaration,
  width: number,
  height: number
): BackgroundSnapshot {
  const view = element.ownerDocument.defaultView;
  return createBackgroundSnapshot({
    backgroundColor: computedStyle.backgroundColor,
    backgroundImage: computedStyle.backgroundImage,
    backgroundSize: computedStyle.backgroundSize,
    backgroundPosition: computedStyle.backgroundPosition,
    backgroundRepeat: computedStyle.backgroundRepeat,
    backgroundBlendMode: computedStyle.backgroundBlendMode,
    backgroundOrigin: computedStyle.backgroundOrigin,
    backgroundClip: computedStyle.backgroundClip,
    backgroundAttachment: computedStyle.backgroundAttachment,
    width,
    height,
    baseUrl: element.ownerDocument.baseURI,
    devicePixelRatio: view?.devicePixelRatio,
    box: readBackgroundBox(computedStyle),
  });
}

function readBackgroundBox(style: CSSStyleDeclaration): BackgroundBox {
  return {
    borderTop: parseCssLength(style.borderTopWidth),
    borderRight: parseCssLength(style.borderRightWidth),
    borderBottom: parseCssLength(style.borderBottomWidth),
    borderLeft: parseCssLength(style.borderLeftWidth),
    paddingTop: parseCssLength(style.paddingTop),
    paddingRight: parseCssLength(style.paddingRight),
    paddingBottom: parseCssLength(style.paddingBottom),
    paddingLeft: parseCssLength(style.paddingLeft),
  };
}

function parseCssLength(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function layerNeedsRasterFallback(
  snapshot: BackgroundSnapshot,
  layer: BackgroundLayer
): boolean {
  return Boolean(
    (layer.repeat !== "repeat" && layer.repeat !== "no-repeat") ||
      layer.origin !== "padding-box" ||
      layer.clip !== "border-box" ||
      layer.attachment === "fixed" ||
      layer.attachment === "local" ||
      !(layer.position.supported && layer.size.supported) ||
      !isFullBackgroundRegion(
        snapshot,
        getBackgroundRegion(snapshot, layer.origin)
      )
  );
}

function isFullBackgroundRegion(
  snapshot: BackgroundSnapshot,
  region: BackgroundRegion
): boolean {
  return (
    region.x === 0 &&
    region.y === 0 &&
    region.width === snapshot.width &&
    region.height === snapshot.height
  );
}

function trySnapshotRaster(
  options: ResolveBackgroundPaintsOptions
): Promise<{ paint: FigmaPaint } | null> {
  const hasStaticFallback = options.snapshot.layers.some(
    (layer) =>
      layer.kind === "image" &&
      layerNeedsRasterFallback(options.snapshot, layer)
  );
  const hasDynamicLayer = options.snapshot.layers.some(
    (layer) => layer.kind === "unsupported"
  );
  if (!(hasStaticFallback || hasDynamicLayer)) {
    return Promise.resolve(null);
  }
  if (hasDynamicLayer && !options.backgroundRasterizer) {
    return Promise.resolve(null);
  }
  return tryRasterize(options, options.backgroundRasterizer);
}

async function resolveBackgroundLayer(
  options: ResolveBackgroundPaintsOptions,
  layer: BackgroundLayer
): Promise<BackgroundLayerResolution> {
  if (layer.kind === "gradient") {
    return resolveGradientLayer(options, layer);
  }
  if (layer.kind !== "image" || !layer.source) {
    emit(options, {
      mode: "unsupported",
      reason: "background image function has no prepared URL source",
      layerIndex: layer.index,
    });
    return { kind: "empty" };
  }

  if (layerNeedsRasterFallback(options.snapshot, layer)) {
    return {
      kind: "raster",
      layerIndex: layer.index,
      reason:
        nativeBackgroundReason(layer) ??
        "background positioning area requires capture-state rasterization",
      source: layer.source,
    };
  }

  try {
    const detachedImage = options.element.ownerDocument.createElement("img");
    const image = await options.imageCache.getBySource(
      layer.source,
      detachedImage
    );
    const presentation = resolveBackgroundImagePresentation(
      layer,
      { width: options.snapshot.width, height: options.snapshot.height },
      {
        width: image.width ?? 1,
        height: image.height ?? 1,
      }
    );
    if (!presentation.native || presentation.reason) {
      return {
        kind: "raster",
        layerIndex: layer.index,
        reason:
          presentation.reason ?? "background geometry needs rasterization",
        source: layer.source,
      };
    }
    const blobIndex = options.registerBlob({ bytes: image.bytes });
    emit(options, {
      mode: "native",
      reason: "raster background URL mapped to IMAGE paint",
      layerIndex: layer.index,
      source: layer.source,
    });
    return {
      kind: "paint",
      paints: [
        {
          type: "IMAGE",
          opacity: 1,
          visible: true,
          blendMode: cssBlendModeToFigmaBlendMode(layer.blendMode),
          transform: presentation.transform,
          image: {
            hash: image.hash,
            dataBlob: blobIndex,
          },
          imageScaleMode: presentation.imageScaleMode,
          originalImageWidth: image.width,
          originalImageHeight: image.height,
        },
      ],
    };
  } catch (error) {
    emit(options, {
      mode: "failed",
      reason: error instanceof Error ? error.message : String(error),
      layerIndex: layer.index,
      source: layer.source,
    });
    return { kind: "empty" };
  }
}

function resolveGradientLayer(
  options: ResolveBackgroundPaintsOptions,
  layer: BackgroundLayer
): BackgroundLayerResolution {
  const gradientPaints = cssBackgroundToFigmaPaints(layer.raw, {
    width: options.snapshot.width,
    height: options.snapshot.height,
  }).map((paint) => ({
    ...paint,
    blendMode: cssBlendModeToFigmaBlendMode(layer.blendMode),
  }));
  if (gradientPaints.length > 0) {
    emit(options, {
      mode: "native",
      reason: "gradient background layer mapped to Figma paint",
      layerIndex: layer.index,
    });
    return { kind: "paint", paints: gradientPaints };
  }
  emit(options, {
    mode: "unsupported",
    reason: "gradient function could not be parsed",
    layerIndex: layer.index,
  });
  return { kind: "empty" };
}

async function tryRasterize(
  options: ResolveBackgroundPaintsOptions,
  hostRasterizer: BackgroundRasterizer | undefined
): Promise<{ paint: FigmaPaint } | null> {
  const rasterizer = hostRasterizer ?? createCanvasBackgroundRasterizer();
  try {
    const imageFile = await rasterizer({
      element: options.element,
      snapshot: options.snapshot,
      loadImage: (source) => {
        const detachedImage =
          options.element.ownerDocument.createElement("img");
        return options.imageCache.getBySource(source, detachedImage);
      },
      signal: options.signal,
    });
    const image = await processImageFile(imageFile, options.signal);
    const blobIndex = options.registerBlob({ bytes: image.bytes });
    emit(options, {
      mode: "raster-fallback",
      reason: hostRasterizer
        ? "background host rasterizer rendered the capture-state snapshot"
        : "canvas rasterizer rendered the capture-state snapshot",
    });
    return {
      paint: {
        type: "IMAGE",
        opacity: 1,
        visible: true,
        blendMode: "NORMAL",
        transform: {
          m00: 1,
          m01: 0,
          m02: 0,
          m10: 0,
          m11: 1,
          m12: 0,
        },
        image: { hash: image.hash, dataBlob: blobIndex },
        imageScaleMode: "STRETCH",
        originalImageWidth: image.width,
        originalImageHeight: image.height,
      },
    };
  } catch (error) {
    emit(options, {
      mode: "failed",
      reason: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function emit(
  options: ResolveBackgroundPaintsOptions,
  diagnostic: BackgroundDiagnostic
): void {
  options.onDiagnostic?.(diagnostic);
}
