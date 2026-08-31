# PR #33/#34 Cherry-Pick Decision

## Decision

Take no cherry-pick, merge, target refresh, registry update, package update, or
remote PR action from this research task.

PR #33's only potentially useful code (`28c9858`) must wait for a reviewed
upstream merge and pin refresh because it changes an absorbed path. PR #34 is
release metadata for #31/#32 and is neither a release nor a dependency of the
dotted-border work.

## Shared Snapshot

Resolved after a fresh `git fetch upstream --prune` plus explicit PR-head
fetches at `2026-08-03T06:32:00.4842976Z`:

Final revalidation at `2026-08-03T06:52:39.6173865Z` found no movement in
upstream main, either PR head/state, or npm `latest`.

| Target | Exact SHA/version | Decision significance |
| --- | --- | --- |
| `upstream/main` | `cc8d4864e6be53d0d5047fbf97283b112b3117f4` | Current reviewed registry pin and PR #33/#34 base. |
| PR #33 | `03a49c6d80a5ad2287b10c96aebe63e6696f46cb` | Open/conflicting dotted-border branch. |
| PR #34 | `06a3daf851e611947c0f102e8c49089a3568c251` | Open, blocked release-metadata branch. |
| npm latest | `@figit/dom-to-figma@0.2.1` | Still exactly the registry stable target. |
| stable tag / commit | `39b0ab4` tag object / `0bf06ec` peeled commit | No published 0.2.2 target exists. |

These conclusions are tied only to this snapshot. A movement of any listed ref,
PR head, merge state, or npm dist-tag invalidates the corresponding intake
conclusion and requires a new snapshot.

The decision deliberately extends the two July audits rather than superseding
them: the 2026-07-26 audit retained `image-presentation` for incomplete
upstream object-fit semantics, and the 2026-07-27 intake made style paths such
as `border.ts` absorbed only while byte-equivalent to the reviewed main commit.
PR #33 creates the latter constraint; PR #34 does not change either conclusion.

## Commit and PR Matrix

| Candidate | Capability / content | Semantic status | Governance / conflict status | Required gate before any action | Recommended disposition |
| --- | --- | --- | --- | --- | --- |
| `dfbaac7` in #33 history | #32 radial gradients, angled gradients, basic object-fit | Already merged upstream as squash `cc8d486`; current fork retains richer local image-presentation semantics as a documented partial overlap. | Stale duplicate lineage; generic `git cherry` cannot recognize the squash because parents differ. | None for intake; do not reintroduce it. | Exclude permanently from #33 selection. |
| `28c9858` | Uniform dotted border as `[width, width]` Figma dash pattern; dashed/mixed fallback; Node test and patch changeset | Narrow best-effort behavior, not proof of rounded/per-side/dashed parity. | Changes absorbed `styles/border.ts`; direct application before pin refresh is absorbed-path drift. No `sharedPaths` allowance covers it. | Final merged-source review, core-delta check, browser border tests, package test/type/build, oracle parity, upstream-main adapter. | Wait for merge and conditionally assess on a sync branch. |
| `03a49c6` | Tier-2 scoreboard ratchet only | Generated measurement evidence, not runtime behavior. | Must not be used to claim fork parity without measuring fork output. | Fresh fork oracle run and explicit reviewed baseline update if warranted. | Do not cherry-pick independently. |
| PR #33 whole | The three rows above | Contains stale #32 ancestry and a nonportable oracle ratchet. | PR is open/conflicting and review-required. | All of the `28c9858` gates plus final graph review. | Reject now. |
| `06a3daf` / PR #34 | Deletes #31/#32 changesets; changelog; 0.2.2 version | Release metadata only; explicitly excludes `28c9858` and `olive-moons-shave.md`. | Fork package/version work is separate. | Actual npm publication, exact tag/commit/tarball review, stable metadata plus adapter gate. | Do not cherry-pick; wait for a possible stable-target review. |

## Required Sequence if Upstream Changes

1. Fetch the final upstream merge/ref state without switching the dirty checkout.
   Confirm #33's final merge SHA, whether the resulting `border.ts` exactly
   matches the candidate semantics, and whether #34/npm changed independently.
2. Start a separately approved `sync/upstream-*` task from the fork branch.
   Do not use a full upstream merge by default; the fork-maintenance policy calls
   for an explicit, reviewable selection.
3. For a merged dotted-border path, review the new `upstream/main` target and
   update code/pin together only if `border.ts` is byte-equivalent to that exact
   new upstream commit. Otherwise it must become an explicitly registered local
   capability with an exact path and fresh fingerprint; no implicit absorbed-path
   exception exists.
4. Re-run semantic gates at the final commit: focused parser and browser tests,
   `pnpm --filter @figit/dom-to-figma test`, `check-types`, `build`, and
   `pnpm oracle:parity`. The missing cases must include rounded dotted borders,
   dotted/dashed/mixed side styles, unequal side widths/colors, dash/cap output,
   and a no-regression Figma measurement.
5. Run governance and compatibility gates: `upstream-core-delta:check`,
   `upstream-core-delta:main`, `test:upstream-core-delta`, and
   `upstream-adapter:main`. The ordinary upstream-main comparison is advisory,
   but it is blocking for the resulting `sync/upstream-*` pull request.
6. Only after a real 0.2.2 publication, separately resolve npm provenance and
   run `upstream-core-delta:stable -- --verify-latest` plus
   `upstream-adapter:stable`. A stable refresh neither releases the fork nor
   absorbs PR #33.

## Evidence Already Obtained

| Evidence | Result | Boundary |
| --- | --- | --- |
| Candidate isolated archive at `28c9858` | Node `border.test.ts`: 1 file / 6 tests passed; core `check-types` passed. | Does not prove browser, adapter, build, or Figma parity. |
| Current fork core-delta gate | 17 governed runtime, 7 absorbed runtime, 0 unmapped; budget limit 18. | Run against the dirty current fork, not a future intake. |
| Current stable gate | 0.2.1 resolved and `--verify-latest` passed; 3 stable-relative unmapped runtime paths reported. | Metadata check; adapter stable was deferred. |
| Fork package / adapter range | Fork core manifest remains `0.2.0`; adapter peer range is `>=0.2.0 <0.4.0`. | A possible upstream 0.2.2 is already range-admissible, but still requires the published-artifact adapter gate; no fork release edit follows automatically. |
| PR #33 preview checks | Two GitHub preview/release checks passed. | Not a fork compatibility gate. |
| PR #34 checks | None listed. | No release verification evidence. |

The first local governance invocation was blocked by Git's Windows
safe-directory ownership protection. Re-running with a process-local
`GIT_CONFIG_*` trust setting succeeded; no global Git configuration was changed.

## No-Action Boundary and Rollback

This task did not run `cherry-pick`, `merge`, `rebase`, `push`, a PR mutation,
registry fingerprint update, npm publish, or a product-code edit. The only
changes are these task-local research artifacts. Any later code/pin change has
its own sync-branch rollback unit and must not be folded into this research
evidence.
