# Composed DOM 遍历端口实施计划

## Dependencies

- Blocking: `07-25-upstream-core-delta-governance`.
- Independent after that gate: text/font work may proceed in parallel.

## Step 1: Isolate The Existing Delta

- [x] Map commit `e8b46a4` and related Shadow DOM edits to current files and tests.
- [x] Separate traversal-hook changes from responsive layout or product behavior.
- [x] Register both the core hook and composed helper as distinct capabilities.

## Step 2: Build The Minimal Core Commit

- [x] Normalize the public strategy types and light-DOM default.
- [x] Audit every child/parent read in walker, form conversion, frame conversion, and layout inference.
- [x] Add injected-strategy tests that do not require the helper package.
- [x] Prove the default path produces no snapshot or parity change.

## Step 3: Verify The Helper

- [x] Test open roots, default/named slots, fallback content, nested slots, duplicate assignments, cycles, and closed roots.
- [x] Add converter integration cases for order, composed parent, and auto-layout behavior.
- [x] Keep `@figit/composed-dom` out of core runtime dependencies.

## Step 4: Prepare Upstream Artifacts

- [x] Rebase the isolated candidate conceptually onto the current upstream code shape without rewriting fork `main`.
- [x] Produce focused commits, PR title/body, API rationale, examples, and test evidence.
- [x] Record any upstream review concern in the delta registry.
- [x] Stop before push or PR creation pending explicit approval.

## Step 5: Verify The Fork

- [x] Run package tests for `@figit/composed-dom`, `@figit/dom-to-figma`, and `@figit/browser-capture-adapter`.
- [x] Run workspace types, build, tests, and oracle parity. Workspace lint is blocked by the repository-wide CRLF checkout baseline; scoped lint passes for every task file.

## Exit Condition

The generic hook is ready for upstream review, the helper remains independently usable by the adapter, and default upstream behavior is unchanged. Patch deletion is deferred to the retirement task after an accepted equivalent reaches the selected baseline.
