import type { DomTreeStrategy } from "@aakkino/composed-dom";

import type { CaptureInventory } from "./resource-inventory";
import {
  analyzeCaptureTarget,
  isExcludedTreeElement,
  isTargetConnected,
} from "./resource-inventory";
import type {
  ActivationDiagnostics,
  ActivationProgress,
  ActivationScope,
  ActivationStatus,
  LazyActivationMode,
} from "./types";

export const LAZY_ACTIVATION_TIMEOUT_MS = 10_000;
export const LAZY_ACTIVATION_QUIET_WINDOW_MS = 100;
export const LAZY_ACTIVATION_TRAILING_WINDOW_MS = 500;
export const LAZY_ACTIVATION_MAX_PASSES = 2;
export const LAZY_ACTIVATION_MAX_CONTAINERS = 32;
export const LAZY_ACTIVATION_MAX_SCROLL_STEPS = 64;

const ELEMENT_NODE = 1;
const MIN_SCROLL_DELTA = 1;
const RESTORE_TOLERANCE_PX = 1;

type LazyActivationOptions = {
  mode: LazyActivationMode;
  domTraversal: DomTreeStrategy;
  isExcluded?: (element: Element) => boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
  quietWindowMs?: number;
  trailingWindowMs?: number;
  maxPasses?: number;
  maxContainers?: number;
  maxScrollSteps?: number;
  onProgress?: (progress: ActivationProgress) => void;
};

export type LazyActivationResult = {
  inventory: CaptureInventory;
  diagnostics: ActivationDiagnostics;
};

type ScrollRole = "page" | "ancestor" | "descendant";

type ScrollContext =
  | {
      kind: "window";
      key: Document;
      document: Document;
      view: Window;
      role: ScrollRole;
    }
  | {
      kind: "element";
      key: Element;
      element: Element;
      role: ScrollRole;
    };

type ScrollPosition = { left: number; top: number };
type ScrollSnapshot = ScrollPosition & { context: ScrollContext };

type MutableRun = {
  inventory: CaptureInventory;
  status: ActivationStatus;
  passes: number;
  scrollSteps: number;
  visited: Set<object>;
  discoveredSources: Set<string>;
  discoveredNodes: number;
  resourceSetChanged: boolean;
  errors: Set<string>;
};

type Runtime = {
  options: LazyActivationOptions;
  target: CaptureInventory["analysis"]["plan"]["target"];
  scope: Exclude<ActivationScope, "canvas">;
  run: MutableRun;
  startedAt: number;
  deadline: number;
  quietWindowMs: number;
  trailingWindowMs: number;
  maxPasses: number;
  maxContainers: number;
  maxScrollSteps: number;
  initialSources: ReadonlySet<string>;
  snapshots: Map<object, ScrollSnapshot>;
  observedNodes: WeakSet<Element>;
};

class ActivationStop extends Error {
  readonly status: "canceled" | "timed-out" | "target-lost";

  constructor(status: ActivationStop["status"]) {
    super(status);
    this.name = "ActivationStop";
    this.status = status;
  }
}

