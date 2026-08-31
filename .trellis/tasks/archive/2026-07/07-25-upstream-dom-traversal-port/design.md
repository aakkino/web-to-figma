# Composed DOM 遍历端口设计

## Contribution Shape

Prepare two independently reviewable units:

1. A core strategy hook with a light-DOM default.
2. An open composed-tree implementation and its browser tests.

The first unit is the primary upstream target. It enables the fork-owned adapter to inject `openComposedDomTree` even if upstream does not adopt the helper package.

## Minimal Core Contract

The strategy exposes only the relationships the converter needs:

```ts
type DomTraversalChild = {
  readonly node: Node;
  readonly composedParent: Element;
};

type DomTraversalStrategy = {
  readonly children: (parent: Element) => ReadonlyArray<DomTraversalChild>;
  readonly walk: (root: Element) => Iterable<DomTraversalVisit>;
};
```

Names may follow upstream conventions, but the semantics must remain explicit. The light-DOM implementation is internal and is the default, preserving source compatibility for existing callers.

## Propagation Rule

Resolve the selected strategy once in `createFigmaConverter` and thread the same object through the entire conversion context. Every operation that determines child membership or parentage must use it:

- root and descendant walking;
- DOM child sorting and node classification;
- form-control child conversion;
- frame conversion and auto-layout inference;
- absolute/flow child partitioning.

Direct reads of `children`, `childNodes`, or `parentElement` in those paths require review because they can silently mix light and composed trees.

## Open Composed Semantics

- An open shadow root replaces the host's light children as the traversal source.
- A slot expands `assignedNodes({ flatten: true })`; when empty, it expands fallback children.
- Expanded nodes carry their rendered composed parent.
- A traversal-level seen set prevents duplicates.
- An active-slot set prevents recursive projection loops.
- Closed shadow roots remain opaque because browser APIs do not expose them.

## Test Design

Core tests should use a small injected fake strategy to prove the hook without depending on another package. Browser tests for `@figit/composed-dom` cover actual slot APIs. Integration tests inject the package strategy into the converter and assert output structure, order, auto-layout membership, and absence of duplicate nodes.

## Upstream Review Strategy

Keep the core commit limited to types, default implementation, context plumbing, tests, and public documentation. Avoid bundling unrelated responsive or auto-layout behavior. Draft a second contribution for the helper only if upstream maintainers want an official composed-tree utility.
