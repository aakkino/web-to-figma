# Validate Codex native Trellis subagent dispatch

## Goal

Prove that Codex can natively dispatch Trellis research, implementation, and
check subagents with isolated conversation history while still supplying the
active task and curated task context.

## Background

- The project explicitly sets `codex.dispatch_mode: auto`.
- The Codex process was restarted after that configuration change.
- An isolated `trellis-research` subagent observed native startup injection
  before reading task files and persisted its evidence in
  `research/subagent-smoke-target.md`.
- The worktree already contains unrelated user changes, including changes in
  `packages/dom-to-figma/src/converter/classify.ts` and its test. They must not
  be modified by this smoke test.

## Requirements

- Dispatch `trellis-research`, `trellis-implement`, and `trellis-check` with
  `fork_turns="none"` so successful task awareness cannot come from inherited
  conversation history.
- Use the research-selected clean test surface
  `packages/fig-kiwi/src/clipboard.test.ts`.
- Add one assertion scenario for the existing contract that malformed optional
  `(figmeta)` content degrades to `meta: null`.
- Limit implementation to that harmless test-only improvement; do not change
  production behavior, generated files, dependencies, or package exports.
- Have the implementation and check subagents report the active task and the
  task constraints they received through their initial Trellis context.
- Run the focused test with
  `pnpm --filter @figit/fig-kiwi exec vitest run src/clipboard.test.ts` and the
  package gate with `pnpm --filter @figit/fig-kiwi test`.
- Do not commit the smoke-test changes.

## Acceptance Criteria

- [x] All three native Trellis subagent roles start successfully with isolated
      conversation history.
- [x] Each subagent identifies
      `.trellis/tasks/08-03-codex-native-subagent-smoke-test` as the active task
      and demonstrates awareness of this PRD without receiving its contents in
      the dispatch prompt.
- [x] The implementation changes only a previously clean test file and does
      not alter runtime behavior.
- [x] The focused test and the `@figit/fig-kiwi` package test pass.
- [x] `trellis-check` independently reviews the diff and reports no blocking
      issue, or fixes any issue it finds and reruns the relevant verification.
- [x] The final report names the dispatched roles and records their observable
      context-injection evidence.

## Out of Scope

- Product behavior changes.
- Changes to the existing user edits.
- Dependency, generated-file, snapshot, baseline, or release changes.
- Creating a commit.

## Notes

- This is a lightweight, PRD-only task.

## Verification Results

- `trellis-research`, `trellis-implement`, and `trellis-check` all ran with
  `fork_turns="none"`, identified this task from native startup injection, and
  reported that child-side fallback was not needed.
- The implement and check roles knew the exact target test, malformed metadata
  contract, unrelated `classify` exclusions, required verification, and
  no-commit constraint without those details appearing in their dispatch
  prompts.
- `pnpm --filter @figit/fig-kiwi exec vitest run src/clipboard.test.ts` passed:
  1 file, 2 tests.
- `pnpm --filter @figit/fig-kiwi test` passed: 5 files, 42 tests.
- `pnpm --filter @figit/fig-kiwi check-types`, focused Biome validation, and
  `git diff --check` passed.
- Package-wide Biome validation still reports 27 pre-existing findings outside
  the task-owned test file. They were not modified because they are unrelated
  to this smoke test.
- No commit was created.