export async function activateLazyResources(
  initialInventory: CaptureInventory,
  options: LazyActivationOptions
): Promise<LazyActivationResult> {
  const startedAt = Date.now();
  const scope = activationScope(initialInventory);
  const run: MutableRun = {
    inventory: initialInventory,
    status: "completed",
    passes: 0,
    scrollSteps: 0,
    visited: new Set(),
    discoveredSources: new Set(),
    discoveredNodes: 0,
    resourceSetChanged: false,
    errors: new Set(),
  };
  if (options.mode === "off") {
    return createResult(run, "off", scope, true, startedAt);
  }
  if (scope === "canvas") {
    run.status = "not-applicable";
    return createResult(run, "auto", scope, true, startedAt);
  }

  const timeoutMs = nonNegative(options.timeoutMs, LAZY_ACTIVATION_TIMEOUT_MS);
  const observedNodes = new WeakSet<Element>();
  collectNewElements(
    initialInventory.analysis.plan.target.root,
    options.domTraversal,
    options.isExcluded,
    observedNodes
  );
  const runtime: Runtime = {
    options,
    target: initialInventory.analysis.plan.target,
    scope,
    run,
    startedAt,
    deadline: startedAt + timeoutMs,
    quietWindowMs: nonNegative(
      options.quietWindowMs,
      LAZY_ACTIVATION_QUIET_WINDOW_MS
    ),
    trailingWindowMs: nonNegative(
      options.trailingWindowMs,
      LAZY_ACTIVATION_TRAILING_WINDOW_MS
    ),
    maxPasses: positiveInteger(options.maxPasses, LAZY_ACTIVATION_MAX_PASSES),
    maxContainers: positiveInteger(
      options.maxContainers,
      LAZY_ACTIVATION_MAX_CONTAINERS
    ),
    maxScrollSteps: positiveInteger(
      options.maxScrollSteps,
      LAZY_ACTIVATION_MAX_SCROLL_STEPS
    ),
    initialSources: new Set(
      initialInventory.resources.map((resource) => resource.src)
    ),
    snapshots: new Map(),
    observedNodes,
  };
  let restored = true;

  try {
    await runPasses(runtime);
  } catch (error) {
    applyRunError(run, error);
  } finally {
    restored = restoreSnapshots(runtime.snapshots, run.errors);
  }

  if (!(restored || preservesPrimaryStatus(run.status))) {
    run.status = "restore-failed";
  }
  await finalizeInventory(runtime);
  return createResult(run, "auto", scope, restored, startedAt);
}

async function runPasses(runtime: Runtime): Promise<void> {
  for (let pass = 1; pass <= runtime.maxPasses; pass += 1) {
    assertCanContinue(runtime);
    runtime.run.passes = pass;
    const changed = await runPass(runtime, pass);
    if (!changed) {
      return;
    }
    if (pass === runtime.maxPasses) {
      runtime.run.status = "budget-exhausted";
    }
  }
}

async function runPass(runtime: Runtime, pass: number): Promise<boolean> {
  const contexts = discoverContexts(runtime);
  if (contexts.length > runtime.maxContainers) {
    runtime.run.status = "budget-exhausted";
  }
  const selected = contexts.slice(0, runtime.maxContainers);
  const beforeRevision = runtime.run.inventory.analysis.plan.revision;
  const beforeRanges = rangeSignature(selected);

  for (const [index, context] of selected.entries()) {
    if (runtime.run.scrollSteps >= runtime.maxScrollSteps) {
      runtime.run.status = "budget-exhausted";
      break;
    }
    await activateContext(runtime, context, pass, index, selected.length);
  }
  return (
    beforeRevision !== runtime.run.inventory.analysis.plan.revision ||
    beforeRanges !== rangeSignature(selected)
  );
}

async function activateContext(
  runtime: Runtime,
  context: ScrollContext,
  pass: number,
  contextIndex: number,
  contextCount: number
): Promise<void> {
  assertCanContinue(runtime);
  if (!snapshotContext(runtime, context)) {
    return;
  }
  runtime.run.visited.add(context.key);
  const remainingSteps = runtime.maxScrollSteps - runtime.run.scrollSteps;
  const remainingContexts = Math.max(1, contextCount - contextIndex);
  const positions = planPositions(
    context,
    runtime.target.root,
    runtime.scope,
    Math.max(1, Math.floor(remainingSteps / remainingContexts))
  );
  for (const [index, position] of positions.entries()) {
    if (runtime.run.scrollSteps >= runtime.maxScrollSteps) {
      runtime.run.status = "budget-exhausted";
      return;
    }
    await activationStep(
      runtime,
      context,
      position,
      pass,
      index === positions.length - 1
    );
  }
}

