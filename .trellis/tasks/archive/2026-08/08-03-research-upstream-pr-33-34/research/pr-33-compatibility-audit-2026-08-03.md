# PR #33 Compatibility Audit

## Scope and Recommendation

This is read-only cherry-pick research. No runtime file, registry entry, target
pin, branch, remote PR, or package version was changed.

**Recommendation:** do not cherry-pick PR #33 while it is open and conflicting.
Wait for a final upstream merge commit, then use a separately approved
`sync/upstream-*` intake review. The only potentially useful runtime commit is
`28c9858`, but applying it now would modify an absorbed upstream path before its
pin is refreshed and would fail the core-delta absorbed-path contract.

## Snapshot

The live targets below were fetched and resolved at
`2026-08-03T06:32:00.4842976Z`.

Research began at `2026-08-03T06:21:42.2008846Z` from the fork branch and
working-tree state recorded below.

Final revalidation at `2026-08-03T06:52:39.6173865Z` found the same upstream
main, PR heads/states, and npm `latest`; no evidence from an earlier snapshot
was mixed into this conclusion.

| Subject | Exact identity | Observed state |
| --- | --- | --- |
| Fork checkout | `sync/upstream-20260726` at `ee62ac0acc5413a2554eaf2b09b3a02f8945d75b` | The checkout was already dirty on unrelated user files. This research did not alter them. |
| `upstream/main` | `cc8d4864e6be53d0d5047fbf97283b112b3117f4` | Current PR #33 base. |
| PR #33 | [#33](https://github.com/figitdesign/web-to-figma/pull/33), head `03a49c6d80a5ad2287b10c96aebe63e6696f46cb` | Open, not draft, `CONFLICTING` / `DIRTY`, review required, no reviews, not merged. |
| PR #33 branch | `niko047/fix-dashed-dotted-borders` | Remote head resolved to the same SHA as the fetched pull ref. |
| Upstream PR #32 | [#32](https://github.com/figitdesign/web-to-figma/pull/32), head `dfbaac72ba67e75f0756c081f7947c87e50dac06` | Merged at `2026-07-25T18:33:14Z`; GitHub records squash merge commit `cc8d486`. |

