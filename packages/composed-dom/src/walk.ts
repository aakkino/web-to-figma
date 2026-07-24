import type { DomTreeChild, DomTreeVisit } from "./types";

const ELEMENT_NODE = 1;

export function walkTree(
  root: Element,
  getChildren: (parent: Element) => ReadonlyArray<DomTreeChild>
): Iterable<DomTreeVisit> {
  return (function* visit(): Generator<DomTreeVisit> {
    const seen = new Set<Node>([root]);

    function* descendants(
      parent: Element,
      depth: number
    ): Generator<DomTreeVisit> {
      for (const child of getChildren(parent)) {
        if (seen.has(child.node)) {
          continue;
        }
        seen.add(child.node);
        yield { ...child, depth };
        if (child.node.nodeType === ELEMENT_NODE) {
          yield* descendants(child.node as Element, depth + 1);
        }
      }
    }

    yield* descendants(root, 0);
  })();
}