async function activationStep(
  runtime: Runtime,
  context: ScrollContext,
  position: ScrollPosition,
  pass: number,
  trailing: boolean
): Promise<void> {
  assertCanContinue(runtime);
  writePosition(context, position);
  runtime.run.scrollSteps += 1;
  await waitForActivationWindow(
    runtime,
    trailing
      ? Math.max(runtime.quietWindowMs, runtime.trailingWindowMs)
      : runtime.quietWindowMs
  );
  assertCanContinue(runtime);
  const inventory = analyzeCaptureTarget(runtime.target.input, {
    domTraversal: runtime.options.domTraversal,
    isExcluded: runtime.options.isExcluded,
  });
  collectChanges(runtime, inventory);
  runtime.run.inventory = inventory;
  runtime.options.onProgress?.({
    pass,
    maxPasses: runtime.maxPasses,
    step: runtime.run.scrollSteps,
    maxSteps: runtime.maxScrollSteps,
    containersVisited: runtime.run.visited.size,
    elapsedMs: Date.now() - runtime.startedAt,
  });
}

async function finalizeInventory(runtime: Runtime): Promise<void> {
  if (!isTargetConnected(runtime.target.root)) {
    runtime.run.status = "target-lost";
    return;
  }
  try {
    if (!(runtime.options.signal?.aborted || Date.now() >= runtime.deadline)) {
      await waitForActivationWindow(runtime, runtime.quietWindowMs);
    }
    const restored = analyzeCaptureTarget(runtime.target.input, {
      domTraversal: runtime.options.domTraversal,
      isExcluded: runtime.options.isExcluded,
    });
    const changedAfterRestore =
      restored.analysis.plan.revision !==
      runtime.run.inventory.analysis.plan.revision;
    collectChanges(runtime, restored);
    runtime.run.inventory = restored;
    if (!changedAfterRestore) {
      return;
    }
    runtime.run.resourceSetChanged = true;
    if (runtime.options.signal?.aborted || Date.now() >= runtime.deadline) {
      if (!preservesPrimaryStatus(runtime.run.status)) {
        runtime.run.status = "resource-set-changed";
      }
      return;
    }
    await waitForActivationWindow(runtime, runtime.quietWindowMs);
    const confirmation = analyzeCaptureTarget(runtime.target.input, {
      domTraversal: runtime.options.domTraversal,
      isExcluded: runtime.options.isExcluded,
    });
    if (
      confirmation.analysis.plan.revision !== restored.analysis.plan.revision &&
      !preservesPrimaryStatus(runtime.run.status)
    ) {
      runtime.run.status = "resource-set-changed";
    }
    collectChanges(runtime, confirmation);
    runtime.run.inventory = confirmation;
  } catch (error) {
    if (error instanceof ActivationStop) {
      if (!preservesPrimaryStatus(runtime.run.status)) {
        runtime.run.status = error.status;
      }
    } else {
      runtime.run.errors.add("final-inventory-failed");
    }
  }
}

function discoverContexts(runtime: Runtime): Array<ScrollContext> {
  const contexts: Array<ScrollContext> = [];
  const seen = new Set<object>();
  const root = runtime.target.root;
  const view = root.ownerDocument.defaultView;
  if (view) {
    addContext(contexts, seen, {
      kind: "window",
      key: root.ownerDocument,
      document: root.ownerDocument,
      view,
      role: runtime.scope === "page" ? "page" : "ancestor",
    });
  }

  if (runtime.scope === "element") {
    const ancestors: Array<Element> = [];
    let current = composedParent(root);
    while (current) {
      ancestors.push(current);
      current = composedParent(current);
    }
    for (const ancestor of ancestors.reverse()) {
      addScrollableElement(runtime, contexts, seen, ancestor, "ancestor");
    }
  }

  const role = runtime.scope === "page" ? "page" : "descendant";
  addScrollableElement(runtime, contexts, seen, root, role);
  for (const { node } of runtime.options.domTraversal.walk(root)) {
    if (node.nodeType === ELEMENT_NODE) {
      addScrollableElement(runtime, contexts, seen, node as Element, role);
    }
  }
  return contexts;
}

