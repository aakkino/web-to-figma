import type { DomTreeStrategy } from "@aakkino/composed-dom";
import { openComposedDomTree } from "@aakkino/composed-dom";

import { resolveLazyBackgroundSource } from "./lazy-background";

import type {
  CaptureAnalysis,
  CaptureInput,
  CapturePlan,
  CaptureResourceKind,
  CaptureResourceSummary,
  CaptureResourceUsage,
  CaptureTarget,
} from "./types";

const IMAGE_URL_PATTERN = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi;
const IMAGE_DENSITY_PATTERN = /^(?:\s*)(\d+(?:\.\d+)?)(?:x|dppx)/i;
const IMAGE_SET_FUNCTION_PATTERN = /image-set\s*\(/i;
const GRADIENT_FUNCTION_PATTERN = /gradient\s*\(/i;
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
  kind: CaptureResourceKind;
  nodeCount: number;
  elements: ReadonlyArray<HTMLImageElement>;
  usages: ReadonlyArray<CaptureResourceUsage>;
};

export type CaptureInventory = {
  analysis: CaptureAnalysis;
  resources: ReadonlyArray<CaptureInventoryResource>;
  elementSources: WeakMap<HTMLImageElement, string>;
  backgroundSources: ReadonlyMap<Element, string>;
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
  const backgroundSources = new Map<Element, string>();
  let imageNodeCount = 0;
  let unsupportedBackgroundImageCount = 0;
  let backgroundImageLayerCount = 0;

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
        addResourceUsage(
          resourcesBySource,
          source,
          { kind: "image", owner: element },
          element
        );
        elementSources.set(element, source);
      }
    }
    const background = collectBackgroundSources(
      element,
      root.ownerDocument.baseURI
    );
    backgroundImageLayerCount += background.layerCount;
    unsupportedBackgroundImageCount += background.unsupportedCount;
    for (const usage of background.usages) {
      addResourceUsage(
        resourcesBySource,
        usage.source,
        {
          kind: "background-image",
          owner: element,
          layerIndex: usage.layerIndex,
        },
        element.ownerDocument.createElement("img")
      );
    }
    if (!background.hasImageLayer) {
      const view = element.ownerDocument.defaultView;
      const lazyBackground = resolveLazyBackgroundSource(
        element.getAttribute("data-bgset"),
        {
          baseUrl: root.ownerDocument.baseURI,
          renderedWidth: readElementWidth(element),
          devicePixelRatio: view?.devicePixelRatio ?? 1,
        }
      );
      if (lazyBackground) {
        addResourceUsage(
          resourcesBySource,
          lazyBackground.source,
          {
            kind: "background-image",
            owner: element,
            layerIndex: background.layerCount,
          },
          element.ownerDocument.createElement("img")
        );
        backgroundSources.set(element, lazyBackground.source);
        backgroundImageLayerCount += 1;
      }
    }
  };

  visit(root);
  for (const { node } of domTraversal.walk(root)) {
    visit(node);
  }

  const resources = [...resourcesBySource.values()];
  const summaries: Array<CaptureResourceSummary> = resources.map(
    ({ resourceId, nodeCount, kind, usages }) => ({
      resourceId,
      nodeCount,
      kind,
      usageCount: usages.length,
    })
  );
  const revision = createResourceRevision(resources);
  const plan: CapturePlan = {
    target,
    imageNodeCount,
    uniqueImageResourceCount: resources.filter((resource) =>
      resource.usages.some((usage) => usage.kind === "image")
    ).length,
    unsupportedBackgroundImageCount,
    backgroundImageLayerCount,
    uniqueResourceCount: resources.length,
    resources: summaries,
    revision,
  };

  return {
    analysis: { plan, analyzedAt: Date.now() },
    resources,
    elementSources,
    backgroundSources,
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
    previousPlan.backgroundImageLayerCount !==
      nextPlan.backgroundImageLayerCount ||
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
  kind: CaptureResourceKind;
  nodeCount: number;
  elements: Array<HTMLImageElement>;
  usages: Array<CaptureResourceUsage>;
};

function createResource(
  index: number,
  src: string,
  kind: CaptureResourceKind,
  element: HTMLImageElement,
  usage: CaptureResourceUsage
): MutableInventoryResource {
  return {
    resourceId: `image-${index}`,
    src,
    kind,
    nodeCount: 1,
    elements: [element],
    usages: [usage],
  };
}

