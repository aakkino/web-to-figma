# Upstream Compatibility Target Review

## Decision

The reviewed local-main promotion base is
`bac116ad8a7ac18812cfa6af72b140c45c6dbf83`. The target refresh is approved
for that base with exactly three registry changes:

1. Pin stable to `@figit/dom-to-figma@0.2.4` and commit
   `859efea8d7f8330783c6c4e3e520fd673e877336`.
2. Pin `upstream/main` to the same commit with `resolvedAt: 2026-08-25`.
3. Change only `image-presentation.upstreamState` from `pr-draft-pending` to
   `partial-upstream-main-object-fit`.

Do not change the governance baseline, capability paths, shared paths,
fingerprints, review dates, removal conditions, or the `15`-file runtime
budget. No capability is eligible for retirement at this target.

## Immutable Target Evidence

Snapshot: `2026-08-25T14:45:38+08:00`.

| Target | Reviewed immutable value | Evidence |
| --- | --- | --- |
| Promotion base | local `main` at `bac116ad8a7ac18812cfa6af72b140c45c6dbf83` | Detached worktree HEAD and every generated report agree. |
| Governance | `fork-base/ac830db` -> `ac830db5b89d2e8e7eede86f9419303988ae1938` | Candidate governance check resolved the unchanged pin. |
| npm stable | `@figit/dom-to-figma@0.2.4` | Official npm registry `latest` is `0.2.4`, published `2026-08-22T13:08:16.942Z`; integrity is `sha512-GAc82UfGueG1xY8m7S7cCrptQWo9m1kx543TpmYbRKD/0VwqCzHFpfvYW1UqLwYfVNidR7793aaCOJgjZi0+sA==`. |
| Stable Git tag | tag object `a312898056343d6bceda0263cfe7a6fdb981d004`, peeled commit `859efea8d7f8330783c6c4e3e520fd673e877336` | Live `git ls-remote` and fetched tag agree. The npm SLSA provenance identifies the same Git commit and `refs/heads/main`. The annotated tag has no GPG signature; npm supplies registry signature and provenance attestations. |
| Upstream main | `upstream/main` -> `859efea8d7f8330783c6c4e3e520fd673e877336` | Read-only fetch plus live `git ls-remote https://github.com/figitdesign/web-to-figma.git refs/heads/main` agree. |

Stable and upstream main intentionally converge on the release commit. A
moving ref name alone is not used as evidence.

## Capability Review

The review compared `0bf06ecce52aabc2bc696980b83040860630e35f` to
`859efea8d7f8330783c6c4e3e520fd673e877336`, then searched the reviewed
upstream tree for each removal-condition dimension.

| Capability / cohort | Upstream result | Registry disposition |
| --- | --- | --- |
| `responsive-shadow-dom` / C1 | Upstream changes fractional geometry in `dom.ts` and `walk.ts`, but has no `shadowRoot` conversion contract. | Retain the complete capability and current state. No path, fingerprint, or removal-condition change. |
| `composed-dom-traversal` / C3 | No `getComposed*`, `composedParent`, or equivalent injectable traversal API is present. | Retain the complete capability and current state. |
| `glyph-aware-font-fallback` / C4 | Upstream detects a missing glyph within the selected font, but has no multi-font candidate selection or CJK fallback implementation; `document.fonts` appears only in fixtures. | Retain the complete capability and current state. The per-font missing-glyph check does not satisfy the full removal condition. |
| `image-presentation` / C5 | Upstream maps CSS `object-fit` to Figma scale modes, but has no `object-position` handling. | Record `partial-upstream-main-object-fit`; retain all local behavior, paths, tests, fingerprint, and the full removal condition. |
| `image-loader-cancellation` / C5 | No `AbortSignal` propagation is present. | Retain the complete capability and current state. |
| `nowrap-text-sizing` / C4 | Upstream changes general text box measurement and has an unrelated flex `flexWrap === "nowrap"` branch, but no `whiteSpace: nowrap` text-sizing branch. | Retain the complete capability and current state. General geometry overlap is insufficient for retirement. |

This is target-review evidence, not permission to cherry-pick the 17 upstream
commits between the old reviewed pin and the new release.

## Candidate Registry Diff

```diff
 stable.version: 0.2.1 -> 0.2.4
 stable.ref: @figit/dom-to-figma@0.2.1 -> @figit/dom-to-figma@0.2.4
 stable.commit: 0bf06ecce52aabc2bc696980b83040860630e35f -> 859efea8d7f8330783c6c4e3e520fd673e877336
 upstreamMain.commit: 0bf06ecce52aabc2bc696980b83040860630e35f -> 859efea8d7f8330783c6c4e3e520fd673e877336
 upstreamMain.resolvedAt: 2026-07-25 -> 2026-08-25
 image-presentation.upstreamState: pr-draft-pending -> partial-upstream-main-object-fit
```

