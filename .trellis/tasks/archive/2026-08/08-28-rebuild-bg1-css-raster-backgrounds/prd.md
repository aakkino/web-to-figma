# Rebuild BG1 CSS raster backgrounds

## Goal

Rebuild the BG1 capability on the stabilized baseline so CSS raster background
layers that already exist in computed style are discovered before conversion,
prepared through the bounded image pipeline, and emitted as Figma IMAGE paints
or explicit raster/unsupported diagnostics instead of disappearing silently.

## Background

The authoritative assessment classifies BG1 rows S42-S44 as a selective
candidate, not as permission to apply their commits. The user authorized BG1
for planning after FD1 completed; implementation remains separately gated.

Read-only inspection pins the planning target to
`main@dd91f18346d7326ab71c1a77769bfe7aed310af3`. That target supports gradients,
ordinary `<img>` staging, adapter-owned preparation, and image presentation,
but has no CSS raster-background parser/rasterizer or background resource
inventory. The dirty root checkout is
`sync/upstream-20260726@906b205ef05917749b3d0982ca6dd11ff1b35866`
and is evidence only, never an execution target.

Historical evidence commits:

- S42 `d663c6bee734382c75062ec4067e809b92345f12` - implementation evidence;
- S43 `75f9bc0b122e0a55318b8b26ab6b883e11c02597` - capability-registry evidence;
- S44 `9fb02ea5532b66fbe815cecc5cd03116197121c0` - staging-contract evidence.

## Requirements

- Rebuild BG1 with new patch identity from an isolated branch/worktree based on
  the approved `main` SHA; literal cherry-picks and whole-branch operations are
  prohibited.
- Inventory computed CSS `background-image` raster sources, including resolved
  `url()` and static `image-set()` candidates, without fetching or mutating the
  page during analysis.
- Canonicalize sources against the owning document, retain owner/layer usage,
  deduplicate preparation by source, and stage every planned source before
  fonts and conversion using existing budget, cancellation, failure, and
  placeholder behavior.
- Preserve CSS layer order and the current solid/gradient behavior. Expressible
  URL layers should remain editable IMAGE paints; geometry or composition that
  Figma cannot express must use bounded capture-state rasterization or produce
  an explicit unsupported diagnostic.
- Cover size, position, repeat, origin/clip, attachment, blend, and layer-box
  decisions without silently treating an unsupported background as success.
- Route background bytes through the existing image loader, normalization,
  hashing, intrinsic-dimension, blob-registration, and prepared-only contracts.
  Conversion must never start an unplanned network request.
- Keep adapter scheduling/policy/diagnostics outside the published converter.
  Do not reintroduce the retired fork-only preparation API or expose adapter
  budgets and placeholder reasons through core configuration.
- Preserve ordinary `<img>` behavior, object-fit/object-position, gradients,
  composed traversal, cancellation, placeholders, target fingerprints, private
  package names/registry policy, and release workflow.
- A supported core capability may be negotiated structurally. With a core that
  lacks it, ordinary images must still convert and CSS raster backgrounds must
  produce an explicit unsupported-capability result rather than disappear.
- Add a changeset and update the governed core-delta registry/spec only if the
  rebuilt published behavior requires them. Review exact paths and
  fingerprints; never refresh them blindly.
- Keep BG2 deferred. BG1 must not resolve `data-bgset`, arbitrary lazy `data-*`
  attributes, or sources that are not present in computed CSS.

## Acceptance Criteria

- [ ] Single and multilayer computed CSS raster backgrounds enter inventory and
      staging without analysis-time fetches or DOM mutation.
- [ ] A staged background produces a decoded payload IMAGE paint with a real
      blob, correct paint order, and verifiable size/position geometry.
- [ ] Duplicate sources prepare once while retaining distinct owner/layer
      geometry and usage diagnostics.
- [ ] Repeat/tile, origin/clip, attachment, blend, `image-set()`, and unsupported
      image-function fixtures select native, raster-fallback, or explicit
      unsupported behavior without silent omission.
- [ ] Raster/failure/unsupported diagnostics distinguish the outcome and do not
      expose raw source URLs in user-facing or persisted diagnostic summaries.
- [ ] Existing gradient, ordinary `<img>`, object-fit/object-position,
      cancellation, placeholder, composed traversal, and revalidation tests
      remain green.
- [ ] A stable core without BG1 preserves ordinary image conversion and reports
      CSS background capability absence explicitly.
- [ ] Core and adapter unit/browser suites, type checks, builds, extension
      tests/builds, compatibility gates, and `git diff --check` pass.
- [ ] Oracle parity covers the background scene without tolerance or baseline
      relaxation solely to make BG1 pass.
- [ ] The final diff contains no BG2/LA/CP behavior, package-name/registry
      migration, lockfile replay, unrelated formatting, or dirty-root content.
- [ ] Root branch/HEAD, index/staged state, tracked dirty-file hashes, and prior
      worktree occupancy match their pre-execution snapshot.

## Out Of Scope

- BG2 lazy background sources, including `data-bgset` and framework-specific
  background attributes.
- Lazy activation, scrolling, waiting for runtime mutation, site scripts, or
  site-specific selectors; those belong to BG2/LA1/LA2 as applicable.
- CP1/CP2 capture artifacts or persistence and any FD1 follow-up.
- New image proxy/security permissions, storage, messaging, extension UI, or
  clipboard artifact changes.
- Package renames, registry migration, release-workflow changes, lockfile
  replay, whole-branch integration, or literal application of S42-S44.

## Key Decisions

- Planning and implementation authorization cover BG1 only; BG2 and every
  other cohort remain separately gated.
- BG1 is limited to sources already materialized in computed CSS. The later
  `data-bgset` lazy-background mechanism in S46-S47 remains BG2.
- Native IMAGE/gradient paints are preferred for editability; bounded static
  rasterization is the fallback for capture-state geometry that Figma cannot
  represent, with explicit diagnostics for unsupported dynamic functions.
- The approved planning target is
  `main@dd91f18346d7326ab71c1a77769bfe7aed310af3`, subject to an exact drift
  check immediately before any execution setup.