function addScrollableElement(
  runtime: Runtime,
  contexts: Array<ScrollContext>,
  seen: Set<object>,
  element: Element,
  role: ScrollRole
): void {
  if (
    seen.has(element) ||
    !isTargetConnected(element) ||
    isExcludedTreeElement(element, runtime.options.isExcluded) ||
    element === element.ownerDocument.body ||
    element === element.ownerDocument.documentElement
  ) {
    return;
  }
  try {
    const view = element.ownerDocument.defaultView;
    if (!view) {
      return;
    }
    const style = view.getComputedStyle(element);
    const scrollsX =
      isScrollable(style.overflowX) &&
      element.scrollWidth - element.clientWidth > MIN_SCROLL_DELTA;
    const scrollsY =
      isScrollable(style.overflowY) &&
      element.scrollHeight - element.clientHeight > MIN_SCROLL_DELTA;
    if (scrollsX || scrollsY) {
      addContext(contexts, seen, {
        kind: "element",
        key: element,
        element,
        role,
      });
    }
  } catch {
    runtime.run.errors.add("context-inspection-failed");
  }
}

function addContext(
  contexts: Array<ScrollContext>,
  seen: Set<object>,
  context: ScrollContext
): void {
  if (seen.has(context.key)) {
    return;
  }
  seen.add(context.key);
  contexts.push(context);
}

function snapshotContext(runtime: Runtime, context: ScrollContext): boolean {
  if (runtime.snapshots.has(context.key)) {
    return true;
  }
  try {
    runtime.snapshots.set(context.key, {
      context,
      ...readPosition(context),
    });
    return true;
  } catch {
    runtime.run.errors.add("scroll-snapshot-failed");
    return false;
  }
}

function planPositions(
  context: ScrollContext,
  target: Element,
  scope: Exclude<ActivationScope, "canvas">,
  limit: number
): Array<ScrollPosition> {
  if (scope === "element" && context.role === "ancestor") {
    return targetVisibilityPositions(context, target, limit);
  }
  const range = readRange(context);
  const current = readPosition(context);
  const candidates: Array<ScrollPosition> = [current];
  for (const top of axisPositions(range.maxTop, range.viewportHeight)) {
    candidates.push({ left: current.left, top });
  }
  for (const left of axisPositions(range.maxLeft, range.viewportWidth)) {
    candidates.push({ left, top: current.top });
  }
  if (range.maxLeft > 0 && range.maxTop > 0) {
    candidates.push({ left: range.maxLeft, top: range.maxTop });
  }
  return samplePositions(dedupePositions(candidates), limit);
}

function targetVisibilityPositions(
  context: ScrollContext,
  target: Element,
  limit: number
): Array<ScrollPosition> {
  const current = readPosition(context);
  const range = readRange(context);
  const targetRect = target.getBoundingClientRect();
  const contextRect =
    context.kind === "window"
      ? {
          left: 0,
          top: 0,
          right: range.viewportWidth,
          bottom: range.viewportHeight,
        }
      : context.element.getBoundingClientRect();
  if (
    isFixed(target) ||
    (targetRect.left >= contextRect.left &&
      targetRect.top >= contextRect.top &&
      targetRect.right <= contextRect.right &&
      targetRect.bottom <= contextRect.bottom)
  ) {
    return [current];
  }
  const startLeft = clamp(
    current.left + targetRect.left - contextRect.left,
    0,
    range.maxLeft
  );
  const endLeft = clamp(
    current.left + targetRect.right - contextRect.left - range.viewportWidth,
    0,
    range.maxLeft
  );
  const startTop = clamp(
    current.top + targetRect.top - contextRect.top,
    0,
    range.maxTop
  );
  const endTop = clamp(
    current.top + targetRect.bottom - contextRect.top - range.viewportHeight,
    0,
    range.maxTop
  );
  const candidates: Array<ScrollPosition> = [];
  for (const top of spanPositions(startTop, endTop, range.viewportHeight)) {
    candidates.push({ left: current.left, top });
  }
  for (const left of spanPositions(startLeft, endLeft, range.viewportWidth)) {
    candidates.push({ left, top: current.top });
  }
  candidates.push({ left: endLeft, top: endTop });
  return samplePositions(dedupePositions(candidates), limit);
}

