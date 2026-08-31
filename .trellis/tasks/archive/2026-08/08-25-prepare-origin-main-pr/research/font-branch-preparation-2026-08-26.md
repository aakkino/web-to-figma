# C4 Font Local Review Branch Preparation

## Result

- Branch: `review/local-main-font-20260826`
- Actual base: `8291c6b1a8ab2d8e9e29e4cc567f4286a20415f2`
- New curated head: `16ea58b5681f2c599044c9fc257b04543b717103`
- Commits above base: 1
- Diff: 5 files, 172 insertions, 4 deletions
- Remote branch: absent
- Push/PR/merge: not performed

The branch passed focused and complete current-base promotion gates and is
ready for a separate normal-push authorization.

## Preconditions And Construction

A fresh `git fetch --prune origin` returned exit `0`; both live `main` and
`origin/main` remained the accepted C3 merge commit
`8291c6b1a8ab2d8e9e29e4cc567f4286a20415f2`. The target local,
remote-tracking, and live remote refs were absent, and `D:\w2f-c4` did not
exist.

Approved mapping:

```text
original d8456cd5a435edb8c1a96d2d4a35fb0e878d931d
+ split original 0c1616e35048b38b296f29426dfd2989e70234e0
  -> prior curated ac538479b40daed491b8739f7056beb46355e434
  -> current-base curated 16ea58b5681f2c599044c9fc257b04543b717103
```

An isolated LF worktree was created from the exact new base. Cherry-picking
the prior curated commit returned exit `0` without conflicts. The new commit's
parent is exactly the current base and its subject remains
`test(converter): harden reviewed glyph-aware font coverage`. The temporary
upstream-to-`origin/main` branch configuration was removed after construction.

## Exact Content And Exclusions

The changed paths are exactly:

```text
.trellis/spec/dom-to-figma/frontend/rendering-contracts.md
docs/upstream-core-delta.json
packages/dom-to-figma/src/converter/font-cache.test.ts
packages/dom-to-figma/src/converter/nodes/text/primitives/font/loader.test.ts
packages/dom-to-figma/src/figma.text.browser.test.ts
```

Every new-head blob is byte-identical to the same path at prior curated C4.
The stable patch ID for both prior and current-base patches is
`75781843a7d179bf30ab73b8de2532cafd5bbb53`. This proves exact approved C4
content despite the new commit identity.

The candidate contains no `.trellis/tasks` or `.trellis/workspace` paths, no
C5 image-pipeline path, and no task-planning/handoff path from split original
`0c1616e...`. Its commit-ID intersection with the 47 sync-only commits is
empty; its merge base with `sync/upstream-20260726` is
`606ee8aa9ca4915ec28dd7853fd5b42283ff54ea`.

## Focused Gates

All commands returned exit `0`:

```text
pnpm install --frozen-lockfile
pnpm --filter @figit/dom-to-figma exec vitest run src/converter/font-cache.test.ts src/converter/nodes/text/primitives/font/loader.test.ts src/figma.text.browser.test.ts
pnpm --filter @figit/browser-capture-adapter exec vitest run src/bridges/dom-to-figma.test.ts
pnpm upstream-core-delta:check --report .artifacts/c4-focused-governance.json
```

Results: font/text 18/18, adapter bridge 9/9, and governance 15 runtime / 8
test / 0 unmapped runtime paths.

## Full Gates

Every command returned exit `0`:

```text
pnpm lint --diagnostic-level=error --max-diagnostics=none
pnpm check-types
pnpm build
pnpm test
pnpm oracle:parity
pnpm upstream-core-delta:check --report .artifacts/c4-governance.json
pnpm upstream-core-delta:stable --verify-latest --report .artifacts/c4-stable.json
pnpm upstream-adapter:stable
pnpm upstream-core-delta:main --report .artifacts/c4-upstream-main.json
git ... diff 8291c6b1..16ea58b5 --check
```

Results: lint 357 files; type-check and build 8 projects each; workspace tests
405 passed / 5 skipped / 0 failed; Tier-0 parity 46 scenes; governance 15
runtime / 8 test / 0 unmapped; stable `@figit/dom-to-figma@0.2.4` at
`859efea8...`; stable adapter passed; upstream main `859efea8...`; diff
whitespace passed.

All reports identify head `16ea58b5...` and contain zero errors. Artifact
SHA-256 values captured before worktree removal were:

```text
c4-focused-governance.json 148a989c38189c6be5127e029d637bdf55f0946633d3e000e41c86ced4ec51f4
c4-governance.json         148a989c38189c6be5127e029d637bdf55f0946633d3e000e41c86ced4ec51f4
c4-stable.json             71fcab510d4993f3eb218c0b4fd56c5d7389b2e388f8d3f4bc4265bc3e780ac9
c4-upstream-main.json      6f25836ba41324fd02c8cb7d5bed1509cca50b9a6d66adc098aa9cef160c563c
```

Focused and full governance artifacts are byte-identical.

## Rollback Unit

C4 is one review and rollback unit: revert the single current-base curated
commit. It does not include or depend on C5. The already merged C1+C2 and C3
units remain outside a font-only rollback.

