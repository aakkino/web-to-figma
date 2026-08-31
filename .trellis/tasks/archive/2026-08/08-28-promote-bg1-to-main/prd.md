# Promote BG1 to main

## Goal

Promote the already reviewed BG1 local delivery through an auditable GitHub PR
and prove that the selected `origin/main` contains the exact BG1 patch before
BG2 can be considered for separate planning.

## Background

The archived `08-28-rebuild-bg1-css-raster-backgrounds` task completed local
implementation and validation but did not own remote publication. Its source
branch is clean and contains exactly two commits above the planning base:

- implementation: `30d33b9131e1775bc54c53a6afe4548a3fd2dc71`;
- reviewed head: `5b906e214241300edd4beff08dfb67313005bbf2`.

Read-only planning inspection on 2026-08-28 confirmed:

- local and remote target: `main` / `origin/main` at
  `dd91f18346d7326ab71c1a77769bfe7aed310af3`;
- source branch: `task/rebuild-bg1-css-raster-backgrounds`, two commits ahead
  and zero commits behind `origin/main`;
- source worktree: `.tmp/rebuild-bg1-css-raster-backgrounds`, clean;
- remote source branch: absent;
- existing PR for the source branch: none;
- diff: 22 files, 2,626 insertions, 78 deletions;
- required GitHub checks: `Lint, typecheck, build, test` and
  `Tier-0 parity ratchet`, with strict up-to-date enforcement;
- force-push and branch deletion are disabled, conversation resolution is
  required, and branch protection applies to administrators.

The first authorized pre-push validation stopped before any remote mutation:
touched-file Biome found `assist/source/useSortedProperties` in
`packages/dom-to-figma/scripts/oracle-scenes/img/img-03-css-background.html`.
The user approved a separate third commit that only moves `background-repeat`
before `background-position`; it must not change either declaration's value or
the rendered scene.

PR #14 was then created at corrected head
`312c8389ee25eca74e653178fba5b9bb85ae8f7e`. Five CI jobs passed, but the
required repository gate found that the new `img/img-03-css-background` scene
was missing from the stable id/size manifest snapshot. The user approved a
separate fourth correction strategy limited to adding that scene as
`height: 180`, `id: "img/img-03-css-background"`, `width: 320` in the owning
snapshot; implementation still waits for approval of the revised final plan.

## Requirements

- Preserve the two reviewed BG1 commits unchanged and add exactly one third
  lint-only correction commit. Its only product diff may reorder
  `background-repeat` before `background-position` in the identified Oracle
  scene; do not add BG2, LA, CP, unrelated formatting, lockfile,
  release-workflow, or dirty-root content.
- Preserve all three current commits unchanged and add exactly one fourth
  snapshot-only correction commit. Its only diff may add the five-line stable
  manifest object for `img/img-03-css-background` with height `180` and width
  `320` after `img/img-02-object-fit`; it may not update any other snapshot,
  scene, baseline, tolerance, test, or product file.
- Refresh `origin/main` immediately before the first remote mutation and bind
  all evidence to exact base and head SHAs.
- Before the fourth correction, require local and remote source heads to equal
  `312c8389ee25eca74e653178fba5b9bb85ae8f7e`. After committing it, record the
  final corrected reviewed head and require all later preflight evidence to
  match it. If `origin/main` differs from the planning target or any identity
  check fails, stop and return to planning. Do not rebase, merge, cherry-pick,
  amend, or reconstruct automatically.
- Revalidate the committed branch against the actual PR base before push. The
  validation must cover touched-file formatting, core and adapter tests/types/
  builds, extension compatibility, upstream delta governance, stable and main
  adapter compatibility, Oracle parity, and whitespace integrity.
- Keep the dirty sync root untouched. Run promotion work from the existing clean
  BG1 worktree or another explicitly approved isolated worktree.
- Obtain separate explicit authorization before each remote mutation class:
  ordinary push, PR creation or material PR update, and merge. Planning or task
  activation alone authorizes none of them.
- Push the existing source branch without force. The remote ref must resolve to
  the recorded final corrected reviewed head immediately after the authorized
  update push.
