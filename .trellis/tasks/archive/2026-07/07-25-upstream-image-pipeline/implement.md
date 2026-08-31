# 图片管线与表现语义实施计划

## Dependencies

- Blocking for all edits: `07-25-upstream-core-delta-governance`.
- Blocking for staged API removal: `07-25-vanilla-upstream-adapter-fallback`.

## Step 1: Inventory Image Deltas

- [x] Map commits `4da4c51` and `0149d62` to preparation, loader, cache, presentation, and integration-test paths.
- [x] Classify each hunk as generic correctness or adapter/product policy.
- [x] Record independent registry entries and removal conditions.

## Step 2: Isolate Presentation Correctness

- [x] Reduce the presentation change to a pure, upstream-shaped unit.
- [x] Expand table-driven tests for fit, position, ratios, and invalid dimensions.
- [x] Add browser-level assertions for emitted Figma scale modes and transforms.
- [x] Prepare a standalone commit and upstream PR draft.

## Step 3: Move Product Preparation Outward

- [x] Wait for adapter fallback acceptance.
- [x] Route scheduler preparation, placeholder decisions, and cancellation through adapter-owned state.
- [x] Prove conversion consumes only the terminal prepared decision for planned resources.
- [x] Remove or minimize core `ImagePreparation` without changing the adapter public contract.

## Step 4: Split Remaining Generic Loader Fixes

- [x] Identify format processing or cache fixes required independently of staging.
- [x] Give each fix a minimal reproduction and focused tests.
- [x] Keep product budgets, concurrency constants, and diagnostics out of upstream commits.

## Step 5: Verify And Prepare Handoff

- [x] Run converter image unit/browser tests, adapter scheduler/capture tests, extension integration, and oracle parity.
- [x] Test both fork-native and vanilla-stable adapter strategies during migration.
- [x] Produce separate PR drafts for presentation and any generic loader/hook change.
- [x] Stop before remote push or PR submission pending explicit approval.

## Exit Condition

Generic image correctness is upstream-ready, product staging belongs to the adapter, and any remaining core image delta is minimal, optional, registered, and backed by an explicit upstream need.