## Checkout And Cleanup Integrity

The isolated worktree was clean before standard removal. `git worktree remove
D:/w2f-c4` returned `255` because dependency content left the directory
non-empty, but its Git registration and `.git` file were removed. The residual
`D:\w2f-c4` was not force-deleted or recursively removed.

During local construction and validation, the shared checkout remained on
`sync/upstream-20260726` at
`07bbcd751c34a378caeb91b10681842f37c64b7d`, with empty staged state and the
same six tracked dirty paths. No remote branch, push, PR, merge, force update,
main update, existing-temporary-directory deletion, or shared-checkout change
occurred.

## Push Publication

Immediately before push, a fresh fetch confirmed live `main` and `origin/main`
remained `8291c6b1...`; the local branch remained exactly one commit above it
at `16ea58b5...`, and both remote-tracking and live remote refs were absent.

At `2026-08-26T14:46:38+08:00`, this exact normal non-force push returned exit
`0`:

```text
git ... push --set-upstream origin refs/heads/review/local-main-font-20260826:refs/heads/review/local-main-font-20260826
```

After a fresh fetch, local, remote-tracking, and live remote refs all resolved
exactly to `16ea58b5681f2c599044c9fc257b04543b717103`. The configured upstream is
`origin/review/local-main-font-20260826`, with ahead/behind `0/0`. The
remote-tracking reflog recorded:

```text
16ea58b5681f2c599044c9fc257b04543b717103
origin/review/local-main-font-20260826@{2026-08-26T14:46:44+08:00}
update by push
```

Live `main` and `origin/main` remained `8291c6b1...`. An all-state PR query for
the head returned `[]`; no PR was created or modified. No main/other-ref push,
force, merge, auto-merge, code change, branch deletion, temporary-directory
deletion, or shared-checkout change occurred.

Remote branch URL:

`https://github.com/aakkino/web-to-figma/tree/review/local-main-font-20260826`

The next remote state change is PR creation and requires separate explicit
authorization.

## PR Publication

Immediately before creation, live `main` remained `8291c6b1...`, all three
head refs remained `16ea58b5...`, and an all-state query for the head branch
returned no existing PR.

At `2026-08-26T14:55:29+08:00`, `gh pr create` returned exit `0` and created
exactly one non-draft PR:

`https://github.com/aakkino/web-to-figma/pull/4`

GitHub records creation at `2026-08-26T06:55:33Z`. Post-creation verification
found PR #4 OPEN and unmerged with auto-merge disabled, base `main` at
`8291c6b1...`, head `review/local-main-font-20260826` at `16ea58b5...`, one
commit, and the exact five approved files totaling 172 insertions and 4
deletions. The title is
`test(converter): harden glyph-aware font fallback coverage`; the live body is
byte-identical to `research/font-pr-body-record.md` and states that GitHub CI
and review are pending.

All six initial checks were `IN_PROGRESS`: repository, Tier-0, governance,
stable, upstream-main, and preview. The repository and Tier-0 required checks
were both pending, so `mergeStateStatus` was `BLOCKED`. No CI completion or
merge readiness is claimed.

At the final read-only observation, governance, stable, and upstream-main had
completed successfully; the non-required Preview had failed; repository and
Tier-0 remained `IN_PROGRESS`. Both required checks therefore remained
pending and the PR remained `BLOCKED`.

No push, force-push, PR edit after creation, merge, auto-merge, branch deletion,
code change, checkout switch, or temporary-directory deletion occurred. The
next gate is required CI and independent review; body sync and merge remain
separate authorization boundaries.

## PR CI Convergence And Independent Review

At `2026-08-26T15:00:57+08:00`, an independent read-only review confirmed all
five project gates had completed successfully: repository, Tier-0 parity,
governance, latest stable, and upstream main. Branch protection still requires
only `Lint, typecheck, build, test` and `Tier-0 parity ratchet`; both succeeded.

The remaining failed check is the non-required `Publish to pkg.pr.new` Preview.
Its failed-job log reports HTTP 404 because the `pkg-pr-new` GitHub App is not
installed on `aakkino/web-to-figma`; this is not a product or required-gate
failure. GitHub therefore reports the otherwise mergeable PR as `UNSTABLE`.

PR #4 remains OPEN, non-draft, unmerged, and without auto-merge. Its title,
base/head SHAs, one commit, five files, and `+172/-4` stat are unchanged. Live
and local bodies remain normalized-byte-identical with SHA-256
`4ca9ffdb6a699153557343c1b8be117e27bb0b0f9887f9ea572ee313fabad69a`.
Scope, mapping, exclusions, local gates, and rollback statements remain
accurate, but the shared final sentence that says GitHub CI is not complete is
now stale. Updating that live body requires separate remote-write
authorization; this review did not edit either the live PR or the local body
record.

