# Implementation Plan: CSS Background And Lazy Image Extraction

## Execution Mode

This remains one cross-layer Trellis task because inventory, staging, core
conversion, and payload verification share one source identity contract. The
work is executed as ordered phases and atomic commits, not as independent
child tasks. Each phase has an explicit dependency and verification gate.

The user reviewed and approved `prd.md`, `design.md`, and this file. The task
was started before implementation and is now in the completion/verification
phase.

## Preconditions

- Read the scoped `dom-to-figma` specs and the archived eyeondesign diagnosis.
- Preserve unrelated dirty files in the worktree.
- Confirm the reviewed refs in `docs/upstream-core-delta.json` before changing
  core runtime files.
- Decide the core runtime budget before adding a new module. The current
  `upstream/main` report has 14 runtime delta files against a limit of 15; a
  larger implementation must update the registry budget deliberately.
- Keep the existing `ImagePreparationPort`, scheduler ownership, placeholder
  reasons, and `unplanned-late` protection intact.

## Phase 0: Contract And Governance Setup

### Work

1. Review the exact current-vs-upstream file set with:
   `pnpm upstream-core-delta:main -- --report .tmp/background-before.json`.
2. Define the new capability entry in `docs/upstream-core-delta.json` after
   the first reviewed core diff. Use exact paths, focused tests, owner,
   review date, `removeWhen`, and a generated patch fingerprint.
3. Decide whether the implementation fits the one remaining runtime slot. If
   not, record the intentional budget/milestone change before source edits.
4. Add no broad directory globs and do not refresh fingerprints before the
   implementation diff is reviewed.

### Gate

- Registry schema and `pnpm upstream-core-delta:check` pass for the planned
  capability shape.
- The planned core paths do not include an unreviewed modification to an
  `absorbedUpstreamPaths` file.

## Phase 1: Pure Background Model And Fixtures

### Core files

- Add the background-domain style module beside `converter/styles/` parsers.
- Extend only the narrow internal/public types needed for
  `BackgroundLayer`, `BackgroundSnapshot`, source selection, and support
  classification.
- Reuse existing gradient and color parsers; do not copy their algorithms.

### Behavior

- Implement top-level CSS layer tokenization that respects strings and nested
  functions.
- Resolve `url()` and `image-set()` candidates against the owner document.
- Parse size, position, repeat, origin, clip, attachment, and blend lists with
  CSS list repetition rules.
- Classify each layer as native, canvas-fallback, or unsupported.
- Preserve CSS source order and create a revision-safe serializable snapshot.

### Tests

- Add pure tests for commas inside gradients/URLs, quoted URLs, base URI
  resolution, malformed functions, image-set DPR selection, list repetition,
  and diagnostic reasons.
- Add fixtures for single/multiple layers, sprite crops, repeat-x/y, round,
  space, origin/clip, fixed/local attachment, and blend lists.

### Gate

```text
pnpm --filter @figit/dom-to-figma test -- src/converter/styles/background.test.ts
pnpm --filter @figit/dom-to-figma check-types
```

## Phase 2: Core Image Source And Frame Integration

### Core files

- `packages/dom-to-figma/src/figma.ts`
- `packages/dom-to-figma/src/converter/convert.ts`
- `packages/dom-to-figma/src/converter/nodes/frame/converter.ts`
- `packages/dom-to-figma/src/converter/image-cache.ts`
- `packages/dom-to-figma/src/converter/nodes/image/loader.ts`
- the Phase 1 background module and focused core tests

### Behavior

1. Add a generic `imageSourceResolver(element)` option. Default resolution is
   unchanged: `currentSrc || src`.
2. Add a source-keyed image cache for background requests while preserving the
   existing element-keyed cache behavior for `<img>`.
3. Keep `ImageRequest.element` available for existing loaders. Background
   requests use detached owners and explicit canonical `src`.
4. Make the frame conversion path await background image preparation through
   the existing async `convertElement`/walker boundary.
5. Emit background color first, then ordered native background layers. Reuse
   `registerBlob`, `processImageFile`, and existing IMAGE paint fields.
6. Preserve ordinary image fit, position, intrinsic dimensions, deduplication,
   and cancellation tests.

### Gate

```text
pnpm --filter @figit/dom-to-figma test
pnpm --filter @figit/dom-to-figma check-types
pnpm --filter @figit/dom-to-figma build
```

The new core converter must convert a direct DOM fixture with a CSS URL using
only a supplied `ImageLoader`; no adapter import or workspace-only source is
allowed.

## Phase 3: Adapter Inventory, Lazy Resolution, And Staging

### Adapter files

