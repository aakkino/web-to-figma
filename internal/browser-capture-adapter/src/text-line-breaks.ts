import { getComposedChildNodes } from "@figit/dom-to-figma";
import type { LineBreakDiagnostics, LineBreakMode } from "./types";

const TEXT_NODE = 3;
const MAX_BMP_CODE_POINT = 0xff_ff;
const LINE_TOP_TOLERANCE_PX = 1;
const MIN_VISIBLE_RECT_SIZE_PX = 0.5;
const CJK_TEXT_PATTERN = /[\u3400-\u9fff\uf900-\ufaff]/;
const LINE_BREAK_PATTERN = /[\r\n]/;
const COLLAPSIBLE_WHITESPACE_PATTERN = /[\t\n\f\r ]+/g;

type TextRestore = () => void;

export type LineBreakPreparation = {
  diagnostics: LineBreakDiagnostics;
  restore(): void;
};

export function prepareCjkLineBreaks(
  root: Element,
  mode: LineBreakMode = "auto"
): LineBreakPreparation {
  const diagnostics: LineBreakDiagnostics = {
    mode,
    measuredNodes: 0,
    changedNodes: 0,
    insertedBreaks: 0,
    skippedNodes: 0,
    measurementFailures: [],
  };
  const restores: Array<TextRestore> = [];

  if (mode === "off") {
    return {
      diagnostics,
      restore: () => undefined,
    };
  }

  const document = root.ownerDocument;
  const visit = (node: Node): void => {
    if (node.nodeType === TEXT_NODE) {
      prepareTextNode(node as Text, document, restores, diagnostics);
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      for (const child of getComposedChildNodes(node as Element)) {
        visit(child);
      }
    }
  };

  visit(root);

  return {
    diagnostics,
    restore() {
      const failures: Array<string> = [];
      for (const restore of [...restores].reverse()) {
        try {
          restore();
        } catch (error) {
          failures.push(toErrorMessage(error));
        }
      }
      if (failures.length > 0) {
        throw new Error(`Text cleanup failed: ${failures.join("; ")}`);
      }
    },
  };
}

export function getBrowserLineBreakIndexes(
  document: Document,
  textNode: Text
): Array<number> {
  const content = textNode.data;
  const breakIndexes: Array<number> = [];
  let previousRect: DOMRect | null = null;
  let previousEnd = 0;

  for (let offset = 0; offset < content.length; ) {
    const codePoint = content.codePointAt(offset) ?? 0;
    const characterLength = codePoint > MAX_BMP_CODE_POINT ? 2 : 1;
    const range = document.createRange();
    range.setStart(textNode, offset);
    range.setEnd(textNode, offset + characterLength);
    const rect = Array.from(range.getClientRects()).find(isVisibleRect);
    if (rect) {
      if (
        previousRect &&
        Math.abs(rect.top - previousRect.top) > LINE_TOP_TOLERANCE_PX &&
        !LINE_BREAK_PATTERN.test(content.slice(previousEnd, offset))
      ) {
        breakIndexes.push(offset);
      }
      previousRect = rect;
      previousEnd = offset + characterLength;
    }
    offset += characterLength;
  }

  return breakIndexes;
}

function prepareTextNode(
  textNode: Text,
  document: Document,
  restores: Array<TextRestore>,
  diagnostics: LineBreakDiagnostics
): void {
  const element = textNode.parentElement;
  const originalText = textNode.data;
  if (
    !(element && originalText && CJK_TEXT_PATTERN.test(originalText)) ||
    isNonVisualTextElement(element) ||
    LINE_BREAK_PATTERN.test(originalText)
  ) {
    diagnostics.skippedNodes += 1;
    return;
  }

  const view = document.defaultView;
  if (!view) {
    diagnostics.skippedNodes += 1;
    return;
  }

  let style: CSSStyleDeclaration;
  try {
    style = view.getComputedStyle(element);
  } catch (error) {
    diagnostics.measurementFailures = [
      ...diagnostics.measurementFailures,
      `style: ${toErrorMessage(error)}`,
    ];
    return;
  }
  if (style.whiteSpace !== "normal" && style.whiteSpace !== "nowrap") {
    diagnostics.skippedNodes += 1;
    return;
  }

  diagnostics.measuredNodes += 1;
  const normalizedText = originalText.replace(
    COLLAPSIBLE_WHITESPACE_PATTERN,
    " "
  );
  try {
    textNode.data = normalizedText;
    const breakIndexes = getBrowserLineBreakIndexes(document, textNode);
    if (breakIndexes.length === 0) {
      textNode.data = originalText;
      return;
    }

    const originalWhiteSpace = element.style.getPropertyValue("white-space");
    const originalPriority = element.style.getPropertyPriority("white-space");
    const convertedText = insertLineBreaks(normalizedText, breakIndexes);
    textNode.data = convertedText;
    element.style.setProperty("white-space", "pre-line");
    diagnostics.changedNodes += 1;
    diagnostics.insertedBreaks += breakIndexes.length;
    restores.push(() => {
      textNode.data = originalText;
      if (originalWhiteSpace) {
        element.style.setProperty(
          "white-space",
          originalWhiteSpace,
          originalPriority
        );
      } else {
        element.style.removeProperty("white-space");
      }
    });
  } catch (error) {
    textNode.data = originalText;
    diagnostics.measurementFailures = [
      ...diagnostics.measurementFailures,
      `node: ${toErrorMessage(error)}`,
    ];
  }
}

function insertLineBreaks(
  content: string,
  breakIndexes: ReadonlyArray<number>
): string {
  let result = content;
  for (const index of [...breakIndexes].reverse()) {
    if (
      index <= 0 ||
      result[index - 1] === "\n" ||
      result[index - 1] === "\r"
    ) {
      continue;
    }
    result = `${result.slice(0, index)}\n${result.slice(index)}`;
  }
  return result;
}

function isVisibleRect(rect: DOMRect): boolean {
  return (
    rect.width > MIN_VISIBLE_RECT_SIZE_PX &&
    rect.height > MIN_VISIBLE_RECT_SIZE_PX
  );
}

function isNonVisualTextElement(element: Element): boolean {
  const tagName = element.localName.toLowerCase();
  return (
    tagName === "script" ||
    tagName === "style" ||
    tagName === "noscript" ||
    tagName === "template"
  );
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
