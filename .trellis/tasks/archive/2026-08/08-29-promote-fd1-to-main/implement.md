# Implementation Plan: Promote FD1 font diagnostics to main

1. Capture the dirty root branch/HEAD, staged paths, tracked dirty-file hashes,
   and all worktree branch/head/cleanliness identities without modifying them.
2. In the preserved FD1 worktree, verify a clean source at exact head
   `62eef8de9ff01b4d58c905a8f8e2949da00703b8`; verify the remote source branch
   and source PR are still absent in explicit repository
   `aakkino/web-to-figma`. Treat `figitdesign/web-to-figma` only as the
   upstream compatibility reference.
3. Fetch `origin/main` read-only, record its exact SHA, and compare it with the
   planning target `decde39a60a220d6ea853f04c3893a0446fa76bf`. On drift,
   inspect affected FD1 files and return to planning before branch mutation.
4. Re-run the three-way merge preview and exact four-file diff review. Stop if
   current contracts require a wider product change or if remote/source
   identities differ from the plan.
5. Merge the exact refreshed `origin/main` into
   `task/rebuild-fd1-font-diagnostics` without rebase, cherry-pick, amend, or
   history rewriting. If conflicts occur, preserve current-main behavior plus
   the reviewed FD1 integration only; return to planning before any scope
   expansion.
6. Review `app.tsx` and `vitest.config.ts` semantically, verify the two FD1
   modules are unchanged unless an approved conflict resolution required a
   minimal adjustment, and confirm the base-to-head payload is exactly the four
   approved files.
7. Run focused and extension validation, then the repository gate. Reproduce
   any claimed pre-existing repository-wide failure on the exact refreshed
   base; do not normalize or edit unrelated files to make a gate pass.
8. Independently review the committed reconciled head for scope, current-main
   preservation, privacy, tests, browser compatibility, remote readiness,
   exclusions, and dirty-root/worktree preservation. Record the reconciled
   head and its exact parents.
9. Run the real-extension font-recovery smoke on the reconciled head and record
   browser/build identity and observed exact/fallback/unavailable rendering,
   command availability/order, narrow-workspace usability, and absence of
   sensitive details. Stop before push if the smoke is missing or fails.
10. Present exact base/head/payload/validation/review/smoke evidence and request
    explicit ordinary-push authorization.
11. After authorization, push the source branch without force and verify the
    remote ref equals the reconciled reviewed head.
12. Draft and independently verify the PR title/body locally, including scope,
    exclusions, identities, validation, privacy, rollback, preservation, and
    parent-task linkage. Request explicit PR-creation authorization.
13. After authorization, create one PR in explicit repository
    `aakkino/web-to-figma` targeting `main`; pass `--repo
    aakkino/web-to-figma` to every GitHub CLI operation and verify its
    base/head, commits, exact four-file payload, merge policy, and auto-merge
    state.
14. Monitor all material CI jobs to terminal state. Investigate failures
    read-only first; any required head change returns to planning and requires
    a revised reviewed head plus fresh authorization.
15. Perform final committed-shape and PR metadata review, confirm all current
    checks pass, resolve all conversations, and verify base/head/remote/worktree
    identities have not drifted.
16. Present final CI/review/smoke/identity evidence and request explicit merge
    authorization.
17. After authorization, merge through GitHub with merge-commit method and the
    exact expected head. Do not squash, rebase-merge, auto-merge, bypass branch
    protection, directly push `main`, or delete the source branch.
18. Refresh `origin/main`; prove ancestry for `62eef8d`, the reconciled reviewed
    head, and GitHub merge commit; verify PR state and exact payload containment.
19. Recheck the root preservation snapshot and unrelated worktree occupancy.
    Record PR, checks, merge, final main, containment, and revert-PR rollback
    evidence in this task and reconcile both governance parents.
20. Run the Trellis check/finish flow, request archival authorization, and keep
    branch/worktree cleanup separately authorized.

## Validation Commands

```powershell
pnpm exec biome check `
  apps/extension/entrypoints/content/app.tsx `
  apps/extension/entrypoints/content/font-recovery-diagnostics.tsx `
  apps/extension/entrypoints/content/font-recovery-diagnostics.test.tsx `
  apps/extension/vitest.config.ts
pnpm --filter extension test
pnpm --filter extension check-types
pnpm --filter extension build
pnpm --filter extension build:firefox
pnpm lint
pnpm check-types
pnpm build
pnpm test
git diff --check origin/main...HEAD
```

The implementation record must capture exit codes, test counts, browser build
targets, the exact base/head used by each command, and any independently
reproduced pre-existing failure. The final PR's six material checks are the
repository gate, package-tarball inspection, stable compatibility, Tier-0
parity, upstream core-delta governance, and upstream-main compatibility.

## Stop Conditions

- Source head, remote branch/PR state, refreshed target, or preservation state
  differs from the recorded preflight.
- Reconciliation requires a fifth product file, changes current-main behavior,
  weakens privacy/tests, or rewrites `62eef8d`.
- A touched-file, focused FD1, extension, browser build, manual smoke, required
  CI, or independent review gate fails or is stale.
- Promotion requires force-push, direct-main mutation, squash/rebase merge,
  protection bypass, auto-merge, unapproved remote mutation, or implicit
  branch/worktree cleanup.
- Post-merge ancestry, payload containment, PR metadata, or dirty-root
  preservation cannot be proven.

## Rollback Points

- Before local merge: no FD1 state changes; retain the reviewed source.
- After local merge, before push: retain the reconciled local branch or create
  a new reviewed correction only through replanning; do not rewrite history.
- After push, before merge: retain/close the PR and retain/delete the remote
  branch only under separate authorization; `main` remains unchanged.
- After merge: create a reviewed revert PR for the GitHub merge commit.
