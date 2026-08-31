# Promote FD1 font diagnostics to main

## Goal

Promote the already reviewed FD1 font-mismatch diagnostics onto the current
`main` line through one auditable pull request while preserving the later
BG1/BG2, LA1/LA2, and CP1/CP2 outcomes and the unrelated dirty sync checkout.

## Background

The archived `08-28-rebuild-fd1-font-diagnostics` task rebuilt FD1 against
`main@dd91f18346d7326ab71c1a77769bfe7aed310af3` and produced reviewed commit
`62eef8de9ff01b4d58c905a8f8e2949da00703b8`. Its focused diagnostics tests,
extension tests, type-check, Chrome MV3 build, Firefox MV2 build, directed
Biome, privacy review, and `git diff --check` passed, but the task did not own
remote publication and no live-extension smoke was performed.

Read-only planning preflight on 2026-08-29 established:

- the PR target repository is the maintained fork
  `aakkino/web-to-figma`; `figitdesign/web-to-figma` is the upstream
  compatibility reference and is not this promotion's PR base repository;
- current local and remote target is
  `origin/main@decde39a60a220d6ea853f04c3893a0446fa76bf`;
- the preserved FD1 branch/worktree is clean at `62eef8d`, 14 commits behind
  and one commit ahead of the target, with common base `dd91f183`;
- the remote FD1 branch and any FD1 pull request are absent;
- the reviewed payload remains four extension presentation/test files;
- both `app.tsx` and `vitest.config.ts` changed on main after the FD1 base, but
  the read-only three-way preview contains no conflict marker;
- GitHub permits merge commits, preserves merged source branches, and the
  latest main-line PR used six successful checks.

## Requirements

- Preserve `62eef8d` as the reviewed FD1 implementation identity. Do not amend,
  rebase, squash, cherry-pick, or reconstruct it.
- Refresh `origin/main` immediately before local reconciliation. If it differs
  from the recorded planning target, inspect the drift and return to planning
  before changing the FD1 branch.
- Reconcile the current target by merging the exact refreshed `origin/main`
  into `task/rebuild-fd1-font-diagnostics` in its isolated clean worktree.
  Preserve current main behavior and tests while retaining only the approved
  FD1 presentation/test delta.
- The reconciled `app.tsx` must retain current capture, artifact, output,
  settings, lazy-activation, and controller behavior and add only the reviewed
  font-recovery diagnostics integration. The reconciled Vitest configuration
  must preserve every current project/test entry and include the FD1 test.
- Keep the product boundary to the existing four FD1 files unless a required
  merge-resolution or failing gate proves that current contracts require a
  wider change. Any wider product, adapter, converter, storage, messaging,
  permission, lockfile, release, baseline, or unrelated test change returns to
  planning and requires fresh approval.
- Re-run the focused privacy/UI tests, complete extension package gate, both
  browser builds, directed Biome, repository gates, and whitespace checks on
  the reconciled committed shape. Perform a real-extension smoke covering the
  font-recovery workspace before merge, or stop and record the missing gate.
- Keep the dirty root checkout untouched. Do not stage, normalize, stash,
  clean, move, delete, or rewrite unrelated files, branches, or worktrees.
- Treat ordinary push, PR creation or material PR update, and merge as three
  separate remote mutation classes. Obtain explicit authorization immediately
  before each class; task activation does not authorize any of them.
- Push without force and create one PR in `aakkino/web-to-figma` targeting
  `main`. All GitHub CLI/API reads and writes for the promotion must name that
  repository explicitly; upstream `figitdesign/web-to-figma` drift is handled
  by the existing compatibility gate, not as PR-base drift. The PR must record
  the exact base, original FD1 commit, reconciled reviewed head, four-file
  payload, validation, privacy boundary, exclusions, rollback, and parent task.
- Require every material current-head check to pass and all review
  conversations to be resolved before requesting merge authorization.
- Merge through GitHub's merge-commit method. Do not squash, rebase-merge,
  directly push `main`, enable auto-merge, bypass protection, or delete the
  source branch without separate authorization.
- After merge, refresh `origin/main` and prove that `62eef8d`, the reconciled
  reviewed head, and GitHub's merge commit are ancestors. Record final PR,
  check, merge, target, preservation, and rollback evidence and reconcile the
  execution container and top-level governance parent.

## Acceptance Criteria

- [x] Preflight records exact local/remote target, source branch/head, common
      base, ahead/behind counts, clean worktree, remote branch, PR state, and
      dirty-root preservation snapshot.
- [x] Current `origin/main` is merged into the preserved FD1 branch without
      rewriting `62eef8d`; the resulting committed diff against the PR base is
      limited to the approved four FD1 files.
- [x] Current main behavior in `app.tsx` and all current Vitest entries remain
      intact while FD1 diagnostics and its focused test are present.
- [x] Diagnostics preserve the reviewed exact/fallback/unavailable summaries,
      command order, collapsed safe details, and Unicode `Cc`/`Cf` privacy
      filtering without exposing page text, code points, URLs, or raw errors.
- [x] Directed Biome, focused FD1 tests, the full extension test suite,
      extension type-check, Chrome MV3 build, Firefox MV2 build, repository
      lint/type/build/test gates, and `git diff --check` pass, or only a
      separately reproduced pre-existing repository-wide blocker is recorded.
- [x] A real-extension font-recovery smoke passes on the reconciled reviewed
      head before merge.
- [x] Separately authorized ordinary push and PR creation publish the exact
      reviewed head without force, direct-main mutation, or unrelated payload.
- [x] All material GitHub checks pass for the final head, independent review
      finds no unresolved scope/privacy/compatibility issue, and all review
      conversations are resolved.
- [x] A separately authorized merge commit preserves `62eef8d` and the final
      reviewed head; refreshed `origin/main` contains all required identities
      and the exact approved payload.
- [x] Promotion evidence and rollback are recorded in this task, both parent
      governance tasks are reconciled, and unrelated root/worktree state is
      unchanged.

## Out Of Scope

- New font-resolution behavior, adapter/converter contracts, diagnostic
  persistence, capture-artifact changes, output behavior, or extension
  redesign.
- Replaying historical S65 `49966ef8`, whole-branch sync integration, or any
  non-candidate sync commit.
- Changes to BG1/BG2, LA1/LA2, CP1/CP2, package releases, dependencies,
  lockfiles, permissions, governance fingerprints, Oracle baselines, or CI
  configuration.
- Force-push, direct `main` push, squash/rebase merge, protection bypass,
  automatic conflict resolution after target drift, source-branch deletion,
  worktree cleanup, or unrelated dirty-state cleanup.

## Key Decisions

- This task owns current-baseline reconciliation, remote promotion, and
  target-line proof; the archived FD1 task remains the immutable local-delivery
  record.
- Merge current `origin/main` into the preserved source branch so the reviewed
  FD1 commit remains reachable while later main-line work becomes the explicit
  reconciliation parent.
- The remote lifecycle has separate push, PR, and merge approvals.
- Any target drift, product-scope expansion, privacy regression, failed
  material gate, or unresolved review returns the task to planning.
