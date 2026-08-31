# FD1 promotion planning preflight

Captured read-only on 2026-08-29.

## Local Source And Target

- Source branch: `task/rebuild-fd1-font-diagnostics`.
- Source worktree:
  `D:/desktop_directory/web-to-figma/.tmp/rebuild-fd1-font-diagnostics`.
- Source head: `62eef8de9ff01b4d58c905a8f8e2949da00703b8`.
- Source worktree: clean.
- Original/common base:
  `dd91f18346d7326ab71c1a77769bfe7aed310af3`.
- Local `origin/main` and remote `refs/heads/main`:
  `decde39a60a220d6ea853f04c3893a0446fa76bf`.
- Ahead/behind relative to target: 14 behind, one ahead.

## Payload And Merge Preview

- Base-to-source payload: four files, 461 insertions, five deletions.
- Files: content `app.tsx`, the FD1 diagnostics module and test, and extension
  Vitest configuration.
- `app.tsx` and `vitest.config.ts` changed on both sides after the common base.
- Read-only `git merge-tree` preview reported both-side changes but emitted no
  conflict markers. This is planning evidence only; implementation must repeat
  the preview after refreshing the target and review the actual committed merge
  result semantically.

## Remote State

- Promotion/PR repository: `aakkino/web-to-figma` (the maintained fork).
- Compatibility upstream only: `figitdesign/web-to-figma`; its `main` is not
  the PR base for this task.
- Remote source branch: absent.
- Existing PR with head `task/rebuild-fd1-font-diagnostics`: absent.
- Repository default branch: `main`.
- Merge commits are enabled; merged source branches are not automatically
  deleted.
- Latest main-line PR #19 passed six checks: repository lint/type/build/test,
  local package tarballs, latest stable compatibility, Tier-0 parity, upstream
  core-delta governance, and upstream-main compatibility.

## Existing Delivery Evidence

- Archived FD1 review records directed Biome, 6/6 focused tests, 39/39
  extension tests including Chromium, extension type-check, Chrome MV3 build,
  Firefox MV2 build, and `git diff --check` as passed.
- Independent review corrected sanitizer coverage to reject all Unicode `Cc`
  and `Cf` characters and found no remaining issue.
- No manual live-extension smoke was performed during local FD1 delivery.
- The archived approval manifest defines one FD1 commit/PR rollback unit and
  prohibits literal use of historical S65.

## Planning Consequence

Preserve `62eef8d`, merge freshly resolved `origin/main` into the source branch,
validate and smoke the reconciled committed shape, then use separate push, PR,
and merge authorization gates. Any target drift, unexpected remote state,
conflict-driven scope expansion, or privacy/current-main regression returns to
planning.
