import type { DomTreeStrategy } from "@aakkino/composed-dom";

import { isTargetConnected } from "./resource-inventory";
import type {
  CaptureInput,
  FontDiagnostic,
  FontProperties,
  FontResolver,
  TypographyInspection,
  TypographyLetterSpacing,
  TypographyLineHeight,
  TypographyToken,
} from "./types";

const TEXT_NODE = 3;
const DOCUMENT_FRAGMENT_NODE = 11;
const FALLBACK_WEIGHT = 400;
const MIN_FONT_WEIGHT = 1;
const MAX_FONT_WEIGHT = 1000;
const NON_VISUAL_ELEMENTS = new Set([
  "script",
  "style",
  "template",
  "noscript",
]);
const FONT_STYLE_ITALIC_PATTERN = /^italic/i;
const FONT_STYLE_OBLIQUE_PATTERN = /^oblique/i;
const WHITESPACE_OR_CONTROL_PATTERN = /[\p{C}\p{Z}\s]/u;
const CSS_HEX_ESCAPE_PATTERN = /^[0-9a-f]{1,6}$/i;
const MAX_UNICODE_CODE_POINT = 0x10_ff_ff;
const CSS_WEIGHT_KEYWORDS: Readonly<Record<string, number>> = {
  normal: 400,
  bold: 700,
};

type MutableUsage = {
  token: TypographyToken;
  usageCount: number;
  codePoints: Set<number>;
};

export type TypographyInspectionDependencies = {
  fontResolver: FontResolver;
  domTraversal: DomTreeStrategy;
  isExcluded?: (element: Element) => boolean;
};

export async function inspectTypography(
  target: CaptureInput,
  dependencies: TypographyInspectionDependencies,
  signal?: AbortSignal
): Promise<TypographyInspection> {
  const roots = captureRoots(target);
  const document = roots[0]?.ownerDocument;
  if (!document || roots.some((root) => root.ownerDocument !== document)) {
    throw new Error("Typography target must belong to one document");
  }
  if (roots.some((root) => !isTargetConnected(root))) {
    throw new Error("Typography target is no longer connected");
  }
  throwIfAborted(signal);

  const usages = collectTypographyUsages(roots, dependencies);
  const requests = aggregateFontRequests(usages);
  dependencies.fontResolver.beginCapture(document);
  await dependencies.fontResolver.preflight(requests, "compatible", signal);
  const diagnostics = new Map(
    dependencies.fontResolver
      .getDiagnostics()
      .map((diagnostic) => [fontRequestKey(diagnostic.request), diagnostic])
  );

  const resolvedUsages = [...usages.values()]
    .sort((left, right) => compareTokens(left.token, right.token))
    .map(({ token, usageCount }) => ({
      token,
      usageCount,
      resolution:
        diagnostics.get(fontRequestKey(toFontRequest(token))) ??
        missingDiagnostic(toFontRequest(token)),
    }));
  const summary = {
    total: resolvedUsages.length,
    exact: 0,
    fallback: 0,
    failed: 0,
  };
  for (const usage of resolvedUsages) {
    summary[usage.resolution.status] += 1;
  }
  return { usages: resolvedUsages, summary };
}

export function parseFontFamilyList(value: string): Array<string> {
  const families: Array<string> = [];
  let start = 0;
  let quote = "";
  let escaped = false;
  for (let index = 0; index <= value.length; index += 1) {
    const character = value[index] ?? ",";
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (character === quote) {
        quote = "";
      }
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character !== ",") {
      continue;
    }
    const family = decodeCssFamily(value.slice(start, index));
    if (family) {
      families.push(family);
    }
    start = index + 1;
  }
  return families;
}

function collectTypographyUsages(
  roots: ReadonlyArray<Element>,
  dependencies: TypographyInspectionDependencies
): Map<string, MutableUsage> {
  const usages = new Map<string, MutableUsage>();
  for (const root of roots) {
    const visit = (node: Node, composedParent?: Element): void => {
      if (node.nodeType !== TEXT_NODE) {
        return;
      }
      addTypographyUsage(
        node as Text,
        composedParent ?? (node as Text).parentElement,
        root,
        usages,
        dependencies.isExcluded
      );
    };
    for (const { node, composedParent } of dependencies.domTraversal.walk(
      root
    )) {
      visit(node, composedParent);
    }
  }
  return usages;
}

