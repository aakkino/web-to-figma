# Implementation Plan: S79 oracle scene-registration spec port

1. [x] After explicit approval of this final child plan, activate this child
   with `task.py start`; do not rely on the parent task's implementation
   approval.
2. [x] Capture the dirty sync root preservation baseline: branch/HEAD, index
   hash, staged set, dirty tracked paths/content digest, compact porcelain
   digest, and worktree occupancy.
3. [x] Refresh only `origin/main`, record its exact SHA, and create one isolated
   detached worktree at that SHA. Do not create a branch or commit at this gate.
4. [x] Re-read the target architecture/testing specs, scene discovery source,
   stable-manifest test, snapshot path, scoreboard contract, and package
   scripts from inside the isolated worktree.
5. [x] Semantically add the scene-registration contract to
   `.trellis/spec/oracle-harness/frontend/architecture.md`, preserving target
   wording and mixed package names.
6. [x] Add the named stable-manifest test requirement and parity
   non-substitution rule to
   `.trellis/spec/oracle-harness/frontend/testing-guidelines.md`.
7. [x] Prove the worktree diff contains exactly those two files and that no
   code, snapshot, scoreboard, archive, or journal path changed.
8. [x] Run the full S79 validation set and fix in-scope failures. Record any
   unrelated pre-existing failure without mutating unrelated files.
9. [x] Dispatch `trellis-check` for an independent full-scope review and
   self-fix pass; re-run all affected validations after fixes.
10. [x] Recompute root preservation evidence. The only permitted occupancy
    delta is the known isolated S79 worktree.
11. [x] Stop and present the checked two-file diff and validation evidence.
    Obtain separate explicit authorization before creating a branch, staging,
    or committing.
12. [x] At the commit gate, create the approved target-derived branch, stage
    only the two owned paths, inspect `git diff --cached`, verify the staged set,
    and create one documentation commit.
13. [x] Complete the separately authorized push, PR creation, and merge gates,
    then refresh target containment before the parent marks S79 ported.
14. [ ] Treat branch deletion, tag operations, and worktree cleanup as later
    independent authorization gates.

## Validation

Run the task-context validation from the protected sync root, where this
uncommitted child task exists:

```powershell
python ./.trellis/scripts/task.py validate .trellis/tasks/08-30-port-s79-oracle-scene-registration-spec
```

Run the target behavior and diff checks from the isolated target-derived
worktree:

```powershell
pnpm --filter @figit/oracle-harness check-types
pnpm --filter @figit/oracle-harness test
pnpm oracle:parity
pnpm lint
git diff --check
git diff --name-only
```

Also verify Markdown heading/fence consistency, exact package names, the named
manifest test, the two-projection wording, and before/after preservation
digests. Before a commit, repeat the path assertion against `git diff --cached`.

## Review Gates

- Fresh target pin and isolated-worktree gate.
- Exactly-two-owned-files gate.
- Dual-projection semantic completeness gate.
- Independent unit-suite and parity gate.
- Dirty-root and pre-existing-worktree preservation gate.
- Independent `trellis-check` gate.
- Separate commit, publication, integration, and cleanup authorization gates.

## Rollback Points

- Before commit authorization, discard only the isolated two-file diff after
  explicit approval; do not touch the sync root.
- After commit, revert the single S79 documentation commit if authorized.
- Worktree and branch cleanup are explicit operations, never automatic
  rollback steps.
