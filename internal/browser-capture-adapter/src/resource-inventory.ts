import type { DomTreeStrategy } from "@figit/composed-dom";
import { openComposedDomTree } from "@figit/composed-dom";

import type {
  CaptureAnalysis,
  CaptureInput,
  CapturePlan,
  CaptureResourceSummary,
  CaptureTarget,
} from "./types";

const IMAGE_URL_PATTERN = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi;
const IMAGE_PROTOCOLS = new Set(["data:", "blob:", "http:", "https:"]);
const FNV_OFFSET_BASIS = 2_166_136_261;
const FNV_PRIME = 16_777_619;
const HASH_MODULUS = 4_294_967_296;
const HEX_RADIX = 16;
const REVISION_HASH_WIDTH = 8;
const DOCUMENT_FRAGMENT_NODE = 11;

export type CaptureInventoryResource = {
  resourceId: string;
  src: string;
  nodeCount: number;
  elements: ReadonlyArray<HTMLImageElement>;
};

export type CaptureInventory = {
  analysis: CaptureAnalysis;
  resources: ReadonlyArray<CaptureInventoryResource>;
  elementSources: WeakMap<HTMLImageElement, string>;
};

export type CaptureInventoryOptions = {
  domTraversal?: DomTreeStrategy;
  isExcluded?: (element: Element) => boolean;
};

export type CapturePlanRevalidation =
  | { status: "unchanged"; inventory: CaptureInventory }
  | { status: "counts-changed"; inventory: CaptureInventory }
  | { status: "resource-set-changed"; inventory: CaptureInventory }
  | { status: "target-lost" };

export function analyzeCaptureTarget(
  input: CaptureInput,
  options: CaptureInventoryOptions = {}
): CaptureInventory {
  const target = toCaptureTarget(input);
  const root = target.root;
  const domTraversal = options.domTraversal ?? openComposedDomTree;
  const resourcesBySource = new Map<string, MutableInventoryResource>();
  const elementSources = new WeakMap<HTMLImageElement, string>();
  let imageNodeCount = 0;
  let unsupportedBackgroundImageCount = 0;

  const visit = (node: Node): void => {
    if (node.nodeType !== 1) {
      return;
    }
    const element = node as Element;
    if (isExcludedTreeElement(element, options.isExcluded)) {
      return;
    }
    if (isImageElement(element)) {
      imageNodeCount += 1;
      const source = resolveImageSource(element, root.ownerDocument.baseURI);
      if (source) {
        const resource = resourcesBySource.get(source);
        const next =
          resource ??
          createResource(resourcesBySource.size + 1, source, element);
        if (!resource) {
          resourcesBySource.set(source, next);
        } else {
          next.elements.push(element);
        }
        next.nodeCount += resource ? 1 : 0;
        elementSources.set(element, source);
      }
    }
    unsupportedBackgroundImageCount +=
      countUnsupportedBackgroundImages(element);
  };

  visit(root);
  for (const { node } of domTraversal.walk(root)) {
    visit(node);
  }

  const resources = [...resourcesBySource.values()];
  const summaries: Array<CaptureResourceSummary> = resources.map(
    ({ resourceId, nodeCount }) => ({ resourceId, nodeCount })
  );
  const revision = createResourceRevision(resources);
  const plan: CapturePlan = {
    target,
    imageNodeCount,
    uniqueImageResourceCount: resources.length,
    unsupportedBackgroundImageCount,
    resources: summaries,
    revision,
  };

  return {
    analysis: { plan, analyzedAt: Date.now() },
    resources,
    elementSources,
  };
}

export function revalidateCapturePlan(
  previous: CaptureInventory,
  options: CaptureInventoryOptions = {}
): CapturePlanRevalidation {
  if (!isTargetConnected(previous.analysis.plan.target.root)) {
    return { status: "target-lost" };
  }
  const next = analyzeCaptureTarget(
    previous.analysis.plan.target.input,
    options
  );
  const previousPlan = previous.analysis.plan;
  const nextPlan = next.analysis.plan;
  if (previousPlan.revision !== nextPlan.revision) {
    return { status: "resource-set-changed", inventory: next };
  }
  if (
    previousPlan.imageNodeCount !== nextPlan.imageNodeCount ||
    previousPlan.unsupportedBackgroundImageCount !==
      nextPlan.unsupportedBackgroundImageCount
  ) {
    return { status: "counts-changed", inventory: next };
  }
  return { status: "unchanged", inventory: next };
}

export function isTargetConnected(element: Element): boolean {
  if (typeof element.isConnected === "boolean") {
    return element.isConnected;
  }
  return Boolean(element.ownerDocument.documentElement?.contains(element));
}

function toCaptureTarget(input: CaptureInput): CaptureTarget {
  if ("frames" in input) {
    const root = input.frames[0]?.element;
    if (!root) {
      throw new Error("Capture input must contain at least one frame");
    }
    return { input, root, kind: "canvas" };
  }
  return { input, root: input.element, kind: "element" };
}

type MutableInventoryResource = {
  resourceId: string;
  src: string;
  nodeCount: number;
  elements: Array<HTMLImageElement>;
};

function createResource(
  index: number,
  src: string,
  element: HTMLImageElement
): MutableInventoryResource {
  return {
    resourceId: `image-${index}`,
    src,
    nodeCount: 1,
    elements: [element],
  };
}

function isImageElement(element: Element): element is HTMLImageElement {
  return element.localName.toLowerCase() === "img";
}

function resolveImageSource(
  element: HTMLImageElement,
  baseUrl: string
): string | null {
  const raw = element.currentSrc || element.getAttribute("src") || element.src;
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

function countUnsupportedBackgroundImages(element: Element): number {
  const view = element.ownerDocument.defaultView;
  if (!view) {
    return 0;
  }
  let backgroundImage: string;
  try {
    backgroundImage = view.getComputedStyle(element).backgroundImage;
  } catch {
    return 0;
  }
  if (!backgroundImage || backgroundImage === "none") {
    return 0;
  }
  const pattern = new RegExp(IMAGE_URL_PATTERN.source, IMAGE_URL_PATTERN.flags);
  let count = 0;
  while (pattern.exec(backgroundImage)) {
    count += 1;
  }
  return count;
}

function createResourceRevision(
  resources: ReadonlyArray<MutableInventoryResource>
): string {
  const sourceList = resources
    .map((resource) => resource.src)
    .sort()
    .join("\u001f");
  return `r${fnv1a(sourceList)}`;
}

function fnv1a(value: string): string {
  let hash = FNV_OFFSET_BASIS;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash, FNV_PRIME) + value.charCodeAt(index);
    hash %= HASH_MODULUS;
    if (hash < 0) {
      hash += HASH_MODULUS;
    }
  }
  return hash.toString(HEX_RADIX).padStart(REVISION_HASH_WIDTH, "0");
}

function isExcludedTreeElement(
  element: Element,
  isExcluded: CaptureInventoryOptions["isExcluded"]
): boolean {
  if (!isExcluded) {
    return false;
  }
  let current: Node | null = element;
  while (current) {
    if (current.nodeType === 1 && isExcluded(current as Element)) {
      return true;
    }
    if (current.parentNode) {
      current = current.parentNode;
      continue;
    }
    if (isShadowRoot(current)) {
      current = current.host;
      continue;
    }
    current = null;
  }
  return false;
}

function isShadowRoot(node: Node): node is ShadowRoot {
  return node.nodeType === DOCUMENT_FRAGMENT_NODE && "host" in node;
}