- `internal/browser-capture-adapter/src/types.ts`
- `internal/browser-capture-adapter/src/resource-inventory.ts`
- `internal/browser-capture-adapter/src/image-scheduler.ts`
- `internal/browser-capture-adapter/src/capture-engine.ts`
- `internal/browser-capture-adapter/src/bridges/dom-to-figma.ts`
- `internal/browser-capture-adapter/src/capture-adapter.ts` and `index.ts` if
  the optional rasterizer/capability port is public
- a focused lazy-source helper if the source policy cannot stay local to the
  inventory module

### Behavior

1. Preserve active `<img>` counts and add resource kind/usages for lazy and
   CSS background sources.
2. Extract background transport URLs without fetching. The adapter does not
   own Figma geometry; it records owner/layer usage and canonical sources.
3. Create detached image owners for background resources without assigning
   `src` or inserting them into the page.
4. Resolve the explicit lazy allowlist in the order defined by `design.md`.
   Freeze the selected source in a session-local weak map before staging.
5. Stage each canonical source once through the existing scheduler and bridge
   preparation port. All failures, budgets, cancels, retries, and placeholders
   keep their existing semantics.
6. Include background/lazy source descriptors in plan revision/revalidation and
   expose counts without changing the meaning of existing active-image fields.

### Tests

- Inventory browser tests assert zero fetches during analysis.
- Active, data-only, data-placeholder, malformed, and competing lazy
  candidates assert source precedence and diagnostics.
- Background URL, image-set, duplicate-source, shadow DOM, and multiple-owner
  tests assert resource identity and usage geometry.
- Scheduler/capture tests assert all background sources finish before fonts and
  conversion, including skip, retry, budget, cancel, clear-generation, and
  late-source cases.

### Gate

```text
pnpm --filter @figit/browser-capture-adapter test
pnpm --filter @figit/browser-capture-adapter check-types
pnpm --filter @figit/browser-capture-adapter build
```

## Phase 4: Bridge Capability And Compatibility Shim

### Behavior

1. Add a versionless structural capability descriptor for CSS backgrounds and
   image source resolution to the core bridge shape.
2. Pass the frozen source resolver and generic background rasterizer port only
   when the installed core exposes the new capability.
3. Keep the adapter fallback for stable vanilla cores. It must continue to
   prepare ordinary images and must return explicit `unsupported-capability`
   diagnostics for CSS backgrounds.
4. Do not add `imagePreparation`, budget fields, or placeholder reasons to the
   core public config.
5. Keep the only upstream import in `bridges/dom-to-figma.ts` and preserve the
   import-boundary tests.

### Tests

- Bridge fixture with the new capability receives resolver/rasterizer options.
- Stable-core fixture ignores the optional capability but passes ordinary image
  conversion and reports background unsupported.
- Missing required base exports retain the existing stable error.
- A clean external consumer uses packed core and adapter artifacts without
  workspace source imports.

### Gate

```text
pnpm --filter @figit/browser-capture-adapter test -- src/bridges/dom-to-figma.test.ts
pnpm upstream-adapter:stable
```

## Phase 5: Canvas Fallback And Diagnostics

### Core/adapter work

- Implement the deterministic canvas renderer from `design.md` for prepared
  URL/gradient layers.
- Cover tile, round, space, one-axis repeat, clip/origin, scroll offsets,
  border radius, and supported blend modes.
- Convert fallback bytes through the normal format normalization, hashing, and
  blob registration path.
- Add the optional host rasterizer callback for dynamic CSS Paint and unknown
  runtime image functions.
- Emit structured background diagnostics for native, raster, unsupported,
  failed, and placeholder outcomes.

### Resource safety

- Enforce canvas width/height and total pixel guards before allocation.
- Use `AbortSignal` for image decoding and bitmap/canvas work.
- Revoke object URLs and close `ImageBitmap` instances in success, failure, and
  cancellation paths.
- Do not fetch from the rasterizer; all URL images come through the prepared
  loader.

### Tests

- Browser tests assert non-empty PNG blobs and deterministic hashes for a fixed
  snapshot.
- Pixel-oriented assertions verify layer order, blend, repeat, clip, and
  attachment state with small fixtures.
- Dynamic `paint()` tests assert host-rasterizer success and explicit
  unsupported diagnostics when no host is provided.
- Budget and canvas failure tests assert placeholder/recovery behavior.

### Gate

```text
pnpm --filter @figit/dom-to-figma test
pnpm --filter @figit/browser-capture-adapter test
pnpm --filter @figit/dom-to-figma check-types
pnpm --filter @figit/browser-capture-adapter check-types
```

