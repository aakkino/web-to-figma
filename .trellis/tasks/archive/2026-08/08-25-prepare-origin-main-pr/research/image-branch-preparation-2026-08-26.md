# C5 Image Local Review Branch Preparation

## Result

- Branch: `review/local-main-image-20260826`
- Actual base: `9839c7e89ab9b7b146a0ccacaf34516887fb6e0a`
- New curated head: `5f85e2b1c29a3c69e37836bbf58f7f1c4d0342b1`
- Commits above base: 1
- Diff: 13 files, 190 insertions, 530 deletions
- Remote branch: absent
- Push/PR/merge: not performed

The branch passed focused and complete current-base promotion gates and is
ready for a separate normal-push authorization.

## Preconditions And Construction

A fresh `git fetch --prune origin` returned exit `0`; live `main` and
`origin/main` remained the accepted C4 merge commit
`9839c7e89ab9b7b146a0ccacaf34516887fb6e0a`. The target local,
remote-tracking, and live remote refs were absent, and `D:\w2f-c5` did not
exist.

Approved mapping and order:

```text
original aa6bbdca31f412753e57452d4bca1f57feeb12e4
+ original e8d928a9c1dff86afb871b43378710ec02116784
+ original cd3f0ded9f5505597d861949970cdd1c896db646
  -> prior curated 61888631fb9059f1c8cbb7d2d97e2ab03a105a6d
  -> current-base curated 5f85e2b1c29a3c69e37836bbf58f7f1c4d0342b1
```

The approved promotion validation intentionally combines the API retirement,
image presentation/cancellation behavior, and ownership governance into one
review and rollback unit. That one-commit structure was preserved rather than
splitting or compressing it differently.

An isolated LF worktree was created from the exact new base. Cherry-picking
the prior curated unit returned exit `0` without conflicts. The new commit's
parent is exactly the current base and its subject remains
`refactor(dom-to-figma): adopt reviewed adapter-owned image pipeline`. The
temporary upstream-to-`origin/main` branch configuration was removed.

## Exact Content And Exclusions

The changed paths are exactly:

```text
deleted: .changeset/staged-resource-pipeline.md
.trellis/spec/dom-to-figma/frontend/staged-resource-pipeline.md
docs/upstream-core-delta.json
packages/dom-to-figma/README.md
packages/dom-to-figma/src/converter/image-cache.ts
deleted: packages/dom-to-figma/src/converter/image-preparation.ts
packages/dom-to-figma/src/converter/nodes/image/converter.ts
packages/dom-to-figma/src/converter/nodes/image/loader.test.ts
packages/dom-to-figma/src/converter/nodes/image/loader.ts
packages/dom-to-figma/src/converter/nodes/image/presentation.test.ts
packages/dom-to-figma/src/converter/nodes/image/presentation.ts
packages/dom-to-figma/src/figma.image.browser.test.ts
packages/dom-to-figma/src/figma.ts
```

Every retained new-head blob and both deletion states are byte-identical to
prior curated C5. The stable patch ID for both prior and current-base patches
is `9823e2b535c24948ec2e8dfec9ee32c24ee94ae7`.

The candidate contains no `.trellis/tasks` or `.trellis/workspace` path and
does not import archive `9be7c21` or journal `bac116a`. Its commit-ID
intersection with the 47 sync-only commits is empty; its merge base with
`sync/upstream-20260726` is
`606ee8aa9ca4915ec28dd7853fd5b42283ff54ea`.

## Focused Gates

All commands returned exit `0`:

```text
pnpm install --frozen-lockfile
pnpm --filter @figit/dom-to-figma exec vitest run src/converter/nodes/image/loader.test.ts src/converter/nodes/image/presentation.test.ts src/figma.image.browser.test.ts
pnpm --filter @figit/browser-capture-adapter exec vitest run src/bridges/dom-to-figma.test.ts
pnpm upstream-core-delta:check --report .artifacts/c5-focused-governance.json
```

Results: image/object-fit/resource 19/19, adapter bridge 9/9, and governance
14 runtime / 8 test / 0 unmapped runtime paths.

## Full Gates

The candidate passed the complete sequence:

```text
pnpm lint --diagnostic-level=error --max-diagnostics=none
pnpm check-types
pnpm build
pnpm test
pnpm oracle:parity
pnpm upstream-core-delta:check --report .artifacts/c5-governance.json
pnpm upstream-core-delta:stable --verify-latest --report .artifacts/c5-stable.json
pnpm upstream-adapter:stable
pnpm upstream-core-delta:main --report .artifacts/c5-upstream-main.json
git ... diff 9839c7e8..5f85e2b1 --check
```

