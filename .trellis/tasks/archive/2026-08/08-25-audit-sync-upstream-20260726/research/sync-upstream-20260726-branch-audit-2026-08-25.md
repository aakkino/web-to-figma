# `sync/upstream-20260726` Branch Audit

## Scope And Bottom Line

This is a read-only audit of the local `sync/upstream-20260726` branch. It
does not approve a merge, a cherry-pick, a push, a branch rename, or deletion.

The branch is **not** a single current upstream-sync candidate:

- It has 47 commits after local `main`, but a PR to `origin/main` would expose
  67 commits because local `main` itself is 20 commits ahead of `origin/main`.
- The original July style-effects intake has a precise local L3 audit, but no
  current remote branch, matching public PR, CI evidence, or reachability from
  `origin/main`.
- The 31 commits after the 2026-07-27 intake closure are several independent
  fork product and research tasks. They do not inherit the style-intake audit.
- The registered upstream target is stale against the locally cached upstream
  ref, and the npm stable target is live-confirmed as stale. A new upstream
  review is required before any future `sync/upstream-*` promotion.

The historical decision that the mixed upstream commit `cc8d486` did not need
a direct cherry-pick remains a decision about that upstream candidate. It is
not a decision to discard the selectively adapted local commits already on
this branch.

## Audit Snapshot

Snapshot time: `2026-08-25T11:05:18+08:00`, before this report was created.
All Git commands used a process-local `safe.directory` setting and did not
switch branches, stage files, or alter history.

| Ref / value | Exact value | Audit interpretation |
| --- | --- | --- |
| Current branch / `HEAD` | `sync/upstream-20260726` / `07bbcd751c34a378caeb91b10681842f37c64b7d` | Local audit subject. |
| Local `main` | `bac116ad8a7ac18812cfa6af72b140c45c6dbf83` | Direct ancestor of the audit branch. |
| `origin/main` | `606ee8aa9ca4915ec28dd7853fd5b42283ff54ea` | Refreshed successfully; 20 commits behind local `main`. |
| Cached `upstream/main` | `859efea8d7f8330783c6c4e3e520fd673e877336` | Last locally available upstream observation; a live GitHub refresh failed during this audit. |
| `merge-base(main, sync)` | `bac116ad8a7ac18812cfa6af72b140c45c6dbf83` | The branch contains all local `main` history plus 47 commits. |
| `merge-base(origin/main, sync)` | `606ee8aa9ca4915ec28dd7853fd5b42283ff54ea` | A PR to `origin/main` contains 67 branch-side commits. |
| `merge-base(upstream/main, sync)` | `ac830db5b89d2e8e7eede86f9419303988ae1938` | Immutable governance baseline, not a fork promotion base. |
| Registry stable target | `@figit/dom-to-figma@0.2.1` / `0bf06ecce52aabc2bc696980b83040860630e35f` | Old reviewed target. |
| Cached reviewed stable tag | `@figit/dom-to-figma@0.2.1`: tag object `39b0ab498b33dbb665cfc684c08514bbf7410f83`, peeled commit `0bf06ecce52aabc2bc696980b83040860630e35f` | Exact local provenance for the registry target. |
| Live npm `latest` | `0.2.4` | Verified with `pnpm view @figit/dom-to-figma version --json`; a stable-target review is now required. |
| Cached latest stable tag | `@figit/dom-to-figma@0.2.4`: tag object `a312898056343d6bceda0263cfe7a6fdb981d004`, peeled commit `859efea8d7f8330783c6c4e3e520fd673e877336` | Cached Git tag agrees with the live npm version and cached upstream head. |
| Registry upstream target | `cc8d4864e6be53d0d5047fbf97283b112b3117f4` | Old reviewed target, 17 commits behind the cached `upstream/main`. |

Reproducible topology counts:

```text
git rev-list --left-right --count main...sync/upstream-20260726
# 0 47

git rev-list --left-right --count origin/main...sync/upstream-20260726
# 0 67

git rev-list --left-right --count upstream/main...sync/upstream-20260726
# 24 109
```

The complete read-only reproduction set was:

