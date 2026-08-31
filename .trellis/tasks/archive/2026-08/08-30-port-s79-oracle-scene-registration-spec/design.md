# Design: S79 oracle scene-registration spec port

## Ownership And Boundary

This task is a direct child of
`08-30-reconcile-post-audit-sync-tail`. It owns only a semantic target-line port
to the oracle architecture and testing specifications. The parent retains
ownership of the S01-S85 ledger, final containment review, and source freeze.

Implementation occurs in an isolated detached worktree at a freshly pinned
`origin/main` SHA. The dirty `sync/upstream-20260726` checkout is evidence-only
and must not be used as the edit location.

## Sources Of Truth

Use evidence in this order:

1. The freshly pinned target versions of the two owned spec files.
2. Target implementation in `internal/oracle-harness/src/scenes.ts` and
   `src/scenes.test.ts`.
3. Target snapshot and scoreboard paths plus the target package scripts.
4. S79 and the parent research note as semantic evidence for the missing rule.

This ordering prevents an old source patch from replacing newer target wording
or package names.

## Contract Projection

```text
scene HTML set or size hint changes
  -> discoverScenes(): slash-separated id + resolved width/height + id sort
  -> stable manifest snapshot (registration completeness)
  -> scoreboard baseline (parity ratchet)

validation
  -> oracle-harness unit suite checks the manifest snapshot
  -> oracle:parity checks the scoreboard ratchet
  -> neither gate substitutes for the other
```

The architecture spec owns the complete contract and operational example. The
testing spec owns the named test and the non-substitution rule. No code or data
projection changes are needed because the target already implements both.

## Isolation And Preservation

Before creating the detached worktree, record the sync root branch/HEAD, index
hash, staged paths, dirty tracked-path digest, compact porcelain digest, and
existing worktree list. After each authorized mutation gate, recompute them.
The expected occupancy difference during implementation is exactly one known
isolated worktree; all pre-existing worktrees and root digests remain stable.

Stage only the two owned spec paths and only after commit authorization. A
staged-path assertion and cached diff review are mandatory before committing.

## Authorization Gates

1. Child implementation approval authorizes task activation, target refresh,
   isolated worktree creation, two-file editing, and validation only.
2. Commit requires a later explicit authorization after the checked diff is
   shown. Branch creation, if needed for that commit, is part of this gate.
3. Push and PR creation require explicit publication authorization.
4. Merge requires explicit integration authorization and refreshed checks.
5. Branch deletion, tag operations, and worktree cleanup remain separately
   authorized follow-ups.

No earlier parent-task approval satisfies any child gate.

## Compatibility And Rollback

The port changes guidance only and preserves target package naming. Before a
commit, rollback is removal of the isolated two-file diff. After a commit, the
port is one independently revertible documentation commit. Cleanup of the
isolated worktree is never implicit, even after rollback or merge.
