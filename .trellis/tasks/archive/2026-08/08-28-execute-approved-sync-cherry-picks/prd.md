# Execute approved sync rebuilds and ports

## Goal

Govern independently verifiable execution children for sync candidates that the
user explicitly approves, while keeping unapproved cohorts as deferred registry
entries rather than active tasks.

## Background

The audit child is complete. The imported assessment rejects whole-branch
integration and identifies seven candidate cohorts. FD1 and BG1 were approved
in separate batches, completed through independent children, and archived.
After BG1 containment, the user separately authorized BG2 planning. On
2026-08-29 the user explicitly authorized LA1 and CP1 as one parallel planning
batch while preserving independent child tasks, review gates, and rollback
units. Both children have now passed local and remote gates, merged in the
required order, and been archived. LA2 and CP2 then completed as separate
children: LA2 verified semantic containment with zero product diff, and CP2
  merged its one-label reconciliation through PR #19. FD1's reviewed local
  delivery was finally promoted through PR #20, completing all seven candidate
  cohorts across nine execution children at `origin/main@687a8509`.

## Requirements

- This task is a governance container and must not own product implementation.
- Create an execution child only after the user approves that cohort for
  planning; task creation must not imply implementation approval.
- Each execution child must own exact target identity, current-baseline design,
  acceptance criteria, validation, preservation evidence, and rollback unit.
- Historical commits are evidence inputs only. Every approved child must rebuild
  or port against current contracts with new patch identity.
- Preserve dependency order: `BG1 -> BG2`, `LA1 -> LA2`, and `CP1 -> CP2`.
  FD1 is independent.
- Dependent cohorts must not receive an execution task until their prerequisite
  cohort has passed its own integration review and the user approves the next
  planning step.
- Independently approved root cohorts may be planned and developed concurrently
  only in isolated branches/worktrees with separately testable artifacts. Merge
  order for the current batch is LA1 first, then CP1 after synchronizing the
  contained LA1 target and repeating full validation.
- Adapter, converter, storage, messaging, publishing, and lockfile changes are
  not standalone tasks merely because they are excluded from FD1. A cohort task
  may authorize a required layer explicitly; unexpected cross-layer expansion
  returns to planning.

## Acceptance Criteria

- [x] FD1 is represented by one independently verifiable execution child.
- [x] BG1 received one execution child only after explicit cohort-level
      planning consent.
- [x] BG2 received one execution child only after BG1 containment and explicit
      cohort-level planning consent; its reviewed head `a1c06bd` was promoted
      through PR #16 and merge commit `1c26bc2a`, and refreshed `origin/main`
      contains both identities.
- [x] LA1 and CP1 each received one independent planning child only after the
      user explicitly approved both root cohorts for parallel planning.
- [x] LA1 and CP1 implementation starts only after each child's latest final
      planning summary receives separate approval.
- [x] LA1 and CP1 are merged and contained in the required order through PRs
      #17 and #18; refreshed `origin/main@0a311e1` contains both outcomes.
- [x] Every execution child was created only after explicit cohort-level
      planning consent.
- [x] Dependency and approval gates are recorded in each existing child rather
      than inferred only from tree position.
- [x] Completed children are reconciled against the imported audit and parent
      governance task without broadening approval.
- [x] LA2 completed as represented/superseded with zero product diff; CP2
      merged PR #19 as `decde39a`; FD1 promotion merged PR #20 as `687a8509`.
- [x] All nine execution children are reconciled to seven approved cohorts,
      and final `origin/main@687a8509` contains every promoted outcome.

## Out Of Scope

- Direct product edits, tests, branches, worktrees, commits, or PRs in this
  governance-container task.
- Pre-creating tasks for unapproved cohorts.
- Creating generic tasks for architectural layers without a concrete approved
  deliverable.

## Key Decisions

- B is an execution-governance container; B1 owns the approved FD1 delivery.
- Future cohort tasks will be created just in time after explicit approval.
- After FD1 completed, BG1 was separately authorized, implemented, checked,
  and archived as a local rollback unit. Its archive originally omitted the
  cross-task promotion boundary; that record has been corrected.
- BG1 was promoted through PR #14 with final reviewed head `92c8452f`, merge
  commit `98c10d5f`, and verified containment on refreshed `origin/main`.
  Its remote source branch remains preserved as the pre-merge rollback unit.
- BG1 integration satisfied BG2's technical dependency. Child
  `08-28-rebuild-bg2-lazy-background-sources` rebuilt the cohort with reviewed
  head `a1c06bd`, passed all local and PR checks, and merged PR #16 through
  merge commit `1c26bc2a`. Refreshed `origin/main@1c26bc2a` contains both
  identities and the remote source branch remains preserved. LA1 and CP1 were
  independently planned against that target. Their work overlapped in
  isolated worktrees, but LA1 merges first; CP1 then synchronizes and fully
  revalidated before PR #18 merged as `0a311e1`. Both children are archived,
  and refreshed `origin/main@0a311e1` contains their outcomes. LA2 then closed
  as represented/superseded by LA1 with zero product diff. CP2 shipped only the
  `Copy & Save` label through PR #19 and merge `decde39a`. FD1's preserved
  reviewed commit `62eef8d` was reconciled as `d3459aa` and promoted through
  PR #20 and merge `687a8509`, with its source branch retained and the dirty
  sync root unchanged.
