# BG1 Audit Context

## Governance Evidence

- Authoritative assessment:
  `.trellis/tasks/archive/2026-08/08-28-assess-sync-integration/research/sync-integration-assessment-2026-08-28.md`
- BG1 is a selective root candidate; candidate status is not execution approval.
- S42-S44 are historical evidence only. They must not be cherry-picked.
- Minimum audit gate: core/adapter unit and browser tests, adapter resource
  round trip, extension build, oracle parity, and one BG1 rollback unit.

## Baseline Evidence

- Planning target: `main@dd91f18346d7326ab71c1a77769bfe7aed310af3`.
- Dirty evidence checkout:
  `sync/upstream-20260726@906b205ef05917749b3d0982ca6dd11ff1b35866`.
- Main has gradient backgrounds and ordinary staged images but lacks the BG1
  background parser, rasterizer, resource inventory, and bridge capability.
- The dirty sync checkout contains later BG1/BG2/LA/CP work and must not be used
  as the edit target or transplanted wholesale.

## Cohort Boundary

- BG1: raster sources already present in computed CSS, their preparation,
  conversion, fallback, diagnostics, compatibility, and governed public delta.
- BG2: later unresolved lazy CSS sources such as `data-bgset`; remains blocked.
- LA1/LA2: scroll/runtime activation; remain deferred.
- Architectural layers are permitted only where the BG1 data flow requires
  them. Unexpected extension, messaging, storage, publishing, or lockfile work
  returns to planning.
