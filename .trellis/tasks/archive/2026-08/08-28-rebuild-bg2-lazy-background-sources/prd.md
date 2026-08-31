# Rebuild BG2 lazy background sources

## Goal

Rebuild the BG2 lazy-background capture capability against the current
`origin/main` contract, promote the reviewed change through one governed PR,
and prove target-line containment so an explicitly supported `data-bgset`
source reaches users without scrolling, executing page lazy-loader code,
mutating the source DOM, or replaying the old sync commits.

## Background

- The historical evidence commits are
  `be47e62774179f582cffedbbfc6dd5198e293546` (S46 fixture) and
  `9df8d0b8c387471c83fadb72c7f195e5b7d5ac17` (S47 implementation).
  They are evidence only and must not be cherry-picked.
- BG1 was reviewed at `92c8452f02da3fa5c304e81d89c3c9905ba453d5`
  and is contained in `origin/main` through merge commit
  `98c10d5fd0ad8b7c97f8b5bb397fa19d24852313`; this satisfies BG2's
  technical dependency.
- Read-only inspection of `origin/main@98c10d5f` confirms the computed CSS
  background inventory, staging, rendering, diagnostics, and capability seam
  exist, while `lazy-background.ts`, `data-bgset`, and `backgroundSources` do
  not.
- The dirty root is `sync/upstream-20260726`; its visible BG2 files are not the
  target baseline and must not be edited, staged, cleaned, or used as proof of
  current behavior.

## Requirements

- Re-pin the execution target to refreshed `origin/main` immediately before
  implementation. If it has moved from `98c10d5f`, review the delta against
  this plan before creating an isolated branch/worktree.
- Use S46/S47 and the archived `07-31-extension-lazy-background-capture` task
  only as behavioral and test evidence. Rebuild the smallest current-contract
  patch with new commit identity.
- Discover only explicit `data-bgset` metadata. Support a plain URL, ordinary
  width/density candidates, the evidenced `-xs-` encoding, owner-document base
  URL resolution, and rejection of unsupported or malformed schemes.
- Analyze and canonicalize without network access, page scrolling, page script
  execution, `src` assignment, style mutation, or insertion of request owners
  into the page DOM.
- When computed CSS already contains an image layer, preserve the BG1 result
  and do not inject a duplicate lazy layer. Otherwise, add the selected source
  to the existing background inventory and image scheduler.
- Deduplicate by canonical URL across ordinary images, computed backgrounds,
  and lazy backgrounds; finish preparation before fonts and conversion, and
  forbid late conversion fetches.
- Carry owner-to-source state through an adapter-owned, capture-local context.
  The published core may expose only a generic optional background resolver;
  it must not know `data-bgset`, scheduler policy, extension state, or site
  conventions.
- Clear capture-local state on success, failure, cancellation, and explicit
  cache reset. No subsequent capture may observe a prior owner/source mapping.
- Preserve current BG1 geometry, raster fallback, diagnostics, cancellation,
  stable-core compatibility, ordinary image behavior, `object-fit` /
  `object-position`, and composed-DOM traversal contracts.
- Keep extension product changes limited to an evidenced regression fixture or
  direct adapter-consumer contract update. Do not broaden permissions,
  messaging, clipboard, storage, UI, or capture lifecycle.
- If the published core changes, add a changeset and refresh the governed core
  delta fingerprint/contract. Do not change manifests, lockfiles, release
  workflows, or package ownership unless a separately reviewed target-drift
  finding proves they are required.
- Treat local implementation completion and target-line promotion as distinct
  gates inside this same BG2 task. Do not archive or report the task complete
  after only a local commit.
- After independent local review, refresh the remote base and verify that the
  reviewed BG2 head remains a clean, exact delta over current `origin/main`.
  Target drift is a stop condition for reconciliation, not permission to
  rewrite reviewed history or absorb unrelated changes.
- Obtain explicit execution-time authorization before each remote mutation:
  pushing the BG2 source branch, creating/updating its PR, and merging it.
- The PR must target `main`, contain exactly the reviewed BG2 delivery, preserve
  one cohort-sized rollback boundary, and pass required CI/review without
  branch-protection bypass, auto-merge, or direct `main` push.
