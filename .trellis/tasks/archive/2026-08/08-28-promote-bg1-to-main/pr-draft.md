# PR Draft

## Title

`feat(dom-to-figma): support CSS raster backgrounds`

## Routing

- Repository: `aakkino/web-to-figma`
- Base: `main@dd91f18346d7326ab71c1a77769bfe7aed310af3`
- Head:
  `task/rebuild-bg1-css-raster-backgrounds@92c8452f02da3fa5c304e81d89c3c9905ba453d5`
- State when regenerated: PR #14 is OPEN/non-draft at the exact final head;
  replacement CI is terminal and passing; GitHub still has the separately
  reviewed old three-commit body pending explicit body-update authorization

## Body

### Summary

- Discover computed CSS raster `url(...)` and `image-set(...)` background
  layers without DOM mutation or unplanned fetches.
- Stage canonical image sources once through the browser adapter, preserve all
  owner/layer usages, and clear session state after success, failure, or
  cancellation.
- Convert expressible layers to editable Figma IMAGE paints; use bounded raster
  fallback and structured diagnostics for unsupported geometry or capability.
- Add compatibility governance, staged-resource contracts, focused unit/browser
  coverage, and a zero-finding Oracle scene.

### Exact Identity

- Base: `dd91f18346d7326ab71c1a77769bfe7aed310af3`
- Final corrected reviewed head: `92c8452f02da3fa5c304e81d89c3c9905ba453d5`
- Topology: zero behind, four commits ahead of the base
- Source branch: `task/rebuild-bg1-css-raster-backgrounds`

Commits, in order:

1. `30d33b9131e1775bc54c53a6afe4548a3fd2dc71` -
   `feat(dom-to-figma): support CSS raster backgrounds`
2. `5b906e214241300edd4beff08dfb67313005bbf2` -
   `chore(governance): refresh CSS background fingerprint`
3. `312c8389ee25eca74e653178fba5b9bb85ae8f7e` -
   `style(oracle): sort CSS background declarations`
4. `92c8452f02da3fa5c304e81d89c3c9905ba453d5` -
   `test(oracle): update stable scene manifest`

The third commit only moves the unchanged `background-repeat` declaration
before `background-position` in the Oracle HTML fixture. It does not amend or
rewrite either reviewed BG1 commit and does not change rendered behavior.

The fourth commit adds only the sorted five-line stable scene-manifest object
for `img/img-03-css-background` at 320x180. It closes the repository-test
snapshot omission without changing the scene, scoreboard, tolerance, or
product behavior.

### Payload

Exact base-to-head diff: 23 files, 2,631 insertions, 78 deletions.

- `.changeset/css-raster-backgrounds.md`
- `.trellis/spec/dom-to-figma/frontend/staged-resource-pipeline.md`
- `docs/upstream-core-delta.json`
- `internal/browser-capture-adapter/src/bridges/dom-to-figma.test.ts`
- `internal/browser-capture-adapter/src/bridges/dom-to-figma.ts`
- `internal/browser-capture-adapter/src/capture-engine.browser.test.ts`
- `internal/browser-capture-adapter/src/capture-engine.ts`
- `internal/browser-capture-adapter/src/index.ts`
- `internal/browser-capture-adapter/src/resource-inventory.browser.test.ts`
- `internal/browser-capture-adapter/src/resource-inventory.ts`
- `internal/browser-capture-adapter/src/types.ts`
- `internal/oracle-harness/baseline/scoreboard.json`
- `internal/oracle-harness/src/__snapshots__/scenes.test.ts.snap`
- `packages/dom-to-figma/scripts/oracle-scenes/img/img-03-css-background.html`
- `packages/dom-to-figma/src/converter/convert.ts`
- `packages/dom-to-figma/src/converter/image-cache.ts`
- `packages/dom-to-figma/src/converter/nodes/form/converter.ts`
- `packages/dom-to-figma/src/converter/nodes/frame/converter.ts`
- `packages/dom-to-figma/src/converter/styles/background.test.ts`
- `packages/dom-to-figma/src/converter/styles/background.ts`
- `packages/dom-to-figma/src/converter/walk.ts`
- `packages/dom-to-figma/src/figma.image.browser.test.ts`
- `packages/dom-to-figma/src/figma.ts`

### Release And Compatibility Contract

- Changeset: minor release for `@aakkino/dom-to-figma`, covering computed CSS
  raster background conversion, bounded fallback, and structured diagnostics.
- Published core advertises `domToFigmaCapabilities.cssBackgroundImages ===
  true`; the adapter negotiates this structurally.
