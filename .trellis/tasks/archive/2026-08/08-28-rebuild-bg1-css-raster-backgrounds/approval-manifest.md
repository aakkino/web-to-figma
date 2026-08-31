# Approval Manifest: BG1 CSS raster backgrounds

Status: in progress; implementation authorized, product edits not yet started

## Target

- Target ref: `main`
- Planning target SHA: `dd91f18346d7326ab71c1a77769bfe7aed310af3`
- Drift policy: stop and return to planning if the ref no longer matches

## Approved Scope

- Cohort: BG1 CSS raster backgrounds only
- Evidence commits: S42 `d663c6bee734382c75062ec4067e809b92345f12`,
  S43 `75f9bc0b122e0a55318b8b26ab6b883e11c02597`, and
  S44 `9fb02ea5532b66fbe815cecc5cd03116197121c0`
- Deferred cohorts: BG2, LA1, LA2, CP1, CP2
- Completed cohort: FD1 `62eef8de9ff01b4d58c905a8f8e2949da00703b8`

## Strategy And Gates

- Rebuild against current baseline contracts with new patch identity
- Literal historical cherry-picks and whole-branch operations: prohibited
- Execution task creation/planning: approved by user, 2026-08-28
- Implementation authorization: approved by user, 2026-08-28
- Branch/worktree authorization: one isolated BG1 branch/worktree from the
  approved target SHA after preservation snapshots
- Execution context: one isolated branch/worktree; never the dirty sync root
- Rollback: one BG1 commit/PR unit
- Dependency: BG1 is a root; BG2 remains blocked until BG1 passes integration
  review and receives separate planning authorization
