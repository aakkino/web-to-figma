# Design: Rebuild BG1 CSS raster backgrounds

## Boundary

BG1 spans the published converter's background-paint domain and the private
capture adapter's inventory/staging bridge. Expected product boundaries are:

- `packages/dom-to-figma/src/converter/styles/` for parsing, presentation
  classification, paint geometry, and bounded raster fallback;
- direct converter plumbing in `convert.ts`, `walk.ts`, frame/form converters,
  image caching, and intentional public types/exports only as required;
- `internal/browser-capture-adapter/src/` for computed-background inventory,
  source/usage records, staging order, bridge negotiation, and diagnostics;
- focused core/adapter browser tests, a published-package changeset, and
  registry/spec updates only when the final public delta requires them.

No extension product source, storage, messaging, package manifest, lockfile, or
release-workflow edit is authorized. An unexpected need outside this boundary
stops execution and returns the task to planning.

## Data Flow And Ownership

```text
computed style in the owner's browser realm
  -> adapter inventory (canonical source + owner/layer usage; no fetch)
  -> existing image scheduler (deduped prepared bytes or terminal placeholder)
  -> bridge-scoped frozen background source map + capability negotiation
  -> core background parser/presentation classifier
  -> native IMAGE/gradient paints or bounded raster fallback
  -> existing blob registration and Kiwi clipboard payload
  -> adapter diagnostics
```

The adapter owns source discovery, preparation policy, budgets, cancellation,
placeholder reasons, and session cleanup. Core owns CSS parsing, per-element
geometry, Figma paint selection, prepared image consumption, and blob output.
Neither layer may silently fetch after staging.

## Background Contract

- Parse comma-separated layers with quote/function awareness.
- Resolve computed `url()` and static `image-set()` sources against the owning
  document and retain their original layer index.
- Preserve CSS front-to-back semantics when producing the Figma paint list.
- Use native IMAGE paints only where Figma fields faithfully represent size,
  position, two-axis tiling, clipping, and blend behavior.
- Use a deterministic, pixel-budgeted canvas result for static one-axis repeat,
  spaced/rounded repeat, incompatible clip/origin, attachment, or composition.
- Dynamic `paint(...)` and unknown image functions require an injected host
  rasterizer; without one they remain explicit unsupported diagnostics.
- A raster fallback represents the captured state and is intentionally less
  editable. It must not claim to preserve future scroll or dynamic paint state.

## Compatibility

Capability detection is structural rather than based on a package version. The
base bridge continues to support `main`'s ordinary loader and adapter-owned
preparation fallback. A core without BG1 must retain `<img>` conversion and
return stable `unsupported-capability` diagnostics for computed raster
backgrounds.

The rebuild must preserve current private package identities, target
fingerprints, stable/main adapter compatibility, object-fit/object-position,
and the adapter-owned staging API. Historical S42 public shapes are proposals,
not contracts to copy.

## BG2 Separation

Inventory may only use computed CSS for BG1. It must not inspect or interpret
`data-bgset`, arbitrary lazy attributes, framework metadata, scroll activation,
or later mutations. Those sources remain absent until BG2 or LA cohorts are
separately approved and integrated.

## Target, Isolation, And Rollback

Execution may set up one isolated BG1 branch/worktree only after confirming
`main` still equals `dd91f18346d7326ab71c1a77769bfe7aed310af3` and snapshotting
the dirty root ref, HEAD, index/staged state, tracked dirty hashes, and current
worktree occupancy. The dirty sync checkout must never be cleaned, stashed,
normalized, transplanted, or used as the edit target.

BG1 is one independently reviewed commit/PR rollback unit. Target drift,
capability ambiguity, BG2 leakage, registry-budget expansion, or a required
layer outside the approved boundary stops the task and returns it to planning.
