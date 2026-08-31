# Current Compatibility Baseline

Recorded on 2026-07-25 before architecture implementation. Git references are local resolved refs, not a claim that the remote repositories have not advanced.

## Repository Graph

| Reference | Commit |
| --- | --- |
| `main` | `606ee8aa9ca4915ec28dd7853fd5b42283ff54ea` |
| `origin/main` | `606ee8aa9ca4915ec28dd7853fd5b42283ff54ea` |
| `upstream/main` | `0bf06ecce52aabc2bc696980b83040860630e35f` |
| merge base | `ac830db5b89d2e8e7eede86f9419303988ae1938` |

`upstream/main...main` contains 5 upstream-only commits and 42 fork-only commits. A prior read-only merge simulation produced one textual conflict in `packages/dom-to-figma/CHANGELOG.md`; 8 of the 28 files changed upstream also overlap fork-changed paths. This suggests manageable Git conflicts today, while semantic compatibility remains the larger risk.

## Core Delta

From the merge base to fork `main`, `packages/dom-to-figma/src` changes 20 files with 1,588 insertions and 142 deletions. The capability groups are:

- responsive and Shadow DOM conversion;
- composed-DOM traversal strategy;
- staged image preparation and placeholders;
- glyph-aware CJK font fallback;
- image `object-fit` and `object-position` presentation;
- non-wrapping single-line text sizing.

The originating fork commits currently identified are `af1bec8`, `e8b46a4`, `4da4c51`, `ea9956a`, `0149d62`, and `ab0f56e`. Governance must map these commits to exact current paths before enforcing the allowlist.

## Existing Compatibility Strengths

- The extension depends on `internal/browser-capture-adapter` rather than importing the converter directly.
- `internal/browser-capture-adapter/src/import-boundary.test.ts` enforces a single converter import boundary at `src/bridges/dom-to-figma.ts`.
- The converter already exposes generic injection points including `fontLoader`, `imageLoader`, `classify`, `layout`, and the fork-added `domTraversal`.
- `docs/fork-maintenance.md` already requires reviewed sync branches and keeps product policy outside the converter core.

## Current Replacement Blocker

`internal/browser-capture-adapter/src/bridges/dom-to-figma.ts` calls `assertStagedImageCapability` and throws when the installed converter lacks `createImagePreparation`. Vanilla upstream does not currently provide that fork-added API. The bridge is centralized, but the dependency is mandatory rather than negotiable, so the converter cannot yet be swapped for vanilla upstream without losing capture.

## Prior Verification Evidence

The compatibility assessment completed before this plan recorded:

- workspace type-check and build passed;
- 409 tests passed and 5 were skipped;
- oracle parity passed all 49 scenes;
- Biome checks passed for the 16 changed executable files under review.

These results establish a useful behavior baseline but are not substitutes for fresh execution in each implementation task.

## Known Semantic Risk

One reviewed upstream auto-layout change can introduce an additional border child without reserving position zero or consistently excluding it from auto-layout. This is the kind of semantic conflict that may merge cleanly while changing output. Sync review therefore needs structural and parity tests, not only Git conflict counts.

## Assessment

The fork is structurally a soft fork at its outer boundary, but it has not maximized upstream compatibility because core behavior is still materially divergent and the adapter hard-requires a fork-only API. The approved path is to make the bridge capability-driven first, then upstream generic capabilities and retire local patches only after parity is demonstrated.