Results: lint 356 files; type-check and build 8 projects each; workspace tests
406 passed / 5 skipped / 0 failed; Tier-0 parity 46 scenes; governance 14
runtime / 8 test / 0 unmapped; stable `@figit/dom-to-figma@0.2.4` at
`859efea8...`; stable adapter passed; upstream main `859efea8...`; diff
whitespace passed.

The first stable `--verify-latest` attempt returned exit `1` solely because the
npm registry connection timed out. The exact command was retried without any
candidate or environment edit and returned exit `0`; all following gates also
returned exit `0`. This transient external fetch failure is not treated as a
candidate failure.

All reports identify head `5f85e2b1...` and contain zero errors. Artifact
SHA-256 values captured before worktree removal were:

```text
c5-focused-governance.json f95cd06d8bcb077ba3dc4fe68c68328a07a57c61e8661e1314d5b8ca0e2e4cd8
c5-governance.json         f95cd06d8bcb077ba3dc4fe68c68328a07a57c61e8661e1314d5b8ca0e2e4cd8
c5-stable.json             b8de1062d8c12d0e4a77e004bbedd7579e77bb15f88c02974c5c630e5ecfa657
c5-upstream-main.json      c138b302ccd22c32dc03c014ed24a01600035eae15679483d76c68729ace9d76
```

Focused and full governance artifacts are byte-identical.

## Rollback Unit

C5 must remain one review and rollback unit because the core image-preparation
API retirement depends on the already merged adapter fallback and is reviewed
together with image presentation/cancellation and ownership governance. Revert
the single current-base curated commit to roll back C5. C1+C2, C3, and C4 are
outside this rollback.

## Checkout And Cleanup Integrity

The isolated worktree was clean before standard removal. `git worktree remove
D:/w2f-c5` returned `255` because dependency content left the directory
non-empty, but its Git registration and `.git` file were removed. The residual
`D:\w2f-c5` was not force-deleted or recursively removed.

The shared checkout remained on `sync/upstream-20260726` at
`07bbcd751c34a378caeb91b10681842f37c64b7d`, with empty staged state and the
same six tracked dirty paths. No remote branch, push, PR, merge, force update,
main update, existing-temporary-directory deletion, or shared-checkout change
occurred.

The next remote state change is a normal push of this one branch and requires
separate explicit authorization.

## Independent Local Branch Review

At `2026-08-26T15:35:24+08:00`, an independent read-only review confirmed the
branch is exactly one commit above `9839c7e8...`, at `5f85e2b1...`, with 13
files and `+190/-530`. The three original commits form the recorded linear
sequence, and their changed-path union is exactly the candidate's 13-path
scope. Prior/new stable patch IDs both resolve to `9823e2b5...`; all 11
retained path blobs and both deletion states match the approved prior curated
C5 exactly.

The archived approved C5 reports provide a second content-derived check on all
four recorded artifact hashes. Replacing their sole prior-head SHA with the new
curated head reproduces each recorded current-base SHA-256 exactly, including
the identical focused/full governance hash. The reports therefore retain the
same zero-error 14 runtime / 8 test / 0 unmapped governance result, stable
`0.2.4` and upstream-main `859efea8...` targets. The validation record also
preserves the first stable command's npm connection timeout and exit `1`, then
the identical no-edit retry's exit `0`; it correctly classifies the first
attempt as a transient external fetch failure rather than hiding it or treating
it as a code failure.

The candidate has no task/workspace/archive/journal path, does not contain the
archive or journal commits, and has zero commit-ID intersection with the exact
47-commit local-main-to-sync range. A fresh diff whitespace check passed.

The branch has no configured upstream, remote-tracking/live remote ref, or PR.
Live/local `origin/main` remained `9839c7e8...`. The C5 worktree registration
and `.git` file are absent while the unmodified `D:\w2f-c5` dependency residual
remains. The shared checkout remained `sync/upstream-20260726@07bbcd75`, with
empty staged state and the same six tracked dirty paths. This review performed
no push, PR, merge, branch/code/ref change, or temporary-directory deletion.
C5 is ready only for a separately authorized normal push of this exact branch.

## Push Publication

Immediately before push, a fresh fetch confirmed live `main` and `origin/main`
remained `9839c7e8...`; the local branch remained one commit above it at
`5f85e2b1...`, and both remote-tracking and live remote refs were absent.

At `2026-08-26T15:38:27+08:00`, this exact normal non-force push returned exit
`0`:

```text
git ... push --set-upstream origin refs/heads/review/local-main-image-20260826:refs/heads/review/local-main-image-20260826
```

After a fresh fetch, local, remote-tracking, and live remote refs all resolved
exactly to `5f85e2b1c29a3c69e37836bbf58f7f1c4d0342b1`. The configured upstream is
`origin/review/local-main-image-20260826`, with ahead/behind `0/0`. The
remote-tracking reflog recorded:

