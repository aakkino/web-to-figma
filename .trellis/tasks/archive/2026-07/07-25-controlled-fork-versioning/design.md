# 技术设计

## Remote And Branch Topology

```text
figitdesign/web-to-figma
  upstream/main          fetch-only source reference
          |
          | explicit inspection and selected intake
          v
sync/upstream-YYYYMMDD   temporary review branch
          |
          | tests + PR
          v
aakkino/web-to-figma
  origin/main            stable fork product branch
          |
          +-- feat/*
          +-- fix/*
          +-- chore/*
```

`main` tracks only `origin/main`. Fetching `upstream` updates remote-tracking refs and cannot change the working tree. No automation, GitHub Sync Fork command, pull configuration, or scheduled workflow may merge `upstream/main` into fork `main`.

## Baselines And Tags

- `fork-base/ac830db` points to the current common upstream commit `ac830db5b89d2e8e7eede86f9419303988ae1938`.
- `fork-v0.1.0` points to the current fork HEAD at initialization (`6bf7b21` unless HEAD changes before approved execution).
- Both tags are annotated, verified before push, and treated as immutable.
- Repository tags describe fork history only. They do not change npm package versions or replace Changesets.

Future upstream review compares both commit topology and effective patch:

```powershell
git fetch upstream --prune
git log --left-right --cherry-pick --oneline main...upstream/main
git diff --stat main...upstream/main
```

## Upstream Intake Policy

1. Create `sync/upstream-YYYYMMDD` from the current fork `main`.
2. Inspect upstream commits and touched paths before applying anything.
3. Cherry-pick required fixes by default. Preserve upstream commit identity and record any conflict resolution in the sync PR.
4. A complete upstream merge is an exception for a coherent release or broad compatibility update; it still occurs only on the sync branch.
5. Run repository CI plus targeted extension, adapter and converter gates.
6. Merge the reviewed sync PR into fork `main`; never rebase published fork `main`.

The highest-risk conflict surface is `apps/extension`, which is considered fork-owned. Upstream extension changes are ported by intent rather than assumed mergeable. `packages/dom-to-figma` remains a replaceable upstream dependency: local changes should be optional generic hooks or independently upstreamable fixes, while session policy and product state stay in the private adapter and extension.

## Initial Migration

The initial operation snapshots exact preconditions before any mutation: HEAD, branch tracking, remotes, ahead/behind counts, tags, and porcelain status. It then creates the GitHub fork, normalizes remotes, creates tags, pushes committed history, verifies the GitHub parent relationship, and applies branch protection only after the initial push and CI check names exist.

The working tree is deliberately outside the migration data flow. No command uses `git add`, `git stash`, `git clean`, reset, checkout of user paths, or rebase. Remote changes and tag creation do not alter tracked or untracked file contents.

## Protection Policy

The fork `main` must reject force pushes and deletion. After the first fork CI run exposes stable status-check contexts, enable PR review and require the existing CI jobs:

- `Lint, typecheck, build, test`
- `Tier-0 parity ratchet`

If GitHub reports different check context names, query the successful check run and use the observed names rather than guessing. Do not enable a nonexistent required check that would permanently block merges.

## Compatibility Risks

- The current private adapter peer range expects core `>=0.3.0 <0.4.0`, while the workspace core is `0.2.0`. Fork initialization preserves this state and records it for a separate release/version task.
- `published-package-test` is a meaningful compatibility consumer, but its untracked directory includes generated and external assets. It is not part of the initial fork snapshot.
- If upstream rewrites its own history, the personal fork and baseline tags remain intact. A new sync branch must assess the rewritten range; fork `main` must not be reset to it.

## Rollback

Remote configuration is locally reversible using the preflight URL snapshot. Tag creation can be deleted locally and remotely only if verification fails before other work depends on it. The GitHub fork can remain as a harmless backup even if local remote normalization must be rolled back.

No rollback step may reset or clean the working tree. If fork creation succeeds but push or protection fails, keep `origin`/`upstream` state, report the exact failed stage, and resume idempotently after correction.
