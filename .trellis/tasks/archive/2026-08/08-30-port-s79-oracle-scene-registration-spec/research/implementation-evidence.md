# S79 Implementation Evidence

Captured during the approved implementation gate on 2026-08-30.

## Pin And Isolation

- Refreshed ref: `origin/main` only.
- Target SHA: `687a8509969b24aba13ee414cc19b3d6aef1d20f`.
- Detached worktree:
  `D:/desktop_directory/web-to-figma/.tmp/port-s79-oracle-scene-registration-spec`.
- No branch, stage, commit, push, PR, merge, tag, deletion, or cleanup occurred.
- The historical S79 commit was not cherry-picked or replayed.

## Owned Diff

The target-derived worktree has exactly these two tracked modifications:

- `.trellis/spec/oracle-harness/frontend/architecture.md`
- `.trellis/spec/oracle-harness/frontend/testing-guidelines.md`

The architecture guide now defines the independent stable manifest and
scoreboard projections, their identity/order rules, and their independent unit
and parity gates. The testing guide names
`src/scenes.test.ts > produces a stable id/size manifest` and explains why
parity cannot substitute for it. Target package naming remains mixed:
`@figit/oracle-harness` for harness commands and the existing
`@aakkino/dom-to-figma` / `@aakkino/fig-kiwi` dependencies.

## Validation

- `pnpm install --frozen-lockfile`: passed; required because the new worktree
  initially had no `node_modules`.
- `pnpm --filter @figit/oracle-harness check-types`: passed.
- `pnpm --filter @figit/oracle-harness test`: passed, 20 files and 102 tests;
  3 files and 5 gated tests skipped by the default suite.
- `pnpm oracle:parity`: passed for 47 scenes.
- Markdown fence parity, final newlines, required phrases, and exact package
  names: passed.
- `git diff --check`: passed.
- Exact two-path tracked diff assertion: passed.
- `pnpm lint`: blocked by 400 pre-existing CRLF formatting errors across the
  freshly checked-out target, including JSON and config files outside this
  task. No unrelated file was normalized or modified to address them.

## Preservation Baseline

- Sync branch: `sync/upstream-20260726`.
- Sync HEAD: `b7bd7d6c68557e91e184da65b9e560de950f3bed`.
- Index tree: `81be79ab4c93bc112595a752c88e6708b03b0d95`.
- Staged paths: zero.
- Tracked dirty paths: 17.
- Tracked dirty content digest:
  `FCEC83755473A716E3F9427FA298058615138DA2E0EE4CEA782A449D47C06044`.
- Pre-existing worktrees: 11. The only authorized occupancy delta is the
  detached S79 worktree recorded above.

The final recomputation matched branch, HEAD, index tree, zero staged paths,
the 17 tracked dirty paths, and their content digest exactly. Worktree count is
12: the original 11 plus only the authorized detached S79 worktree. Task-local
activation/progress evidence is the only expected sync-root status delta.

After the unit suite, `git status` briefly reported the manifest snapshot as
modified even though its worktree and index blob ids were both
`a9754a2db015435a17acd1bc0334ba647692076d`. A targeted index stat refresh
cleared that false-positive without changing the index tree or file content.

## Independent Check

The Phase 2.2 review independently confirmed:

- The worktree remains detached at
  `origin/main@687a8509969b24aba13ee414cc19b3d6aef1d20f`; S79 is not an
  ancestor of this target and no S79 commit was replayed.
- The unstaged diff is still exactly the two owned spec paths, with 27 added
  architecture lines and 6 added testing lines. The index remains empty.
- The two independent projections, slash-separated identity, resolved size,
  id ordering, named manifest test, and independent unit/parity gates all
  match the target implementation and package scripts. No in-scope defect
  required a self-fix.
- Type-check, the default unit suite (20 files and 102 tests passed; 3 files
  and 5 gated tests skipped), parity (47 scenes), Trellis validation, Markdown
  fence/heading/final-newline/trailing-whitespace checks, exact-path checks,
  and `git diff --check` passed.
- `pnpm lint` still fails on the fresh target checkout with 400 errors, 75
  warnings, and 1016 infos across 400 processed files. All 400 error
  diagnostics are in Biome's `format` category, with zero diagnostics naming
  either owned path; they are the target checkout's pre-existing CRLF
  formatting state outside this two-Markdown-file diff. Biome processes
  neither owned Markdown path when
  invoked explicitly (`Checked 0 files`), so there is no valid scoped Biome
  formatter/linter for these files. No unrelated file was normalized.

### Root Dirty-Count Reconciliation

The earlier 19-path report and the implementation's 17-path content baseline
describe different Git projections, not different file contents:

- `git status --porcelain=v1 -uno` reports the same 19 named tracked paths as
  the parent preservation evidence.
- `git diff --name-only` reports 17 content-bearing paths. The two additional
  status paths are
  `packages/dom-to-figma/src/converter/classify.test.ts` and
  `packages/dom-to-figma/src/converter/classify.ts`.
- For those two paths, direct `git hash-object` results exactly equal their
  index blob ids (`ec5228d6b95f09e2177b4b953cfff66642d56c1a` and
  `113619ba878ccdb71f59b2fddce31a01e96ad412`). They are stat-cache/racy-clean
  reports only and contain no worktree delta.
- Root branch/HEAD remains
  `sync/upstream-20260726@b7bd7d6c68557e91e184da65b9e560de950f3bed`,
  the index tree remains `81be79ab4c93bc112595a752c88e6708b03b0d95`,
  and the staged set remains empty.
- Worktree occupancy is exactly 12: the original 11 plus the one authorized
  detached S79 worktree. No worktree was created, removed, pruned, or cleaned
  during review.

## Authorized Commit Gate

- Branch: `port/s79-oracle-scene-registration-spec`.
- Commit: `107667e0b2eda7ed6a268cdaad575edfc31dc89c`.
- Subject: `docs(oracle): document scene registration gates`.
- Parent: `687a8509969b24aba13ee414cc19b3d6aef1d20f`.
- Commit scope: exactly the two owned oracle specification files, 33 insertions.
- Cached `git diff --check`, pre-commit hooks, and commitlint passed.
- The isolated worktree is clean after the commit.
- No push, PR, merge, tag, deletion, remote mutation, or cleanup was performed.

## Authorized Publication Gate

- The branch was pushed to
  `origin/port/s79-oracle-scene-registration-spec`.
- Pull request: `https://github.com/aakkino/web-to-figma/pull/21`.
- PR base/head: `main` <- `port/s79-oracle-scene-registration-spec`.
- Published head: `107667e0b2eda7ed6a268cdaad575edfc31dc89c`.
- GitHub reports the PR open, non-draft, and mergeable; CI began after creation.
- No merge, review approval, branch deletion, tag operation, or worktree cleanup
  was performed.

## Authorized Merge Gate

- All six GitHub checks passed before merge, including full CI, upstream
  compatibility, package assurance, and the Tier-0 parity ratchet.
- PR #21 was merged into `main` at
  `1c98bb0e0d04682f619a5aadccdd5027959ac2e0`.
- Merge parents are the previously pinned target
  `687a8509969b24aba13ee414cc19b3d6aef1d20f` and the reviewed S79 port
  `107667e0b2eda7ed6a268cdaad575edfc31dc89c`.
- Refreshed `origin/main` contains the reviewed port commit as an ancestor and
  changes exactly the two owned oracle specification files from the old pin.
- The local and remote port branches and the isolated worktree remain retained.
  No branch deletion, tag operation, or worktree cleanup was performed.