The refresh does not require fingerprint regeneration because fingerprints
are computed against the unchanged governance commit. The candidate
governance report has zero errors, 14 governed runtime files against a limit
of 15, and zero unmapped runtime or test paths.

The directly applicable registry candidate is
`research/upstream-core-delta-candidate.json`. A structural comparison against
`main:docs/upstream-core-delta.json` passed 12/12 assertions: the only changed
JSON leaves are the three stable fields, the upstream-main commit and review
date, and `image-presentation.upstreamState`. The governance target, budget,
shared paths, fingerprints, removal conditions, and all six capability records
otherwise remain unchanged.

The stable and upstream-main comparison reports each show 25 runtime and 23
test/fixture differences relative to the new target. Their 11 unmapped runtime
and 15 unmapped test paths are comparison output, not production authorization:
authorization remains governed exclusively against `fork-base/ac830db`.

## Validation Record

All commands ran in detached worktree
`C:\Users\abskino\AppData\Local\Temp\web-to-figma-target-review-20260825`
at `bac116ad8a7ac18812cfa6af72b140c45c6dbf83`. No branch was created or
updated.

| Command | Exit | Result |
| --- | ---: | --- |
| `git fetch --prune origin` | 0 | Refreshed fork remote evidence. |
| `git fetch --prune upstream` | 0 | Refreshed upstream refs and tags. |
| official npm registry metadata and attestation fetch | 0 | Confirmed latest version, integrity, provenance, and Git commit. |
| live `git ls-remote` for upstream main and `@figit/dom-to-figma@0.2.4` | 0 | Remote head, tag object, and peeled commit agree. |
| `node scripts/check-upstream-core-delta.mjs --report <governance report>` | 0 | 14 runtime, 8 test/fixture, 0 unmapped, 0 errors, budget 14/15. |
| `node scripts/check-upstream-core-delta.mjs --target stable --verify-latest --report <stable report>` | 0 | Resolved and verified `0.2.4` at `859efea8...`. |
| `node scripts/check-upstream-core-delta.mjs --target upstream-main --report <main report>` | 0 | Resolved `upstream/main` at `859efea8...`. |
| `node --test scripts/check-upstream-core-delta.test.mjs` | 0 | 5 passed, 0 failed. |
| `pnpm install --frozen-lockfile` | 0 | Installed the locked workspace dependencies in isolation. |
| `pnpm --filter @figit/composed-dom build` | 0 | Compatibility dependency built. |
| `pnpm --filter @figit/browser-capture-adapter build` | 0 | Adapter types and runtime bundle built. |
| `pnpm upstream-adapter:stable` | 0 | Temporary consumer install, TypeScript contract, image fallback, clipboard conversion, and cleanup passed against stable `0.2.4`. |
| `git diff --check` | 0 | Candidate registry diff has no whitespace errors. |

Registry candidate:

- `research/upstream-core-delta-candidate.json`

Checker reports:

- `research/governance-refresh-candidate.json`
- `research/stable-0.2.4.json`
- `research/upstream-main-859efea8.json`

The approved local-main version does not yet contain an
`upstream-adapter:main` executable. The required upstream-main core check was
run; no newer sync-branch script was imported into the approved cohort.

Git worktree metadata for the detached validation tree was removed after the
checks. Windows stopped filesystem cleanup on an overlong dependency path, so
an unregistered residual directory remains at the path named above. It is not
a Git worktree, contains no unique evidence, and can be deleted later with a
Windows long-path-capable cleanup process.

## Independent Check

- Live `git ls-remote` again resolved upstream `main` and the peeled `0.2.4`
  tag to `859efea8d7f8330783c6c4e3e520fd673e877336`; the tag object remained
  `a312898056343d6bceda0263cfe7a6fdb981d004`.
- The official npm registry again returned version `0.2.4` and integrity
  `sha512-GAc82UfGueG1xY8m7S7cCrptQWo9m1kx543TpmYbRKD/0VwqCzHFpfvYW1UqLwYfVNidR7793aaCOJgjZi0+sA==`.
- The candidate registry passed 12/12 structural assertions against immutable
  local `main`; all three JSON reports parsed successfully and matched their
  recorded targets, heads, counts, and zero-error results.
- No `sync/upstream-20260726`-only capability, path, budget, or absorbed-path
  entry appears in the candidate. The current checkout, local branches, tags,
  and remote-tracking refs were not changed by this review.

## Handoff

`validate-local-main-promotion` may start using
`research/upstream-core-delta-candidate.json`. Apply it only in that task's isolated curated base,
then rerun the same blocking commands. C5 must keep the full local
object-fit/object-position implementation and must run after the already
passing C2 vanilla fallback contract. This review authorizes no upstream
intake, capability retirement, budget increase, ref mutation, or remote action.
