# Approval Manifest: FD1 First Batch

Status: completed and independently checked

## Target

- Target ref: `main`
- Target SHA: `dd91f18346d7326ab71c1a77769bfe7aed310af3`
- Drift policy: stop and return to planning if the ref no longer matches

## Approved Scope

- Cohort: FD1 font diagnostics only
- Evidence commit: `49966ef87924d3b0b2f4c3de92fc431d300bb9e9`
- Deferred cohorts: BG1, BG2, LA1, LA2, CP1, CP2

## Application Strategy

- Rebuild/port against current baseline contracts with new patch identity
- Literal historical cherry-picks: prohibited
- Execution context: isolated branch/worktree
- Scope/conflict expansion: stop and return to planning

## Validation And Rollback

- Focused UI/privacy tests, extension test/type gates, Chrome and Firefox builds
- Directed Biome check and `git diff --check`
- One FD1 commit/PR rollback unit
- Root dirty/index/worktree preservation snapshot required

## Approval

- Approved scope and strategy: user, 2026-08-28
- Implementation authorization: approved by user, 2026-08-28
- Execution commit: `62eef8de9ff01b4d58c905a8f8e2949da00703b8`
