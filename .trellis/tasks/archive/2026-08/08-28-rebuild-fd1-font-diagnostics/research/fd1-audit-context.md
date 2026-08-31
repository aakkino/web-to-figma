# FD1 Audit Context

## Provenance

Authoritative source:
`.trellis/tasks/archive/2026-08/08-28-import-existing-sync-integration-audit/research/sync-integration-assessment-2026-08-28.md`

Imported/source SHA-256:
`0F78EB41FD88CE83C397FD3840A9766C2CD05477D7E4CE2C89D020CE2E83625C`

This file is a scoped extraction of existing findings for context injection. It
does not add or re-evaluate audit evidence.

## Authoritative FD1 Findings

- S65 is `49966ef87924d3b0b2f4c3de92fc431d300bb9e9`, subject
  `feat(extension): explain font capture mismatches`.
- Historical scope is four extension files, `+365/-5`, covering extension UI,
  focused test, app integration, and Vitest configuration.
- Disposition is `C` (selective candidate), not approval to apply the old
  commit. Highest historical evidence is L2; current extension UI/browser
  validation is absent.
- The module `font-recovery-diagnostics.tsx` was absent at the assessed
  baseline `dd91f18346d7326ab71c1a77769bfe7aed310af3`.
- FD1 is independent of BG1/BG2, LA1/LA2, and CP1/CP2.
- Exact target boundary is
  `apps/extension/entrypoints/content/font-recovery-diagnostics*` plus its
  direct UI consumer.
- Current glyph-aware fallback remains authoritative. Diagnostic UI must not
  change core conversion or font-resolution behavior.
- Minimum validation is focused UI tests, extension type-check/build, and a
  browser check. The current project spec additionally requires extension
  tests plus Chrome and Firefox builds.
- Rollback unit is one FD1 change/PR.

## Global Constraints Retained

- Do not merge, rebase, squash, or replay the whole sync branch.
- Use historical commits as evidence for a current-baseline rebuild/port, not
  literal cherry-pick instructions.
- Preserve current target fingerprints, private package/release contracts,
  staged state, unrelated dirty paths, and worktree occupancy.