- Create one PR targeting `main`. Its body must record scope, exclusions,
  base/head SHAs, all commit identities, validation evidence, changeset,
  compatibility contract, rollback unit, and the BG2 dependency.
- Require all material CI jobs to pass: repository gate, upstream core-delta
  governance, latest stable compatibility, upstream-main compatibility, and
  Tier-0 parity. The pkg.pr.new preview is advisory only when its failure is
  demonstrably infrastructure/permission-related and its build is covered by
  the repository gate.
- Resolve all review conversations and perform an independent committed-shape
  review before requesting merge authorization.
- Use a merge commit so the reviewed implementation and governance commits
  remain reachable as distinct ancestors. Do not squash, rebase-merge, bypass
  protection, directly push `main`, or enable auto-merge without authorization.
- After merge, refresh remote refs and prove both the final corrected reviewed head
  and GitHub's reported merge commit are contained in `origin/main`. Record the PR URL,
  merge identity, checks, final main SHA, and rollback procedure in this task
  and reconcile the two parent governance tasks.
- Keep BG2 deferred until this task is checked, committed, archived, and the
  user separately authorizes BG2 planning.

## Acceptance Criteria

- [x] Preflight records exact local/remote base, original, interim, and final
      corrected source heads, four-commit ancestry, clean worktree, remote-branch
      absence/presence, and existing PR state.
- [x] The third commit contains only the approved CSS declaration reorder,
      passes touched-file Biome, and preserves declaration values and scene
      behavior.
- [x] The fourth commit contains only the approved stable manifest object,
      records `img/img-03-css-background` as `320x180`, and makes the stable
      id/size manifest test pass without updating unrelated snapshots.
- [x] The committed BG1 shape passes the approved local promotion gate on the
      actual PR base without tolerance, fingerprint, or baseline relaxation.
- [x] An explicitly authorized ordinary push creates the exact remote source
      ref; no force-push or direct `main` push occurs.
- [x] An explicitly authorized PR targets `main` and accurately records scope,
      commits, validation, changeset, compatibility, rollback, and exclusions.
- [x] Repository, core-delta, stable, upstream-main, and Tier-0 CI jobs pass;
      required checks are current for the final head.
- [x] Independent review finds no unresolved scope, correctness, privacy,
      compatibility, release, or governance issue, and all conversations are
      resolved.
- [x] An explicitly authorized merge commit preserves both original reviewed
      BG1 commits plus both reviewed correction commits and does not bypass
      branch protection.
- [x] Refreshed `origin/main` contains the final corrected reviewed BG1 head and
      recorded merge commit, with final target SHA and rollback evidence stored
      in the task.
- [x] BG1, the execution-governance container, and the top-level governance task
      agree on PR/merge/containment state; BG2 remains deferred pending separate
      planning authorization.
- [x] Root branch/HEAD, staged state, tracked dirty hashes, and unrelated
      worktree occupancy remain unchanged.

## Out Of Scope

- Product-code changes beyond the approved declaration reorder and stable
  manifest object, new BG1 behavior, test weakening, baseline relaxation, or
  changeset/version edits.
- BG2 lazy-background behavior or planning authorization.
- LA1/LA2, CP1/CP2, FD1 follow-up, package registry migration, release workflow,
  lockfiles, or unrelated cleanup.
- Direct `main` push, force-push, auto-merge, protection bypass, or automatic
  response to target drift.

## Key Decisions

- The archived BG1 task owns local implementation; this task exclusively owns
  remote promotion and target-line proof.
- The current three commits through `312c8389` remain immutable promotion
  inputs. One separate snapshot-only correction commit is permitted while the
  target remains `dd91f18346d7326ab71c1a77769bfe7aed310af3`; its SHA becomes
  the final corrected reviewed head after independent review.
- Remote mutations are three separate approval gates: push, PR, and merge.
- Merge commit is the required merge method because it preserves reviewed patch
  identity and matches the repository's established promotion history.
- Target drift is a planning stop condition, not permission to rewrite history.
- The lint-only correction, initial push, and PR creation are complete. The user
  approved the snapshot-only correction strategy on 2026-08-28, but because it
  materially changes the reviewed head, payload, and PR body, implementation
  waits for a subsequent approval of this revised final planning summary.
