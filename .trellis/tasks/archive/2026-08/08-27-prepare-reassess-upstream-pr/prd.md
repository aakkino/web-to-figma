# Prepare Reassess Upstream PR

## Goal

Review and publish the existing local `task/reassess-upstream-cherry-pick`
branch as a pull request to `origin/main`, preserve its exact nine-commit
history, and verify required CI without taking any merge, squash, release, or
unrelated sync action.

## Confirmed Baseline

- Read-only replan date: `2026-08-27`.
- The original publication baseline was
  `main@13948d88e3ec6a0939f39d8f69ce3ef637976a68`.
- Refreshed `origin/main` now resolves to
  `b40fcfc786f53043a4d5ac71c6b1c4af099ec4ff`, the authorized merge of CI fix
  PR #7. Relative to the original baseline it adds only
  `2cac473be19afeaf5375b2013df90138334a064a` plus its merge commit and changes
  only `.github/workflows/ci.yml` by adding the governance upstream fetch.
- Refreshed `upstream/main` resolves to
  `859efea8d7f8330783c6c4e3e520fd673e877336`.
- `task/reassess-upstream-cherry-pick` resolves to
  `c7c0be2f75a9473408663f2d140a1a9418d6c4ec`, is now `2` behind / `9` ahead
  of `origin/main`, and retains the exact strict nine-commit chain rooted at
  the original publication baseline.
- `origin/task/reassess-upstream-cherry-pick` and ready PR #6 both remain at
  the exact task head. PR #6 is open, mergeable, and has no auto-merge request.
- The implementation worktree at
  `D:\desktop_directory\web-to-figma\.tmp\reassess-upstream-cherry-pick` is
  clean and checked out at the expected task branch and SHA.
- The root worktree remains the dirty `sync/upstream-20260726@07bbcd75`; its
  checkout, index, files, and untracked content are protected from this task.
- The complete branch diff contains `81 files`, `5333 insertions`, and 442
  deletions. It includes the reviewed rendering implementation, tests,
  governance, archived Trellis evidence, changeset, and Session 28 journal.
- `sync/upstream-20260726` has `67` commits unique to `main`. None is in the
  task branch ancestry. The eleven deferred product candidates from the sync
  audit were also checked individually and none is an ancestor of the task
  branch.
- A conflict-free merge-tree of current `origin/main` and the task head keeps
  PR #6's exact product diff and contains the corrected governance fetch before
  `Enforce registered core deltas`.

## Required Commit Sequence

1. `9986a891f87755379c7bfb5f93ab4fc2ae8e3268` `feat(dom-to-figma): support advanced border rendering`
2. `a92dc5ca189343a8975a027ac1c1a559fc25700a` `feat(dom-to-figma): support advanced gradients`
3. `0e07a71105eb9e4400de063cd805d5e3600dc9ec` `feat(dom-to-figma): support filter and shadow parity`
4. `9826786c6dbb79c59f425e942e475a1ee88928e9` `fix(dom-to-figma): preserve fractional frame geometry`
5. `bf0bf8edd5a84db2072cb2843698d7b8ee6f959e` `feat(dom-to-figma): integrate rendering parity intake`
6. `993b34a13fcb3bf3729017c65a266bab8bb9b023` `feat(governance): verify upstream main compatibility`
7. `f6a16feb07a835fd44bd4e77e4c46467606315b0` `docs(spec): define safe color-matrix baking`
8. `a2a553935c8b437460e24146f447d1a911cc295f` `chore(task): archive reassess-upstream-cherry-pick`
9. `c7c0be2f75a9473408663f2d140a1a9418d6c4ec` `chore: record journal`

## Publication Status

- The exact task branch was published by non-force push and PR #6 was created
  ready for review with the required description and all nine commits.
- CI fix PR #7 was merged as
  `b40fcfc786f53043a4d5ac71c6b1c4af099ec4ff`; its main-push CI passed every
  job and step, including governance.
- The Release workflow's automatic force-update of
  `changeset-release/main` was restored with an exact force-with-lease to
  `2d56170822a51f0496f84591d91e6de4293a8c1c`. No npm package was published.
- GitHub did not automatically rerun PR #6 checks after the base advanced.
- After an authorized close/reopen, fresh runs `33037273358` and `33037273401`
  executed against the same task head. Both required checks, stable
  compatibility, upstream-main compatibility, and Tier-0 parity passed every
  substantive step. Preview retained the known missing-App 404.
- Fresh governance still failed before report generation. GitHub constructed
  that job from the unchanged PR head workflow, so the job contained no
  `Fetch upstream main read-only` step even though the current-main merge tree
  contains it. The checker therefore repeated the missing-object failure.
- The user explicitly approved preserving the exact nine-commit head and
  accepting this non-required governance result as a documented CI exception.
  Equivalent evidence is green: the exact task head passes governance locally
  after fetching upstream, CI fix PR #7 and its main-push run pass governance,
  and PR #6's fresh upstream-main compatibility job passes every step.
- The user subsequently granted separate final-merge authorization. PR #6 was
  merged with merge commit
  `ea3982da379e7fa722f10384770e498eb4392003`; its parents are current-main
  `b40fcfc786f53043a4d5ac71c6b1c4af099ec4ff` followed by the unchanged exact
  nine-commit task head `c7c0be2f75a9473408663f2d140a1a9418d6c4ec`.
- Main-push CI run `33041049507` passed every job: both required checks,
  governance with the real upstream fetch, stable compatibility, upstream-main
  compatibility, and Tier-0 parity. To preserve the exact head, the strict
  up-to-date flag was temporarily disabled with explicit authorization and
  restored immediately; required check definitions and admin enforcement were
  unchanged.
