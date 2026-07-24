import type { DomTreeChild, DomTreeStrategy } from "./types";
import { walkTree } from "./walk";

function children(parent: Element): ReadonlyArray<DomTreeChild> {
  return Array.from(parent.childNodes, (node) => ({
    node,
    composedParent: parent,
  }));
}

export const lightDomTree: DomTreeStrategy = {
  children,
  walk(root) {
    return walkTree(root, children);
  },
};
