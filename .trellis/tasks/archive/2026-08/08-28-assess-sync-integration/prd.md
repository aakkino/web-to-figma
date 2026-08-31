# Assess sync branch integration into stabilized main

## Goal

Produce a reproducible assessment of `sync/upstream-20260726` against the
pinned stabilized fork baseline, then recommend a controlled integration
strategy for each committed and dirty-worktree cohort. The assessment must
prevent a whole-branch merge from reintroducing superseded implementations,
old release metadata, or Trellis history into `main`.

## Background

- The immutable assessment baseline is
  `baseline/origin-main-20260828@dd91f18346d7326ab71c1a77769bfe7aed310af3`.
  At task creation, local `main` and `origin/main` resolved to the same SHA.
- The committed source is
  `sync/upstream-20260726@2172b181853e111dab5c9e261cc19426420f649f`.
- Their merge base is `606ee8aa9ca4915ec28dd7853fd5b42283ff54ea`.
  The reproducible topology is `37` baseline-only commits and `73` sync-only
  commits; `--cherry-pick` produces the same `37/73` count.
- The 2026-08-25 branch audit covered an older `sync@07bbcd75` snapshot and
  classified its then-current 47-commit range. The stabilized baseline now
  contains separately reviewed and merged replacements for several of those
  capabilities, so the old dispositions cannot be copied forward unchanged.
- The root checkout is the sync branch and is intentionally dirty. It reports
  five tracked paths, but two converter classification paths currently have
  no content diff and appear to be line-ending/stat noise. The remaining
  tracked content and all untracked paths must be assessed separately from the
  73 committed objects.
- The user authorized planning in the prior session, required the dirty root
  checkout to remain protected, and prohibited a whole-branch merge.

## Requirements

### R1. Pin and reproduce the assessment snapshot

- Reassert the full SHA of the baseline, sync tip, merge base, and local
  `main`/`origin/main` observations before analysis.
- Reproduce ahead/behind, cherry/patch signals, commit counts, and the
  baseline-side and sync-side commit sets without fetching over the pinned
  baseline.
- If the immutable baseline branch or sync tip no longer resolves to the
  recorded SHA, stop and return to planning. A moving remote ref may be
  reported as drift but must not silently replace the pinned baseline.

### R2. Account for every divergent commit

- Assign each of the 73 sync-only commits exactly once to an evidence-backed
  cohort and disposition.
- Account for the 37 baseline-only commits sufficiently to determine which
  sync capabilities were merged, reimplemented, superseded, or invalidated by
  later governance and private-package changes.
- Distinguish behavior, tests, specifications, release/governance material,
  diagnostics, Trellis metadata, and journal/archive commits. Task completion
  or archive status alone is not integration evidence.

### R3. Classify integration disposition

- Use these terminal states: already represented on baseline, superseded by
  baseline, retain as a selective port/rebuild candidate, retain as historical
  evidence only, or exclude from integration.
- For every port/rebuild candidate, identify its capability boundary,
  dependencies, target packages, conflicting baseline contracts, minimum
  validation, and reversible follow-up task boundary.
- Patch-ID, clean textual application, or an old task-local test result may be
  supporting evidence but is never sufficient by itself to approve a port.
- Do not recommend merge, rebase, squash, or replay of the whole sync branch.

### R4. Isolate the dirty worktree

- Inventory staged, tracked, untracked, ignored, and line-ending/stat-only
  states without add, restore, clean, checkout, stash, or commit.
- Compare tracked content against both `sync@2172b18` and the pinned baseline.
- Classify dirty product/spec candidates separately from generated, temporary,
  vendored, archived, or tooling content. Do not treat untracked task files as
  committed branch history.
- Recommend preservation and follow-up boundaries, but do not move, delete,
  stage, commit, or transplant dirty content in this assessment.

### R5. Produce a controlled follow-up strategy

- Define the smallest independently reviewable candidate cohorts and their
  dependency order. Reuse existing capability/task boundaries where evidence
  supports them; do not create child tasks merely to mirror commit groups.
- Identify which follow-up cohorts need isolated worktrees, product tests,
  browser checks, oracle parity, governance checks, release validation, or
  explicit user decisions.
- Keep branch/ref changes, dirty-content preservation, child-task creation,
  product implementation, commit, push, PR, and merge as separately authorized
  actions after this assessment.

## Acceptance Criteria

- [ ] The assessment report records the exact baseline, sync tip, merge base,
  `37/73` topology, cherry signal, commands, and snapshot time.
- [ ] A machine-checkable 73-row ledger has no missing or duplicate sync-only
  SHA, and its category totals equal `git rev-list --count`.
- [ ] The 37 baseline-only commits are mapped at a sufficient capability and
  governance level to justify every "represented" or "superseded" decision.
- [ ] Every sync cohort links to actual Git, Trellis, test, PR/CI, or spec
  evidence and states the highest evidence level and any remaining gap.
- [ ] Every committed cohort receives exactly one terminal disposition, and
  every selective candidate has a target boundary, dependency, validation
  gate, and rollback unit.
- [ ] The report explicitly rejects whole-branch merge/rebase/squash/replay and
  explains the concrete regression risks.
- [ ] Dirty state is reported separately, including staged state, five tracked
  status entries, content-diff versus line-ending/stat-only distinctions, and
  grouped untracked/ignored content.
- [ ] The follow-up task map separates already-integrated compatibility work,
  deferred product candidates, metadata/history, and dirty-only candidates.
- [ ] Independent checking reproduces counts, validates cited task/spec paths,
  checks report consistency, and confirms that protected refs, index, and
  tracked dirty content did not change during the assessment.

## Out of Scope

- Product-code integration, cherry-pick, merge, rebase, squash, conflict
  resolution, or source reconstruction.
- Creating follow-up child tasks, branches, or worktrees.
- Staging, committing, moving, deleting, or cleaning dirty-worktree content.
- Updating package names, registry configuration, release metadata, upstream
  targets, fingerprints, oracle baselines, or tolerance budgets.
- Push, PR creation or modification, review, auto-merge, merge, release, or
  branch deletion.
- Re-running every historical product suite merely to reproduce old evidence;
  missing or stale validation is recorded as a follow-up gate.

## Risks and Deferred Decisions

- The committed range changes 256 paths and includes large historical Trellis
  and captured research artifacts, so raw tree size is not a proxy for product
  value.
- Several old sync capabilities were later rebuilt on main with different
  commits and stronger contracts. Semantic equivalence requires capability and
  tree evidence, not commit ancestry.
- Dirty untracked content includes active Trellis infrastructure and temporary
  directories. Preservation or cleanup requires a separate explicit action
  after ownership is established.
- Which selective product cohorts should actually be implemented is deferred
  until the user reviews this assessment's final disposition matrix.
