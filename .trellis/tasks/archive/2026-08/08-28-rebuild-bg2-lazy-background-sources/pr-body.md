## Summary

- discover explicit `data-bgset` background sources without activation, fetch,
  scrolling, page-script execution, or DOM mutation
- stage and deduplicate lazy backgrounds through the existing BG1 inventory,
  scheduler, prepared-only loader, diagnostics, and cancellation pipeline
- expose a generic optional Core background resolver with computed-style
  precedence and capture-local adapter context cleanup

## Evidence boundary

Historical commits `be47e627` and `9df8d0b8` were used only as behavioral and
test evidence. This PR is a new patch against `origin/main@98c10d5f`; no
historical commit was cherry-picked or transplanted.

## Validation

- Core: 281 tests, type-check, build
- Adapter: 70 tests, type-check, build
- Extension: 33 tests, type-check, Chrome and Firefox builds
- full-workspace type-check, build, and tests
- stable `0.2.4` and pinned-main `859efea8` compatibility
- upstream delta check and 7 governance tests
- oracle parity: 47 scenes
- touched-file Biome and `git diff --check`

Repository-wide `pnpm lint` still reports 373 pre-existing CRLF/format errors
outside this PR; every touched Biome-managed file passes directed checks.

## Scope exclusions

No lazy activation, scrolling, observer orchestration, arbitrary `data-*`
inference, extension permissions/messaging/storage/UI changes, manifest or
lockfile churn, release-workflow changes, or history replay.

## Rollback

Merge with a merge commit. After merge, revert that merge commit to roll back
the complete BG2 delivery without rewriting `main` or disturbing BG1.
