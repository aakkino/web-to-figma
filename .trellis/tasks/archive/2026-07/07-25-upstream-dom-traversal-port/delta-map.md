# Composed DOM Delta Map

## Source Commit

`e8b46a486eef608a62c66ff8a6cef69e7536bc23` introduced three separable
capabilities. It must not be proposed upstream as one commit because the helper
package and private adapter are not required by the core hook.

## Candidate A: Core Traversal Hook

Runtime scope:

- `packages/dom-to-figma/src/converter/dom.ts`
- `packages/dom-to-figma/src/converter/walk.ts`
- `packages/dom-to-figma/src/converter/convert.ts`
- `packages/dom-to-figma/src/converter/layout/infer.ts`
- `packages/dom-to-figma/src/converter/nodes/frame/converter.ts`
- `packages/dom-to-figma/src/converter/nodes/form/converter.ts`
- `packages/dom-to-figma/src/converter/nodes/text/converter.ts`
- `packages/dom-to-figma/src/figma.ts`

Evidence scope:

- `packages/dom-to-figma/src/figma.dom-traversal.browser.test.ts`
- `packages/dom-to-figma/src/figma.shadow-dom.browser.test.ts`
- `packages/dom-to-figma/README.md`
- `.changeset/composed-dom-utility.md`

This unit owns the public structural strategy, the light-DOM default, one
strategy instance per converter, composed-parent geometry, classification
fallback, conversion-wide deduplication, and layout/walker agreement. It has no
runtime dependency on `@figit/composed-dom`.

## Candidate B: Open Composed Helper

Scope: `packages/composed-dom/**` plus its changeset entry. This unit owns open
shadow-root replacement, assigned/fallback/nested slot expansion, deterministic
order, duplicate suppression, recursion protection, cross-realm behavior, and
the reusable `walk()` API. It can remain fork-owned if upstream accepts only
Candidate A.

## Fork Integration: Adapter

Scope: `internal/browser-capture-adapter/**`. This is not part of the upstream
core proposal. It selects `openComposedDomTree` and shares that exact object
across inventory, settling, font discovery, line-break preparation, and the
converter bridge. `apps/extension` does not import core conversion source.

## Excluded Deltas

Responsive geometry, staged images, font fallback, image presentation, and
nowrap sizing share some files with Candidate A but are independently
registered capabilities. Candidate extraction must select traversal hunks, not
whole fork files. The fork `main` history is intentionally not rewritten.
