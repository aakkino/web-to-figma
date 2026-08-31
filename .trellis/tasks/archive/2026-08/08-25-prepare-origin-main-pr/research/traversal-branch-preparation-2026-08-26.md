# C3 Traversal Local Review Branch Preparation

## Result

- Branch: `review/local-main-traversal-20260826`
- Actual base: `c9e4e3914dab262adcc4b37556543843e13708ab`
- New curated head: `49d8055ee95b3f9e529f782876e042f6055de71a`
- Commits above base: 1
- Diff: 12 files, 380 insertions, 42 deletions
- Remote branch: present at the exact local head
- Push: completed by separate authorization
- PR: `https://github.com/aakkino/web-to-figma/pull/3` (OPEN, non-draft)
- Merge: not performed

The branch passed current-base focused and full promotion gates, was normally
pushed, and was published as PR #3 under separate authorization. GitHub CI and
review are now the next gate; merge remains a separate authorization boundary.

## Preconditions And Construction

`git fetch --prune origin` returned exit `0`; live `origin/main` remained the
accepted C1+C2 merge commit
`c9e4e3914dab262adcc4b37556543843e13708ab`. The target branch was absent
locally and remotely, and `D:\w2f-c3` did not exist.

Approved mapping:

```text
split original afd3a84d91f52315f20ca3b828ff54293140b8fc
  -> prior curated 530ba98cf2e9e29b792f436ec075d508edde1dfb
  -> new-base curated 49d8055ee95b3f9e529f782876e042f6055de71a
```

The prior curated commit's parent was the old C1+C2 head `82787e62...`. Its
single patch was replayed onto new `origin/main` with `git cherry-pick`; the
command returned exit `0` without conflicts. The new commit's parent is
exactly `c9e4e391...`. The commit subject remains
`feat(converter): harden reviewed composed DOM traversal`.

## Exact Paths

```text
.trellis/spec/dom-to-figma/frontend/architecture.md
docs/upstream-core-delta.json
internal/browser-capture-adapter/src/bridges/dom-to-figma.test.ts
packages/composed-dom/src/composed-dom.browser.test.ts
packages/dom-to-figma/src/converter/convert.ts
packages/dom-to-figma/src/converter/layout/infer.ts
packages/dom-to-figma/src/converter/nodes/form/converter.ts
packages/dom-to-figma/src/converter/nodes/frame/converter.ts
packages/dom-to-figma/src/converter/nodes/text/converter.ts
packages/dom-to-figma/src/converter/walk.ts
packages/dom-to-figma/src/figma.dom-traversal.browser.test.ts
packages/dom-to-figma/src/figma.shadow-dom.browser.test.ts
```

All 12 new-head blobs are byte-identical to the prior approved curated C3
head. The registry therefore retains the reviewed target refresh and exact C3
path/fingerprint evolution without importing later cohort state.

## Exclusion Proof

- The branch is exactly one commit above actual base.
- The changed-path set is exactly the 12 approved C3 paths.
- There is no diff under `.trellis/tasks` or `.trellis/workspace`.
- The candidate commit has zero intersection with the 47 sync-only commits.
- Its merge base with `sync/upstream-20260726` remains `606ee8aa...`.
- No C4 font paths or C5 image-pipeline paths are present.
- No task handoff paths from split original `afd3a84d...` are present.

## Focused Gates

Every command returned exit `0`:

```text
pnpm install --frozen-lockfile
pnpm --filter @figit/composed-dom exec vitest run src/composed-dom.browser.test.ts
pnpm --filter @figit/browser-capture-adapter exec vitest run src/bridges/dom-to-figma.test.ts
pnpm --filter @figit/dom-to-figma exec vitest run src/figma.dom-traversal.browser.test.ts src/figma.shadow-dom.browser.test.ts
pnpm upstream-core-delta:check --report .artifacts/c3-focused-governance.json
```

Results: composed DOM 5/5, adapter bridge 9/9, traversal/shadow 6/6, and
governance 15 runtime / 6 test / 0 unmapped.

## Full Gates

Every command returned exit `0`:

```text
pnpm lint --diagnostic-level=error --max-diagnostics=none
pnpm check-types
pnpm build
pnpm test
pnpm oracle:parity
pnpm upstream-core-delta:check --report .artifacts/c3-governance.json
pnpm upstream-core-delta:stable --verify-latest --report .artifacts/c3-stable.json
pnpm upstream-adapter:stable
pnpm upstream-core-delta:main --report .artifacts/c3-upstream-main.json
git ... diff c9e4e391..49d8055e --check
```

Results:

- lint: 355 files;
- type-check: 8 projects;
- build: 8 projects;
- workspace tests: 402 passed, 5 skipped, 0 failed;
- Tier-0 parity: 46 scenes passed;
- governance: 15 runtime, 6 test, 0 unmapped;
- stable: `@figit/dom-to-figma@0.2.4` at `859efea8...`;
- stable adapter: passed;
- upstream main: `859efea8...`;
- diff whitespace: passed.

All four JSON reports parsed, pointed at `49d8055e...`, and contained zero
errors. Focused and full governance reports were byte-identical.

## Rollback Unit

C3 is one review and rollback unit: revert the single new curated commit. It
does not depend on C4 or C5. C1+C2 remains in `origin/main` and must not be
rolled back as part of a traversal-only rollback.

## Checkout And Cleanup Integrity

