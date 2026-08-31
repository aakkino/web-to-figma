# FD1 PR Creation Evidence

Captured on 2026-08-30 after explicit authorization to create exactly one PR
in `aakkino/web-to-figma`. No authorization was given for PR updates, merge,
auto-merge, branch deletion, check reruns, or direct `main` mutation.

## Guarded Creation

Immediately before creation, explicit fork reads showed:

- `aakkino/web-to-figma:main`:
  `decde39a60a220d6ea853f04c3893a0446fa76bf`;
- `aakkino/web-to-figma:task/rebuild-fd1-font-diagnostics`:
  `d3459aa954ef1b6035c1f370d628ac50b8263329`;
- local source: clean at `d3459aa954ef1b6035c1f370d628ac50b8263329`;
- all existing PRs for the source branch: `[]`.

The single mutation used explicit repository, base, and head arguments:

```powershell
gh pr create --repo aakkino/web-to-figma `
  --base main `
  --head task/rebuild-fd1-font-diagnostics `
  --title "feat(extension): surface font recovery diagnostics" `
  --body $mechanicallyExtractedReviewedBody
```

Result: <https://github.com/aakkino/web-to-figma/pull/20>.

## Immediate Verification

- Number/state/draft: `#20`, `OPEN`, not draft.
- Base: `main@decde39a60a220d6ea853f04c3893a0446fa76bf`.
- Head:
  `task/rebuild-fd1-font-diagnostics@d3459aa954ef1b6035c1f370d628ac50b8263329`.
- Title exactly matched the reviewed title.
- Submitted body exactly matched the mechanically extracted local draft:
  4,458 characters, UTF-8 SHA-256
  `8209DE161A805A7578BA1C27A884B7C0CCD267FADE9600A3ABCF17791293F097`.
- PR commits were exactly the original reviewed implementation
  `62eef8de9ff01b4d58c905a8f8e2949da00703b8` and reconciled merge head
  `d3459aa954ef1b6035c1f370d628ac50b8263329`.
- Reconciled head parents remained exactly `62eef8d` and `decde39a`.
- GitHub reported `MERGEABLE`; `mergeStateStatus` was `BLOCKED` while required
  checks were in progress.
- Auto-merge request: `null`; repository auto-merge policy: disabled.
- Maintainer modification: disabled.
- Remote fork refs remained unchanged at the expected base and source SHAs.

## Exact Payload

GitHub and the local base-to-head comparison both reported exactly four files,
461 insertions, and five deletions:

- modified `apps/extension/entrypoints/content/app.tsx` (`+2`, `-5`);
- added
  `apps/extension/entrypoints/content/font-recovery-diagnostics.test.tsx`
  (`+193`);
- added `apps/extension/entrypoints/content/font-recovery-diagnostics.tsx`
  (`+265`);
- modified `apps/extension/vitest.config.ts` (`+1`).

## Merge Policy At Creation

- Merge commits, squash merges, and rebase merges were repository-enabled;
  the approved eventual method remains merge commit only.
- `main` required strict up-to-date status checks, including
  `Lint, typecheck, build, test` and `Tier-0 parity ratchet`.
- Conversation resolution was required and admin enforcement enabled.
- Force pushes and branch deletion were disabled.
- Six material checks started promptly and were monitored read-only; terminal
  results are recorded below when available.

## Check Results

All six material jobs reached terminal `COMPLETED/SUCCESS` without rerun,
cancellation, or other mutation:

- `Lint, typecheck, build, test`: passed in 1m31s,
  <https://github.com/aakkino/web-to-figma/actions/runs/33285354052/job/99187491723>;
- `Inspect local package tarballs`: passed in 40s,
  <https://github.com/aakkino/web-to-figma/actions/runs/33285354048/job/99187491620>;
- `Upstream core delta governance`: passed in 25s,
  <https://github.com/aakkino/web-to-figma/actions/runs/33285354052/job/99187491716>;
- `Latest stable upstream compatibility`: passed in 34s,
  <https://github.com/aakkino/web-to-figma/actions/runs/33285354052/job/99187491636>;
- `Upstream main compatibility`: passed in 37s,
  <https://github.com/aakkino/web-to-figma/actions/runs/33285354052/job/99187491777>;
- `Tier-0 parity ratchet`: passed in 1m2s,
  <https://github.com/aakkino/web-to-figma/actions/runs/33285354052/job/99187491689>.

## Terminal Readback

- PR remained `OPEN`, not draft, `MERGEABLE`, and `CLEAN`.
- Base/head remained exactly `decde39a` / `d3459aa`.
- The two commits and exact four-file payload remained unchanged.
- Auto-merge request remained `null`.
- Reviews and review comments were both empty arrays; no unresolved review
  conversation was present.
- Remote `main` and source refs remained exactly `decde39a` and `d3459aa`.
- Local preserved FD1 worktree remained clean at `d3459aa`.

No merge, PR update, auto-merge, branch deletion, check rerun/cancellation, or
direct-main mutation was performed. The next remote mutation gate is explicit
merge authorization after final review.