function spanPositions(
  start: number,
  end: number,
  viewport: number
): Array<number> {
  const minimum = Math.min(start, end);
  const maximum = Math.max(start, end);
  const positions = [minimum];
  for (
    let position = minimum + viewport;
    position < maximum;
    position += viewport
  ) {
    positions.push(position);
  }
  positions.push(maximum);
  return [...new Set(positions.map(Math.round))];
}

function isFixed(element: Element): boolean {
  try {
    return (
      element.ownerDocument.defaultView?.getComputedStyle(element).position ===
      "fixed"
    );
  } catch {
    return false;
  }
}

function readRange(context: ScrollContext): {
  maxLeft: number;
  maxTop: number;
  viewportWidth: number;
  viewportHeight: number;
} {
  if (context.kind === "element") {
    return {
      maxLeft: Math.max(
        0,
        context.element.scrollWidth - context.element.clientWidth
      ),
      maxTop: Math.max(
        0,
        context.element.scrollHeight - context.element.clientHeight
      ),
      viewportWidth: Math.max(1, context.element.clientWidth),
      viewportHeight: Math.max(1, context.element.clientHeight),
    };
  }
  const element = scrollingElement(context.document);
  return {
    maxLeft: Math.max(0, element.scrollWidth - context.view.innerWidth),
    maxTop: Math.max(0, element.scrollHeight - context.view.innerHeight),
    viewportWidth: Math.max(1, context.view.innerWidth),
    viewportHeight: Math.max(1, context.view.innerHeight),
  };
}

function readPosition(context: ScrollContext): ScrollPosition {
  const element =
    context.kind === "element"
      ? context.element
      : scrollingElement(context.document);
  return { left: element.scrollLeft, top: element.scrollTop };
}

function writePosition(context: ScrollContext, position: ScrollPosition): void {
  const element =
    context.kind === "element"
      ? context.element
      : scrollingElement(context.document);
  element.scrollLeft = Math.round(position.left);
  element.scrollTop = Math.round(position.top);
}

function restoreSnapshots(
  snapshots: ReadonlyMap<object, ScrollSnapshot>,
  errors: Set<string>
): boolean {
  let restored = true;
  for (const snapshot of [...snapshots.values()].reverse()) {
    try {
      writePosition(snapshot.context, snapshot);
      const actual = readPosition(snapshot.context);
      if (
        Math.abs(actual.left - snapshot.left) > RESTORE_TOLERANCE_PX ||
        Math.abs(actual.top - snapshot.top) > RESTORE_TOLERANCE_PX
      ) {
        restored = false;
        errors.add("scroll-restore-incomplete");
      }
    } catch {
      restored = false;
      errors.add("scroll-restore-failed");
    }
  }
  return restored;
}

async function waitForActivationWindow(
  runtime: Runtime,
  quietWindowMs: number
): Promise<void> {
  const view = runtime.target.root.ownerDocument.defaultView;
  if (!view) {
    throw new ActivationStop("target-lost");
  }
  await waitForFrame(view, runtime.options.signal, runtime.deadline);
  await waitForFrame(view, runtime.options.signal, runtime.deadline);
  await waitForQuietWindow(runtime, quietWindowMs);
}

function waitForFrame(
  view: Window,
  signal: AbortSignal | undefined,
  deadline: number
): Promise<void> {
  assertSignalAndDeadline(signal, deadline);
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error?: ActivationStop): void => {
      if (settled) {
        return;
      }
      settled = true;
      view.clearTimeout(timeoutId);
      signal?.removeEventListener("abort", onAbort);
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    };
    const onAbort = () => finish(new ActivationStop("canceled"));
    const timeoutId = view.setTimeout(
      () => finish(new ActivationStop("timed-out")),
      Math.max(0, deadline - Date.now())
    );
    signal?.addEventListener("abort", onAbort, { once: true });
    view.requestAnimationFrame(() => finish());
  });
}

