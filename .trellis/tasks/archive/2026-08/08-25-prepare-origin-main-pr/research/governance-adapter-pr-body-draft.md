# PR Body Record: Govern upstream core deltas and support the stable adapter

> Created as https://github.com/aakkino/web-to-figma/pull/2 at
> `2026-08-25T20:19:17+08:00`. The live body was synchronized after the two
> authorized CI-only fixes at `2026-08-25T21:15:13+08:00`; it begins at the
> Summary section below and matches it byte-for-byte. PR #2 was merged with
> merge commit `c9e4e3914dab262adcc4b37556543843e13708ab` at
> `2026-08-26T11:08:56+08:00`.

## Summary

- add the upstream core-delta registry, checker, tests, CI policy, and fork
  maintenance contract at the independently reviewed targets;
- add the vanilla stable-package adapter fallback and its executable consumer
  contract;
- keep governance and adapter work in one rollback unit because C1 alone does
  not contain the required `upstream-adapter:stable` gate.

## Base And Head

- Base: `606ee8aa9ca4915ec28dd7853fd5b42283ff54ea`
- Head: `5a953fdc0ddeb644957f0d1f2286a8d1e5db5bea`
- Review branch: `review/local-main-governance-adapter-20260825`
- Commits above base: 4

## Curated Mapping

- `41ff3991d65bf54e915b52df52dafa074cff6b7b` ->
  `81abcdfc47d0c6a61dff9d4f8b593fa61e47a10f` (C1 with the six reviewed target
  leaves)
- `86a83e9f33c202b506be6728bb4bcc4fef1a9d11` plus the retained documentation
  from split `f874f03fa656fc22d47cbbd47c07d8b335d261d9` ->
  `82787e6240ed4d4410e41c6c948ec4da6c511f22`

## Narrow CI Follow-ups

- `38450080b059b514baa49cf834797f23cbb84dc6` removes the redundant package
  script separators that Linux pnpm forwarded to the compatibility checker;
- `5a953fdc0ddeb644957f0d1f2286a8d1e5db5bea` fetches only the registry-selected
  stable tag from the authoritative upstream repository before the stable
  compatibility check.

Both follow-ups change only `.github/workflows/ci.yml` and preserve the
approved C1+C2 product, registry, and documentation content.

Excluded from this PR: C1/C2 task planning, archive moves, journals, and the
three task metadata paths in `f874f03f...`. No commit from the 47 sync-only
commits is included.

## Validation

- focused checker: 5/5 passed;
- adapter bridge: 8/8 passed;
- composed-dom and browser adapter builds passed;
- stable adapter consumer contract passed;
- repository lint, type-check, and build passed;
- workspace tests: 395 passed, 5 skipped, 0 failed;
- oracle parity: 46 scenes passed;
- governance: 15 runtime, 5 tests, 0 unmapped;
- stable `@figit/dom-to-figma@0.2.4` and reviewed upstream-main target checks
  passed.

Current PR CI is green for all project gates:

- Lint, typecheck, build, test;
- Tier-0 parity ratchet;
- Upstream core delta governance;
- Latest stable upstream compatibility, including the stable adapter contract;
- Upstream main compatibility.

`Publish to pkg.pr.new` fails because the `pkg-pr-new` GitHub App is not
installed on this fork. That optional preview is not GitHub-required and is not
a project compatibility gate.

Evidence:

- `.trellis/tasks/archive/2026-08/08-25-audit-local-main-20-commits/research/local-main-origin-main-commit-ledger-2026-08-25.md`
- `.trellis/tasks/archive/2026-08/08-25-review-upstream-compat-targets/research/target-review-2026-08-25.md`
- `.trellis/tasks/archive/2026-08/08-25-validate-local-main-promotion/research/promotion-validation-2026-08-25.md`
- `.trellis/tasks/08-25-prepare-origin-main-pr/research/governance-adapter-ci-diagnosis-2026-08-25.md`

## Rollback

Revert this PR as one unit. Do not retain C1 governance without the C2 stable
adapter gate. C3 traversal, C4 font, and C5 image changes are not included and
will be reconstructed only after this unit is merged and `origin/main` is
refreshed.
