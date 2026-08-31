# Promotion Manifest: BG1 to main

Status: PR #14 merged through GitHub's merge-commit method; refreshed
`origin/main` contains the exact merge commit and final corrected reviewed head,
the 23-file tree/payload is verified, the source branch is preserved, and BG2
remains deferred pending separate user planning authorization

## Source

- Cohort: BG1 CSS raster backgrounds
- Local branch: `task/rebuild-bg1-css-raster-backgrounds`
- Worktree: `.tmp/rebuild-bg1-css-raster-backgrounds`
- Implementation commit:
  `30d33b9131e1775bc54c53a6afe4548a3fd2dc71`
- Reviewed head: `5b906e214241300edd4beff08dfb67313005bbf2`
- Lint-only correction commit and corrected reviewed head:
  `312c8389ee25eca74e653178fba5b9bb85ae8f7e`
- Snapshot-only correction commit and final corrected reviewed head:
  `92c8452f02da3fa5c304e81d89c3c9905ba453d5`
- Final local payload: 23 files, 2,631 insertions, 78 deletions
- Historical S42-S44 commits remain evidence only and are not promotion inputs

## Target

- Repository: `aakkino/web-to-figma`
- Target ref: `origin/main`
- Planning target: `dd91f18346d7326ab71c1a77769bfe7aed310af3`
- Source ancestry before correction: zero behind, two ahead
- Corrected source ancestry before snapshot correction: zero behind, three
  ahead
- Final local source ancestry: zero behind, four ahead
- Remote source branch at planning time: absent
- Remote source branch after the authorized corrected update push:
  `task/rebuild-bg1-css-raster-backgrounds@92c8452f02da3fa5c304e81d89c3c9905ba453d5`
- Remote branch URL:
  `https://github.com/aakkino/web-to-figma/tree/task/rebuild-bg1-css-raster-backgrounds`
- Existing source PR at planning time: none
- Created PR: `https://github.com/aakkino/web-to-figma/pull/14`
- Final PR state: MERGED, previously non-draft, base unchanged, final head
  `92c8452f02da3fa5c304e81d89c3c9905ba453d5`, four exact commits, 23 exact
  files, 2,631 insertions, 78 deletions, and auto-merge disabled
- GitHub and the regenerated four-commit/23-file local draft now match exactly:
  8,285 characters at SHA-256
  `f7708610ef777b5488d42c4d2bf50597143242f71da9e2d66eaca65d1fd84721`.
- Drift policy: stop and return to planning before any mutation

## Remote Gates

- Lint-only correction execution: completed locally in a separate third commit
- Push: explicitly authorized and completed as an ordinary non-force push
- Local PR title/body draft: completed and verified before PR creation
- PR creation: explicitly authorized and completed as PR #14
- Fourth stable-manifest correction: completed locally in a separate commit
- Corrected-head update push: explicitly authorized and completed as an
  ordinary non-force fast-forward
- Regenerated four-commit/23-file local PR body: completed and independently
  verified
- Material PR-body update: explicitly authorized, completed, and verified
- Merge: explicitly authorized and completed through GitHub's merge-commit
  method with expected head protection
- Direct main push, force-push, auto-merge, and protection bypass: prohibited

## Required Evidence

- Local committed-shape promotion validation on the actual base
- Exact remote branch identity after ordinary push
- One PR targeting `main` with accurate scope and rollback record
- Successful repository, core-delta, stable, upstream-main, and Tier-0 jobs
- Independent review and resolved conversations
- Merge commit preserving all four reviewed commits
- Refreshed `origin/main` containing final corrected reviewed head and merge
  commit
- Root/worktree preservation and parent-governance reconciliation

## Dependency

BG2 remains deferred until this task completes and the user separately approves
BG2 planning.

## Initial CI State

- Required repository gate `Lint, typecheck, build, test`: failed in the Test
  step; lint, typecheck, and build passed.
- Failure: `internal/oracle-harness/src/scenes.test.ts` stable manifest snapshot
  lacks `img/img-03-css-background` at 320x180.
- Passed: Tier-0 parity ratchet, upstream core-delta governance, latest stable
  compatibility, upstream-main compatibility, and advisory local-package
  tarball inspection.
- Pending/skipped material jobs: none.
- Run/job:
  `https://github.com/aakkino/web-to-figma/actions/runs/33155565818/job/98797393576`.