- Use a merge commit so the reviewed BG2 patch identity remains reachable.
  After merge, refresh `origin/main`, record PR URL, reviewed head, merge commit,
  final target SHA, and prove both the reviewed head and merge commit are
  contained before reconciling the two governance parents.

## Acceptance Criteria

- [ ] The execution record pins refreshed `origin/main` and proves the BG1
      reviewed head remains contained before any product edit.
- [ ] A `data-bgset` owner with no computed image layer enters inventory with a
      canonical background source, while analysis performs zero fetches and
      leaves the DOM byte/attribute/style shape unchanged.
- [ ] Plain, `-xs-`, width, and density candidates select deterministically;
      malformed input and disallowed schemes do not stage a resource.
- [ ] An existing computed background wins over lazy metadata and produces no
      duplicate layer or request.
- [ ] Duplicate sources across owners and resource kinds are prepared once,
      before fonts and conversion; conversion never starts an unplanned fetch.
- [ ] The owner/source context produces an IMAGE paint through a generic core
      resolver, and is cleared after success, failure, cancellation, and reset.
- [ ] Failure, placeholder, unsupported-capability, and stale-context behavior
      is explicit and covered by adapter/core/browser tests.
- [ ] The eyeondesign-shaped offscreen fixture resolves real image bytes
      without scrolling, running a site lazy-loader, or mutating page DOM.
- [ ] Core, adapter, and extension focused tests/type checks/builds pass;
      compatibility checks and `git diff --check` pass; oracle parity runs if
      the rendered BG1/BG2 path or scene corpus changes.
- [ ] Scope audit finds no LA1/LA2 activation, CP persistence, unrelated
      extension UI/messaging/storage, manifest, lockfile, release workflow, or
      literal history-replay changes.
- [ ] The completed delivery is one independently reviewable branch/PR rollback
      unit and the dirty sync root plus unrelated worktrees remain preserved.
- [ ] The reviewed BG2 source branch is pushed only after its explicit remote
      gate, and the remote branch head exactly matches the locally reviewed
      head.
- [ ] One PR targets `main`, contains only the approved BG2 payload, records the
      validation/rollback contract, and passes all required CI and review gates.
- [ ] An explicitly authorized merge commit preserves the reviewed BG2 head and
      does not bypass branch protection or rewrite `main`.
- [ ] Refreshed `origin/main` contains both the reviewed BG2 head and its merge
      commit; PR URL, identities, final target SHA, and rollback evidence are
      stored in this task and reconciled into both governance parents.

## Out Of Scope

- Lazy activation, scrolling, IntersectionObserver orchestration, infinite
  scroll stabilization, or arbitrary page lazy-loader execution.
- Guessing arbitrary `data-*` attributes, supporting `data-bg` without new
  evidence, or inferring dynamic CSS Paint sources.
- Figma schema, clipboard envelope, artifact persistence, output sinks,
  extension permissions, messaging protocol, storage, or workspace UI changes.
- Whole-branch merge/rebase/squash, literal cherry-pick, old task/archive
  transplantation, package migration, lockfile churn, or release automation.
- Direct `main` push, force-push, history rewrite, auto-merge, branch-protection
  bypass, or automatic response to target drift or CI/review failure.
- A separate BG2 promotion task. This task owns local delivery and governed
  remote promotion end to end.

## Key Decisions

- The prior local-only plan was invalidated after the user clarified that BG1's
  separate promotion task repaired an omission rather than establishing the
  intended lifecycle for later cohorts. The user approved this revised
  end-to-end plan on 2026-08-29. A separate start instruction was received on
  2026-08-29; execution remains gated only by approval of the latest planning
  summary and `task.py start`, so the task remains `planning` for this review.
- `data-bgset` parsing and policy belong to the adapter. Core receives only an
  optional generic resolver for a frozen CSS background expression.
- BG2 composes with the existing BG1 inventory/scheduler/paint pipeline rather
  than replacing or duplicating it.
- One BG2 task owns the complete lifecycle: isolated implementation, local
  commit/review, source-branch push, PR, CI/review, merge commit, refreshed
  `origin/main` containment, and parent reconciliation. These are distinct
  gates but one delivery and one PR/merge rollback unit.