```text
git rev-parse HEAD main origin/main upstream/main
git merge-base main sync/upstream-20260726
git merge-base origin/main sync/upstream-20260726
git merge-base upstream/main sync/upstream-20260726
git rev-list --left-right --count <base>...sync/upstream-20260726
git cherry upstream/main sync/upstream-20260726
git log --cherry-pick --right-only --no-merges upstream/main...sync/upstream-20260726
git for-each-ref refs/tags
git status --porcelain=v2 --branch
pnpm view @figit/dom-to-figma version --json
```

`git cherry upstream/main sync/upstream-20260726` reported 108 `+` and zero
`-` entries; `git log --cherry-pick --right-only --no-merges` reported 108
commits. This is only a patch-ID signal, not merge evidence. It confirms that
the branch's intended, adapted ports are not represented as direct upstream
cherry-picks.

All 47 commits in `main..sync/upstream-20260726` are outside `origin/main`.
There is no local `origin/sync/upstream-20260726` tracking ref after a
successful `git fetch origin`; `remote.origin.fetch` maps every remote head to
`refs/remotes/origin/*`.

## External Evidence Limits

At the initial snapshot, `git fetch origin` succeeded, `git fetch upstream`
failed with a Schannel TLS handshake error, and read-only GitHub API queries
through `gh` returned `EOF`. During the independent check at
`2026-08-25T11:30:26+08:00`, the native web reader could access the fork's
[public PR list](https://github.com/aakkino/web-to-figma/pulls) and its
[closed-PR list](https://github.com/aakkino/web-to-figma/pulls?q=is%3Apr+is%3Aclosed).
They show zero open PRs and exactly one closed PR: unrelated
[#1](https://github.com/aakkino/web-to-figma/pull/1), from
`chore/archive-controlled-fork-versioning` into `main`. Therefore:

- The cached `859efea` ref proves a registry mismatch but is not asserted to
  be a fresh live GitHub observation at the snapshot time.
- The absence of an `origin/sync/upstream-20260726` ref is supported by the
  successful all-heads `origin` fetch.
- No public fork PR is associated with `sync/upstream-20260726`; consequently
  there is no applicable remote review or PR CI evidence to support L4.
- The live npm result is independently verified: `0.2.4`, not the pinned
  `0.2.1`.

The cached upstream range from `cc8d486` to `859efea` has 17 commits. It
contains upstream's merge of PR #33 as `83202a3` and release commits #34, #36,
and #50. This is a trigger for a future target review, not approval to select
any of those commits in this audit.

## Review-Level Rules

This report uses the task design's evidence scale:

| Level | Meaning |
| --- | --- |
| L0 | Commit exists only. |
| L1 | Task planning or archive provenance only. |
| L2 | Task-local test, check, or reproducible verification evidence. |
| L3 | Final integration or intake audit for a named, bounded scope. |
| L4 | Remote PR review and required CI evidence. |
| L5 | Reachable from `origin/main`. |

No ledger group reaches L4 or L5. An archived task is never treated as remote
review evidence.

Every Trellis task referenced below is archived and has `task.json` status
`completed`; every one also has null `commit` and `pr_url` fields. That state
provides provenance only and is not used by itself to assign L2 or L3.

All 47 ledger commits are linear, single-parent Git objects. Only the six
style-intake behavior/governance commits are explicitly named as independent
rollback points by the final intake audit. Later group boundaries are proposed
review units, not proof that each product commit can be ported independently.

## Task-Group Evidence Matrix

| Commit group | Trellis evidence and maximum level | What the evidence actually covers | Disposition |
| --- | --- | --- | --- |
| `f125c2d..c9b013f` (7) | `07-25-upstream-patch-retirement` candidate audit and `07-25-upstream-compat-architecture` final integration review; L3 for the reviewed `cc8d486` baseline/retirement decision. | `cc8d486` was a partial image-presentation overlap and not a safe retirement cherry-pick; compatibility architecture was locally reviewed. | Preserve as historical governance provenance. Re-evaluate targets before reusing any registry/policy changes in a promotion. |
| `aafd966..4c27bc2` (9) | `07-27-upstream-style-effects-intake/research/final-intake-audit-2026-07-27.md`; L3. | Six explicit behavior/governance commits: double border, shadows, color filter, gradients, fork integration, and adapter-main gate. The audit states no remote branch, push, or PR was made. | Keep as a separate, reviewed local intake candidate; do not merge the whole long-lived branch or treat it as a direct upstream cherry-pick. It needs a fresh current-target review. |
| `67ccefd..6f7ff8c` (5) | `07-31-eyeondesign-web-to-dom-image-diagnosis/research/diagnosis.md`; L2 reproducible live diagnosis. | CSS raster backgrounds and lazy sources were diagnosed; no product converter change was made by the diagnosis task. | Historical research only. Retain for provenance; do not promote alone. |
| `d663c6b..3bc2cd0` (4) | `07-31-eyeondesign-image-background-extraction-fix/implement.md`; L2. | Explicit record: core 225/225, adapter 56/56, package type/build, core-delta 6/6, stable/main consumers, and 52-scene parity passed at the old target. | Separate product cohort. Revalidate against the intended fork base and new upstream/stable targets before any PR. |
| `be47e62..c285e06` (3) | `07-31-extension-lazy-background-capture/implement.md`; L2 task-local completion/check evidence. | Lazy-background fixture, core resolver, adapter staging, and extension regression were scoped together. Result counts are not separately recorded in the archived plan. | Separate product cohort; rerun its affected tests before promotion. |
| `dfd432b..627b895` (3) | `07-31-browser-capture-lazy-activation-preflight/implement.md` plus `research/live-eyeondesign-smoke.md`; L2. | Adapter 77 tests, extension 35 tests, type/build, adapters, parity, and live smoke are recorded. | Separate product cohort; retain but revalidate after choosing the fork base. |
| `e1f134b..f82c4a5` (7) | `07-24-figit-capture-artifact` child record and `07-24-extension-capture-persistence/implement.md` parent integration validation; L3. | Artifact/output workflows, Chrome/Firefox build and smoke, persistence integration, and cross-layer parent gate are recorded. | Strongest later product candidate, but still has no L4/L5. Split artifact/persistence work from unrelated upstream history for a future PR. |
| `db6085e..ee62ac0` (3) | `08-01-stabilize-lazy-activation-edge/prd.md`; L2 self-recorded browser/adapter acceptance. | Bounded edge dwell and mutation-aware quiet window; no stand-alone detailed command output is archived. | Separate small product cohort; rerun focused browser/adapter checks before promotion. |
| `f547f8e..a3c8cfb` (3) | `08-03-research-upstream-pr-33-34/research/pr-33-34-cherry-pick-decision-2026-08-03.md`; L2. | Old snapshot decision: take no cherry-pick, merge, pin refresh, package update, or remote action. | Historical no-action research only. The frozen PR/ref conclusions are invalidated by later upstream/stable movement. |
| `49966ef..07bbcd7` (3) | `08-12-font-capture-diagnostics/prd.md`; L2 self-recorded UI test/type/build acceptance. | Presentation-only font-recovery diagnostics; task is archived but lacks remote review. | Separate extension UI cohort; rerun focused extension tests and builds before promotion. |

### Evidence Index

- [Patch-retirement candidate audit](../../archive/2026-07/07-25-upstream-patch-retirement/research/candidate-audit-2026-07-26.md)
- [Compatibility architecture final review](../../archive/2026-07/07-25-upstream-compat-architecture/research/final-integration-review-2026-07-26.md)
- [Style-effects final intake audit](../../archive/2026-07/07-27-upstream-style-effects-intake/research/final-intake-audit-2026-07-27.md)
- [Eye on Design diagnosis](../../archive/2026-07/07-31-eyeondesign-web-to-dom-image-diagnosis/research/diagnosis.md)
- [CSS background extraction validation](../../archive/2026-07/07-31-eyeondesign-image-background-extraction-fix/implement.md)
- [Lazy-background capture validation](../../archive/2026-07/07-31-extension-lazy-background-capture/implement.md)
- [Lazy-activation preflight validation](../../archive/2026-08/07-31-browser-capture-lazy-activation-preflight/implement.md)
- [Lazy-activation live smoke](../../archive/2026-08/07-31-browser-capture-lazy-activation-preflight/research/live-eyeondesign-smoke.md)
- [`.figit` artifact validation](../../archive/2026-08/07-24-figit-capture-artifact/implement.md)
- [Capture-persistence parent integration validation](../../archive/2026-08/07-24-extension-capture-persistence/implement.md)
- [Infinite-scroll edge acceptance](../../archive/2026-08/08-01-stabilize-lazy-activation-edge/prd.md)
- [PR #33/#34 no-action decision](../../archive/2026-08/08-03-research-upstream-pr-33-34/research/pr-33-34-cherry-pick-decision-2026-08-03.md)
- [Font-diagnostics acceptance](../../archive/2026-08/08-12-font-capture-diagnostics/prd.md)

The exact historical decision boundaries are deliberately distinct:

1. The 2026-07-26 candidate audit rejected direct `cc8d486` intake as a
   retirement action because it mixed gradients, text, oracle baselines, and
   only partial image-presentation semantics.
2. The 2026-07-27 task then performed a **local, selective adaptation** of
   style/effect capabilities. Its L3 audit covers `aafd966` through `f79f990`,
   with audit/archive/journal closure through `4c27bc2`.
3. The 2026-08-03 PR #33/#34 task was research only. It did not alter product
   code and explicitly prohibited a cherry-pick or target refresh on its old
   snapshot.

## Complete Commit Ledger

The ledger assigns every SHA in `main..sync/upstream-20260726` exactly once.
Category totals are: reviewed intake 6, upstream decision/research 4, fork
product implementation 11, diagnostic research 2, and task/journal metadata
24; total `6 + 4 + 11 + 2 + 24 = 47`.

| SHA | Primary category | Task / group | Recommended handling |
| --- | --- | --- | --- |
| `f125c2d391fcb287a4a01cbd61591806f843bd5a` | upstream decision/research | patch retirement baseline | Historical no-direct-cherry-pick decision. |
| `c0bbcb5daf511ae9d803d5155c8b3482930d4ab2` | task/journal metadata | patch retirement archive | Keep with audit provenance only. |
| `0873aaf1e0530f4b30fa251a1471d0e6bc76dfa0` | task/journal metadata | patch retirement journal | Keep with audit provenance only. |
| `ce7cb0e80a3491efed8056a1e27160a6dd45813f` | upstream decision/research | compatibility architecture review | Historical L3 architecture evidence. |
| `c7bb78e805d5d49485316b55452026528c010bae` | upstream decision/research | architecture approval | Historical L3 approval evidence. |
| `c620c12749bf19fee52d388acc597324dc77b3e8` | task/journal metadata | compatibility architecture archive | Keep with task history. |
| `c9b013f1b8d3e747912d8c832f4b77ea995cacbf` | task/journal metadata | compatibility architecture journal | Keep with task history. |
| `aafd9664fff7a857508e80c06145e31fbe3e8d74` | reviewed upstream intake | style effects: double border | Candidate only after fresh target review. |
| `b32e833a0e9e58971a99c89ced5a766751923b83` | reviewed upstream intake | style effects: shadows | Candidate only after fresh target review. |
| `d25c0d2434b3053173bde215815890d41dd635bd` | reviewed upstream intake | style effects: color matrix | Candidate only after fresh target review. |
| `553f591d5291ed01e905279726f6b7dadac48620` | reviewed upstream intake | style effects: gradients | Candidate only after fresh target review. |
| `e6f4c43ed90074ffa67b3c0d08276358615d6487` | reviewed upstream intake | style effects: fork integration | Candidate only after fresh target review. |
| `f79f990ece72dfb7c66aa94c4d2ac7388518b7fd` | reviewed upstream intake | style effects: adapter-main gate | Candidate only after fresh target review. |
| `84f527a19d51af0b1ace4baaf238138de13c3a28` | task/journal metadata | style-effects audit | Retain as evidence for the six intake commits. |
| `ce894959cedeaea38227f89ebe3c531c40baa978` | task/journal metadata | style-effects archive | Retain with task history. |
| `4c27bc263aea054203442e1f13a87b95ab1f4c69` | task/journal metadata | style-effects journal closure | Boundary after which no intake evidence is inherited. |
| `67ccefd245bbe8f5d0dd4d66349795dedae922f9` | diagnostic research | Eye on Design diagnosis | Historical diagnosis only. |
| `95ef1f28a44fea84e8b33cac63a2947995858b64` | diagnostic research | image staging boundary | Historical diagnosis only. |
| `f02f861514809add68be00c93b6ac88e3ff4a7c1` | task/journal metadata | diagnosis archive | Keep with task history. |
| `7690af69c917fcbbeb95787116863c28438cdafe` | task/journal metadata | diagnosis journal | Keep with task history. |
| `6f7ff8c8ee48b276ac5dab97ccbaf59d2c0be430` | task/journal metadata | diagnosis manifest repair | Keep with task history. |
| `d663c6bee734382c75062ec4067e809b92345f12` | fork product implementation | CSS background extraction | Separate revalidation candidate. |
| `75f9bc0b122e0a55318b8b26ab6b883e11c02597` | fork product implementation | background capability registration | Carry only with its product cohort. |
| `9fb02ea5532b66fbe815cecc5cd03116197121c0` | fork product implementation | background staging contract | Carry only with its product cohort. |
| `3bc2cd06be5e45dacb6025720ff8b6be72da6998` | task/journal metadata | background extraction archive | Keep with task history. |
| `be47e62774179f582cffedbbfc6dd5198e293546` | fork product implementation | lazy-background fixture | Separate revalidation candidate. |
| `9df8d0b8c387471c83fadb72c7f195e5b7d5ac17` | fork product implementation | lazy-background capture | Separate revalidation candidate. |
| `c285e068d83633452c5bc8269e550c1c41161b18` | task/journal metadata | lazy-background archive | Keep with task history. |
| `dfd432b85ad83510efe4a892bc99fbaa03cdd051` | fork product implementation | lazy-activation preflight | Separate revalidation candidate. |
| `3bb1705a7e0f7f7d5f273ece178014e61df97c50` | task/journal metadata | preflight archive | Keep with task history. |
| `627b895128ba6378087c3d1c7661e56a5138e099` | task/journal metadata | preflight journal | Keep with task history. |
| `e1f134b0d022e13a530ad15e139e24373789c1cb` | fork product implementation | `.figit` capture artifact | Separate product PR candidate. |
| `468a72d1cbee8fc13fe77f0d439b25070e44823a` | task/journal metadata | artifact archive | Keep with task history. |
| `f51b3dbcface90a8ace38c26abd094b26b94705a` | task/journal metadata | artifact journal | Keep with task history. |
| `2361077a2ab5c7aa004007d597e20ba5a9ea2314` | fork product implementation | capture-persistence integration | Separate product PR candidate. |
| `e281719bb1aba2e9f626fbdfd492748f6618bf8c` | fork product implementation | capture integration contracts | Carry only with the persistence cohort. |
| `d373ab8f96ea008e9b1fe3fe50f5565b4b29d9c7` | task/journal metadata | persistence archive | Keep with task history. |
| `f82c4a5be1f8f80798c409d2450d4aaa0567e740` | task/journal metadata | persistence journal | Keep with task history. |
| `db6085e8b0d7946d1c7ad48881e782124d8a2fe0` | fork product implementation | infinite-scroll lazy edge | Small focused revalidation candidate. |
| `fec358978a2c6676fb2e2c89cfcf39e68845263d` | task/journal metadata | lazy-edge archive | Keep with task history. |
| `ee62ac0acc5413a2554eaf2b09b3a02f8945d75b` | task/journal metadata | lazy-edge journal | Keep with task history. |
| `f547f8ed915350030ec243d930e63d244b4898da` | upstream decision/research | PR #33/#34 research | Historical no-action record only. |
| `d38c4534fdf995b778b8605e32d97aa647b66863` | task/journal metadata | PR #33/#34 archive | Keep with task history. |
| `a3c8cfbb4c00ad9390098956cf62980df40ff711` | task/journal metadata | PR #33/#34 journal | Keep with task history. |
| `49966ef87924d3b0b2f4c3de92fc431d300bb9e9` | fork product implementation | font capture diagnostics | Separate extension UI candidate. |
| `990345a121d2946b201a219516caa89ccb575123` | task/journal metadata | font diagnostics archive | Keep with task history. |
| `07bbcd751c34a378caeb91b10681842f37c64b7d` | task/journal metadata | font diagnostics journal | Current branch tip at snapshot. |

## Working Tree Is Separate From The Ledger

The ledger excludes all uncommitted material. At the snapshot:

- Staged paths: none.
- Six tracked paths appeared as worktree-modified. Four have real content
  diffs: `.gitignore` (+1), `.trellis/spec/dom-to-figma/frontend/index.md`
  (+1), `.trellis/workspace/kino/index.md` (+4/-3), and
  `packages/fig-kiwi/src/clipboard.test.ts` (+11/-1).
- `packages/dom-to-figma/src/converter/classify.ts` and
  `packages/dom-to-figma/src/converter/classify.test.ts` appear as `.M`, but
  their worktree hashes equal their index hashes and `git diff --quiet` finds
  no content change. This matches a stat/line-ending normalization condition,
  not a converter delta.
- Normal untracked status reports Trellis/Codex/Claude platform directories,
  `.tmp/`, the active audit task directory, two additional archived tasks,
  `AGENTS.md`, `heho/`, `published-package-test/`, and two screenshot files.
  None is silently included in a promotion recommendation.
- The narrow ignored-status command emitted no `!!` entries. A full recursive
  ignored/untracked enumeration encounters pre-existing Windows
  `Filename too long` warnings under
  `.tmp/upstream-image-presentation/node_modules`; this audit records that
  limitation rather than claiming an exhaustive ignored-file count.

No `git add`, restore, clean, commit, or deletion was performed.

## Recommended Branch Disposition

1. **Freeze and retain this branch as an audit/reference source for now.** Do
   not delete, force-push, rebase, or open a whole-branch PR from it.
2. **Do not merge `sync/upstream-20260726` wholesale into `origin/main`.** It
   would combine the 20 unpublished local-`main` commits, the historical
   intake, several unrelated product cohorts, and task metadata in one 67
   commit-side PR.
3. **Resolve the fork base first.** A separately authorized decision must say
   whether and how `origin/main..main` is promoted. Future review branches
   should start from that approved, clean fork base.
4. **Treat the July style intake as its own local capability candidate.** The
   direct upstream `cc8d486` cherry-pick remains rejected; the selected local
   implementation is distinct. Before promotion, review the now-stale
   upstream/stable targets and rerun the blocking sync-branch gates.
5. **Split later product work by its existing task boundaries.** Background
   extraction, lazy backgrounds, lazy activation, capture persistence/artifact,
   edge stabilization, and font diagnostics each need their own current-base
   revalidation and PR decision. Their historical L2/L3 evidence is useful
   provenance, not current L4 approval.
6. **Create a new dated `sync/upstream-*` branch only for the next upstream
   intake**, from the then-approved `main`. It must not inherit this branch's
   unrelated product history.

Actions that require separate user authorization: branch creation/rename or
deletion, any cherry-pick/merge/rebase, target or registry update, test-driven
product changes, remote push/PR activity, or working-tree cleanup.

## Audit Validation Record

- `git rev-list --count main..sync/upstream-20260726` returned `47`.
- `git rev-list`-derived reachability check found `0` of the 47 commits in
  `origin/main`.
- The five category totals in the ledger sum to `47`; every row has one
  primary category.
- All 13 historical evidence paths in the evidence index were checked for
  existence in the current worktree.
- The cached `0.2.1` and `0.2.4` tag objects and peeled commits were reproduced
  with `git for-each-ref` and `git rev-parse`.
- The public fork PR index was independently checked; only unrelated PR #1 is
  present, so the audit branch has no L4 evidence.
- No historical product test suite was rerun; this is provenance and branch
  topology audit only.

Independent Trellis quality review completed on 2026-08-25. It verified the
47/47 ledger, refs, tags, task states, evidence paths, review levels, worktree
separation, and disposition. This local review must not be confused with a
remote PR review.
