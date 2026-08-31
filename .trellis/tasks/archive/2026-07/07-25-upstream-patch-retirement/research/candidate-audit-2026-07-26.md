# Retirement Candidate Audit: 2026-07-26

## Resolved Targets

| Target | Exact version or commit | Result |
| --- | --- | --- |
| npm `latest` | `@figit/dom-to-figma@0.2.1` / `0bf06ecce52aabc2bc696980b83040860630e35f` | Still the latest stable release; no registered local capability is present. |
| `upstream/main` | `cc8d4864e6be53d0d5047fbf97283b112b3117f4` | Two commits ahead of the prior reviewed target. |

The refreshed upstream range is:

- `810c2aa`: CSS color-matrix fill support; no registered retirement overlap.
- `cc8d486`: radial/angled gradients plus an `object-fit` scale-mode mapping.

## Image Presentation Comparison

Upstream commit `cc8d486` maps CSS `fill`, `cover`, and `contain` to Figma
`STRETCH`, `FILL`, and `FIT`. It maps `none` and `scale-down` to `FIT` as an
approximation and does not read `object-position`.

The fork's registered `image-presentation` capability additionally:

- computes exact rendered sizes for `none` and `scale-down`;
- parses keyword, percentage, pixel, and `calc()` object positions;
- emits a transform for non-centered crop and letterbox placement;
- records intrinsic dimensions on the image paint;
- covers all modes and positioned cases in focused unit and browser tests.

Therefore `cc8d486` is a partial upstream overlap, not an equivalent
replacement. Deleting `presentation.ts` or switching the converter to the
upstream scale-mode-only implementation would regress visible placement and
the registered parity contract.

## Retirement Decision

No registered capability is eligible for deletion from the currently
consumable stable baseline or the reviewed `upstream/main` baseline.

| Capability | State | Blocker / removal condition |
| --- | --- | --- |
| `responsive-shadow-dom` | retained | No reviewed upstream equivalent for responsive geometry plus open Shadow DOM parity. |
| `composed-dom-traversal` | retained | Local upstream draft only; no traversal injection and composed-parent semantics in the selected baseline. |
| `glyph-aware-font-fallback` | retained | Upstream-ready locally, but not accepted into a selected baseline. |
| `image-presentation` | retained | `cc8d486` covers basic object-fit only; object-position and exact `none`/`scale-down` behavior remain missing. |
| `image-loader-cancellation` | retained | No AbortSignal propagation and decode-cleanup equivalent in the selected baseline. |
| `nowrap-text-sizing` | retained | Upstream-ready locally, but not accepted into a selected baseline. |

All entries remain owned by `abskino`, retain the registry review date
`2026-10-31`, and keep their existing objective removal conditions. The next
action is upstream review/publication of the prepared atomic units, which still
requires separate user approval for any push or PR.

## Intake Decision

Do not cherry-pick `cc8d486` as a retirement change. It combines gradients,
text, oracle baselines, and a partial image behavior, so it is not an isolated
replacement for the registered image capability. The sync branch records the
review only; runtime code remains unchanged.

## Verification

- `pnpm upstream-core-delta:check`: passed; 14 runtime paths and zero unmapped runtime paths against the governance baseline.
- `pnpm upstream-core-delta:stable -- --verify-latest`: passed; npm `latest` remains `0.2.1`.
- `pnpm upstream-core-delta:main`: passed against `cc8d4864e6be53d0d5047fbf97283b112b3117f4`.
- `pnpm test:upstream-core-delta`: passed, 5 tests.
- `pnpm upstream-adapter:stable`: passed in the installed-package fixture.
- `pnpm check-types`: passed for all workspace projects.
- `pnpm build`: passed, including the Chrome MV3 extension.
- `pnpm test`: passed; 5 governance tests plus 401 workspace tests passed, and 5 environment-gated oracle-harness tests remained skipped.
- `pnpm oracle:parity`: passed across 46 scenes with the existing 15 tier-0 findings.
- `pnpm exec biome check docs/upstream-core-delta.json`: passed.
- `pnpm lint`: the primary checkout was first blocked by the pre-existing nested root configuration at `.tmp/upstream-image-loader-cancellation/biome.jsonc`. A temporary config exclusion exposed checkout-wide CRLF-to-LF formatting drift, so the exclusion was reverted. The exact task diff was then applied to an isolated `core.autocrlf=false` shared clone; after normalizing the two changed JSON files there, the original `pnpm lint` command passed with zero errors, 75 existing warnings, and 656 existing informational diagnostics.