- No rerun, PR/head/body update, push, baseline edit, or merge was performed.

## Replacement CI State

Replacement checks for final head
`92c8452f02da3fa5c304e81d89c3c9905ba453d5` are terminal. All six checks
passed; pending, failed, and skipped check runs are zero.

| Check | Conclusion |
| --- | --- |
| `Lint, typecheck, build, test` | success |
| `Inspect local package tarballs` | success (advisory preview) |
| `Latest stable upstream compatibility` | success |
| `Tier-0 parity ratchet` | success |
| `Upstream core delta governance` | success |
| `Upstream main compatibility` | success |

- Repository gate run/job:
  `https://github.com/aakkino/web-to-figma/actions/runs/33166634178/job/98833502183`.
- Advisory preview run/job:
  `https://github.com/aakkino/web-to-figma/actions/runs/33166634159/job/98833502127`.
- At the replacement-CI checkpoint, no check had been rerun and no PR body,
  merge, auto-merge, branch deletion, or other follow-on remote mutation had
  occurred. The later separately authorized body-only synchronization is
  recorded below.

## Final Pre-Merge PR Metadata And Review

- At this checkpoint, PR #14 was OPEN and non-draft with merge state `CLEAN`.
- Title, base `dd91f183`, head `92c8452f`, four commits, exact 23-file payload,
  and +2,631/-78 stats remained unchanged by the body-only update.
- Auto-merge remains disabled.
- All six final-head check runs remain completed/success after body
  synchronization.
- GitHub reports zero review threads, zero unresolved review threads, and zero
  submitted reviews; `reviewDecision` is null, so there is no conversation or
  requested-review blocker in the current metadata.
- Merge was subsequently authorized, but the initial attempts had not performed
  it. Three guarded GitHub merge API requests returned EOF and an alternate
  HTTPS client failed TLS establishment. REST and GraphQL readbacks after those
  attempts both reported PR #14 OPEN, `merged=false`, `mergedAt=null`, no merge
  commit, merge state `CLEAN`, and auto-merge disabled.

## Initial Merge Transport Blocker

- Every merge request specified `merge_method=merge` and expected head
  `92c8452f02da3fa5c304e81d89c3c9905ba453d5`.
- No squash, rebase merge, auto-merge, protection bypass, direct `main` push,
  source-branch deletion, or close operation was attempted.
- Each ambiguous response was followed by authoritative readback before any
  retry. All readbacks prove no merge occurred.
- A fresh full preflight then authorized exactly one distinct GraphQL
  `mergePullRequest` mutation using PR node `PR_kwDOTi3JR88AAAABBUDU8w`,
  `mergeMethod: MERGE`, and the exact expected head `92c8452f`. It returned EOF
  and was not retried. Immediate bounded REST and GraphQL readbacks both still
  report OPEN, `merged=false`, `mergedAt=null`, and no GraphQL merge commit.
- Post-merge fetch, containment proof, governance reconciliation, and archival
  were not started because confirmed merge is their entry condition.

## Successful Merge And Containment

- A fresh user-authorized REST retry passed the full merge preflight and
  returned `merged=true`.
- PR: `https://github.com/aakkino/web-to-figma/pull/14`.
- Merged at: `2026-08-28T12:18:17Z`.
- Merge commit and refreshed final `origin/main`:
  `98c10d5fd0ad8b7c97f8b5bb397fa19d24852313`.
- Merge parents are exactly planning base `dd91f183` and final reviewed head
  `92c8452f`, preserving all four reviewed source commits.
- `git merge-base --is-ancestor 92c8452f origin/main`: exit 0.
- `git merge-base --is-ancestor 98c10d5f origin/main`: exit 0.
- Final main tree equals the reviewed head tree; base-to-main payload is the
  exact 23 files, +2,631/-78, with zero file-set difference.
- Remote source branch remains preserved at `92c8452f`.
- PR file list remains exactly 23 files and all six current-head checks remain
  completed/success.
- Root branch/HEAD/staged state, all 12 pre-reconciliation preservation hashes,
  and unrelated worktree occupancy/heads matched their recorded snapshot.
- Rollback is a reviewed PR reverting merge commit `98c10d5f`; never rewrite
  `main`.
