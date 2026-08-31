# Implementation Plan: Promote BG1 to main

1. Reconfirm the recorded preservation snapshot and verify the BG1 worktree is
   clean at original reviewed head
   `5b906e214241300edd4beff08dfb67313005bbf2`.
2. In the isolated BG1 worktree, move only `background-repeat` before
   `background-position` in the identified `.background-card` rule. Verify the
   working diff changes no values or other lines, then run touched-file Biome.
3. Create one separate lint-only commit without amending or rewriting either
   reviewed commit. Record its SHA as the corrected reviewed head and verify the
   branch is exactly three commits ahead/zero behind with a clean worktree.
4. Read-only fetch `origin/main` and query GitHub for the source remote ref,
   existing PR, branch protection, merge methods, and required checks.
5. Stop if the target is not `dd91f18346d7326ab71c1a77769bfe7aed310af3`,
   the source is not exactly three commits ahead/zero behind, the source head is
   not the recorded corrected reviewed head, or any unapproved remote state
   already exists.
6. Re-run committed-shape local validation from the isolated BG1 worktree.
   Record every command, exit code, test count, resolved compatibility target,
   and Oracle result; distinguish the known Windows CRLF-wide lint limitation
   from touched-file Biome success.
7. Independently review the correction commit and exact base-to-head diff,
   changeset, core-delta
   registry/fingerprint, staged-resource spec, Oracle scoreboard/scene, and all
   exclusions. Stop on any product change requirement or weakened gate.
8. Present the push preflight and request explicit ordinary-push authorization.
9. After authorization, push `task/rebuild-bg1-css-raster-backgrounds` without
   force and verify the remote ref equals the corrected reviewed head.
10. Draft the PR title/body locally, verify its exact base/head and 22-file
   payload, then request explicit PR-creation authorization.
11. After authorization, create one PR targeting `main`; record its URL/number
   and verify GitHub reports the expected refs and commits.
12. Monitor all CI jobs to terminal state. Investigate failures without changing
    code, registry fingerprints, tolerances, baselines, or PR head unless the
    task returns to planning and receives fresh approval.
13. Reconfirm local and remote source heads equal `312c8389`, PR #14 remains at
    that head, `origin/main` remains `dd91f183`, and the isolated worktree is
    clean.
14. Add only the sorted five-line `img/img-03-css-background` object with
    height `180` and width `320` to
    `internal/oracle-harness/src/__snapshots__/scenes.test.ts.snap`. Run the
    owning stable-manifest test and verify the exact working diff.
15. Create one separate fourth snapshot-only commit without amending or
    rewriting the first three commits. Record its SHA as the final corrected
    reviewed head; verify zero behind/four ahead, a clean worktree, and an exact
    23-file base-to-head payload.
16. Re-run the complete local validation command matrix and independently review
    the fourth commit, full payload, governance reports, Oracle output,
    exclusions, and preservation state.
17. Present the corrected-head preflight and request explicit authorization for
    the ordinary non-force update push. After authorization, push and verify
    PR #14 advances to the exact final corrected reviewed head.
18. Regenerate the local PR body for the four-commit/23-file shape, independently
    verify it, and request explicit authorization for the material PR-body
    update. After authorization, update only the body and verify exact readback.
19. Monitor the replacement CI runs to terminal state. Stop on any material
    failure or stale required check.
20. Run the independent final committed-shape and PR metadata check; resolve all
    conversations and synchronize the PR body only with explicit authorization
    for a material update.
21. Present final checks/review/base/head evidence and request explicit merge
    authorization.
22. After authorization, merge with a merge commit through GitHub. Do not use
    squash, rebase merge, auto-merge, direct push, or protection bypass.
23. Refresh `origin/main`; verify reviewed-head and merge-commit ancestry, final
    PR state, exact payload containment, and preservation snapshots.
24. Record PR URL, merge commit, final main SHA, CI conclusions, review result,
    rollback, and containment in this task; reconcile archived BG1 and both
    governance parents while leaving BG2 deferred.
25. Run the full Trellis check and finish flow for this promotion task.

## Local Validation Commands

```powershell
pnpm exec biome check <exact-bg1-touched-files>
pnpm --filter @aakkino/dom-to-figma test
pnpm --filter @aakkino/dom-to-figma check-types
pnpm --filter @aakkino/dom-to-figma build
pnpm --filter @figit/browser-capture-adapter test
pnpm --filter @figit/browser-capture-adapter check-types
pnpm --filter @figit/browser-capture-adapter build
pnpm --filter extension test
pnpm --filter extension check-types
pnpm --filter extension build
pnpm --filter extension build:firefox
pnpm test:upstream-core-delta
pnpm upstream-core-delta:check -- --report .artifacts/bg1-promotion-core-delta.json
pnpm upstream-core-delta:stable -- --verify-latest --report .artifacts/bg1-promotion-stable.json
pnpm upstream-adapter:stable
pnpm upstream-core-delta:main -- --report .artifacts/bg1-promotion-upstream-main.json
pnpm upstream-adapter:main
pnpm oracle:parity
git diff --check origin/main...HEAD
```

## Stop Conditions

- Remote or local base/head identity differs from the revised manifest.
- The fourth correction changes anything beyond the approved stable manifest
  object, or the source worktree/payload differs from the recorded final shape.
- Promotion requires other product edits, history rewriting, force-push, protection
  bypass, direct `main` push, or an unapproved remote state transition.
- Any replacement material CI job fails or is skipped, except a documented advisory preview
  infrastructure failure covered by the successful repository build.
- Required checks are stale, review conversations remain unresolved, or GitHub
  cannot produce a merge commit preserving the final corrected reviewed head.
- Post-merge ancestry, payload containment, or unrelated-root preservation does
  not match the recorded preflight.

## Rollback Points

- Before push: no remote state exists; leave the local branch unchanged.
- After push, before PR: delete the remote branch only with explicit authority.
- After PR, before merge: close the PR and retain or delete the remote branch as
  separately authorized; `main` remains unchanged.
- After merge: create a reviewed revert PR for the merge commit; never rewrite
  `main` or silently reopen BG1 implementation.