Live/local `origin/main` remained `8291c6b1...`; local, remote-tracking, and
live C4 refs remained `16ea58b5...`. The PR `updatedAt` remained equal to its
creation time, and no ref reflog entry appeared after PR creation. The shared
checkout remained `sync/upstream-20260726@07bbcd75` with empty staged state and
the same six tracked dirty paths. No push, PR edit, merge, auto-merge, ref/code
change, branch deletion, or temporary-directory deletion occurred.

Independent review is complete. The next authorization gate is a body-only CI
status sync. Merge remains a later, separate authorization boundary after that
sync is independently verified.

## PR Body CI Status Sync

The user separately authorized a body-only status sync. At
`2026-08-26T15:04:29+08:00`, `gh pr edit 4 --body-file` returned exit `0`.
Only the obsolete CI/review paragraph changed. It now records all five
successful project gates and both successful required checks, the optional
Preview's HTTP 404 caused by the uninstalled pkg-pr-new App, the check's
non-required/non-compatibility status, and completed independent review. It
also keeps merge behind separate explicit authorization.

Scope, mapping, base/head, exclusions, local gates, and rollback content were
unchanged. The updated task-local body SHA-256 is
`7a91ac3c4cc509cd69d57510ee2639a9ce19d9c834e5ae2dfec598fea01d5c65`.

## Merge Publication

The user separately authorized immediate merge of PR #4. Before the remote
write, the PR remained OPEN and unmerged with auto-merge disabled, base
`8291c6b1...`, head `16ea58b5...`, one commit, five files, both required checks
successful, and all five project gates successful.

At `2026-08-26T15:12:46+08:00`, this guarded merge-commit command returned
exit `0`:

```text
gh pr merge 4 --repo aakkino/web-to-figma --merge --match-head-commit 16ea58b5681f2c599044c9fc257b04543b717103
```

GitHub records `mergedAt` as `2026-08-26T07:12:50Z` and merge commit
`9839c7e89ab9b7b146a0ccacaf34516887fb6e0a`. Its ordered parents are exactly:

```text
8291c6b1a8ab2d8e9e29e4cc567f4286a20415f2
16ea58b5681f2c599044c9fc257b04543b717103
```

The merge tree and C4 head tree both resolve to
`33930fb3539ae23253ae9729b5329fb723e30fce`. After fetch, live `main` and
`origin/main` both point exactly to the merge commit; the C4 curated commit is
reachable from it. Local, remote-tracking, and live review branch refs remain
at `16ea58b5...`; the branch was not deleted.

PR #4 is MERGED. No squash, rebase, auto-merge, branch deletion, extra push,
force-push, code change, other-PR operation, checkout switch, or temporary
directory deletion occurred. The next gate requires separate authorization to
reconstruct and validate the C5 image cohort from the new `origin/main`.

## Independent PR Body Sync Review

At `2026-08-26T15:08:27+08:00`, an independent read-only review confirmed the
obsolete CI-pending sentence is absent and the live body matches the task-local
record. Their normalized SHA-256 is
`63df64331a1108aa21eac39bd806aab43ab9134de617d2e1896f028c1add7779`;
the file-byte hash above includes the record's on-disk line endings. Replacing
the new settled-status paragraph with the prior pending sentence reconstructs
the independently recorded pre-sync hash exactly, proving no other body section
drifted.

All five project gates and both required checks remain successful. The only
failure is the non-required Preview HTTP 404 caused by the missing pkg-pr-new
App. PR #4 remains OPEN, non-draft, unmerged, mergeable but `UNSTABLE`, and
without auto-merge. Its title, base/head, one commit, five files, and `+172/-4`
stat are unchanged.

Live/local `origin/main` remained `8291c6b1...`; local, remote-tracking, and
live C4 refs remained `16ea58b5...`. The shared checkout remained
`sync/upstream-20260726@07bbcd75`, with empty staged state and the same six
tracked dirty paths. No push, PR edit during this review, merge, auto-merge,
code/ref change, branch deletion, or temporary-directory deletion occurred.
The body-only sync is independently verified, so C4 may enter its separately
authorized merge gate.

## Independent Post-Merge Review

At `2026-08-26T15:16:33+08:00`, an independent read-only review confirmed PR
#4 is MERGED at `2026-08-26T07:12:50Z` as merge commit
`9839c7e89ab9b7b146a0ccacaf34516887fb6e0a`, with auto-merge unused. Its
ordered parents are exactly the prior main `8291c6b1...` followed by the C4
head `16ea58b5...`. The merge and C4 head trees are identical at
`33930fb3539ae23253ae9729b5329fb723e30fce`.

Live and local `origin/main` point to `9839c7e8...`, and C4 is reachable from
that merge. Local, remote-tracking, and live review branch refs remain retained
at `16ea58b5...`. The only post-merge local ref event is the expected
fast-forward fetch of `origin/main`; there is no evidence of an extra push or
other ref update.

The shared checkout remains `sync/upstream-20260726@07bbcd75`, with empty
staged state and the same six tracked dirty paths. This review performed no
remote write, push, PR edit, merge, branch/code/ref change, branch deletion, or
temporary-directory deletion. C4 post-merge state is verified; the next gate
is separate authorization to reconstruct and validate the C5 image local
branch from the new `origin/main`.