```text
5f85e2b1c29a3c69e37836bbf58f7f1c4d0342b1
origin/review/local-main-image-20260826@{2026-08-26T15:38:33+08:00}
update by push
```

Live `main` and `origin/main` remained `9839c7e8...`. An all-state PR query for
the head returned `[]`; no PR was created or modified. No main/other-ref push,
force, merge, auto-merge, code change, branch deletion, temporary-directory
deletion, or shared-checkout change occurred.

Remote branch URL:

`https://github.com/aakkino/web-to-figma/tree/review/local-main-image-20260826`

The next remote state change is PR creation and requires separate explicit
authorization.

## PR Publication

Immediately before creation, live `main` remained `9839c7e8...`, all three
head refs remained `5f85e2b1...`, and an all-state query for the head branch
returned no existing PR.

At `2026-08-26T15:46:56+08:00`, `gh pr create` returned exit `0` and created
exactly one non-draft PR:

`https://github.com/aakkino/web-to-figma/pull/5`

GitHub records creation at `2026-08-26T07:47:03Z`. Post-creation verification
found PR #5 OPEN and unmerged with auto-merge disabled, base `main` at
`9839c7e8...`, head `review/local-main-image-20260826` at `5f85e2b1...`, one
commit, and the exact 13 approved files totaling 190 insertions and 530
deletions. Both approved file deletions are present. The title is
`refactor(dom-to-figma): align image resources and object-fit lifecycle`; the
live body is byte-identical to `research/image-pr-body-record.md` and states
that GitHub CI and review are pending.

All six initial checks were `IN_PROGRESS`: repository, Tier-0, governance,
stable, upstream-main, and preview. The repository and Tier-0 required checks
were both pending, so `mergeStateStatus` was `BLOCKED`. No CI completion or
merge readiness is claimed.

At the final read-only observation, Tier-0, governance, stable, and
upstream-main had completed successfully; repository remained `IN_PROGRESS`;
the non-required Preview had failed. One required check therefore remained
pending and the PR remained `BLOCKED`.

No push, force-push, PR edit after creation, merge, auto-merge, branch deletion,
code change, checkout switch, or temporary-directory deletion occurred. The
next gate is required CI and independent review; body sync and merge remain
separate authorization boundaries.

## Independent Push Review

At `2026-08-26T15:41:35+08:00`, an independent read-only review confirmed
local, remote-tracking, and live remote C5 refs all resolve exactly to
`5f85e2b1c29a3c69e37836bbf58f7f1c4d0342b1`. The local branch tracks
`origin/review/local-main-image-20260826` at ahead/behind `0/0`.

The target remote ref was absent before publication, and the remote-tracking
reflog records its creation as `update by push` at
`2026-08-26T15:38:33+08:00`. The exact recorded command uses a normal,
non-force, full source-to-destination refspec. The all-ref reflog since the
local review contains only this expected new ref, with no main or other-ref
update.

Live/local `origin/main` remained `9839c7e8...`, and an all-state PR query for
the C5 head/branch remained empty. The shared checkout remained
`sync/upstream-20260726@07bbcd75`, with empty staged state and the same six
tracked dirty paths. This review performed no push, PR write, merge,
auto-merge, branch/code/ref change, or temporary-directory deletion. The next
gate is separate authorization to create the C5 PR.

## PR CI Convergence And Independent Review

At `2026-08-26T15:50:33+08:00`, an independent read-only review confirmed all
five project gates had completed successfully: repository, Tier-0 parity,
governance, latest stable, and upstream main. Branch protection still requires
only `Lint, typecheck, build, test` and `Tier-0 parity ratchet`; both succeeded.

The remaining failed check is the non-required `Publish to pkg.pr.new` Preview.
Its failed-job log reports HTTP 404 because the `pkg-pr-new` GitHub App is not
installed on `aakkino/web-to-figma`; this is not a product or required-gate
failure. GitHub therefore reports the otherwise mergeable PR as `UNSTABLE`.

PR #5 remains OPEN, non-draft, unmerged, and without auto-merge. Its title,
base/head SHAs, one commit, exact 13 files, both approved deletions, and
`+190/-530` stat are unchanged. Live and local bodies remain
normalized-byte-identical with SHA-256
`297edd9df55554003eca84c04a28905be5ec59cc863d035d53c85e5884fbf67c`.
Scope, mapping, one-unit rollback, exclusions, local gates, and the transparent
stable npm timeout/no-edit retry account remain accurate, but the shared final
CI-pending sentence is now stale. Updating that live body requires separate
remote-write authorization; this review did not edit either the live PR or the
local body record.

