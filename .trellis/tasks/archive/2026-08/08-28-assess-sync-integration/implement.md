# Sync Integration Assessment Execution Plan

## Activation Gate

- [ ] The user approves the latest planning summary in a subsequent message.
- [ ] `task.py start` is run only after that approval and context manifests
  validate with real entries.
- [ ] Activation authorizes this read-only assessment plus task-local report
  writes; it does not authorize product integration, dirty-content mutation,
  child tasks, refs, commits, remotes, or PR operations.

## 1. Assert Safety and Snapshot

- [ ] Record full pre-assessment porcelain-v2 status, staged paths, tracked
  diff hashes, current branch/HEAD, and worktree occupancy.
- [ ] Assert baseline `dd91f18`, sync `2172b18`, and merge base `606ee8a`.
- [ ] Reproduce normal and `--cherry-pick` topology as `37/73`.
- [ ] Stop if an immutable ref differs; do not fetch or repair it in place.

## 2. Build the Divergence Ledgers

- [ ] Export the 73 sync-only rows with full SHA, parents, date, subject,
  paths, stat, and patch/cherry signals.
- [ ] Export and group the 37 baseline-only commits by reviewed PR,
  capability, governance, release, and task-history role.
- [ ] Validate row uniqueness, set equality, order, and category totals against
  `git rev-list`.

## 3. Map Historical Evidence

- [ ] Reconcile the 73-row range with the 2026-08-25 47-row audit and identify
  the 26 later sync-side bookkeeping/history commits.
- [ ] Link each behavior/research cohort to the exact archived PRD, design,
  implementation record, research report, check, PR/CI evidence, and reviewed
  commit boundary that actually applies.
- [ ] Compare compatibility foundations and style/effects intake against the
  reviewed implementations now reachable from the pinned baseline.
- [ ] Record evidence level and gaps without treating archive status as test or
  merge proof.

## 4. Evaluate Tree and Capability Relationships

- [ ] Compare product-focused trees and blob identities for each candidate
  cohort rather than using the 256-path raw diff as a value signal.
- [ ] Use reachability, patch ID, path ownership, target contracts, and current
  behavior/tests to classify represented versus superseded work.
- [ ] For unresolved product candidates, define the smallest port/rebuild
  boundary, dependency order, baseline invariants, validation gates, and
  rollback unit.
- [ ] If temporary patch checks are useful, run them against a disposable
  index/tree and prove the root index hash is unchanged afterward.

## 5. Inventory Dirty State Separately

- [ ] Record staged, tracked, untracked, and ignored state without refresh,
  add, restore, stash, clean, checkout, or commit.
- [ ] Explain all five tracked status entries, including the two converter
  classification paths that currently have no content diff.
- [ ] Compare actual tracked content with both immutable tips and classify it
  by product/spec intent without absorbing it into the commit ledger.
- [ ] Group untracked/ignored content as active Trellis infrastructure,
  archived/task evidence, generated/temp output, external experiment, or
  possible product candidate; record ownership uncertainty rather than
  deleting noise.

## 6. Write the Assessment and Follow-up Map

- [ ] Write `research/sync-integration-assessment-2026-08-28.md` with snapshot,
  ledgers, evidence levels, capability relationships, dirty inventory, and
  terminal disposition matrix.
- [ ] Explain why whole-branch merge/rebase/squash/replay is unsafe using
  concrete conflicts with stabilized main, package/release changes, and
  bookkeeping history.
- [ ] Propose only independently reviewable follow-up tasks, with explicit
  dependencies and separate authorization boundaries.
- [ ] Identify decisions the user must make after reading the matrix; do not
  create or start follow-up tasks in this assessment.

## 7. Independent Verification

- [ ] Recompute 73-row and 37-row set equality from Git and verify every cited
  local path exists.
- [ ] Validate disposition totals, one terminal state per committed cohort,
  and one owner per SHA.
- [ ] Run Markdown/link/JSON checks appropriate to the report and
  `git diff --check` on this task directory.
- [ ] Run Trellis task/context validation.
- [ ] Dispatch `trellis-check` for an independent spec, evidence, ledger,
  safety, and acceptance-criteria review.
- [ ] Reassert baseline/sync SHAs, root branch, staged state, tracked-dirty
  content hashes, and worktree list are unchanged.

## Planned Validation Commands

```powershell
git -c safe.directory=D:/desktop_directory/web-to-figma rev-parse baseline/origin-main-20260828 sync/upstream-20260726
git -c safe.directory=D:/desktop_directory/web-to-figma merge-base baseline/origin-main-20260828 sync/upstream-20260726
git -c safe.directory=D:/desktop_directory/web-to-figma rev-list --left-right --count baseline/origin-main-20260828...sync/upstream-20260726
git -c safe.directory=D:/desktop_directory/web-to-figma rev-list --left-right --cherry-pick --count baseline/origin-main-20260828...sync/upstream-20260726
git -c safe.directory=D:/desktop_directory/web-to-figma status --porcelain=v2 --branch
git -c safe.directory=D:/desktop_directory/web-to-figma diff --cached --name-only
git -c safe.directory=D:/desktop_directory/web-to-figma worktree list --porcelain
git -c safe.directory=D:/desktop_directory/web-to-figma diff --check -- .trellis/tasks/08-28-assess-sync-integration
python ./.trellis/scripts/task.py validate .trellis/tasks/08-28-assess-sync-integration
```

Full package, browser, oracle, and release suites belong to the selective
product follow-up that owns the affected runtime. This assessment records
those gates but does not claim them by testing a dirty historical checkout.

## Explicitly Prohibited

- Whole-sync merge, rebase, squash, replay, or conflict resolution.
- Product source, spec, registry, release, baseline, fingerprint, or tolerance
  changes outside this task directory.
- Root-index mutation or dirty-content staging, restore, stash, move, delete,
  clean, transplant, or commit.
- Follow-up task/worktree creation, branch/ref mutation, push, PR, merge, or
  release without separate user authorization.