function waitForQuietWindow(
  runtime: Runtime,
  quietWindowMs: number
): Promise<void> {
  assertSignalAndDeadline(runtime.options.signal, runtime.deadline);
  if (quietWindowMs === 0) {
    return Promise.resolve();
  }
  const view = runtime.target.root.ownerDocument.defaultView;
  if (!view) {
    return Promise.reject(new ActivationStop("target-lost"));
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    let quietId = 0;
    const observers: Array<MutationObserver> = [];
    const finish = (error?: ActivationStop): void => {
      if (settled) {
        return;
      }
      settled = true;
      view.clearTimeout(quietId);
      view.clearTimeout(deadlineId);
      runtime.options.signal?.removeEventListener("abort", onAbort);
      for (const observer of observers) {
        observer.disconnect();
      }
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    };
    const armQuietTimer = (): void => {
      view.clearTimeout(quietId);
      quietId = view.setTimeout(() => finish(), quietWindowMs);
    };
    const onAbort = () => finish(new ActivationStop("canceled"));
    const deadlineId = view.setTimeout(
      () => finish(new ActivationStop("timed-out")),
      Math.max(0, runtime.deadline - Date.now())
    );
    runtime.options.signal?.addEventListener("abort", onAbort, { once: true });
    for (const root of mutationRoots(
      runtime.target.root,
      runtime.options.domTraversal
    )) {
      try {
        const observer = new view.MutationObserver(armQuietTimer);
        observer.observe(root, {
          attributes: true,
          childList: true,
          subtree: true,
        });
        observers.push(observer);
      } catch {
        runtime.run.errors.add("mutation-observer-failed");
      }
    }
    armQuietTimer();
  });
}

function mutationRoots(
  root: Element,
  domTraversal: DomTreeStrategy
): Array<Node> {
  const roots: Array<Node> = [root];
  if (root.shadowRoot) {
    roots.push(root.shadowRoot);
  }
  for (const { node } of domTraversal.walk(root)) {
    if (node.nodeType === ELEMENT_NODE && (node as Element).shadowRoot) {
      roots.push((node as Element).shadowRoot as ShadowRoot);
    }
  }
  return roots;
}

function collectChanges(runtime: Runtime, inventory: CaptureInventory): void {
  for (const resource of inventory.resources) {
    if (!runtime.initialSources.has(resource.src)) {
      runtime.run.discoveredSources.add(resource.src);
    }
  }
  runtime.run.discoveredNodes += collectNewElements(
    runtime.target.root,
    runtime.options.domTraversal,
    runtime.options.isExcluded,
    runtime.observedNodes
  );
}

function collectNewElements(
  root: Element,
  domTraversal: DomTreeStrategy,
  isExcluded: ((element: Element) => boolean) | undefined,
  observed: WeakSet<Element>
): number {
  let count = observeElement(root, isExcluded, observed) ? 1 : 0;
  for (const { node } of domTraversal.walk(root)) {
    if (
      node.nodeType === ELEMENT_NODE &&
      observeElement(node as Element, isExcluded, observed)
    ) {
      count += 1;
    }
  }
  return count;
}

function observeElement(
  element: Element,
  isExcluded: ((element: Element) => boolean) | undefined,
  observed: WeakSet<Element>
): boolean {
  if (observed.has(element) || isExcludedTreeElement(element, isExcluded)) {
    return false;
  }
  observed.add(element);
  return true;
}

function activationScope(inventory: CaptureInventory): ActivationScope {
  const target = inventory.analysis.plan.target;
  if (target.kind === "canvas") {
    return "canvas";
  }
  const document = target.root.ownerDocument;
  return target.root === document.body ||
    target.root === document.documentElement
    ? "page"
    : "element";
}