Live/local `origin/main` remained `9839c7e8...`; local, remote-tracking, and
live C5 refs remained `5f85e2b1...`. The PR `updatedAt` remained equal to its
creation time, and no ref reflog entry appeared after PR creation. The shared
checkout remained `sync/upstream-20260726@07bbcd75`, with empty staged state and
the same six tracked dirty paths. No push, PR edit, merge, auto-merge,
branch/code/ref change, or temporary-directory deletion occurred.

Independent review is complete. The next authorization gate is a body-only CI
status sync. Merge remains a later, separate authorization boundary after that
sync is independently verified.

## PR Body CI Status Sync

The user separately authorized a body-only final status sync. At
`2026-08-26T15:54:38+08:00`, `gh pr edit 5 --body-file` returned exit `0`.
Only the obsolete CI/review paragraph changed. It now records all five
successful project gates and both successful required checks, the optional
Preview's HTTP 404 caused by the uninstalled pkg-pr-new App, the check's
non-required/non-compatibility status, and completed independent review. It
also keeps merge behind separate explicit authorization.

Scope, the three-original mapping, base/head, 13-file scope, both deletions,
exclusions, local gates, the stable timeout/retry record, and the single
rollback unit were unchanged. The updated task-local body SHA-256 is
`203c074868b9a062913d659eae12567158f370f0b26461e753f3cd926a3b2724`.

## Independent PR Body Sync Review

At `2026-08-26T15:57:08+08:00`, an independent read-only review confirmed the
obsolete CI-pending sentence is absent and the live body matches the task-local
record. Their normalized SHA-256 is
`72a4066f6cba5ac3ec5c9e9e3ddc048c0fb603987581d7ce166f97b622efad00`;
the file-byte hash above includes the record's on-disk line endings. Replacing
the new settled-status paragraph with the prior pending sentence reconstructs
the independently recorded pre-sync hash exactly, proving no other body
section drifted.

All five project gates and both required checks remain successful. The only
failure is the non-required Preview HTTP 404 caused by the missing pkg-pr-new
App. PR #5 remains OPEN, non-draft, unmerged, mergeable but `UNSTABLE`, and
without auto-merge. Its title, base/head, one commit, exact 13 files, both
approved deletions, and `+190/-530` stat are unchanged.

Live/local `origin/main` remained `9839c7e8...`; local, remote-tracking, and
live C5 refs remained `5f85e2b1...`. The shared checkout remained
`sync/upstream-20260726@07bbcd75`, with empty staged state and the same six
tracked dirty paths. This review performed no remote write, push, PR edit,
merge, auto-merge, branch/code/ref change, or temporary-directory deletion.
The body-only sync is independently verified, so C5 may enter its separately
authorized merge gate.

## Merge Publication And Final Topology

The user separately authorized the final merge. At
`2026-08-26T16:02:20+08:00`, the match-head-protected command
`gh pr merge 5 --repo aakkino/web-to-figma --merge --match-head-commit
5f85e2b1c29a3c69e37836bbf58f7f1c4d0342b1` returned exit `0`. GitHub records
PR #5 as MERGED at `2026-08-26T08:02:24Z`, with merge commit
`13948d88e3ec6a0939f39d8f69ce3ef637976a68`.

The merge commit has the exact ordered parents
`9839c7e89ab9b7b146a0ccacaf34516887fb6e0a` and
`5f85e2b1c29a3c69e37836bbf58f7f1c4d0342b1`. Its tree and the reviewed C5
head tree are both `e5aab1edd28663f82b5afd7e79c6a90404cb7e7b`. Live/local `origin/main`
resolved to the merge commit, C5 is reachable from it, and the local,
remote-tracking, and live remote C5 review branch remained at `5f85e2b1...`.

The complete promotion topology is now:

| Unit | PR | Reviewed head | Merge commit | Ordered parents |
| --- | --- | --- | --- | --- |
| C1+C2 | #2 | `5a953fdc...` | `c9e4e391...` | `606ee8aa...`, `5a953fdc...` |
| C3 | #3 | `49d8055e...` | `8291c6b1...` | `c9e4e391...`, `49d8055e...` |
| C4 | #4 | `16ea58b5...` | `9839c7e8...` | `8291c6b1...`, `16ea58b5...` |
| C5 | #5 | `5f85e2b1...` | `13948d88...` | `9839c7e8...`, `5f85e2b1...` |

PRs #2, #3, #4, and #5 are all MERGED. Each reviewed head and merge commit is
reachable from the new `origin/main`, the four merge commits form the exact
approved sequential chain, and every merge tree equals its reviewed head tree.
No branch was deleted and no extra push, force-push, code change, PR operation,
auto-merge, or shared-checkout mutation occurred.

The `prepare-origin-main-pr` implementation scope is complete. Independent
final checking remains required, and this task has not been archived.