- A stable core without BG1 capability preserves ordinary image conversion and
  emits one explicit unsupported-capability result per unblocked background
  usage.
- Core-delta governance resolves `fork-base/ac830db` to
  `ac830db5b89d2e8e7eede86f9419303988ae1938`, with 15 governed runtime paths,
  zero unmapped runtime paths, and no registry errors.
- Stable compatibility resolves `@figit/dom-to-figma@0.2.4` to
  `859efea8d7f8330783c6c4e3e520fd673e877336`.
- Upstream-main compatibility resolves `upstream/main` to the same reviewed
  `859efea8d7f8330783c6c4e3e520fd673e877336` commit.
- No fingerprint, tolerance, threshold, epsilon, or existing Oracle baseline
  was relaxed.

### Local Validation

All approved committed-shape commands passed on Windows against the exact
base/head pair:

- Exact touched-file Biome: 20 supported files checked, no errors or fixes.
- `@aakkino/dom-to-figma`: 34 test files / 280 tests; types and build passed.
- `@figit/browser-capture-adapter`: 12 test files / 58 tests; types and build
  passed.
- Extension: 7 test files / 33 tests; types, Chrome build, and Firefox build
  passed. Firefox emitted only its known data-collection permission warning.
- Core-delta script: 7 tests passed; governance, latest stable, and
  upstream-main core reports passed.
- Stable and upstream-main adapter compatibility passed.
- Oracle parity passed all 47 scenes; `img/img-03-css-background` had zero
  Tier-0 findings and zero maximum delta. A separate reviewer rerun also passed
  the committed ratchet; its measurement variance was confined to pre-existing
  text scenes.
- `git diff --check origin/main...HEAD` passed.
- The owning stable scene-manifest test passed: 1 file / 4 tests.
- An additional full `pnpm test` passed, including oracle harness 20 files / 102
  tests, and directly proved the prior CI snapshot failure closed. Its three
  files / five skipped tests are explicitly gated integration/live-Figma tests,
  not skipped material CI jobs.

Independent committed-shape review found no scope, correctness, privacy,
compatibility, release, governance, or preservation blocker.

The first PR run failed only because the new 320x180 Oracle scene was absent
from the committed stable scene-manifest snapshot. The reviewed fourth commit
adds exactly that entry; no baseline or tolerance was changed.

### CI And Review Expectations

Before merge, require terminal success for:

- repository lint, typecheck, build, and test gate;
- upstream core-delta governance;
- latest stable core and adapter compatibility;
- upstream-main core and adapter compatibility;
- Tier-0 parity ratchet.

GitHub branch protection requires current `Lint, typecheck, build, test` and
`Tier-0 parity ratchet` checks with strict up-to-date enforcement. All review
conversations must be resolved, and the final head and 23-file payload must be
reverified before merge authorization.

Replacement CI for final head `92c8452f02da3fa5c304e81d89c3c9905ba453d5`
is terminal with no pending or skipped check runs. All six checks passed:

- `Lint, typecheck, build, test`;
- `Inspect local package tarballs` (advisory preview);
- `Latest stable upstream compatibility`;
- `Tier-0 parity ratchet`;
- `Upstream core delta governance`;
- `Upstream main compatibility`.

The pkg.pr.new preview is advisory only if its failure is demonstrably caused
by infrastructure, permissions, or App installation, the repository build has
passed, and the failure is unrelated to package correctness. No other material
CI failure or skipped gate is waived.

### Exclusions

- No BG2 lazy-source discovery (`data-bgset`, lazy `<img>` metadata), runtime
  activation, scrolling, or timeout-based loading.
- No LA1/LA2, CP1/CP2, FD1 follow-up, package-registry migration, release
  workflow, lockfile, application/extension source, or dirty-root content.
- No test weakening, fingerprint/tolerance/baseline relaxation, history
  rewriting, direct `main` push, force-push, auto-merge, or protection bypass.

### Merge And Rollback

Use GitHub's merge-commit method only after separate explicit merge
authorization. This must preserve all four reviewed source commits as distinct
ancestors and provide one target-line rollback unit.

- Before merge: close the PR if required; retaining or deleting the remote
  branch remains a separately authorized action. `main` stays unchanged.
- After merge: rollback through a reviewed PR that reverts GitHub's merge
  commit. Never rewrite `main` or silently reopen BG1 implementation.

### Dependency

BG2 remains deferred. This promotion only satisfies its dependency gate after
the PR is merged, containment is proved on refreshed `origin/main`, this task
passes final checks and is archived, and the user separately authorizes BG2
planning.
