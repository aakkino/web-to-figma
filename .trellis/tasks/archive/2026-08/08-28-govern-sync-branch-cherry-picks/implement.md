# Implementation Plan: Govern sync branch cherry-picks

1. [x] Complete Child A by importing the authoritative report byte-for-byte and
   verifying its provenance and SHA-256.
2. [x] Review the imported disposition matrix and choose the exact candidate
   cohorts for rebuild/port against the current baseline.
3. [x] Record the approval manifest with target ref/SHA, order, validation, and
   rollback units.
4. [x] Start Child B only after the latest planning summary and approval manifest
   receive explicit user approval.
5. [x] Execute and validate one approved cohort at a time in dependency order. If
   its implementation child stops at a local branch, plan and complete a
   separate promotion child before treating the cohort as target-line complete
   or considering a dependent cohort.
6. [x] Perform the parent integration review against the manifest, imported report,
   and preservation rules.
7. [x] Reconcile every post-audit source commit through S88 and port the sole
   durable tail delta, S79, to the refreshed target.
8. [x] Repair archived task context references and complete pre-archive
   validation for the 15-node final task tree.
9. [ ] Archive the closure child, archive this parent as the final source
   commit, validate both final archive locations, and create the annotated
   terminal tag.

## Review Gates

- Child A import integrity gate.
- User-owned candidate-scope approval gate.
- Child B preflight target/worktree gate.
- Per-cohort validation and rollback gate.
- Parent final reconciliation gate.
- Post-audit tail disposition gate.
- Exact-path archive and terminal-tag gate.

## Validation

```powershell
python ./.trellis/scripts/task.py validate .trellis/tasks/08-28-govern-sync-branch-cherry-picks
python ./.trellis/scripts/task.py validate .trellis/tasks/08-28-import-existing-sync-integration-audit
python ./.trellis/scripts/task.py validate .trellis/tasks/08-28-execute-approved-sync-cherry-picks
```
