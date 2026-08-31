# Fix pkg.pr.new Preview Workflow

## Goal

Restore successful PR preview publishing after the user-installed pkg.pr.new
GitHub App, with correct pnpm catalog packaging and without redundant main-push
preview runs.

## Requirements

- R1. Change only `.github/workflows/pkg-pr-new.yml`; do not modify product
  code, package versions, lockfiles, Release automation, or other refs.
- R2. Trigger preview publishing only for pull requests targeting `main`, for
  the normal opened, synchronized, reopened, and ready-for-review lifecycle.
- R3. Continue using the lockfile-installed `pkg-pr-new` through `pnpm exec`.
- R4. Pass `--pnpm` because this workspace uses pnpm `catalog:` dependencies.
- R5. Keep pnpm installation commands in preview output and update one PR
  comment rather than creating repeated comments.
- R6. Preserve least privilege with `permissions: {}`; publishing and comments
  remain owned by the installed pkg.pr.new GitHub App.
- R7. Publish the fix from an isolated clean worktree on a dedicated branch,
  create a ready-for-review PR to `main`, and inspect the real preview job.
- R8. Do not merge the fix PR without separate authorization, publish npm,
  alter Release automation, delete branches, enable auto-merge, or modify the
  dirty root worktree.

## Acceptance Criteria

- [x] Workflow syntax parses and the diff is limited to the one workflow file.
- [x] The publish command includes `--pnpm`, `--packageManager=pnpm`, and
  `--comment=update`, and no longer uses `--comment=on`.
- [x] A main push no longer matches the preview workflow trigger.
- [x] The ready PR runs Build and Publish preview successfully without the
  previous App-not-installed 404.
- [x] The run outputs pkg.pr.new preview package URLs and updates a PR comment.
- [x] Required CI remains green and npm `@figit/dom-to-figma` remains `0.2.4`.
- [x] No merge, npm release, Release workflow change, auto-merge, or unrelated
  ref/worktree mutation occurs.

## Evidence

- User confirmed the pkg.pr.new GitHub App installation on `2026-08-27`.
- Official setup: https://github.com/stackblitz-labs/pkg.pr.new#setup
- Existing dependency: `pkg-pr-new@0.0.70` in the committed pnpm lockfile.
- Workspace catalog: `pnpm-workspace.yaml` contains `catalog:` and package
  manifests consume `catalog:` specifiers.
- PR #8: https://github.com/aakkino/web-to-figma/pull/8
- Preview run `33042628840`: Build and Publish preview passed; pkg.pr.new bot
  created https://github.com/aakkino/web-to-figma/pull/8#issuecomment-5434790889.
- CI run `33042628846`: all required, governance, compatibility, and Tier-0
  jobs passed.
- The user separately authorized final merge. PR #8 merged as
  `f95e914c07dad8a38cae313b10dba74e62219975`, preserving its single commit.
- Main-push CI run `33042859093` passed every job. No Publish Preview workflow
  ran on the main push, confirming the trigger restriction.
- Automatic Release run `33042859048` retained the known create-PR permission
  failure and briefly moved `changeset-release/main`; exact force-with-lease
  restored it to `2d56170822a51f0496f84591d91e6de4293a8c1c`. npm remained
  `@figit/dom-to-figma@0.2.4`.