- The automatic Release run failed without publishing npm but briefly advanced
  `changeset-release/main`. The ref was restored with exact force-with-lease to
  `2d56170822a51f0496f84591d91e6de4293a8c1c`; published package version remains
  `0.2.4`.

## Requirements

- R1. Immediately before the close/reopen remote write, refresh only
  `origin/main`, `upstream/main`, and the remote task-branch observation.
  Reassert current main `b40fcfc786f53043a4d5ac71c6b1c4af099ec4ff`,
  task SHA `c7c0be2f75a9473408663f2d140a1a9418d6c4ec`, `2/9` topology,
  exact commit sequence, clean implementation worktree, and a conflict-free
  merge result containing the governance fetch. Any further drift returns the
  task to planning without changing PR #6.
- R2. Push only the exact local
  `task/reassess-upstream-cherry-pick` ref to the same branch name on `origin`,
  using a non-force push. Do not update any other local or remote ref.
- R3. Create one ready-for-review PR in `aakkino/web-to-figma` with base `main`
  and head `task/reassess-upstream-cherry-pick`. Preserve all nine commits; do
  not rebase, amend, reorder, squash, or add a publication-only commit.
- R4. The PR description must cover border/gradient/effects/fractional geometry
  scope, the six preserved fork contracts, full local validation evidence, the
  patch changeset, governance results, and the existing Windows CRLF full-lint
  baseline. It must explicitly state that whole-sync intake and the eleven
  deferred product candidates are excluded.
- R5. Before push, rerun the agreed local validation matrix from the clean
  implementation worktree. A failure stops the remote operation; do not edit
  baselines, tolerances, budgets, fingerprints, code, commits, or refs to make
  the gate pass.
- R6. After PR creation, wait for and inspect GitHub checks. The protected-main
  required contexts `Lint, typecheck, build, test` and `Tier-0 parity ratchet`
  must both succeed. Also verify the non-required governance, stable upstream,
  upstream-main adapter, and preview jobs rather than relying only on the PR's
  aggregate green state.
- R7. Do not enable auto-merge, merge, squash, publish npm packages, update a
  release branch, or alter `sync`, `backup`, `main`, tags, or any other refs.
  Final merge requires separate explicit authorization and must preserve the
  nine commits.
- R8. Update PR #6's stale base/topology wording, then close and immediately
  reopen the same PR solely to trigger fresh `pull_request` workflows against
  the corrected current-main merge tree. Do not change its head branch or
  commits.
- R9. Preserve the exact nine-commit head and document the approved
  non-required governance exception with its root cause and equivalent green
  evidence. Do not attempt another rerun, temporary origin ref, head update,
  merge, rebase, or synthetic check result.

## Acceptance Criteria

- [x] The final re-trigger drift gate reports current main and task SHAs,
  `2` behind / `9` ahead, the required commit order, the exact remote task
  branch, a clean implementation worktree, and the corrected conflict-free
  merge tree.
- [x] Local package/workspace test, type-check, build, oracle parity,
  stable/main adapters, governance checks, changed-file lint, and
  `git diff --check` pass with the documented CRLF exception limited to the
  pre-existing full-repository lint baseline.
- [x] `origin/task/reassess-upstream-cherry-pick` is created at exactly
  `c7c0be2f75a9473408663f2d140a1a9418d6c4ec` by a non-force push.
- [x] The PR has base `main`, the exact task head, all nine commits, the required
  description, and no unrelated sync/product/dirty-worktree content.
- [x] Both protected-main required checks pass, and every relevant CI job is
  inspected at job/step level. Stable and upstream-main compatibility must
  pass; governance and preview may retain only the explicitly approved,
  documented head-workflow and missing-App exceptions.
- [x] PR #6 is reopened at the same head with updated description, fresh CI
  checks from the corrected workflow, and no auto-merge request.
- [x] The approved non-required governance exception is recorded without
  changing the exact nine-commit PR head, together with the successful local,
  PR #7/main-push, and upstream-main compatibility evidence.
- [x] No auto-merge, squash, npm publish, or unrelated ref/worktree mutation
  occurs. The separately authorized final merge preserves all nine commits;
  temporary protection and automatic release-ref movement are fully restored.

## Out Of Scope

- Editing product code, tests, governance data, changesets, or existing commits.
- Promoting or reviewing the 67 sync-only commits or eleven deferred product
  candidates as a new intake.
- Cleaning, switching, staging, committing, or otherwise changing the dirty root
  worktree.
- Merging the PR before separate explicit authorization, enabling auto-merge,
  publishing npm packages, or performing release/version operations.

## Risks And Deferred Items

- PR creation triggers the repository's existing `Publish Preview` workflow,
  which publishes ephemeral packages to `pkg.pr.new`; it does not run the npm
  release workflow. The npm `Release` workflow only triggers on a push to
  `main`, which this task forbids.
- `Upstream main compatibility` is configured with job-level
  `continue-on-error` for this task branch name. Its steps must be inspected
  directly even when the overall workflow is green.
- Full-repository lint on Windows remains affected by the pre-existing CRLF
  baseline. Changed-file Biome lint and `git diff --check` are the release
  evidence for this branch unless CI exposes a genuine new lint regression.
- Any movement beyond current `origin/main@b40fcfc786f53043a4d5ac71c6b1c4af099ec4ff`,
  task HEAD, commit count/order, remote task branch, merge-tree content, or
  implementation worktree cleanliness invalidates this revised plan and
  requires another planning review.
- Reopening alone cannot apply a workflow-only base fix to this PR's governance
  job graph. The user approved the separately verified governance evidence and
  chose exact-nine-commit preservation; no further head or history mutation is
  authorized.
