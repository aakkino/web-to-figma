import type { FigmaTransform } from "../../types";

type ImageFit = "fill" | "contain" | "cover" | "none" | "scale-down";

type Size = {
  width: number;
  height: number;
};

type LengthPercentage = {
  percentage: number;
  pixels: number;
};

type AxisPosition = LengthPercentage & {
  fromEnd: boolean;
};

export type ImagePresentation = {
  imageScaleMode: "FILL" | "FIT" | "STRETCH";
  transform: FigmaTransform;
};

const IDENTITY_TRANSFORM: FigmaTransform = {
  m00: 1,
  m01: 0,
  m02: 0,
  m10: 0,
  m11: 1,
  m12: 0,
};

const CENTER = 0.5;
const PERCENT_SCALE = 100;
const CALC_PREFIX_LENGTH = 5;
const WHITESPACE = /\s/;
const WHITESPACE_SEQUENCE = /\s+/g;
const LENGTH_PERCENTAGE_TERM = /[+-]?\d*\.?\d+(?:%|px)/g;
const MATRIX_EPSILON = 1e-12;

export function resolveImagePresentation(input: {
  fit: string;
  position: string;
  box: Size;
  intrinsic: Size;
}): ImagePresentation {
  const fit = normalizeFit(input.fit);
  if (!(isValidSize(input.box) && isValidSize(input.intrinsic))) {
    return { imageScaleMode: "STRETCH", transform: IDENTITY_TRANSFORM };
  }
  const position = parseObjectPosition(input.position);
  const rendered = renderedImageSize(fit, input.box, input.intrinsic);
  const offsetX = resolveAxisPosition(
    position.x,
    input.box.width - rendered.width
  );
  const offsetY = resolveAxisPosition(
    position.y,
    input.box.height - rendered.height
  );

  if (fit === "contain" && isCentered(position)) {
    return { imageScaleMode: "FIT", transform: IDENTITY_TRANSFORM };
  }
  if (fit === "cover" && isCentered(position)) {
    return { imageScaleMode: "FILL", transform: IDENTITY_TRANSFORM };
  }

  return {
    imageScaleMode: "STRETCH",
    transform: {
      m00: safeRatio(input.box.width, rendered.width),
      m01: 0,
      m02: safeRatio(-offsetX, rendered.width),
      m10: 0,
      m11: safeRatio(input.box.height, rendered.height),
      m12: safeRatio(-offsetY, rendered.height),
    },
  };
}

function normalizeFit(value: string): ImageFit {
  switch (value) {
    case "contain":
    case "cover":
    case "none":
    case "scale-down":
      return value;
    default:
      return "fill";
  }
}

function renderedImageSize(fit: ImageFit, box: Size, intrinsic: Size): Size {
  if (!(isValidSize(box) && isValidSize(intrinsic))) {
    return box;
  }

  if (fit === "fill") {
    return box;
  }

  const containScale = Math.min(
    box.width / intrinsic.width,
    box.height / intrinsic.height
  );
  let scale: number;
  switch (fit) {
    case "cover":
      scale = Math.max(
        box.width / intrinsic.width,
        box.height / intrinsic.height
      );
      break;
    case "none":
      scale = 1;
      break;
    case "scale-down":
      scale = Math.min(1, containScale);
      break;
    case "contain":
      scale = containScale;
      break;
    default:
      return unreachable(fit);
  }

  return {
    width: intrinsic.width * scale,
    height: intrinsic.height * scale,
  };
}

function isValidSize(size: Size): boolean {
  return (
    Number.isFinite(size.width) &&
    Number.isFinite(size.height) &&
    size.width > 0 &&
    size.height > 0
  );
}