function rangeSignature(contexts: ReadonlyArray<ScrollContext>): string {
  return contexts
    .map((context) => {
      const range = readRange(context);
      return `${range.maxLeft}:${range.maxTop}`;
    })
    .join("|");
}

function axisPositions(maximum: number, viewport: number): Array<number> {
  if (maximum <= 0) {
    return [0];
  }
  const positions = [0];
  for (let position = viewport; position < maximum; position += viewport) {
    positions.push(position);
  }
  positions.push(maximum);
  return positions;
}

function samplePositions(
  positions: ReadonlyArray<ScrollPosition>,
  limit: number
): Array<ScrollPosition> {
  if (positions.length <= limit) {
    return [...positions];
  }
  if (limit <= 1) {
    return [positions.at(-1) ?? { left: 0, top: 0 }];
  }
  const sampled: Array<ScrollPosition> = [];
  for (let index = 0; index < limit; index += 1) {
    const sourceIndex = Math.round(
      (index * (positions.length - 1)) / (limit - 1)
    );
    const position = positions[sourceIndex];
    if (position) {
      sampled.push(position);
    }
  }
  return dedupePositions(sampled);
}

function dedupePositions(
  positions: ReadonlyArray<ScrollPosition>
): Array<ScrollPosition> {
  const seen = new Set<string>();
  const result: Array<ScrollPosition> = [];
  for (const position of positions) {
    const rounded = {
      left: Math.round(position.left),
      top: Math.round(position.top),
    };
    const key = `${rounded.left}:${rounded.top}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(rounded);
    }
  }
  return result;
}

function composedParent(element: Element): Element | null {
  if (element.assignedSlot) {
    return element.assignedSlot;
  }
  if (element.parentElement) {
    return element.parentElement;
  }
  const root = element.getRootNode();
  return root instanceof ShadowRoot ? root.host : null;
}

function scrollingElement(document: Document): Element {
  return document.scrollingElement ?? document.documentElement;
}

function isScrollable(value: string): boolean {
  return value === "auto" || value === "scroll" || value === "overlay";
}

function assertCanContinue(runtime: Runtime): void {
  if (!isTargetConnected(runtime.target.root)) {
    throw new ActivationStop("target-lost");
  }
  assertSignalAndDeadline(runtime.options.signal, runtime.deadline);
}

function assertSignalAndDeadline(
  signal: AbortSignal | undefined,
  deadline: number
): void {
  if (signal?.aborted) {
    throw new ActivationStop("canceled");
  }
  if (Date.now() >= deadline) {
    throw new ActivationStop("timed-out");
  }
}

function applyRunError(run: MutableRun, error: unknown): void {
  if (error instanceof ActivationStop) {
    run.status = error.status;
    return;
  }
  run.errors.add("activation-failed");
  run.status = "budget-exhausted";
}

function preservesPrimaryStatus(status: ActivationStatus): boolean {
  return (
    status === "canceled" ||
    status === "timed-out" ||
    status === "target-lost" ||
    status === "budget-exhausted"
  );
}

function createResult(
  run: MutableRun,
  mode: LazyActivationMode,
  scope: ActivationScope,
  restored: boolean,
  startedAt: number
): LazyActivationResult {
  return {
    inventory: run.inventory,
    diagnostics: {
      mode,
      scope,
      status: mode === "off" ? "off" : run.status,
      passes: run.passes,
      scrollSteps: run.scrollSteps,
      containersVisited: run.visited.size,
      discoveredNodes: run.discoveredNodes,
      discoveredResources: run.discoveredSources.size,
      elapsedMs: Date.now() - startedAt,
      restored,
      resourceSetChanged: run.resourceSetChanged,
      errors: [...run.errors],
    },
  };
}

function positiveInteger(value: number | undefined, fallback: number): number {
  return value === undefined || !Number.isFinite(value)
    ? fallback
    : Math.max(1, Math.round(value));
}

function nonNegative(value: number | undefined, fallback: number): number {
  return value === undefined || !Number.isFinite(value)
    ? fallback
    : Math.max(0, Math.round(value));
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