function addTypographyUsage(
  textNode: Text,
  element: Element | null,
  root: Element,
  usages: Map<string, MutableUsage>,
  isExcluded: TypographyInspectionDependencies["isExcluded"]
): void {
  const text = textNode.textContent ?? "";
  if (!(text.trim() && element) || isNonVisualElement(element)) {
    return;
  }
  if (
    isExcludedTreeElement(element, isExcluded) ||
    !isRendered(element, root)
  ) {
    return;
  }
  const token = readTypographyToken(element);
  if (!token) {
    return;
  }
  const key = typographyTokenKey(token);
  const existing = usages.get(key);
  if (existing) {
    existing.usageCount += 1;
    addCodePoints(existing.codePoints, text);
    return;
  }
  const codePoints = new Set<number>();
  addCodePoints(codePoints, text);
  usages.set(key, { token, usageCount: 1, codePoints });
}

function readTypographyToken(element: Element): TypographyToken | null {
  const view = element.ownerDocument.defaultView;
  if (!view) {
    return null;
  }
  let style: CSSStyleDeclaration;
  try {
    style = view.getComputedStyle(element);
  } catch {
    return null;
  }
  const familyStack = parseFontFamilyList(style.fontFamily);
  const family = familyStack[0];
  if (!family) {
    return null;
  }
  return {
    familyStack,
    family,
    weight: parseWeight(style.fontWeight),
    style: parseFontStyle(style.fontStyle),
    fontSizePx: parsePixels(style.fontSize),
    lineHeight: parseLineHeight(style.lineHeight),
    letterSpacing: parseLetterSpacing(style.letterSpacing),
  };
}

function aggregateFontRequests(
  usages: ReadonlyMap<string, MutableUsage>
): Array<FontProperties> {
  const requests = new Map<
    string,
    { request: FontProperties; codePoints: Set<number> }
  >();
  for (const usage of usages.values()) {
    const request = toFontRequest(usage.token);
    const key = fontRequestKey(request);
    const existing = requests.get(key);
    if (existing) {
      for (const codePoint of usage.codePoints) {
        existing.codePoints.add(codePoint);
      }
      continue;
    }
    requests.set(key, {
      request,
      codePoints: new Set(usage.codePoints),
    });
  }
  return [...requests.values()].map(({ request, codePoints }) => ({
    ...request,
    codePoints: [...codePoints].sort((left, right) => left - right),
  }));
}

function captureRoots(target: CaptureInput): Array<Element> {
  if ("frames" in target) {
    if (target.frames.length === 0) {
      throw new Error("Typography target must contain at least one frame");
    }
    return target.frames.map((frame) => frame.element);
  }
  return [target.element];
}

function isRendered(element: Element, root: Element): boolean {
  let current: Element | null = element;
  while (current) {
    const view = current.ownerDocument.defaultView;
    if (!view) {
      return false;
    }
    let style: CSSStyleDeclaration;
    try {
      style = view.getComputedStyle(current);
    } catch {
      return false;
    }
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.visibility === "collapse" ||
      style.contentVisibility === "hidden"
    ) {
      return false;
    }
    if (current === root) {
      return true;
    }
    current = composedParentElement(current);
  }
  return false;
}

function isExcludedTreeElement(
  element: Element,
  isExcluded: TypographyInspectionDependencies["isExcluded"]
): boolean {
  if (!isExcluded) {
    return false;
  }
  let current: Element | null = element;
  while (current) {
    if (isExcluded(current)) {
      return true;
    }
    current = composedParentElement(current);
  }
  return false;
}

function composedParentElement(element: Element): Element | null {
  if (element.parentElement) {
    return element.parentElement;
  }
  const root = element.getRootNode();
  return root.nodeType === DOCUMENT_FRAGMENT_NODE && "host" in root
    ? (root as ShadowRoot).host
    : null;
}

