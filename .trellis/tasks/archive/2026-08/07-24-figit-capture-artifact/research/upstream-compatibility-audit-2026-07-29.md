# Upstream Compatibility Audit: 2026-07-29

## Scope

Assess the latest source and package targets under the project's upstream
compatibility spec, determine whether the current fork can consume them, and
identify any impact on the `.figit` capture artifact plan. This audit does not
merge, rebase, cherry-pick, push, or change the converter registry.

## Resolved Targets

| Target | Resolved value | Result |
| --- | --- | --- |
| `upstream/main` after `git fetch --prune upstream` | `cc8d4864e6be53d0d5047fbf97283b112b3117f4` | Matches the reviewed registry target; zero new commits since the 2026-07-26/27 intake. |
| npm latest `@figit/dom-to-figma` | `0.2.1` at `0bf06ecce52aabc2bc696980b83040860630e35f` | Matches the pinned stable target. |
| Current integration branch | `sync/upstream-20260726` at `4c27bc263aea054203442e1f13a87b95ab1f4c69` | Contains the reviewed selective intake. |
| Local `main` | `bac116a` | 16 commits behind the current integration branch. |
| `origin/main` | `606ee8a` | 20 commits behind local `main` and 36 behind the integration branch. |

The fetched upstream range from the immutable common baseline `ac830db` still
contains the same seven commits: double borders, oracle montage/publisher,
text shadow, filter drop-shadow, the `0.2.1` release, color-matrix filters, and
gradients/basic object-fit.

## Compatibility Evidence

| Gate | Result | Evidence |
| --- | --- | --- |
| `pnpm upstream-core-delta:check` | Pass | 21 runtime differences: 14 governed fork paths plus 7 byte-equivalent absorbed upstream paths; zero unmapped runtime paths. |
| `pnpm test:upstream-core-delta` | Pass | 6/6 governance tests. |
| `pnpm upstream-core-delta:stable -- --verify-latest` | Pass | Stable remains `0.2.1`; the 3 paths outside fork capabilities are `filter-color.ts`, `gradient.ts`, and `paint.ts`, all byte-equivalent paths absorbed from the newer pinned upstream main rather than unregistered fork patches. |
| `pnpm upstream-core-delta:main` | Pass | Pinned SHA matches; 14 runtime differences and zero unmapped runtime paths. |
| `pnpm upstream-adapter:stable` | Pass | Real temporary consumer passes against installed `0.2.1`. |
| `pnpm upstream-adapter:main` | Pass | Pinned upstream source builds/packs and the temporary consumer passes type, capability, image fallback, and conversion checks. |

The compatibility commands cleaned their temporary source and consumer
directories. Existing uncommitted workspace changes were preserved. The two
`classify` files appear modified in `git status` because of checkout line-ending
normalization but have no content diff; they did not create an unregistered
runtime delta.

## Intake Disposition

### Already absorbed on the integration branch

- CSS double borders.
- Text and filter drop shadows.
- CSS color-matrix fill baking with composed-DOM-aware gating.
- Radial and angled gradients.
- The upstream type additions supporting these effects.

Seven parser/type runtime files are tracked as exact absorbed upstream paths.
Fork-specific frame/text integration remains governed because it intentionally
adapts the upstream behavior to composed traversal, layout, font, and ordering
semantics.

### Keep as fork implementations

- Responsive geometry and open Shadow DOM conversion.
- Injectable composed-DOM traversal and composed-parent semantics.
- Glyph-aware CJK font fallback.
- Full image presentation, including object-position and exact
  none/scale-down/intrinsic-size behavior. Upstream's basic object-fit is only
  partial overlap and does not meet the registry removal condition.
- Abortable image loading and normalization.
- Non-wrapping single-line text sizing.

These six capabilities remain within the runtime budget and have objective
removal conditions. Their current upstream states range from local-ready or PR
drafts to partial overlap; none can be retired from the fetched upstream state.

### Do not absorb for this task

- Oracle montage/publisher tooling is an independent toolchain concern.
- Upstream release metadata and changesets do not define the fork release.
- A complete upstream merge has no value while the reviewed capabilities are
  already selectively integrated and the fork owns substantially broader
  extension, adapter, composed-DOM, and compatibility infrastructure.

## Feasibility And Recommendation

There is no new upstream intake to perform. Technical compatibility is high at
the adapter boundary and intentionally partial inside the converter: upstream
main and stable can both serve as vanilla cores, while the fork retains six
registered semantic extensions. The feasible action is to finish review and
promotion of the existing integration branch through the normal fork quality
and protected-branch process, not to fetch more code or retire patches.

For the `.figit` task, upstream compatibility is non-blocking. Its schema,
checksum, parser, artifact, and sinks should remain project-owned and consume
only exact clipboard HTML plus project-owned settings/diagnostics. This keeps
the file format replayable across future converter target changes and avoids
turning an upstream refresh into a file-format migration.

## Residual Risks

- The reviewed intake is not yet on local `main` or `origin/main`; branch
  promotion is a separate action requiring the repository's full sync-branch
  gates and review.
- The current audit ran upstream governance and adapter compatibility gates,
  not the full repository lint/build/test/oracle suite required before merging
  the sync branch.
- Future upstream movement must stop at SHA mismatch and trigger a new target
  review; it must not silently expand this task.
