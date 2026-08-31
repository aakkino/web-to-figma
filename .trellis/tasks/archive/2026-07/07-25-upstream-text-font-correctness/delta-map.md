# Text And Font Delta Map

## Reviewed Baseline

- Stable and local `upstream/main`: `0bf06ecce52aabc2bc696980b83040860630e35f`
- Glyph-aware source: `ea9956ae79fc3c1876b4f0eae95910b8ffcf1f9e`
- Single-line source: `ab0f56ea49ac34389cb7bc33a4987ac1a8d0b9e5`

The source commits are already reachable from fork `main`. The fork history is
not rewritten; upstream candidates must be extracted by capability and applied
to the selected upstream baseline.

## Candidate A: Glyph-Aware Font Contract

Runtime scope:

- `packages/dom-to-figma/src/converter/font-cache.ts`
- `packages/dom-to-figma/src/converter/nodes/text/converter.ts`
- `packages/dom-to-figma/src/converter/nodes/text/primitives/font/loader.ts`

Evidence scope:

- `packages/dom-to-figma/src/converter/font-cache.test.ts`
- `packages/dom-to-figma/src/converter/nodes/text/primitives/font/loader.test.ts`
- `packages/dom-to-figma/src/figma.text.browser.test.ts`
- `packages/dom-to-figma/README.md`
- `.changeset/fixed-font-fallback-payload.md`

This unit adds optional sorted, unique `codePoints` to `FontProperties`, makes
glyph demand part of the cache identity, and emits the family, weight, italic
state, style, and PostScript metadata for the bytes actually returned. The
converter owns code-point collection; catalog lookup, glyph-coverage policy,
fallback ordering, diagnostics, and network behavior remain consumer-owned.

## Candidate B: Browser-Enforced Single-Line Sizing

Runtime scope:

- `packages/dom-to-figma/src/converter/convert.ts`
- `packages/dom-to-figma/src/converter/nodes/text/converter.ts`

Evidence scope:

- `packages/dom-to-figma/src/figma.text.browser.test.ts`
- `packages/dom-to-figma/scripts/oracle-scenes/txt/txt-01-single-line-button.html`
- `.changeset/single-line-text-auto-resize.md`

This unit emits `WIDTH_AND_HEIGHT` only for one rendered line under `pre` or
`nowrap`, without explicit line separators or ellipsis. Eligible children of
inferred Auto Layout also emit `stackChildAlignSelf: "AUTO"`. Range and style
reads use the node's owner document and window.

## Fork-Only Integration

`internal/browser-capture-adapter/src/font-resolver.ts`, its font inventory,
bundled/page/catalog selection, CJK policy, transport, and diagnostics are not
part of Candidate A. They consume the optional contract and demonstrate that a
consumer can use it for glyph-aware resolution. Extension content scripts and
capture workflow changes are also excluded.

## Shared-File Extraction

`converter/nodes/text/converter.ts` also contains composed traversal and other
rendering fixes. Candidate extraction must select only font-contract or
single-line hunks. Candidate A and Candidate B remain separate commits and
separate PRs even though they share that file.
