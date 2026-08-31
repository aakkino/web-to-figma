# 实施计划

## Phase 1: Contracts And Pure Parsing

- [x] Add `backgroundSources` inventory and conversion-context types.
- [x] Extract a pure lazy background candidate parser for `data-bgset`, including
  the `-xs-` site encoding, width/DPR selection, base URL resolution, and scheme
  rejection.
- [x] Add unit/browser fixtures for ordinary URL, responsive candidates,
  malformed values, placeholder source, and duplicate owners.

## Phase 2: Core Resolver Seam

- [x] Add the generic `backgroundImageResolver` core config callback.
- [x] Thread the callback through walk/frame conversion and use it only when
  computed background-image is `none`.
- [x] Add browser tests proving lazy background conversion emits an IMAGE paint
  without mutating the DOM; retain existing background tests.

## Phase 3: Adapter Staging And Bridge

- [x] Inventory `data-bgset` on any Element and bind it to a background usage.
- [x] Stage every selected source before fonts/conversion and expose owner/source
  context to the bridge.
- [x] Clear the context after conversion and preserve stable-core behavior.
- [x] Add capture-engine and bridge tests for ordering, deduplication,
  unsupported capability, failure, and stale context isolation.

## Phase 4: Extension Regression And Quality

- [x] Add an eyeondesign-shaped fixture with offscreen `a.grid-item-block.lazyload`
  nodes and a 200x136 data placeholder.
- [x] Run extension tests, type checks, builds, and Chrome/Firefox packaging.
- [x] Run core/adapter gates, `git diff --check`, `pnpm upstream-core-delta:check`,
  and `pnpm oracle:parity` if core rendering paths change.

## Risky Files

- `internal/browser-capture-adapter/src/resource-inventory.ts`
- `internal/browser-capture-adapter/src/capture-engine.ts`
- `internal/browser-capture-adapter/src/bridges/dom-to-figma.ts`
- `internal/browser-capture-adapter/src/types.ts`
- `packages/dom-to-figma/src/figma.ts`
- `packages/dom-to-figma/src/converter/convert.ts`
- `packages/dom-to-figma/src/converter/nodes/frame/converter.ts`
- `packages/dom-to-figma/src/converter/styles/background-paints.ts`

## Validation Commands

```powershell
pnpm --filter @figit/dom-to-figma test
pnpm --filter @figit/dom-to-figma check-types
pnpm --filter @figit/browser-capture-adapter test
pnpm --filter @figit/browser-capture-adapter check-types
pnpm --filter extension test
pnpm --filter extension check-types
pnpm --filter extension build
pnpm --filter extension build:firefox
pnpm test:upstream-core-delta
pnpm upstream-core-delta:check
pnpm oracle:parity
git diff --check
```
