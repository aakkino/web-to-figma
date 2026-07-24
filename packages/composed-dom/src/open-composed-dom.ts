import type { DomTreeChild, DomTreeStrategy } from "./types";
import { walkTree } from "./walk";

const ELEMENT_NODE = 1;
const SLOT_NAME = "slot";

function children(parent: Element): ReadonlyArray<DomTreeChild> {
  const shadowRoot = parent.shadowRoot;
  const source = shadowRoot
    ? Array.from(shadowRoot.childNodes, (node) => ({
        node,
        composedParent: parent,
      }))
    : Array.from(parent.childNodes, (node) => ({
        node,
        composedParent: parent,
      }));

  const expanded: Array<DomTreeChild> = [];
  const seenNodes = new Set<Node>();
  const activeSlots = new Set<Node>();
  for (const entry of source) {
    expand(entry, expanded, seenNodes, activeSlots);
  }
  return expanded;
}

function expand(
  entry: DomTreeChild,
  output: Array<DomTreeChild>,
  seenNodes: Set<Node>,
  activeSlots: Set<Node>
): void {
  if (!isSlot(entry.node)) {
    if (!seenNodes.has(entry.node)) {
      seenNodes.add(entry.node);
      output.push(entry);
    }
    return;
  }

  if (activeSlots.has(entry.node)) {
    return;
  }
  activeSlots.add(entry.node);

  const slot = entry.node as HTMLSlotElement;
  const assigned = readAssignedNodes(slot);
  const nodes = assigned.length > 0 ? assigned : Array.from(slot.childNodes);
  const composedParent = slot.parentElement ?? entry.composedParent;
  for (const node of nodes) {
    expand({ node, composedParent }, output, seenNodes, activeSlots);
  }

  activeSlots.delete(entry.node);
}

function readAssignedNodes(slot: HTMLSlotElement): Array<Node> {
  if (typeof slot.assignedNodes !== "function") {
    return [];
  }
  try {
    return Array.from(slot.assignedNodes({ flatten: true }));
  } catch {
    return [];
  }
}

function isSlot(node: Node): boolean {
  return (
    node.nodeType === ELEMENT_NODE &&
    (node as Element).localName.toLowerCase() === SLOT_NAME
  );
}

export const openComposedDomTree: DomTreeStrategy = {
  children,
  walk(root) {
    return walkTree(root, children);
  },
};
