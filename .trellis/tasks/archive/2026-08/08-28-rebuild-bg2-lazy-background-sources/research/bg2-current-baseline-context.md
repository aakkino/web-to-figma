# BG2 Current-Baseline Planning Context

## Decision Snapshot

- Planning authorized by the user on 2026-08-28 after BG1 completion.
- Planning target: `origin/main@98c10d5fd0ad8b7c97f8b5bb397fa19d24852313`.
- BG1 reviewed head:
  `92c8452f02da3fa5c304e81d89c3c9905ba453d5`.
- Read-only `merge-base --is-ancestor` check: BG1 reviewed head is contained
  by the planning target.
- BG1 PR/merge: PR #14, merge commit `98c10d5f`.
- Historical BG2 evidence: S46
  `be47e62774179f582cffedbbfc6dd5198e293546` and S47
  `9df8d0b8c387471c83fadb72c7f195e5b7d5ac17`.
- Strategy: rebuild against refreshed current baseline with new patch identity;
  never cherry-pick or transplant the historical task.
- Delivery correction: BG1's separate promotion child repaired an omitted
  remote-delivery boundary. It is not a requirement to split later cohorts.
  BG2 owns local implementation through PR merge and target-line containment in
  one task, with distinct execution-time push, PR, and merge authorization
  gates.

## Current Target Findings

Read-only Git-object inspection of `origin/main` found:

- BG1 computed CSS background discovery and resource inventory are present.
- `CaptureResourceKind` already includes `background-image`; canonical sources
  and usages flow through one image scheduler before conversion.
- The bridge already exposes prepared-only image loading, frozen ordinary image
  sources, BG1 capability checks, background diagnostics, cancellation, and
  cleanup.
- Core already owns background snapshots, native IMAGE paints, raster fallback,
  structured diagnostics, and optional `imageSourceResolver` /
  `backgroundRasterizer` seams.
- `data-bgset`, `backgroundSources`, and
  `internal/browser-capture-adapter/src/lazy-background.ts` are absent from the
  target. BG2 has therefore not already landed through BG1.
- The smallest missing core seam is a generic optional resolver used only when
  computed `background-image` is empty/`none`; the historical S47 design is
  evidence for this shape, not code to copy blindly.

## Historical Behavior Worth Preserving

The archived July task and S47 provide evidence for:

- explicit `data-bgset` allowlisting;
- plain URL/srcset-like candidates, `-xs-` handling, width/DPR selection,
  base-URL resolution, and scheme rejection;
- no-fetch/no-mutation analysis;
- canonical URL deduplication and preparation before conversion;
- capture-local owner/source context and `finally` cleanup;
- computed CSS precedence;
- an offscreen eyeondesign-shaped regression fixture;
- failure, placeholder, unsupported, and stale-context tests.

These requirements must be reconciled with the current BG1 implementation,
current package names (`@aakkino/*` public packages and private
`@figit/browser-capture-adapter`), current private release policy, and current
compatibility registry.

## Scope And Preservation

Expected source boundaries are:

- `internal/browser-capture-adapter/src/` for parsing, inventory, context,
  bridge, diagnostics, and tests;
- only the required background resolver/threading paths under
  `packages/dom-to-figma/src/`;
- at most a direct regression fixture under
  `apps/extension/entrypoints/content/`;
- a changeset, staged-resource contract, and governed core delta update only if
  the public core changes.

Excluded: LA activation/scrolling, CP artifact/persistence, arbitrary metadata,
extension permissions/messaging/storage/UI, manifests, lockfile, release
workflow, package migration, and whole-history operations.

The root worktree is dirty on `sync/upstream-20260726`; its state and all linked
worktrees are unrelated protected context. Product work and remote promotion
must use a new isolated worktree from refreshed `origin/main` after
implementation approval. Completion requires a reviewed source-branch push,
one PR to `main`, required CI/review, an explicitly authorized merge commit,
refreshed `origin/main` containment, and reconciliation of both governance
parents.
