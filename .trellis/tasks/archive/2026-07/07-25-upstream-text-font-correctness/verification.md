# Verification

## Reviewed Inputs

- Upstream stable and local `upstream/main` commit:
  `0bf06ecce52aabc2bc696980b83040860630e35f`
- Glyph-aware source commit:
  `ea9956ae79fc3c1876b4f0eae95910b8ffcf1f9e`
- Single-line source commit:
  `ab0f56ea49ac34389cb7bc33a4987ac1a8d0b9e5`

## Focused Gates

- Scoped Biome check: passed with only pre-existing informational diagnostics
  in `figma.text.browser.test.ts`.
- Core focused tests: 3 files, 18 tests passed.
- Core package: 21 files, 166 tests passed; type-check and build passed.
- Browser capture adapter: 12 files, 53 tests passed.
- Governance check: 15 registered runtime paths, 0 unmapped runtime paths.
- Stable target check: resolved `@figit/dom-to-figma@0.2.1` to the reviewed
  commit and completed without errors.
- `upstream/main` target check: resolved to the same reviewed commit and
  completed without errors.
- Vanilla stable adapter compatibility: passed in a clean installed-package
  fixture.

The stable/main reports list four unmapped runtime paths under blur, border,
shadow, and node types. Those are pre-existing post-stable rendering deltas
outside this task. The governance baseline, which owns fork-delta
authorization, reports zero unmapped runtime paths.

## Workspace Gates

- `pnpm check-types`: passed for all workspace projects.
- `pnpm build`: passed, including Chrome MV3 extension build.
- `pnpm test`: passed. This includes 5 governance tests, 166 core tests,
  53 adapter tests, 33 extension tests, and 102 oracle-harness tests; 5
  environment-gated oracle-harness tests remained skipped as before.
- `pnpm oracle:parity`: passed across 46 scenes. It retained the known 15
  tier-0 findings and introduced no new parity failure.
- `pnpm lint`: blocked by the repository-wide CRLF/format checkout baseline
  (75,340 errors across 449 files). No bulk formatting was applied. All files
  changed by this task pass the scoped Biome check.

## Publication Boundary

Two independent upstream candidates and PR drafts are recorded in
`delta-map.md` and `upstream-pr.md`. No remote branch was pushed and no PR was
created.