The shared checkout remained on `sync/upstream-20260726` at
`07bbcd751c34a378caeb91b10681842f37c64b7d`, with its existing six tracked
dirty paths and empty staged set unchanged. The C3 branch upstream config was
unset during local validation; the separately authorized push later set it to
the same-name origin branch.

The C3 worktree was clean before standard removal. Its Git registration was
removed, but `git worktree remove` returned `255` because dependency content
left `D:\w2f-c3` non-empty. The unregistered residual was not force-deleted or
recursively removed. Existing temporary directories were not touched.

## Push Publication

Immediately before push, a fresh fetch confirmed `origin/main` remained
`c9e4e391...`; the local branch remained one commit above it at `49d8055e...`,
and both the remote-tracking and live remote branch were absent.

At `2026-08-26T12:59:06+08:00`, this exact normal non-force push returned exit
`0`:

```text
git -c safe.directory=D:/desktop_directory/web-to-figma push --set-upstream origin refs/heads/review/local-main-traversal-20260826:refs/heads/review/local-main-traversal-20260826
```

After a fresh fetch, the local branch, remote-tracking branch, and live
`ls-remote` branch all resolved exactly to
`49d8055ee95b3f9e529f782876e042f6055de71a`. `origin/main` remained
`c9e4e3914dab262adcc4b37556543843e13708ab`; upstream tracking was clean.
The remote-tracking reflog recorded:

```text
49d8055ee95b3f9e529f782876e042f6055de71a
refs/remotes/origin/review/local-main-traversal-20260826@{2026-08-26T12:59:12+08:00}
update by push
```

Remote branch URL:

`https://github.com/aakkino/web-to-figma/tree/review/local-main-traversal-20260826`

An all-state GitHub PR query for this head returned `[]`. No PR was created or
modified, and no merge, auto-merge, main push, force-push, branch deletion,
code change, checkout switch, or temporary-directory deletion occurred.

## PR Publication

Immediately before creation, live `main` and the live review branch still
resolved to `c9e4e391...` and `49d8055e...`, respectively. An all-state query
for the head branch returned no existing PR.

At `2026-08-26T13:33:33+08:00`, `gh pr create` returned exit `0` and created
exactly one non-draft PR:

`https://github.com/aakkino/web-to-figma/pull/3`

GitHub records its creation at `2026-08-26T05:33:37Z`. Post-creation
verification found PR #3 OPEN and unmerged, with auto-merge disabled, base
`main` at `c9e4e391...`, head
`review/local-main-traversal-20260826` at `49d8055e...`, one commit, and the
exact 12 approved files. The title is
`feat(converter): harden composed DOM traversal`; the live body matches
`research/traversal-pr-body-record.md` and states that CI/review are pending.

All six initial checks were `IN_PROGRESS`: repository, Tier-0, governance,
stable, upstream-main, and preview. The repository and Tier-0 required checks
were both pending, so `mergeStateStatus` was `BLOCKED`. No CI completion or
merge readiness is claimed.

During the final read-only verification, all five project gates completed
successfully: repository, Tier-0, governance, stable, and upstream-main. The
two required checks (repository and Tier-0) were both `SUCCESS`. The separate
non-required `Publish to pkg.pr.new` preview check completed with `FAILURE`, so
the current `mergeStateStatus` is `UNSTABLE`. PR #3 remains OPEN, non-draft,
unmerged, with auto-merge disabled and review still pending.

During the creation authorization, no push, force-push, PR edit after
creation, merge, auto-merge, branch deletion, code change, checkout switch, or
temporary-directory deletion occurred. The next gate was required CI/review
settlement followed by separate merge authorization.

## PR Body CI Status Sync

Under separate authorization, the single obsolete sentence saying GitHub CI
was incomplete was replaced with the settled status from the live checks. At
`2026-08-26T14:11:39+08:00`, `gh pr edit 3 --body-file` returned exit `0`.
The updated paragraph records all five successful project gates and both
successful required checks, identifies the pkg-pr-new App installation as the
cause of the non-required Preview failure, and keeps review/merge pending a
separate authorization. Scope, mapping, base/head, exclusions, validation
results, and rollback text were unchanged.

## Merge Publication

The user separately authorized immediate merge of PR #3. Before the remote
write, the PR remained OPEN and unmerged with auto-merge disabled, base
`c9e4e391...`, head `49d8055e...`, one commit, 12 files, both required checks
successful, and all five project gates successful.

At `2026-08-26T14:19:11+08:00`, this guarded merge-commit command returned
exit `0`:

```text
gh pr merge 3 --repo aakkino/web-to-figma --merge --match-head-commit 49d8055ee95b3f9e529f782876e042f6055de71a
```

GitHub records `mergedAt` as `2026-08-26T06:19:14Z` and merge commit
`8291c6b1a8ab2d8e9e29e4cc567f4286a20415f2`. Its ordered parents are exactly:

```text
c9e4e3914dab262adcc4b37556543843e13708ab
49d8055ee95b3f9e529f782876e042f6055de71a
```

The merge tree and C3 head tree both resolve to
`9900561208e6ddebf7ed57c1e09fd4c056c6559b`. After fetch, live `main` and
`origin/main` both point exactly to the merge commit; the C3 curated commit is
reachable from it. Local, remote-tracking, and live review branch refs remain
at `49d8055e...`; the branch was not deleted.

PR #3 is MERGED. No squash, rebase, auto-merge, branch deletion, extra push,
force-push, code change, other-PR operation, checkout switch, or temporary
directory deletion occurred. The next gate requires separate authorization to
reconstruct and validate the C4 font cohort from the new `origin/main`.
