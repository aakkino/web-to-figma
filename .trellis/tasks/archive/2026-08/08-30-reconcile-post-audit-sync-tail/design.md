# Design: Post-audit tail reconciliation and source freeze

## Ownership

This task is the third direct child of
`08-28-govern-sync-branch-cherry-picks`. It owns the extended ledger,
freeze-readiness proof, and cross-child reconciliation. It does not mix target
spec delivery into the dirty sync checkout.

A narrow child task will own the `37f5361` oracle registration contract port in
an isolated worktree based on a freshly pinned `origin/main`. The child ports
the rule semantically, validates the spec against current source/tests, and
provides an independently revertible target-line commit or PR.

## Data Flow

```text
frozen original audit (S01-S73)
  + re-pinned sync tail (S74..terminal row)
  + current target containment evidence
  -> complete disposition ledger
  -> durable-delta queue
       -> S79 oracle spec-port child
  -> target containment review
  -> freeze-ready proof
  -> top-level parent archive as final sync commit
  -> annotated terminal tag (no branch mutation)
```

## Ledger Contract

The extended ledger is ordered exactly like `git rev-list --reverse` from the
pinned target comparison. Each source-only commit appears once and receives one
terminal state: represented, superseded, ported/port candidate, historical
only, or excluded. Patch uniqueness is evidence, not value; bookkeeping cannot
be promoted merely because `git cherry` reports `+`.

The final closure projection maps every valuable outcome to a reachable target
identity. Historical-only and excluded rows map to the frozen source/tag rather
than `main`.

## Isolation And Preservation

All source analysis is read-only. Hash the protected dirty paths, staged set,
index, branch/HEAD, and worktree occupancy before and after each mutation gate.
The S79 port uses a separate target-derived worktree and stages only its two
owned spec files. No task may clean, stash, normalize, transplant, or absorb the
dirty sync root.

## Freeze Protocol

1. Finish the complete ledger and target containment proof.
2. Finish and contain the S79 spec-port child.
3. Re-pin the source and append any planning/archive commits added since the
   preliminary S85 boundary.
4. Archive the execution container and this task when their gates pass.
5. Complete the top-level parent review and make its archive commit the final
   commit on `sync/upstream-20260726`.
6. Create an annotated local tag at that exact SHA. Do not commit the SHA back
   onto the frozen branch.
7. Push the tag or delete/archive branches only after separate authorization.

If the source advances after the candidate freeze point, the freeze fails: the
new tail must be appended to the ledger and reviewed before another candidate
SHA is nominated.

## Rollback

- Ledger and planning changes are documentation-only and can be reverted as one
  task-local unit before freeze.
- The S79 port is a separate target-line commit/PR rollback unit.
- A local tag can be deleted and recreated before publication; a published tag
  is immutable by policy and requires an explicit corrective process.
- The frozen source branch remains retained as historical evidence; branch
  deletion is not part of this task.
