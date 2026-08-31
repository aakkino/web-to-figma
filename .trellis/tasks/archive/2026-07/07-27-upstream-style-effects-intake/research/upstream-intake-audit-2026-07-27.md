# Upstream Intake Audit: 2026-07-27

## Reviewed References

| Reference | Commit |
| --- | --- |
| Common baseline | `ac830db5b89d2e8e7eede86f9419303988ae1938` |
| Fork integration head | `c9b013f1b8d3e747912d8c832f4b77ea995cacbf` |
| Reviewed upstream main | `cc8d4864e6be53d0d5047fbf97283b112b3117f4` |
| Stable upstream package | `@figit/dom-to-figma@0.2.1` |

## Upstream Range

| Commit | Capability | Intake disposition |
| --- | --- | --- |
| `0208934` | CSS double border | Port as an isolated capability. |
| `6337243` | Oracle montage and PR publisher | Scope decision pending. |
| `774a670` | Text shadow | Port parser, type and text integration by intent. |
| `51b5821` | Filter drop-shadow | Port parser and frame integration by intent. |
| `0bf06ec` | Package release | Do not consume as fork release metadata. |
| `810c2aa` | CSS color-matrix | Port with composed-aware leaf gating. |
| `cc8d486` | Gradients and basic object-fit | Port gradients; retain fork image presentation. |

## Merge Surface

- Upstream changed files: 55.
- Fork changed files since the common baseline: 287.
- Overlapping files: 10.
- Upstream core changed files: 19.
- Fork core changed files: 22.
- Overlapping core files: 5.
- Three-way textual conflicts: 5 total, including 2 production converter files.

Conflicting production code is concentrated in:

- `packages/dom-to-figma/src/converter/nodes/frame/converter.ts`;
- `packages/dom-to-figma/src/converter/nodes/image/converter.ts`.

The seven upstream-only implementation files under `styles/` and `types/`
apply cleanly to the fork. An isolated compatibility checkout passed package
type-check and 37 focused upstream unit tests across blur, filter-color,
gradient and shadow.

## Semantic Decisions Already Supported By Evidence

- Preserve fork image presentation. Upstream only maps basic object-fit modes
  and lacks object-position and exact none/scale-down sizing.
- Adapt color-matrix gating to composed children. Raw light-DOM child checks can
  misclassify a Shadow DOM host as a visual leaf.
- Treat double-border metadata as converter-only input and emit its inner line
  through the fork child pipeline; never spread it onto a Figma node change.
- Pass the measured frame box into the gradient parser; the optional default
  compiles but does not reproduce angled CSS geometry.
- Merge text-shadow into the fork text converter without replacing its font,
  traversal or nowrap sizing work.

## Current Gate Evidence

- `pnpm upstream-core-delta:check`: passed, 14 runtime paths and no unmapped
  governance paths.
- `pnpm test:upstream-core-delta`: passed, 5 tests.
- `pnpm upstream-core-delta:main`: resolved the reviewed upstream commit and
  produced the expected inventory.
- `pnpm upstream-adapter:stable`: passed against a real installed vanilla
  stable package.

The remaining governance gap is that the `upstream-main-compatibility` CI job
only validates the pinned ref and emits a diff report. It does not build or run
the adapter against an upstream-main package artifact.
