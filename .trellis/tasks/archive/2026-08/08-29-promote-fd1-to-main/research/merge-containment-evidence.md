# FD1 Merge And Containment Evidence

Captured on 2026-08-30 after explicit authorization to merge only PR #20 in
`aakkino/web-to-figma` by GitHub merge commit, bound to expected head
`d3459aa954ef1b6035c1f370d628ac50b8263329`.

## Immediate Pre-Merge Guard

Every read used explicit repository `aakkino/web-to-figma` and showed:

- PR #20 was `OPEN`, not draft, `MERGEABLE`, and `CLEAN`;
- base was `main@decde39a60a220d6ea853f04c3893a0446fa76bf`;
- head was
  `task/rebuild-fd1-font-diagnostics@d3459aa954ef1b6035c1f370d628ac50b8263329`;
- payload remained exactly the approved four files, 461 insertions and five
  deletions;
- all six material checks were `COMPLETED/SUCCESS`;
- reviews, review comments, and GraphQL review threads were all empty arrays;
- auto-merge request was `null`;
- live fork `main` and source refs matched the bound base and head.

## Authorized Mutation

The only merge mutation was:

```powershell
gh pr merge 20 --repo aakkino/web-to-figma --merge `
  --match-head-commit d3459aa954ef1b6035c1f370d628ac50b8263329
```

Exit code was 0. The command did not include squash, rebase, auto-merge, admin
bypass, branch deletion, or direct-main push options.

## GitHub Result

- PR: <https://github.com/aakkino/web-to-figma/pull/20>.
- State: `MERGED` at `2026-08-30T01:45:10Z` by `aakkino`.
- GitHub merge commit:
  `687a8509969b24aba13ee414cc19b3d6aef1d20f`.
- Merge parents, in order:
  `decde39a60a220d6ea853f04c3893a0446fa76bf` and
  `d3459aa954ef1b6035c1f370d628ac50b8263329`.
- Merge subject:
  `Merge pull request #20 from aakkino/task/rebuild-fd1-font-diagnostics`.
- Auto-merge remained `null`; all six recorded checks remained successful.

## Ref And Ancestry Proof

`git fetch --no-tags origin main` advanced only the remote-tracking
`origin/main` from `decde39a` to the GitHub merge commit. Live fork `main` and
refreshed `origin/main` both resolved to
`687a8509969b24aba13ee414cc19b3d6aef1d20f`.

`git merge-base --is-ancestor <commit> origin/main` exited 0 for each:

- original reviewed FD1 implementation:
  `62eef8de9ff01b4d58c905a8f8e2949da00703b8`;
- reconciled reviewed head:
  `d3459aa954ef1b6035c1f370d628ac50b8263329`;
- GitHub merge commit:
  `687a8509969b24aba13ee414cc19b3d6aef1d20f`.

The remote source branch remains present at exactly `d3459aa`; it was not
deleted. The local FD1 worktree remains clean at the same commit.

## Exact Containment

The merge commit tree is byte-identical to the reconciled reviewed head tree.
Relative to first parent `decde39a`, the merge remains exactly four files,
461 insertions, and five deletions:

- modified `apps/extension/entrypoints/content/app.tsx`;
- added
  `apps/extension/entrypoints/content/font-recovery-diagnostics.test.tsx`;
- added `apps/extension/entrypoints/content/font-recovery-diagnostics.tsx`;
- modified `apps/extension/vitest.config.ts`.

The four merge blobs exactly matched the reviewed head blobs:

- `app.tsx`: `9ec22ebc70836b459a19937f5a53ee554be163f3`;
- diagnostics test: `6962e50a3b84200b800c8e4c3ae384194a4b86be`;
- diagnostics component: `d06a8272e5907d45b510d80365814767e1c51bc5`;
- Vitest config: `d02fd42d996ad605fa226905f78e31f455b1093c`.

## Preservation And Rollback

- Dirty root remained
  `sync/upstream-20260726@9c949a4a7a7560b460562014232d982c1f21533c`
  with zero staged paths.
- All 17 pre-execution tracked dirty-path SHA-256 values matched exactly after
  merge and containment verification.
- Registered worktree occupancy, unrelated branches, and unrelated heads were
  unchanged; the FD1 worktree remains present and clean at `d3459aa`.
- No branch/worktree cleanup or task archive was performed.

Rollback is a separately reviewed PR reverting GitHub merge commit
`687a8509969b24aba13ee414cc19b3d6aef1d20f`. Do not rewrite `main`,
force-push, or delete preservation evidence as rollback.

Remaining local governance work is final Trellis verification and parent-task
reconciliation. Archive and source branch/worktree cleanup remain separately
authorized operations.
