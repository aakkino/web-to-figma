# FD1 Authorized Push Evidence

Captured on 2026-08-30. The user authorized only an ordinary non-force push of
the reconciled FD1 source branch. PR creation/update, merge, auto-merge,
branch deletion, and direct `main` mutation remained unauthorized.

## Pre-Push Gate

- Local source branch: `task/rebuild-fd1-font-diagnostics`.
- Local source head: `d3459aa954ef1b6035c1f370d628ac50b8263329`.
- Local source worktree: clean with zero staged diff.
- Reconciled parents:
  `62eef8de9ff01b4d58c905a8f8e2949da00703b8` and
  `decde39a60a220d6ea853f04c3893a0446fa76bf`.
- Local `origin/main` and live remote `refs/heads/main`:
  `decde39a60a220d6ea853f04c3893a0446fa76bf`.
- Remote source ref: absent.
- Open PRs with this source branch: `[]`.
- Dirty root remained
  `sync/upstream-20260726@9c949a4a7a7560b460562014232d982c1f21533c`
  with zero staged paths. The 17 tracked dirty-path hashes in
  `local-execution-evidence.md` remained exact.

## Authorized Mutation

The only remote mutation command was:

```powershell
git push --porcelain origin `
  refs/heads/task/rebuild-fd1-font-diagnostics:`
  refs/heads/task/rebuild-fd1-font-diagnostics
```

- Exit: 0.
- Result: `[new branch]`.
- No force option or force refspec was used.
- Remote branch:
  `https://github.com/aakkino/web-to-figma/tree/task/rebuild-fd1-font-diagnostics`.

## Immediate Readback

- Remote source ref:
  `d3459aa954ef1b6035c1f370d628ac50b8263329`.
- Remote `main` remained:
  `decde39a60a220d6ea853f04c3893a0446fa76bf`.
- Open source-branch PR query remained `[]`.
- Local source worktree remained clean at `d3459aa`.

No PR was created or updated. No merge, auto-merge, check rerun, direct-main
push, force-push, source deletion, or other remote mutation was performed.
