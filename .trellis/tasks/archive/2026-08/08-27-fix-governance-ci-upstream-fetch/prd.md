# Fix governance CI upstream fetch

## Goal

Make the governance CI job load the reviewed upstream history required for
absorbed-path verification, while leaving the existing nine-commit rendering
PR unchanged.

## Background

- PR #6 runs `Upstream core delta governance` from an origin-only checkout.
- `pnpm upstream-core-delta:check` compares each `absorbedUpstreamPaths` entry
  with `targets.upstreamMain.commit` by calling `git show`.
- The pinned commit `859efea8d7f8330783c6c4e3e520fd673e877336`
  is not reachable from any origin ref. A fresh origin-only clone reproduces
  the missing-object failure.
- The same CI workflow's `Upstream main compatibility` job fetches upstream
  main before running its checker and passes every step.

## Requirements

- R1. Create an isolated branch from the current `origin/main` and change only
  `.github/workflows/ci.yml` plus task-local Trellis records.
- R2. In `Upstream core delta governance`, fetch upstream main read-only after
  checkout/setup and before `Enforce registered core deltas`, reusing the
  established upstream-main compatibility pattern.
- R3. Do not change the checker, governance registry, pinned commits,
  fingerprints, absorbed paths, budgets, product code, tests, or baselines.
- R4. Verify that an origin-only checkout initially lacks the pinned upstream
  object, the added fetch makes it available, and
  `pnpm upstream-core-delta:check` then succeeds and writes its report.
- R5. Run focused workflow/diff checks plus repository lint and typecheck. Do
  not suppress unrelated failures or alter the Windows CRLF baseline.
- R6. Push the isolated CI branch with a non-force push and create a
  ready-for-review PR targeting `main`. Inspect all triggered CI jobs.
- R7. Do not modify, rebase, amend, force-push, close/reopen, or merge PR #6.
  Do not merge the CI-fix PR or enable auto-merge without separate approval.

## Acceptance Criteria

- [x] The fix is a minimal workflow-only production diff on a branch rooted at
  the refreshed `origin/main`.
- [x] An origin-only reproduction proves the pinned object is absent before
  the fetch and available afterward.
- [x] Local governance verification succeeds with 14 governed runtime paths,
  11 absorbed upstream paths, and 0 unmapped runtime paths.
- [x] Workflow structure, changed-file lint, repository typecheck, and
  `git diff --check` pass; any full-repository Windows formatter baseline is
  reported rather than edited.
- [x] A ready PR targets `main`, contains only the intended CI fix, and its
  governance job succeeds in GitHub Actions.
- [x] PR #6 remains open and ready at the exact nine-commit head, with no
  auto-merge, merge, squash, release, or unrelated ref changes.

## Completion Evidence

- PR #7 merged as `b40fcfc786f53043a4d5ac71c6b1c4af099ec4ff`, preserving the
  isolated workflow-only commit `2cac473be19afeaf5375b2013df90138334a064a`.
- PR #7 CI proved the governance job fetches the reviewed upstream commit and
  completes `Enforce registered core deltas` successfully.
- Main-push run `33041049507` passed lint, typecheck, build, tests, governance,
  stable/upstream-main compatibility, and Tier-0 parity after PR #6 merged.
- PR #6 subsequently merged unchanged as
  `ea3982da379e7fa722f10384770e498eb4392003`; no tenth product commit was added.

## Out Of Scope

- Merging the CI-fix PR.
- Retrying or changing the pkg.pr.new preview configuration.
- Advancing `main`, closing/reopening PR #6, or rerunning PR #6 CI.
- Adding a tenth commit to the existing rendering branch.

## Risks And Deferred Items

- The definitive proof is the new PR's GitHub Actions run because local clones
  already contain upstream objects after development fetches.
- Merging the fix advances `main` and invalidates PR #6's pinned-base planning
  assumptions. That merge and the subsequent PR #6 reassessment require new
  explicit authorization.
