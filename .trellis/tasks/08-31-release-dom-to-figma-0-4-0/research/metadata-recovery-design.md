# Research: metadata-recovery-design

- Query: Minimal safe recovery design for failed Release run 33355456677.
- Scope: internal
- Date: 2026-08-31

## Findings

### Current flow and failure

1. The protected `publish` job checks out the reviewed input SHA, verifies that
   it is current `origin/main`, builds and preflights all three allowlisted
   packages, calls `pnpm release:publish`, then uploads only
   `manifest.json` (`.github/workflows/release.yml:45-96`).
2. The manifest contains `sourceSha` and all allowlisted artifacts, in fixed
   order (`scripts/private-release.mjs:381-424`, `:802-821`). It deliberately
   includes unchanged `fig-kiwi@0.2.0` and `composed-dom@0.1.1` as well as
   `dom-to-figma@0.4.0`.
3. `publishSerially` compares each staged artifact to the registry. It accepts
   an immutable matching version without publishing and returns only an
   in-memory `{ coordinate, state }` result; only an `absent` version is
   published (`scripts/private-release.mjs:187-234`). This is correct and is
   already tested (`scripts/private-release.test.mjs:405-413`).
4. The downstream metadata job downloads the full manifest and passes every
   artifact to `reconcileMetadata` (`.github/workflows/release.yml:98-116`,
   `scripts/private-release.mjs:479-486`). Metadata consequently treats every
   historical coordinate as if it were released at this invocation's
   `sourceSha`: an existing tag at any different SHA fails before any write
   (`scripts/private-release.mjs:237-258`).
5. Run 33355456677 therefore stopped at valid historical
   `fig-kiwi@0.2.0 -> dd91f183...`, before creating the absent dom tag/Release.
   Its publish job had already verified and published private dom 0.4.0 at
   `adc52aea...`; the tag and Release are still absent. See
   `research/release-run-33355456677-debug.md:54-83,85-119`.

This is a data-contract defect between jobs, not a registry or transient
failure. The repository contract itself says matching versions are idempotent
and that only matching metadata at the approved SHA is idempotent
(`.trellis/spec/repository/backend/private-package-release.md:69-77,83-96`),
but currently applies the second rule to coordinates that did not originate in
the current release.

### Authoritative coordinate evidence

| Evidence | Establishes | Limits |
| --- | --- | --- |
| Publish result `state === "absent"` | The coordinate was newly published by this protected invocation after staged-byte verification. | It is transient unless serialized and uploaded with the manifest. A later rerun sees that coordinate as `matching`. |
| Current reviewed source + staged artifact + matching registry bytes | The registry version is byte/manifest-identical to the package at the reviewed source. | Does not alone prove when an already-published version was first published. |
| Per-package version history from owned tags reachable before the reviewed source | A current source version is a new version beyond its last owned package tag. | Must be fail-closed on no unique predecessor, non-ancestor/ref ambiguity, malformed versions, or version regression. It is a recovery fallback, not normal-release provenance. |
| Registry `gitHead` | Supplementary evidence only. | Not reliable for every GitHub npm version; the existing spec expressly forbids treating its absence as proof (`private-package-release.md:152-156`). |

At the failed source, package manifests identify dom as `0.4.0`, while the
last owned dom tag is `0.3.0`; fig-kiwi and composed-dom source versions equal
their existing `0.2.0`/`0.1.1` tags. This is sufficient to identify the sole
current-source recovery coordinate only when combined with the staged-byte
registry match and absent metadata pair.

### Options

#### A. Publish result handoff and metadata filtering

Have `publishSerially` return states as it does now, but have `runPublish`
write a non-binary publish-result document alongside `manifest.json`, for
example `{ sourceSha, published: [artifact identity...] }`, containing only
initially `absent` artifacts after all verification and promotion succeeds.
Upload it with the non-binary manifest and have metadata reconcile only that
list. Retain manifest identity validation in the metadata job.

- Strengths: exact causal provenance; historical tags are never even
  candidates; no tag retargeting; lowest-risk steady-state design.
- Limitation: cannot by itself recover this run after a reviewed code fix,
  because dom 0.4.0 will then enter publish as `matching` and the failed run's
  artifact contains only the old 928-byte manifest, not result state.

#### B. Derive recovery coordinates from reviewed source/history/version state

For an explicitly bounded recovery path, derive a candidate only when all
conditions hold: (1) preflight/re-publish verifies the registry artifact
matches current staged bytes and metadata; (2) its exact tag and Release are
both absent; (3) a unique owned predecessor tag for that package is an
ancestor of the reviewed source; (4) the source package version is strictly
newer than that predecessor; and (5) no tag for the candidate coordinate
exists anywhere. Then reconcile that candidate to the reviewed source SHA.

- Strengths: exactly recovers already-published dom 0.4.0 after a reviewed
  release-script fix; excludes fig-kiwi/composed-dom because their coordinates
  already have historical tags; needs no binary artifact recovery.
- Costs: requires a small Git/version resolver plus explicit tests; it should
  be a compatibility fallback to A, not the default source of truth. If the
  resolver cannot establish all predicates, stop and require a separately
  reviewed, explicit recovery design rather than guessing.

