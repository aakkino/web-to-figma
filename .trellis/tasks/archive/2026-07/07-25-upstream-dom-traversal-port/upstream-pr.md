# Upstream PR Draft: Injectable DOM Traversal Strategy

## Proposed Commit

`feat(converter): add an injectable DOM traversal strategy`

This is the primary upstream candidate. The open composed-tree helper is a
separate optional contribution and is not a runtime dependency of this commit.

## PR Title

Add an injectable DOM traversal strategy to the converter

## PR Body

### Problem

The converter currently reads the light DOM directly in its walker and layout
paths. Consumers that need another rendered tree, such as open Shadow DOM with
slot projection, cannot supply it consistently. Replacing only the walker is
insufficient because classification, relative geometry, form frames, and
auto-layout inference can then reason about different parent/child trees.

### Change

Add an optional structural `domTraversal` configuration with one operation:

```ts
type DomTraversalChild = {
  readonly node: Node;
  readonly composedParent: Element;
};

type DomTraversalStrategy = {
  readonly children: (
    parent: Element
  ) => ReadonlyArray<DomTraversalChild>;
};
```

The converter resolves the option once and threads the same object through
walking, conservative classification, node conversion, parent-relative
geometry, form conversion, and auto-layout inference. A conversion-wide seen
set prevents a projected node from being emitted twice.

### Compatibility

Omitting the option selects an internal light-DOM strategy that snapshots
`parent.childNodes` in order. Existing callers, snapshots, and package
dependencies are unchanged. The core package does not import or depend on the
open composed-tree helper.

The contract is structural, so consumers may supply their own implementation.
The fork's adapter uses `@figit/composed-dom`, but that package is not required
for this PR.

### Test Evidence

- A fake injected strategy proves classification, composed-parent positioning,
  custom-classifier compatibility, plain-text selection, and duplicate
  suppression without importing the helper package.
- Browser integration proves open shadow roots, assigned slot content,
  composed-parent text styling, and auto-layout/walker agreement.
- Helper browser tests cover named/default/fallback/nested slots, duplicate
  assignments, recursive projections, iframe realms, and closed roots.
- The unchanged default path is covered by the complete core suite and oracle
  parity gate.

### Review Notes

- Closed roots remain inaccessible; the strategy does not guess their content.
- Mutation observation, iframe access policy, and visibility filtering stay
  consumer-owned.
- The API intentionally exposes child relationships only. A helper may add a
  `walk()` convenience method without expanding the core contract.

## Local Extraction Order

1. Apply only Candidate A traversal hunks from `delta-map.md` to the selected
   upstream baseline.
2. Run the focused core browser tests and the complete upstream suite.
3. Commit Candidate A with the proposed commit subject.
4. Keep Candidate B and adapter integration in separate commits/PRs.

No branch was pushed and no remote PR was created.