## Phase 6: Page And Oracle Regression

### Fixtures

- Add a minimal `a.grid-item-block.lazyloaded` fixture with a CSS background
  URL and duplicate cards to reproduce eyeondesign's failure without
  hard-coding the site in runtime code.
- Add mixed native/fallback background scenes to the oracle corpus.
- Keep the archived eyeondesign JSON/screenshots as diagnosis evidence; add a
  live page regression only in the browser extraction harness.

### Assertions

- Main card background sources appear in the inventory and prepared-resource
  diagnostics.
- Final payload contains image blob data and IMAGE paint/fallback output for
  the cards.
- Existing gradients, ordinary `<img>`, object-fit/object-position, text
  backgrounds, layout, and placeholder behavior are unchanged.
- A second conversion/revalidation does not fetch an unplanned late source.

### Gate

```text
pnpm oracle:parity
pnpm --filter @figit/dom-to-figma test
pnpm --filter @figit/browser-capture-adapter test
```

Run the live eyeondesign extraction against the original diagnostic viewport
and compare resource counts, image payload presence, and zero network-stage
failures. Store only stable diagnostic artifacts required by the task; do not
commit downloaded site assets.

## Phase 7: Soft Fork Sync And Quality Review

### Sync review

1. Run `pnpm upstream-core-delta:main -- --report .tmp/background-after.json`.
2. Map every changed core runtime path to the new capability or an existing
   shared capability. Avoid broad path globs.
3. If an upstream update overlaps the background module, compare behavior and
   record partial overlap rather than deleting the local implementation.
4. Update fingerprints only after the diff and tests are reviewed.
5. Add the small, isolated Windows extraction fix for the
   `.claude/skills/opensrc` symlink in the upstream-main test harness. The fix
   must affect only temporary checkout creation and must not alter the packed
   core, adapter API, or runtime behavior.
6. Re-run stable and reviewed-main consumer checks through the repository
   commands. Do not mark the main consumer gate passed without an actual clean
   external consumer.

### Quality gate

```text
git diff --check
pnpm --filter @figit/dom-to-figma check-types
pnpm --filter @figit/browser-capture-adapter check-types
pnpm --filter @figit/dom-to-figma test
pnpm --filter @figit/browser-capture-adapter test
pnpm test:upstream-core-delta
pnpm upstream-core-delta:check
pnpm upstream-adapter:stable
pnpm upstream-adapter:main
pnpm oracle:parity
```

Repository-wide lint may surface the pre-existing broad formatting and
configuration findings documented in the prior diagnostic session. Package
lint output must still be reviewed for new findings in touched files.

## Atomic Commit Boundaries

Use Conventional Commits and keep these commits independently reviewable:

1. `feat(dom-to-figma): model css background layers`
2. `feat(browser-capture-adapter): stage background and lazy image sources`
3. `feat(dom-to-figma): rasterize unsupported background semantics`
4. `test(dom-to-figma): cover background and eyeondesign regression`
5. `test(upstream): make main consumer extraction Windows-safe`
6. `chore(upstream): register background capability delta`

Commit names are guidance, not a requirement to stop between phases. Do not
mix unrelated worktree changes or generated oracle baselines into these commits.

## Implementation Status

- Core background parsing, native paints, source-keyed image caching, and
  prepared-byte canvas fallback are implemented.
- Adapter inventory now covers active, allowlisted lazy, and CSS background
  sources without mutating the page or fetching during analysis.
- The bridge negotiates `cssBackgroundImages` capability and preserves stable
  core behavior with explicit unsupported diagnostics.
- The upstream-main Windows temporary-checkout fix is isolated to the
  compatibility harness, and the reviewed core delta is registered with an
  explicit budget and capability entry.
- Verification passed: core tests 225/225, adapter tests 56/56, both package
  type checks and builds, upstream delta tests 6/6, stable/main consumer
  checks, and oracle parity for 52 scenes.

## Definition Of Ready For Development

- [x] Root cause and source artifact are documented.
- [x] Soft-fork compatibility objective is defined.
- [x] Core/adapter ownership and old-core behavior are defined.
- [x] Lazy source precedence is selected.
- [x] Native/fallback semantics and dynamic Paint limitation are explicit.
- [x] Resource identity, staging order, cancellation, and revalidation are
  defined.
- [x] Test, oracle, live regression, compatibility, and governance gates are
  listed.
- [x] Windows upstream-main extraction is included as an isolated verification
  infrastructure commit; it does not expand the runtime feature scope.
- [x] User reviewed `prd.md`, `design.md`, and `implement.md`.
- [x] `task.py start` was run before implementation.
