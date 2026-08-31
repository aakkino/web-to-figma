# Implementation Plan: Post-audit tail reconciliation

1. [x] Re-pin `sync/upstream-20260726`, `origin/main`, merge base, ordered
   source-only commit set, root preservation hashes, staged set, and worktree
   occupancy.
2. [x] Copy the authoritative S01-S73 ledger into a task-local extended closure
   report and append every post-audit commit through the current source tip.
3. [x] Independently recompute row order, identities, parents, subjects, paths,
   and exactly-one terminal disposition for the full ledger.
4. [x] Create and plan a narrow S79 child only after the user approves this
   final plan. Rebuild the oracle scene-registration guidance against freshly
   pinned `origin/main`; do not cherry-pick `37f5361` literally.
5. [x] Validate the S79 child with target-version spec review, oracle harness
   unit tests, `pnpm oracle:parity`, scoped lint/format checks, and
   `git diff --check`; promote it through separately authorized commit/push/PR
   gates as required.
6. [x] Refresh target containment evidence, then re-pin the sync source and
   append any commits added after the planning-time S85 boundary.
7. [x] Produce a freeze-ready proof covering every source-only commit, every
   valuable target outcome, excluded/historical rationale, and unchanged dirty
   state.
8. [x] Archive the completed execution container and this reconciliation child;
   return to the top-level parent for its final integration review.
9. [ ] Make the top-level parent archive commit the final sync-branch commit,
   verify no later source commit exists, and create an annotated local terminal
   tag without advancing the branch.
10. [ ] Treat tag publication, branch deletion, and cleanup as separately
    authorized follow-up operations.

## Validation

```powershell
python ./.trellis/scripts/task.py validate .trellis/tasks/08-30-reconcile-post-audit-sync-tail
git -c safe.directory=D:/desktop_directory/web-to-figma rev-list --reverse <target>..<sync>
git -c safe.directory=D:/desktop_directory/web-to-figma diff --check -- .trellis/tasks/08-30-reconcile-post-audit-sync-tail
pnpm --filter @figit/oracle-harness test
pnpm oracle:parity
```

The oracle commands apply when checking the S79 port. Ledger-only iterations
use Git, Markdown, JSONL, Trellis validation, and preservation checks.

## Review Gates

- Full-ledger completeness and exactly-one-disposition gate.
- S79 child creation and final-plan approval gate.
- S79 commit, push, PR, and merge gates as applicable.
- Freeze-readiness and unchanged-dirty-state gate.
- Final local-tag creation gate; remote publication remains separate.

## Top-Level Handoff

Steps 9-10 are owned by the top-level parent after this reconciliation task is
archived. The parent must account for the remaining reconciliation archive and
journal commits, make its own archive commit the terminal sync commit, and stop
for separate annotated-tag authorization. Tag publication, branch deletion,
and worktree cleanup remain later independent gates.
