# Implementation Plan: Rebuild BG1 CSS raster backgrounds

1. Reconfirm `main` resolves to
   `dd91f18346d7326ab71c1a77769bfe7aed310af3`; stop on drift.
2. Snapshot the dirty root branch/HEAD, index and staged state, hashes of every
   tracked dirty file, and all existing worktree paths.
3. Create one isolated BG1 branch/worktree from the approved target SHA only
   after implementation authorization.
4. Reinspect the target's gradient/frame conversion, image cache, adapter
   inventory/scheduler/bridge, capability registry, and current tests before
   choosing exact files.
5. Add focused failing tests for computed URL/image-set discovery, no-fetch
   analysis, source deduplication, paint order/geometry, fallback/unsupported
   behavior, and the stable-core compatibility path.
6. Implement the smallest core background model and paint/raster path that
   satisfies those fixtures while reusing the existing image-processing and
   blob-registration pipeline.
7. Extend adapter inventory and bridge context only for computed CSS sources;
   stage them through the existing scheduler before fonts/conversion and keep
   BG2 lazy attributes absent.
8. Add explicit diagnostics and structural capability negotiation without
   exposing adapter policy through the public core configuration.
9. Add or update a changeset, exact core-delta registry row/fingerprints, and
   the owning staged-resource spec only if required by the final public delta.
10. Review the diff against the BG1 boundary. Reject extension product edits,
    BG2/LA/CP logic, lockfiles, manifests/package identities, release workflow,
    broad formatting, and historical task/bookkeeping replay.
11. Run focused and package validation, then compatibility and oracle gates.
    Do not weaken tests, fingerprints, tolerances, or baselines to obtain green.
12. Commit/check BG1 as one rollback unit and compare preservation snapshots
    before reconciling B or considering BG2 planning.

## Validation Commands

```powershell
pnpm exec biome check <exact-touched-bg1-files>
pnpm --filter @aakkino/dom-to-figma test
pnpm --filter @aakkino/dom-to-figma check-types
pnpm --filter @aakkino/dom-to-figma build
pnpm --filter @figit/browser-capture-adapter test
pnpm --filter @figit/browser-capture-adapter check-types
pnpm --filter @figit/browser-capture-adapter build
pnpm --filter extension test
pnpm --filter extension check-types
pnpm --filter extension build
pnpm --filter extension build:firefox
pnpm test:upstream-core-delta
pnpm upstream-adapter:stable
pnpm upstream-adapter:main
pnpm oracle:parity
git diff --check
```

Any browser/live gate that cannot run must be reported as a blocker or explicit
residual gap; a skipped gate is not a pass.

## Stop Conditions

- `main` no longer matches the approved SHA.
- Correct BG1 behavior requires BG2 lazy-source parsing or activation.
- Conversion would need an unplanned fetch or adapter scheduler state in core.
- The change requires extension product source, package/registry migration,
  lockfile replay, release-workflow edits, or a core-delta budget exception not
  covered by the approved plan.
- Validation requires fingerprint, tolerance, or baseline relaxation without
  independent evidence and approval.
- Any unrelated dirty-root or existing worktree state changes.
