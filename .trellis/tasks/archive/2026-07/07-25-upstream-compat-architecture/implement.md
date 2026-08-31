# 最大化上游兼容架构实施计划

## Execution Rule

This parent task coordinates work only. Implementation occurs in the child tasks, each started and reviewed independently. Do not start any child from this planning approval alone.

## Phase 0: Freeze The Baseline

- [x] Confirm the latest stable upstream package version and resolve the tested `upstream/main` commit.
- [x] Re-run the baseline diff and behavior suite before changing architecture.
- [x] Complete `07-25-upstream-core-delta-governance` and make its gate blocking.

Exit condition: every current core production delta is registered, and the CI report distinguishes fork, stable upstream, and `upstream/main` results.

## Phase 1: Make The Outer Boundary Replaceable

- [x] Complete `07-25-vanilla-upstream-adapter-fallback`.
- [x] Test the single bridge against the fork workspace package and a vanilla stable upstream package.
- [x] Confirm extension consumers do not import `@figit/dom-to-figma` directly.

Exit condition: missing fork-only staged-image APIs trigger a tested adapter-owned fallback instead of an exception.

## Phase 2: Prepare Independent Upstream Units

- [x] Complete `07-25-upstream-dom-traversal-port`.
- [x] Complete `07-25-upstream-text-font-correctness`.
- [x] Complete the generic correctness portion of `07-25-upstream-image-pipeline` after its fallback prerequisite.
- [x] For each unit, produce an atomic commit series, focused tests, compatibility evidence, and draft PR text.

DOM traversal and text/font work can run independently after Phase 0. Image work may prepare generic tests early, but it cannot retire staged core behavior until Phase 1 passes.

Exit condition: each retained core patch has a reviewable upstream unit or a written reason that it cannot yet be generalized.

## Phase 3: Retire Superseded Patches

- [x] Complete `07-25-upstream-patch-retirement` only for capabilities present in the selected upstream baseline.
- [x] Remove compatibility shims and registry entries in separate, reversible commits.
- [x] Record core-delta milestones: `20 -> <=10 -> <=5 -> near 0`.

Exit condition: the fork uses upstream implementations wherever parity is proven; any remaining delta is explicitly registered and time-bounded.

## Required Verification

Run the affected-package tests during each child task and the complete gate before parent acceptance:

```sh
pnpm lint
pnpm check-types
pnpm build
pnpm test
pnpm oracle:parity
```

The compatibility jobs must additionally exercise the adapter with the latest stable upstream release. On an upstream sync PR they must exercise the resolved `upstream/main` commit as a blocking job.

## Upstream PR Handoff

For each proposed contribution, prepare locally:

- ordered commits with no product-specific dependency;
- problem statement and minimal reproduction;
- focused tests and full-suite evidence;
- compatibility and migration notes;
- draft PR title and body.

Stop before remote publication. Ask for explicit user approval for the actual push or upstream PR submission.

## Final Review

- [x] All child acceptance criteria are satisfied.
- [x] No existing capture behavior was removed to meet a budget.
- [x] Stable and sync compatibility policies are documented and enforced.
- [x] Remaining core deltas have owners and deletion conditions.
- [x] Parent task is only marked complete after user review of the consolidated evidence.