function addResourceUsage(
  resourcesBySource: Map<string, MutableInventoryResource>,
  source: string,
  usage: CaptureResourceUsage,
  element: HTMLImageElement
): void {
  const resource = resourcesBySource.get(source);
  if (!resource) {
    resourcesBySource.set(
      source,
      createResource(
        resourcesBySource.size + 1,
        source,
        usage.kind,
        element,
        usage
      )
    );
    return;
  }
  resource.nodeCount += 1;
  resource.usages.push(usage);
  if (usage.kind === "background-image") {
    resource.kind = "background-image";
  }
  resource.elements.push(element);
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

function collectBackgroundSources(
  element: Element,
  baseUrl: string
): {
  layerCount: number;
  unsupportedCount: number;
  hasImageLayer: boolean;
  usages: Array<{ source: string; layerIndex: number }>;
} {
  const view = element.ownerDocument.defaultView;
  if (!view) {
    return {
      layerCount: 0,
      unsupportedCount: 0,
      hasImageLayer: false,
      usages: [],
    };
  }
  let backgroundImage: string;
  try {
    backgroundImage = view.getComputedStyle(element).backgroundImage;
  } catch {
    return {
      layerCount: 0,
      unsupportedCount: 0,
      hasImageLayer: false,
      usages: [],
    };
  }
  if (!backgroundImage || backgroundImage === "none") {
    return {
      layerCount: 0,
      unsupportedCount: 0,
      hasImageLayer: false,
      usages: [],
    };
  }
  const layers = splitCssTopLevelList(backgroundImage);
  const usages: Array<{ source: string; layerIndex: number }> = [];
  let unsupportedCount = 0;
  for (let index = 0; index < layers.length; index += 1) {
    const layer = layers[index] ?? "";
    const source = extractLayerSource(layer, baseUrl, view.devicePixelRatio);
    if (source) {
      usages.push({ source, layerIndex: index });
    } else if (!GRADIENT_FUNCTION_PATTERN.test(layer)) {
      unsupportedCount += 1;
    }
  }
  return {
    layerCount: layers.length,
    unsupportedCount,
    hasImageLayer: true,
    usages,
  };
}

function readElementWidth(element: Element): number {
  try {
    const width = element.getBoundingClientRect().width;
    return Number.isFinite(width) && width > 0 ? width : 1;
  } catch {
    return 1;
  }
}

function extractLayerSource(
  layer: string,
  baseUrl: string,
  devicePixelRatio: number
): string | null {
  const pattern = new RegExp(IMAGE_URL_PATTERN.source, IMAGE_URL_PATTERN.flags);
  const matches: Array<{ source: string; density: number; order: number }> = [];
  let match = pattern.exec(layer);
  while (match) {
    const raw = (match[1] ?? match[2] ?? match[3] ?? "").trim();
    let source: string | null = null;
    try {
      const resolved = new URL(raw, baseUrl);
      source = IMAGE_PROTOCOLS.has(resolved.protocol)
        ? resolved.toString()
        : null;
    } catch {
      source = null;
    }
    if (source) {
      const suffix = layer.slice(pattern.lastIndex);
      const density = Number.parseFloat(
        IMAGE_DENSITY_PATTERN.exec(suffix)?.[1] ?? "1"
      );
      matches.push({ source, density, order: matches.length });
    }
    match = pattern.exec(layer);
  }
  if (matches.length === 0) {
    return null;
  }
  if (!IMAGE_SET_FUNCTION_PATTERN.test(layer)) {
    return matches[0]?.source ?? null;
  }
  return (
    [...matches].sort((left, right) => {
      const leftAbove = left.density >= devicePixelRatio;
      const rightAbove = right.density >= devicePixelRatio;
      if (leftAbove !== rightAbove) {
        return leftAbove ? -1 : 1;
      }
      if (left.density !== right.density) {
        return leftAbove
          ? left.density - right.density
          : right.density - left.density;
      }
      return left.order - right.order;
    })[0]?.source ?? null
  );
}

function splitCssTopLevelList(value: string): Array<string> {
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
    } else if (character === "(") {
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

function createResourceRevision(
  resources: ReadonlyArray<MutableInventoryResource>
): string {
  const sourceList = resources
    .flatMap((resource) =>
      resource.usages.map(
        (usage) => `${resource.src}|${usage.kind}|${usage.layerIndex ?? -1}`
      )
    )
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
