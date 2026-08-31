# Reconcile post-audit sync tail and freeze source

## Goal

Reconcile every sync-only commit added after the original 73-row audit, decide
whether durable outcomes require target-line ports, freeze the terminal sync
SHA, and prove that no still-valuable behavior remains stranded on the source
branch.

## Background

The authoritative audit froze `sync/upstream-20260726@2172b181` and assigned
exactly one disposition to each of 73 sync-only commits. The approved execution
container subsequently completed seven product cohorts through nine archived
children, with all promoted outcomes contained in
`origin/main@687a8509969b24aba13ee414cc19b3d6aef1d20f`.

The sync branch later advanced by 12 commits to the observed tip
`b7bd7d6c68557e91e184da65b9e560de950f3bed`. Eleven tail commits contain audit,
archive, promotion, or journal provenance. Commit
`37f53615d0dbd57c60edb09f278e16ff6a098e1c` also changes durable oracle scene
registration guidance and requires a current-baseline disposition. Because the
source branch can still move, `b7bd7d6` is an observed pre-planning tip, not yet
the terminal freeze identity.

## Requirements

- Re-pin `sync/upstream-20260726`, `origin/main`, and their merge base before
  analysis, and enumerate the exact ordered sync-only set.
- Extend the existing 73-row ledger through every commit at the re-pinned sync
  tip. Every added row must have exactly one evidence-backed terminal state:
  represented, superseded, port candidate, historical only, or excluded.
- Reconcile S74-S85 individually rather than classifying them only by subject
  prefix or path family.
- Compare `37f5361` with current oracle-harness specs, tests, and scene
  registration behavior. Its dual-projection registration rule is valid and
  absent from `origin/main`; deliver it through an independent spec-port child
  with its own review and rollback boundary.
- Treat task archives, promotion evidence, and journals as source-line
  provenance unless they define a current durable contract. Do not import them
  merely to make source commits reachable from `main`.
- Preserve the dirty root checkout and all unrelated worktrees. Do not stage,
  normalize, stash, clean, restore, move, delete, or overwrite existing work.
- Establish the terminal sync SHA only after all authorized source-line
  bookkeeping is complete. Recording or attesting that SHA must not create a
  later commit on the frozen sync branch.
- Produce a final closure proof mapping the complete frozen sync-only set to
  target-line containment or an explicit non-port disposition.
- Keep remote mutation, tag creation, branch protection, branch deletion, and
  target-line publication behind separate explicit authorization gates.

## Acceptance Criteria

- [ ] The task records the final pinned sync tip, target tip, merge base, and
      exact sync-only commit count.
- [ ] Every commit after original row S73 is present exactly once in the
      extended ledger and has one justified terminal disposition.
- [ ] `37f5361` has an explicit represented, superseded, ported, historical-only,
      or excluded outcome supported by current repository evidence.
- [ ] The `37f5361` durable rule is delivered through a separately reviewable
      child and is contained on the target line before closure is claimed.
- [ ] No approved product capability or durable governance contract remains
      available only from the frozen sync branch.
- [ ] The terminal sync SHA is immutable for the final review, and its identity
      is recorded without advancing that branch again.
- [ ] The final proof distinguishes semantic containment from literal commit
      reachability and does not claim that excluded commits were cherry-picked.
- [ ] Dirty and unrelated working state remains unchanged, with before/after
      evidence sufficient to detect accidental mutation.

## Out Of Scope

- Replaying all sync commits solely to preserve their Git identities.
- Whole-branch merge, rebase, squash, or conflict-resolution integration.
- Reopening the seven completed product cohorts without new contradictory
  evidence.
- Deleting the sync branch, task branches, worktrees, archives, or provenance.
- Product implementation before a separate final-plan approval.

## Key Decisions

- The user confirmed semantic closure: exhaustive commit disposition plus
  target-line containment of every valuable outcome. Historical and
  bookkeeping commits remain only on the frozen sync line.
- Literal replay and commit-identity reachability are not acceptance criteria.
- `37f5361` is a current durable-contract candidate, not product behavior and
  not generic bookkeeping. It requires a narrow main-derived spec-port child.
- The top-level parent owns the final freeze action. After its archive commit is
  the last source-line commit, an annotated tag can attest the terminal SHA
  without advancing the branch; publishing that tag remains separately gated.

## Artifact Status

- Complex-task planning is complete: `prd.md`, `design.md`, `implement.md`, and
  curated implement/check manifests exist and validate.
- No product or spec implementation is authorized until the latest final
  planning summary receives a subsequent explicit approval.
