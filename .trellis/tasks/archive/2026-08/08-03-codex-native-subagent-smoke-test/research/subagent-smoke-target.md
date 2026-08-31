# Research: native subagent smoke target

- Query: Verify native Trellis startup context injection and identify one small, clean, existing test file for a harmless test-only improvement.
- Scope: internal
- Date: 2026-08-03

## Findings

### Native startup injection (observed before repository reads)

Trellis did inject task and artifact-routing context at subagent startup. The initial context named the active task as `.trellis/tasks/08-03-codex-native-subagent-smoke-test` and identified this process as the dispatched `trellis-research` role.

The goal visible from that startup context was to perform repository research for the native Codex subagent smoke test and persist the result under the active task's `research/` directory.

Constraints visible in that initial injected context included:

- research output may be written only under `{TASK_DIR}/research/`; product code, specs, platform configuration, and other task directories are write-forbidden;
- `implement.jsonl` and `check.jsonl` must not be loaded because research context is role-isolated;
- the active task path must come from the injected header rather than a guessed task or `task.py current` fallback;
- the curated context exposed the package/spec directory map and instructed the researcher to read `.trellis/workflow.md`, relevant specs, and target code before forming an opinion.

This section records native startup injection only. It does not rely on `prd.md`, a task-context pull command, or later repository file reads. No fallback loading was needed.

### Later file reads (not startup injection)

After recording the startup evidence above, the researcher read `.trellis/workflow.md`, the task `prd.md`, the applicable guide/spec files, package configuration, and the candidate source/test files. The PRD confirms that the smoke test must use isolated native research/implementation/check roles, change only a previously clean test file, avoid production behavior and unrelated user edits, run focused and practical package verification, and create no commit.

### Recommended target

Use `packages/fig-kiwi/src/clipboard.test.ts` for the harmless test-only improvement.

- The file is a small existing Vitest unit test (14 physical lines) that already tests the adjacent clipboard helper and uses direct local imports (`packages/fig-kiwi/src/clipboard.test.ts:1-14`).
- The parent session supplied a current dirty-path snapshot because the research role forbids Git operations. That snapshot marks `packages/dom-to-figma/src/converter/classify.ts` and `packages/dom-to-figma/src/converter/classify.test.ts` modified, while this tracked candidate is absent from all modified/untracked product paths. Treat the two `classify` files as strictly off-limits.
- Add one focused test for malformed optional `(figmeta)` content returning `meta: null`. Import `parseClipboardHtml` beside `composeClipboardHtml`, construct a minimal envelope with invalid metadata base64 and the existing valid `BASE64_PAYLOAD`, and assert `parseClipboardHtml(html).meta` is `null`.
- This exercises the existing catch-and-degrade behavior in `packages/fig-kiwi/src/clipboard.ts:115-123`; it does not require or justify a product-code change.
- The behavior is an explicit contract in `.trellis/spec/fig-kiwi/frontend/clipboard-and-tree.md:9-17` and fits the required clipboard-test shape in `.trellis/spec/fig-kiwi/frontend/testing-guidelines.md:6-17`.

### Narrow verification

Run:

```sh
pnpm --filter @figit/fig-kiwi exec vitest run src/clipboard.test.ts
```

Baseline result on 2026-08-03 before the proposed edit: Vitest 4.1.5 ran one file and one test; both passed. After the edit, the same command should report the added test as passing. The practical package gate selected by the package spec is:

```sh
pnpm --filter @figit/fig-kiwi test
```

The package manifest maps that gate to `vitest run --passWithNoTests` (`packages/fig-kiwi/package.json:56-62`), and the spec also lists `check-types` and `build` for broader package validation (`.trellis/spec/fig-kiwi/frontend/testing-guidelines.md:22-28`). For this test-only smoke edit, the focused command plus package test is proportionate.

### Files found

- `.trellis/workflow.md` - requires persisted research, relevant spec loading, and incremental scoped work.
- `.trellis/tasks/08-03-codex-native-subagent-smoke-test/prd.md` - later-read smoke-test requirements and acceptance criteria; it was not needed to discover the active task.
- `.trellis/spec/guides/index.md` - selects repository conventions before a code/test change.
- `.trellis/spec/guides/repository-conventions.md` - pnpm/ESM/formatting rules and narrow-then-package verification guidance (`:5-14`, `:43-58`).
- `.trellis/spec/fig-kiwi/frontend/index.md` - routes clipboard work to the clipboard and testing guides (`:7-25`).
- `.trellis/spec/fig-kiwi/frontend/testing-guidelines.md` - Node Vitest environment, clipboard fixtures, and package commands (`:3-17`, `:22-31`).
- `.trellis/spec/fig-kiwi/frontend/clipboard-and-tree.md` - clipboard parsing contracts, including malformed optional metadata degrading to `null` (`:3-20`).
- `packages/fig-kiwi/src/clipboard.test.ts` - recommended previously clean test-only edit surface.
- `packages/fig-kiwi/src/clipboard.ts` - read-only implementation reference showing marker normalization/extraction and malformed-metadata handling (`:53-83`, `:98-125`).
- `packages/fig-kiwi/src/decoder.test.ts` - existing nearby coverage for round-trip, encoded/raw markers, and missing markers (`:195-240`); no explicit malformed-metadata assertion was found.
- `packages/fig-kiwi/vitest.config.ts` - limits Node-environment tests to `src/**/*.test.ts`.
- `packages/fig-kiwi/package.json` - package scripts and local Vitest dependency declaration.

### Code patterns

- Tests use Vitest's `describe`/`it`/`expect` imports and import the implementation directly from the sibling module (`packages/fig-kiwi/src/clipboard.test.ts:1-2`).
- Clipboard fixtures use literal marker envelopes and `composeClipboardHtml`; related parsing assertions use `toEqual`, optional-property checks, and `toThrow` (`packages/fig-kiwi/src/decoder.test.ts:195-240`).
- The parser treats the payload as mandatory but metadata as optional: invalid metadata is caught and mapped to `null` (`packages/fig-kiwi/src/clipboard.ts:98-125`).
- Formatting is two spaces, double quotes, ESM, and direct imports (`.trellis/spec/guides/repository-conventions.md:43-55`).

### External references

No live web research was needed. Tool/runtime details were established from repository-owned configuration: Vitest is declared as `^4.1.5`, the package is ESM, and its engine is Node 20 or newer. The focused command reported Vitest 4.1.5 locally.

### Related specs

- `.trellis/spec/guides/index.md`
- `.trellis/spec/guides/repository-conventions.md`
- `.trellis/spec/fig-kiwi/frontend/index.md`
- `.trellis/spec/fig-kiwi/frontend/testing-guidelines.md`
- `.trellis/spec/fig-kiwi/frontend/clipboard-and-tree.md`

## Caveats / Not Found

- Cleanliness is based on the root agent's current `git status --short` snapshot, not a Git command run by this research agent. This preserves the role's no-Git constraint.
- The focused command was run against the unmodified baseline only. The implementation/check roles must rerun it after adding the assertion, then run the package test gate.
- No explicit test for malformed optional metadata was found in the inspected `fig-kiwi` tests. Existing parsing coverage already handles round-trip envelopes, entity-encoded markers, Figma top-level markers, and missing payload markers.
- Do not edit `packages/fig-kiwi/src/clipboard.ts`, any `classify` file, generated files, dependencies, exports, snapshots, baselines, or release metadata for this smoke test.