GitHub reported two successful preview/release checks for #33, `Publish to
pkg.pr.new` and `Continuous Releases`. They are not evidence for the fork's
adapter, browser, or oracle compatibility gates.

GitHub recorded #33 as created at `2026-07-25T14:41:25Z` and last updated at
`2026-07-25T18:33:16Z`; the final state/review/check fields above were queried
again during the no-drift revalidation.

Reproduction commands used: `git fetch upstream --prune` plus explicit
`refs/pull/33/head`, `gh pr view 33 --repo figitdesign/web-to-figma --json ...`,
`git log`, `git cherry`, `git rev-list --cherry-pick`, `git diff`, and
`git patch-id --stable`.

## Patch Topology

```text
0bf06ec (@figit/dom-to-figma@0.2.1)
  |\
  | \-- dfbaac7 (PR #32 source head) -- 28c9858 -- 03a49c6 (PR #33)
  |
  \---- 810c2aa (#31) -- cc8d486 (squash merge of PR #32; upstream/main)
```

### Facts

- The merge base of `upstream/main` and PR #33 is `0bf06ec`, so a normal
  three-dot PR diff includes stale PR #32 ancestry as well as the dotted-border
  work. Its aggregate surface is 29 files and 1,113 insertions / 78 deletions;
  it is not a safe intake unit.
- `git cherry -v upstream/main upstream/pr/33` and
  `git rev-list --left-right --cherry-pick` both marked `dfbaac7` as right-only.
  That is a limitation of comparing the source commit against a squash merge on
  a different parent, not evidence that PR #32 remains unmerged.
- The raw stable patch IDs are intentionally not identical:
  `0bf06ec..dfbaac7` is `60bdce701bd121241208ba45fa836febd8245109`, while
  `810c2aa..cc8d486` is `5efcfaca50ca3fa28561faf2dc4a3caa43ceb58f`.
  The changed parents include #31. GitHub's PR #32 `mergeCommit` metadata and
  the direct tree comparison provide the usable equivalence evidence:
  `git diff upstream/pr/32 upstream/main` contains only the eight known #31
  color-matrix files, not a second copy of the #32 radial-gradient,
  angled-gradient, or object-fit changes.
- Therefore `dfbaac7` is a duplicated, already-upstream capability lineage for
  intake purposes. It must not be cherry-picked again despite the false-positive
  right-only output from the generic cherry comparison.

### Effective PR #33 Commits

| Commit | Effective delta from its PR #32 parent | Classification | Intake relevance |
| --- | --- | --- | --- |
| `dfbaac7` | PR #32 radial/gradient/object-fit source history | stale squash-equivalent ancestry | Exclude. `cc8d486` already records the merged upstream result. |
| `28c9858` | `.changeset/olive-moons-shave.md`, `border.test.ts`, `border.ts` | one runtime path, one Node unit test, one patch changeset | The only candidate implementation commit. |
| `03a49c6` | `internal/oracle-harness/baseline/scoreboard.json` only | generated parity evidence / ratchet | Do not transplant independently; remeasure in the fork after any approved runtime intake. |

The `28c9858` patch ID is `f91db6c2b7e96e665b9acc77c33df1837b157298`; the
scoreboard-only commit's patch ID is
`327a25241827f67494b09d763ed573e9cd98a68b`.

## Dotted-Border Semantic Surface

### Facts from `28c9858`

| Area | Evidence | What it establishes |
| --- | --- | --- |
| Runtime | `packages/dom-to-figma/src/converter/styles/border.ts` | Adds `dashPattern` to `BorderProperties`. If all four computed side styles are exactly `dotted` and `maxBorderWidth > 0`, it emits `[width, width]`. |
| Frame serialization | Existing `frame/converter.ts` destructures only `doubleBorder` and spreads the remaining border properties; current node types already expose `dashPattern`. | A candidate `dashPattern` can reach a FRAME node without a separate wire-schema change. |
| Dashed fallback | Candidate parser returns no dash pattern for `dashed`. | The existing solid-stroke fallback is retained deliberately. |
| Mixed styles | Candidate requires all four style strings to agree. | Any mixed dotted/solid/dashed combination retains the single-stroke fallback. |
| Test evidence | New Node `border.test.ts`, 6 tests; isolated run passed. | Covers uniform 6px/3px dotted, dashed/solid/double fallback, a dotted/solid mix, and zero width. |
| Release intent | `.changeset/olive-moons-shave.md` requests a patch release. | This would be user-visible converter behavior, not a refactor. |
| Oracle evidence | Existing upstream scene `bord/bord-06-dotted.html` is a square-corner, uniform `160 x 80`, `6px dotted` box. `03a49c6` changes only the scoreboard. | The commit message claims tier-2 improvements, but this audit did not rerun a live Figma oracle. |

The candidate's comments say Figma's continuous dash pattern is intentionally
left unused for `dashed`, because CSS fits dashes per side. They also say square
dashes outperformed round caps. The added `strokeCap` optional type is not set
by the parser or asserted by the test, so the emitted representation is the
default-cap `[width, width]` dash pattern, not a proven round-dot mapping.

### Inference Against the Fork Contract

The current rendering contract permits this narrow direction only as a
best-effort frame stroke: dotted/dashed/mixed-style borders must not be
flattened into the solid per-side vector decomposition. `28c9858` preserves that
fallback, so it does not directly violate the contract's no-solid-trapezoid
rule. It does not prove complete dotted parity:

- The focused tests do not cover dotted plus dashed mixed sides, unequal
  per-side widths, unequal colors, rounded corners, or Figma's continuous
  pattern phase around a rounded frame.
- The one inherited oracle scene is square and uniform. It cannot demonstrate
  the rounding or per-side edge cases required before accepting a broader claim.
- `figma.border.browser.test.ts` and `pnpm oracle:parity` were not run against
  the final upstream merge, so no browser/Figma parity conclusion is justified.

## Fork Governance and Compatibility

### Facts

- `docs/upstream-core-delta.json` pins `upstreamMain` to the same
  `cc8d486` snapshot and lists
  `packages/dom-to-figma/src/converter/styles/border.ts` in
  `absorbedUpstreamPaths`.
- `git diff --numstat upstream/main -- .../styles/border.ts` produced no output:
  the current fork file is byte-equivalent to the pinned upstream path.
- No `sharedPaths` declaration contains `border.ts`; it is absorbed, not owned
  by a local capability.
- The current registry budget is `runtimeFileLimit: 18`. The read-only
  `pnpm upstream-core-delta:check` reported 17 governed fork runtime files,
  7 absorbed upstream runtime files, and 0 unmapped runtime paths. This result
  reflects the user's dirty checkout and is not attributable to PR #33.
- `pnpm upstream-core-delta:stable -- --verify-latest` resolved the reviewed
  `@figit/dom-to-figma@0.2.1` commit and exited successfully. Its three
  unmapped runtime paths likewise describe the current fork relative to stable,
  not the candidate PR.

### Consequence

Cherry-picking `28c9858` now would change an absorbed path while the pinned
`upstreamMain.commit` still contains the old file. The governance contract
requires that to fail as absorbed-path drift. Treating it as a new local
capability would instead require an explicit exact path, review, fingerprint,
and a fresh budget calculation; it is not an implicit exception.

If upstream merges the candidate, the correct follow-up is to resolve the
actual merge SHA, compare its `border.ts` to the intended fork result, and
review a synchronized pin/code change so the file remains byte-equivalent to
the reviewed upstream commit. The previously recorded `image-presentation`
partial overlap is unrelated and remains retained; dotted-border support does
not satisfy any registered `removeWhen` condition.

This is consistent with the 2026-07-26 patch-retirement audit: source-level
basic object-fit support did not retire the fork's fuller object-position and
`none`/`scale-down` behavior. It also follows the 2026-07-27 style-effects
intake rule: a path already classified as absorbed stays exact to the reviewed
upstream commit, rather than gaining an unregistered local adaptation.

## Verification Performed

| Check | Result | Limits |
| --- | --- | --- |
| Isolated archive at `28c9858` | `pnpm install --frozen-lockfile --ignore-scripts` completed; a Windows `tar` warning affected only an unrelated `.claude` skill link. | Archive source and package files were usable. |
| Focused candidate unit test | Passed: 1 file, 6 tests. | Node parser coverage only. |
| Candidate package type check | Passed: `pnpm --filter @figit/dom-to-figma check-types`. | Does not exercise a browser or Figma. |
| Fork core-delta check | Passed with a process-local `safe.directory` setting after the first attempt was blocked by the repository's Windows ownership guard. | Uses the dirty fork checkout. |
| Fork stable metadata check | Passed with `--verify-latest`; npm `latest` remains 0.2.1. | Does not run the adapter fixture. |

Deferred intake gates: final-merge focused test/type check, fork browser border
tests, package build, `pnpm oracle:parity`, `upstream-core-delta:main`,
`upstream-adapter:main`, and the full `lint`, `check-types`, `build`, and `test`
sequence required for an approved sync branch.

## Disposition Options

| Option | Decision | Reason and required trigger |
| --- | --- | --- |
| Cherry-pick the whole PR | Reject now | Reintroduces stale PR #32 lineage, applies an unreviewed ratchet, and #33 is conflicting/open. |
| Cherry-pick only `28c9858` now | Reject now | It creates absorbed-path drift at the current pin. |
| Wait for merge, refresh `upstreamMain`, then selectively absorb | Recommended conditional path | Only after the final merge SHA has been reviewed for byte equivalence and all required converter, governance, adapter-main, and oracle gates pass. |
| Do not absorb | Valid fallback | Keep the current exact absorbed file if upstream changes semantics, conflicts, lacks parity evidence, or any blocking gate fails. |

The rollback unit for any future action is a separately approved sync-branch
commit. This research file itself changes no product behavior.
