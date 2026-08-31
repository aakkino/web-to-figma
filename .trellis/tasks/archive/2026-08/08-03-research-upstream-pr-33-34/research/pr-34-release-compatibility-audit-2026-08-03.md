# PR #34 Release Compatibility Audit

## Scope and Recommendation

PR #34 is a release-metadata PR, not a valid fork runtime intake unit.

**Recommendation:** do not cherry-pick it. If it merges and the npm `latest`
tag advances, perform a separate stable-target review of the published tarball,
tag, and resolved commit. That review must run the stable adapter gate; it does
not update fork package versions, peer ranges, or runtime code automatically.

## Snapshot

Live data was fetched and resolved at `2026-08-03T06:32:00.4842976Z`.

Final revalidation at `2026-08-03T06:52:39.6173865Z` found the same upstream
main, PR heads/states, and npm `latest`; no evidence from an earlier snapshot
was mixed into this conclusion.

| Subject | Exact identity | Observed state |
| --- | --- | --- |
| PR #34 | [#34](https://github.com/figitdesign/web-to-figma/pull/34), head `06a3daf851e611947c0f102e8c49089a3568c251` | Open, not draft, `MERGEABLE` but `BLOCKED`, review required, no reviews/checks, not merged. |
| Base and parent | `upstream/main` at `cc8d4864e6be53d0d5047fbf97283b112b3117f4` | `cc8d486` is the direct parent of `06a3daf`. |
| Release branch | `changeset-release/main` at `06a3daf851e611947c0f102e8c49089a3568c251` | Matches the fetched pull ref. |
| Current npm latest | `@figit/dom-to-figma@0.2.1` | Published `2026-07-23T09:29:42.371Z`; no 0.2.2 version is published. |
| Reviewed stable target | Tag object `39b0ab498b33dbb665cfc684c08514bbf7410f83`, peeled commit `0bf06ecce52aabc2bc696980b83040860630e35f` | Matches `targets.stable` in the registry. |

Npm version timeline observed in this research: `0.0.1` (2026-05-19), `0.0.2`
(2026-05-21), `0.1.0` (2026-07-11), `0.2.0` (2026-07-22), and `0.2.1`
(2026-07-23). The registry returned no `0.2.2` package.

GitHub recorded #34 as created at `2026-07-25T18:33:26Z` and last updated at
`2026-07-25T18:33:52Z`; the final state fields were queried again during the
no-drift revalidation.

## Release Contents

### Facts

`git diff upstream/main upstream/pr/34` contains exactly four release files,
with 18 insertions and 20 deletions:

| Path | Change | Meaning |
| --- | --- | --- |
| `.changeset/filter-color-matrix.md` | deleted | Consumes the already-merged #31 patch changeset. |
| `.changeset/tidy-pugs-smile.md` | deleted | Consumes the already-merged #32 radial/angled-gradient/object-fit patch changeset. |
| `packages/dom-to-figma/CHANGELOG.md` | modified | Adds a `0.2.2` section for #31 and #32 only. |
| `packages/dom-to-figma/package.json` | modified | Changes `0.2.1` to `0.2.2`. |

No production source, type, test, scene, snapshot, or oracle baseline file is
part of #34. The PR's changelog is a release statement for the #31 and #32
capabilities already on `upstream/main`; it is not independent runtime evidence.

### Relation to PR #33

PR #34 does **not** include the dotted-border implementation:

- `28c9858` is not an ancestor of `06a3daf`.
- PR #34's direct parent is `cc8d486`, while #33's dotted commit remains on the
  separate stale branch after `dfbaac7`.
- The #33-specific patch changeset is `olive-moons-shave.md`, introduced by
  `28c9858`; it is not consumed by #34.
- `tidy-pugs-smile.md` may look related because it appears in the aggregate PR
  #33 file list, but it belongs to the inherited PR #32 source commit
  `dfbaac7`, not to the dotted-border delta.

**Inference:** #34 cannot be combined with #33 as one atomic cherry-pick. A
future npm 0.2.2 release would publish #31 and #32, not the unmerged dotted
border behavior.

## Stable Target Impact

### Current Facts

- The registry pins `targets.stable` to exact version `0.2.1`, tag
  `@figit/dom-to-figma@0.2.1`, and commit `0bf06ec`.
- `npm view @figit/dom-to-figma dist-tags time.0.2.1 --json` still reported
  `latest: 0.2.1` in this snapshot.
- `pnpm upstream-core-delta:stable -- --verify-latest` completed successfully
  after the process-local Git ownership workaround. It resolved the same stable
  commit. The report's three unmapped runtime paths describe the dirty fork
  relative to an older stable package; they are not a #34 implementation result.
- `upstream-adapter:stable` was not run. The existing policy requires it to
  build a temporary consumer against the registry-pinned npm package, rather
  than the workspace core.
- The fork's `packages/dom-to-figma/package.json` remains independently versioned
  at `0.2.0`. The private browser-capture adapter declares
  `@figit/dom-to-figma: ">=0.2.0 <0.4.0"`, so its existing peer range already
  admits a possible `0.2.2`; publication alone does not require a peer-range or
  fork-package version edit. Executable adapter compatibility still has to be
  demonstrated against the published artifact.

### Required Post-Release Review

If npm publishes 0.2.2 and moves `latest`, the current `--verify-latest` gate
is expected to fail until an explicit target-review task:

1. Resolve the npm version, integrity/tarball, release tag object, and peeled
   commit at that time. Do not infer provenance from the version number.
2. Compare all package behavior relevant to the fork against the new stable
   artifact, including the still-partial `image-presentation` semantics.
3. Update `targets.stable` only in that separately approved review, then run
   `upstream-core-delta:stable -- --verify-latest` and
   `upstream-adapter:stable` against the published package.
4. Keep fork `package.json`, peer ranges, changesets, and releases out of that
   target refresh unless a separate product release task authorizes them.

This follows `docs/fork-maintenance.md`: package version/peer-range alignment
is separate release work, and compatibility targets are exact reviewed refs,
not moving names.

## Verification and Deferred Gates

| Check | Result | Interpretation |
| --- | --- | --- |
| GitHub PR metadata and fetched pull ref | Both resolve to `06a3daf`. | Confirms identity, state, and exact file list. |
| Git topology | `merge-base(upstream/main, PR34) = cc8d486`; direct parent is `cc8d486`. | Confirms release-only delta. |
| npm registry | `latest` remains 0.2.1. | No stable-target refresh is currently triggered. |
| Stable metadata gate | Passed with `--verify-latest`. | Metadata only; no adapter/package-consumer execution. |

Deferred: a real post-publish tarball provenance check, stable adapter fixture,
adapter type/capability/image-fallback/basic-conversion contract, and any
product-release work. No unrun gate is assumed to pass.

## Disposition

| Option | Decision | Trigger for reconsideration |
| --- | --- | --- |
| Cherry-pick PR #34 | Reject | It imports upstream release metadata into an independent fork without adding a compatible runtime capability. |
| Treat #34 as a release of #33 | Reject | The topology and changesets prove #33's dotted commit is absent. |
| Wait for a published 0.2.2, then refresh stable target | Recommended conditional path | Npm `latest` moves and a separately approved artifact/provenance/adapter review passes. |
| Keep 0.2.1 target | Current action | Until an actual npm release changes the external stable target. |

No release, tag, pin, or package metadata was modified by this research.
