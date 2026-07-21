# Clipboard And Tree

## Clipboard HTML

`composeClipboardHtml` stores Figma comment markers inside `data-metadata` and
`data-buffer` attributes. This is intentional: Safari/WebKit sanitizes
top-level HTML comments during clipboard writes.

`parseClipboardHtml` accepts both raw and entity-encoded marker delimiters
because clipboard serializers normalize attribute values differently. Preserve
that compatibility when changing the envelope:

- a missing Figma payload marker throws with a bounded input sample;
- malformed optional metadata degrades to `meta: null`;
- the payload bytes remain mandatory;
- `composeClipboardHtml` itself has no DOM dependency;
- `toClipboardItem` is the browser-only wrapper.

Do not move the markers back to top-level comments or parse the envelope with a
DOM-only API that would remove Node/script portability.

## Node Tree Ordering

Decoded node ids are not stable across a Figma paste. `treeOrder` reconstructs
trees from `parentIndex` and sorts sibling `position` strings
lexicographically, matching Figma fractional indexing. It excludes DOCUMENT
and CANVAS nodes from each walked frame and returns one depth-first list per
canvas-level frame.

Pair top-level sent/copy-back frames by name and descendants by tree order.
Do not pair copy-back nodes by GUID.

## Structural Diff

`diffFigmaTrees` compares the sent tree with Figma's copied-back tree:

- normalize omitted `stack*` fields through `STACK_FIELD_DEFAULTS`;
- use the shared `TRACKED_STACK_FIELDS` set;
- apply 0.11 numeric and 0.55 geometry tolerances already established by
  paste round-trips;
- accept size changes explained by verified fill/stretch behavior;
- ignore the pasted root transform because its canvas location is arbitrary.

These rules are consumed by both package scripts and
`internal/oracle-harness/src/tier1.ts`. Search all consumers before changing a
default, tracked field, tolerance, or mismatch label.

Reference files:

- `packages/fig-kiwi/src/clipboard.ts`
- `packages/fig-kiwi/src/tree.ts`
- `packages/fig-kiwi/src/diff.ts`
- `packages/fig-kiwi/src/stack-fields.ts`

