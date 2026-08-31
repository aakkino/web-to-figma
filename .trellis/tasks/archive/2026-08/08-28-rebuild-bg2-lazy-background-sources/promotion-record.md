# BG2 Promotion Record

## Reviewed Delivery

- Base: `origin/main@98c10d5fd0ad8b7c97f8b5bb397fa19d24852313`
- Reviewed head: `a1c06bdd4c4b7e45ec9a4e134553cad9856dd8dc`
- Pushed head: `a1c06bdd4c4b7e45ec9a4e134553cad9856dd8dc`
- Remote branch: `task/rebuild-bg2-lazy-background-sources`
- Payload: one commit, 22 files, 918 insertions, 41 deletions
- BG1 reviewed head `92c8452f02da3fa5c304e81d89c3c9905ba453d5`
  is contained by the reviewed base and reviewed head.
- The isolated worktree was clean after commit. The dirty root branch, HEAD,
  index, and pre-existing changes remained unchanged.

## Validation

- Directed Biome checks passed for all touched managed files.
- Core: 34 files / 281 tests, type-check, and build passed.
- Adapter: 13 files / 70 tests, type-check, and build passed.
- Extension: 7 files / 33 tests, type-check, Chrome build, and Firefox build
  passed.
- Full-workspace type-check, build, and tests passed.
- Stable `0.2.4` and pinned-main `859efea8` compatibility passed.
- Upstream delta check and 7 governance tests passed.
- Oracle parity passed for 47 scenes with no new baseline finding.
- `git diff --check` passed.
- Repository-wide `pnpm lint` remains blocked by 373 pre-existing CRLF/format
  errors outside the reviewed payload.

## Proposed Pull Request

Title: `feat(dom-to-figma): capture lazy background sources`

Base: `main`

Head: `task/rebuild-bg2-lazy-background-sources`

Body:

```markdown
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
```

## Promotion Gates

- [x] Explicit push authorization received.
- [x] Remote source head equals the reviewed head.
- [x] Explicit PR creation authorization received.
- [x] PR #16 targets `main` and its one-commit, 22-file payload is verified.
- [x] All six CI checks succeeded; protected `main` requires two of them and
  both succeeded.
- [x] Required approving review count is zero, no reviews or unresolved
  conversations exist, and GitHub reports the PR `CLEAN` / `MERGEABLE`.
- [x] Explicit merge authorization received.
- [x] PR #16 merged at `1c26bc2a48dbe9a7dd642aeca6b546c3bd52ffec`.
- [x] Refreshed `origin/main@1c26bc2a` contains both the reviewed head and merge
  commit; the reviewed head is the merge commit's second parent.
- [x] The remote source branch remains preserved at the reviewed head.
