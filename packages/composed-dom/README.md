# @figit/composed-dom

Small browser-only DOM tree strategies for consumers that need either the
ordinary light DOM or the visible tree formed by open Shadow DOM and slots.

```ts
import { openComposedDomTree } from "@figit/composed-dom";

for (const { node, composedParent, depth } of openComposedDomTree.walk(root)) {
  // `node` is a descendant in composed document order.
  // `composedParent` is the element that owns its visual coordinate space.
}
```

## Strategies

`lightDomTree` returns `parent.childNodes` in their exact light-DOM order.
`openComposedDomTree` replaces a host's light children with the children of its
open shadow root. A slot is replaced by `assignedNodes({ flatten: true })`, or
by its fallback children when nothing is assigned. Nodes are returned once even
when malformed content exposes the same node through more than one path.

`children(parent)` is a call-time snapshot. `walk(root)` yields descendants,
starting at depth `0`; the root itself is not yielded. Every visit includes the
flattened `composedParent`, which can differ from `node.parentElement` for
shadow-root and slotted nodes.

The package returns all node types, including comments and empty text. Filtering
for visibility, resources, or conversion is the consumer's responsibility.

## Limits and versioning

Only standard browser DOM APIs are used. Closed shadow roots are intentionally
opaque, cross-origin iframe contents cannot be inspected, and a walk is a
snapshot rather than a mutation observer. Use the strategy with the same
browser realm as the DOM being measured; the implementation does not use
main-window `instanceof` checks.

The package starts at `0.1.x` while slot ordering and `composedParent` semantics
are verified by multiple consumers. Changes to those semantics are major API
changes after `1.0.0`; browser compatibility fixes that preserve the contract
are patch changes.
