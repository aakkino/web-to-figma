# Govern sync branch cherry-picks

## Goal

Create one auditable governance path for selective integration from
`sync/upstream-20260726` into the stabilized baseline: preserve the completed
assessment as the decision record, then execute only explicitly approved
candidate work through a separate child task. Closure must account for every
commit through a frozen terminal sync SHA and prove that no still-valuable
product or durable governance behavior remains stranded on the sync branch.

## Background

The authoritative assessment is
`.trellis/tasks/archive/2026-08/08-28-assess-sync-integration/research/sync-integration-assessment-2026-08-28.md`.
It rejects every whole-branch merge, rebase, squash, or replay. It classifies
all 73 sync-only commits as `R 5 + S 10 + C 11 + H 12 + X 35`; only the 11
`C` rows remain selective candidates, and the report explicitly states that
candidate status is not approval to apply an old commit.

That assessment froze `sync/upstream-20260726@2172b181` and classified 73
sync-only commits. The branch subsequently advanced by 12 control-plane
commits to `b7bd7d6`, so the original ledger is no longer sufficient for final
branch closure. Eleven tail commits contain audit, archive, promotion, or
journal provenance. Commit `37f5361` additionally changes durable oracle scene
registration guidance and requires an explicit current-baseline disposition.

## Requirements

- The parent owns the source requirement, child-task map, ordering, approval
  gate, and final integration review.
- Child A, `08-28-import-existing-sync-integration-audit`, must import the
  existing assessment unchanged and verify provenance. It must not repeat the
  audit or make Git/product changes.
- Child B, `08-28-execute-approved-sync-cherry-picks`, must remain blocked from
  execution until Child A is complete and the user explicitly approves the
  candidate cohorts and target.
- Whole-branch operations and every `R`, `S`, `H`, or `X` row are outside the
  execution scope.
- Candidate dependency order is `BG1 -> BG2`, `LA1 -> LA2`, `CP1 -> CP2`, with
  `FD1` independent.
- Each approved root/cohort must have its own validation and rollback boundary;
  unrelated dirty worktree content must not be staged, normalized, moved,
  deleted, stashed, cleaned, or transplanted.
- Local implementation completion and target-line promotion are distinct
  lifecycle states. When remote publication is not owned by the implementation
  child, a separately planned promotion child must record branch/head identity,
  push and PR authorization, required CI/review, merge identity, rollback, and
  target-line containment before a dependent cohort can start planning.
- Approved candidates must be rebuilt/ported cohort-by-cohort against the
  current baseline. Historical commits are evidence inputs and must not be
  applied literally.
- A target ref and exact target SHA must be re-pinned before Child B starts.
  The assessment target `baseline/origin-main-20260828@dd91f183...` is evidence,
  not permission to assume that the execution target has not moved.
- Before final closure, freeze and record a terminal sync SHA, extend the
  disposition ledger from 73 rows through every sync-only commit at that SHA,
  and prohibit further commits on the frozen source line during review.
- Treat audit, archive, promotion, and journal commits as control-plane
  provenance unless review identifies a durable contract that belongs on the
  target line. Do not cherry-pick bookkeeping merely to manufacture Git
  identity coverage.
- Reassess `37f5361` against the current oracle-harness specs and tests. Port it
  through an independently reviewable change only if its rule remains valid
  and is not already represented.

## Acceptance Criteria

- [x] The parent links Child A and Child B and records `A -> approval -> B`;
      it also links the later tail-reconciliation and terminal-closure children
      required after the source branch advanced.
- [x] Child A contains a byte-identical imported copy of the authoritative report
      and records its source and SHA-256.
- [x] No audit is rerun as part of Child A.
- [x] Child B started only after recorded approvals named the exact
      cohorts/source commits, target ref/SHA, rebuild/port order, and validation.
- [x] No whole-branch operation or non-`C` commit was executed.
- [x] Each approved cohort is independently reviewable, verifiable, and reversible.
- [x] LA1 and CP1 were approved for parallel planning as distinct root-cohort
      children; their implementation approvals and rollback units remain
      separate, and their merge order is serialized as LA1 then CP1.
- [x] Final parent review reconciles executed outcomes against the approval
      manifest and confirms preservation of unrelated worktree state.
- [ ] A terminal sync SHA is frozen and every sync-only commit through that SHA
      has exactly one evidence-backed terminal disposition.
- [x] The commits after `2172b181` through S88 `c54ee85` are reconciled,
      including an explicit represented, superseded, ported, historical-only,
      or excluded decision for `37f5361`.
- [x] Final closure proves that no approved product capability or durable
      governance contract remains only on the sync branch.

## Out Of Scope

- Reassessing the 110 commits already covered by the archived report.
- Treating the 11 candidates as automatically approved.
- Importing bookkeeping, historical-only, represented, or superseded commits.
- Cleaning or assigning ownership to pre-existing dirty/untracked paths.

## Key Decision

Approved candidates will be rebuilt/ported cohort-by-cohort against the current
baseline. Literal cherry-picks of the historical commits are prohibited.
The first execution batch contained FD1 only. After FD1 completed, BG1 was
separately authorized for planning and local implementation after final plan
review. BG1's implementation remains archived and its separate
`08-28-promote-bg1-to-main` child merged PR #14 through merge commit
`98c10d5f`; refreshed `origin/main` contains both that merge commit and final
reviewed head `92c8452f`. BG2's technical dependency was satisfied, and child
`08-28-rebuild-bg2-lazy-background-sources` completed its reviewed end-to-end
delivery through PR #16. Refreshed `origin/main@1c26bc2a` contains reviewed
head `a1c06bd` and merge commit `1c26bc2a`; the source branch remains preserved
and the dirty sync root remained untouched. On 2026-08-29 the user approved
LA1 and CP1 for parallel planning as independent children against that target.
They may develop in isolated worktrees, but LA1 merges first and CP1 must
synchronize and fully revalidate afterward. After both prerequisites merged and
were archived, the user authorized LA2 and CP2 planning as separate children.
LA2 completed as represented/superseded with zero product diff. CP2 merged its
one-label reconciliation through PR #19 as `decde39a`. FD1's preserved local
delivery was promoted through PR #20 as `687a8509`. Final review reconciles all
seven cohorts across nine execution children, confirms no literal historical
candidate or whole-branch operation was used, and confirms the dirty sync root
and unrelated worktrees remained preserved. S79's durable oracle contract was
subsequently ported through PR #21 as `1c98bb0e`; the refreshed final target is
`origin/main@1c98bb0e0d04682f619a5aadccdd5027959ac2e0`.

## Resolved Closure Contract

"Complete cherry-pick" means exhaustive semantic disposition: every source
commit is accounted for, every valuable outcome is represented or ported, and
historical/bookkeeping commits intentionally remain only on the frozen sync
line. Literal replay or reachability of every sync commit from `main` is not a
closure requirement because it conflicts with the approved whole-branch
rejection and would import known obsolete and bookkeeping changes.