#### C. Accept historical tags at arbitrary SHAs

Reject. This would erase the version-to-source provenance invariant and let a
rerun treat a missing/incorrect metadata state as success. It could silently
leave a Release inconsistent with its tag, create a Release for an unrelated
source, or normalize a malicious/accidental tag. The existing all-tags
preflight is valuable for the coordinates being reconciled; the defect is the
candidate set, not the SHA-conflict rule.

### Recommended minimal design

Create a separately reviewed child implementation task before any release
recovery. Its narrow scope is release metadata provenance, owned by:

- `scripts/private-release.mjs`
- `scripts/private-release.test.mjs`
- `.github/workflows/release.yml`
- `.trellis/spec/repository/backend/private-package-release.md`

Implement A as the permanent contract:

1. Preserve `publishSerially`'s state result, serialize a source-SHA-bound
   non-binary result after successful verification/promotion, and upload it
   with `manifest.json`.
2. Metadata validates that every selected result artifact exactly matches an
   artifact in the source-SHA-bound manifest and reconciles only selected
   coordinates. It preflights every selected tag and Release before its first
   write. An existing selected tag must still equal `sourceSha`; an existing
   Release must name that tag and target the same SHA (currently
   `shellGitHub.inspectRelease` returns only `tag_name`,
   `scripts/private-release.mjs:772-797`).
3. Treat an empty selected set as a successful no-op after validation; it must
   never inspect, recreate, or retarget historical coordinates.

Add B only as an explicit, fail-closed recovery selector used when a source
version is registry-matching but result state is unavailable. Its output feeds
the same reconciler as A. For this recovery it selects only
`@aakkino/dom-to-figma@0.4.0`; historical package tags remain untouched.
Do not rely on `gitHead`, tag absence alone, package ordering, or the
manifest's full allowlist.

After the child fix is reviewed and merged, the operator must capture the new
current `origin/main` SHA and obtain new workflow/environment authorization.
The new run preflights its own source tree, verifies dom 0.4.0 as `matching`
with the immutable integrity recorded in the failed run, derives the bounded
recovery candidate, and creates only the missing dom tag and Release at the
new approved source SHA. It must not rerun 33355456677, retarget historical
tags, delete dom 0.4.0, or delete `changeset-release/main` before the complete
recovery succeeds.

### Regression matrix

| Case | Required assertion |
| --- | --- |
| All three coordinates absent | Publish result selects all; metadata creates their tags/Releases only after all candidate preflight passes. |
| Historical fig/composed matching; dom absent | Publish result selects only dom; metadata never inspects or writes historical metadata. This is the original bug regression. |
| Dom published then metadata fails; reviewed fixed-SHA rerun | Dom is registry `matching`; recovery selector proves 0.3.0 predecessor/version increase and absent dom metadata; creates only dom tag/Release. |
| Rerun after metadata success | Dom selected/recovered coordinate has correct tag and Release target; no writes; historical tags untouched. |
| Selected tag points elsewhere | Fail before any metadata write. |
| Selected Release exists with wrong `target_commitish` or wrong tag | Fail before any metadata write. |
| Historical tag points elsewhere but is not selected | No failure and no inspection/write attributable to it. |
| Candidate has no unique ancestor predecessor, equal/lower version, malformed version, existing tag, missing Release only with conflicting tag, or registry mismatch | Fail closed; no metadata writes. |
| Serialized result source SHA/artifact identity differs from manifest | Fail before metadata API calls. |
| Empty result selection | Valid no-op; no historical metadata calls. |

The existing metadata tests cover correct and conflicting tags plus all-tag
preflight (`scripts/private-release.test.mjs:480-548`); extend them for
selection, release-target validation, no-op behavior, and the recovery
resolver. Existing publish-state tests at `:389-457` cover the starting
classification but need an integration-style result-serialization assertion.
Run `pnpm test:release` (wired in `package.json:20-24`) plus the workflow/
policy tests required by the spec (`private-package-release.md:111-131`).

### Task dependency and compatibility

This is an independently verifiable code/config/spec correction and should be
a child task preceding operational release recovery. Amend the current parent
task's operational plan/evidence only to record the block and ordered
dependency; do not broaden it into an unreviewed workflow change. The child
has clear completion evidence: release tests passing, static workflow artifact
handoff validation, and review of the fail-closed selector. The parent then
resumes with a fresh exact-SHA authorization and live verification.

Compatibility is additive: old failed-run manifests contain no result file,
so ordinary new runs use A while the one bounded B selector handles this
orphaned matching coordinate. Do not reinterpret old manifests as permission
to reconcile their entire allowlist.

## Caveats / Not Found

- The source repository's local `main` is behind `origin/main`; all source-SHA
  conclusions above use recorded remote evidence and read-only Git objects.
- The currently uploaded failed-run artifact is manifest-only; no publish-state
  result was persisted, so it cannot supply A's evidence retroactively.
- `inspectRelease` presently does not return a target SHA, leaving an existing
  Release target unverified; include that repair in the child task.
- `git status --short` reports only the untracked active task directory:
  `?? .trellis/tasks/08-31-release-dom-to-figma-0-4-0/`. This report is the
  only file created by this research unit.