function parseObjectPosition(value: string): {
  x: AxisPosition;
  y: AxisPosition;
} {
  const tokens = splitPositionTokens(value.trim());
  if (tokens.length === 0) {
    return { x: centerPosition(), y: centerPosition() };
  }

  if (tokens.length <= 2) {
    return parseShortPosition(tokens);
  }

  const resolved: { x?: AxisPosition; y?: AxisPosition } = {};
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index] ?? "";
    const axis = keywordAxis(token);
    if (!axis) {
      continue;
    }
    const next = tokens[index + 1];
    const hasOffset =
      token !== "center" && next !== undefined && keywordAxis(next) === null;
    resolved[axis] = keywordPosition(token, hasOffset ? next : undefined);
    if (hasOffset) {
      index += 1;
    }
  }

  return {
    x: resolved.x ?? centerPosition(),
    y: resolved.y ?? centerPosition(),
  };
}

function parseShortPosition(tokens: Array<string>): {
  x: AxisPosition;
  y: AxisPosition;
} {
  const first = tokens[0] ?? "center";
  const second = tokens[1];
  if (second === undefined) {
    if (keywordAxis(first) === "y") {
      return { x: centerPosition(), y: keywordPosition(first) };
    }
    return { x: keywordPosition(first), y: centerPosition() };
  }

  if (keywordAxis(first) === "y" || keywordAxis(second) === "x") {
    return {
      x: keywordPosition(second),
      y: keywordPosition(first),
    };
  }

  return {
    x: keywordPosition(first),
    y: keywordPosition(second),
  };
}

function splitPositionTokens(value: string): Array<string> {
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
    if (
      (character === undefined || WHITESPACE.test(character)) &&
      depth === 0
    ) {
      const token = value.slice(start, index).trim().toLowerCase();
      if (token) {
        tokens.push(token);
      }
      start = index + 1;
    }
  }
  return tokens;
}

function keywordAxis(token: string): "x" | "y" | null {
  if (token === "left" || token === "right") {
    return "x";
  }
  if (token === "top" || token === "bottom") {
    return "y";
  }
  return null;
}

function keywordPosition(token: string, offset?: string): AxisPosition {
  if (token === "center") {
    return centerPosition();
  }
  if (token === "left" || token === "top") {
    const parsed = parseLengthPercentage(offset ?? "0px");
    return { ...parsed, fromEnd: false };
  }
  if (token === "right" || token === "bottom") {
    const parsed = parseLengthPercentage(offset ?? "0px");
    return { ...parsed, fromEnd: true };
  }
  return { ...parseLengthPercentage(token), fromEnd: false };
}

function centerPosition(): AxisPosition {
  return { percentage: CENTER, pixels: 0, fromEnd: false };
}

function parseLengthPercentage(value: string): LengthPercentage {
  const compact = value.toLowerCase().replace(WHITESPACE_SEQUENCE, "");
  const expression =
    compact.startsWith("calc(") && compact.endsWith(")")
      ? compact.slice(CALC_PREFIX_LENGTH, -1)
      : compact;
  const terms = expression.match(LENGTH_PERCENTAGE_TERM);
  if (!terms) {
    return { percentage: 0.5, pixels: 0 };
  }

  let percentage = 0;
  let pixels = 0;
  for (const term of terms) {
    const number = Number.parseFloat(term);
    if (term.endsWith("%")) {
      percentage += number / PERCENT_SCALE;
    } else {
      pixels += number;
    }
  }
  return { percentage, pixels };
}

function resolveAxisPosition(
  position: AxisPosition,
  freeSpace: number
): number {
  const offset = freeSpace * position.percentage + position.pixels;
  return position.fromEnd ? freeSpace - offset : offset;
}

function isCentered(position: { x: AxisPosition; y: AxisPosition }): boolean {
  return isCenteredAxis(position.x) && isCenteredAxis(position.y);
}

function isCenteredAxis(position: AxisPosition): boolean {
  return (
    !position.fromEnd && position.percentage === CENTER && position.pixels === 0
  );
}

function safeRatio(numerator: number, denominator: number): number {
  const value = denominator === 0 ? 1 : numerator / denominator;
  if (Math.abs(value) < MATRIX_EPSILON) {
    return 0;
  }
  if (Math.abs(value - 1) < MATRIX_EPSILON) {
    return 1;
  }
  return value;
}

function unreachable(value: never): never {
  throw new Error(`Unexpected image fit: ${value}`);
}