function isNonVisualElement(element: Element): boolean {
  return NON_VISUAL_ELEMENTS.has(element.localName.toLowerCase());
}

function toFontRequest(token: TypographyToken): FontProperties {
  return {
    family: token.family,
    weight: token.weight,
    italic: token.style !== "normal",
  };
}

function fontRequestKey(request: FontProperties): string {
  return `${request.family.trim().toLowerCase()}:${request.weight}:${request.italic}`;
}

function typographyTokenKey(token: TypographyToken): string {
  return JSON.stringify([
    token.familyStack,
    token.weight,
    token.style,
    token.fontSizePx,
    token.lineHeight,
    token.letterSpacing,
  ]);
}

function compareTokens(left: TypographyToken, right: TypographyToken): number {
  return (
    left.familyStack.join(", ").localeCompare(right.familyStack.join(", ")) ||
    left.weight - right.weight ||
    left.style.localeCompare(right.style) ||
    left.fontSizePx - right.fontSizePx ||
    compareMetric(left.lineHeight, right.lineHeight) ||
    compareMetric(left.letterSpacing, right.letterSpacing)
  );
}

function compareMetric(
  left: TypographyLineHeight | TypographyLetterSpacing,
  right: TypographyLineHeight | TypographyLetterSpacing
): number {
  if (left.kind !== right.kind) {
    return left.kind.localeCompare(right.kind);
  }
  return left.kind === "px" && right.kind === "px"
    ? left.value - right.value
    : 0;
}

function missingDiagnostic(request: FontProperties): FontDiagnostic {
  return {
    request,
    status: "failed",
    attempts: [],
    reason: "Font resolution unavailable",
  };
}

function parseFontStyle(value: string): TypographyToken["style"] {
  if (FONT_STYLE_ITALIC_PATTERN.test(value)) {
    return "italic";
  }
  return FONT_STYLE_OBLIQUE_PATTERN.test(value) ? "oblique" : "normal";
}

function parseWeight(value: string): number {
  const normalized = value.trim().toLowerCase();
  const numeric = Number.parseInt(normalized, 10);
  const weight = Number.isNaN(numeric)
    ? (CSS_WEIGHT_KEYWORDS[normalized] ?? FALLBACK_WEIGHT)
    : numeric;
  return Math.max(MIN_FONT_WEIGHT, Math.min(MAX_FONT_WEIGHT, weight));
}

function parsePixels(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseLineHeight(value: string): TypographyLineHeight {
  return value.trim().toLowerCase() === "normal"
    ? { kind: "normal" }
    : { kind: "px", value: parsePixels(value) };
}

function parseLetterSpacing(value: string): TypographyLetterSpacing {
  return value.trim().toLowerCase() === "normal"
    ? { kind: "normal" }
    : { kind: "px", value: parsePixels(value) };
}

function addCodePoints(target: Set<number>, text: string): void {
  for (const character of text) {
    const codePoint = character.codePointAt(0);
    if (codePoint !== undefined && !isWhitespaceOrControl(codePoint)) {
      target.add(codePoint);
    }
  }
}

function isWhitespaceOrControl(codePoint: number): boolean {
  return WHITESPACE_OR_CONTROL_PATTERN.test(String.fromCodePoint(codePoint));
}

function decodeCssFamily(value: string): string {
  const trimmed = value.trim();
  const unquoted =
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
      ? trimmed.slice(1, -1)
      : trimmed;
  return unquoted
    .replace(
      /\\([0-9a-f]{1,6}[\t\n\f\r ]?|[\s\S])/gi,
      (_match, escapedValue: string) => decodeCssEscape(escapedValue)
    )
    .trim();
}

function decodeCssEscape(escapedValue: string): string {
  const hex = escapedValue.trim();
  if (CSS_HEX_ESCAPE_PATTERN.test(hex)) {
    const codePoint = Number.parseInt(hex, 16);
    return codePoint === 0 || codePoint > MAX_UNICODE_CODE_POINT
      ? "\uFFFD"
      : String.fromCodePoint(codePoint);
  }
  return escapedValue;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw signal.reason ?? new DOMException("Aborted", "AbortError");
  }
}
