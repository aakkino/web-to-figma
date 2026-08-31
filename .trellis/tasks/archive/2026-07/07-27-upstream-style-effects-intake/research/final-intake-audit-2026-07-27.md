# Final Upstream Intake Audit: 2026-07-27

## References

- Reviewed upstream: `upstream/main@cc8d4864e6be53d0d5047fbf97283b112b3117f4`.
- Fork integration base: `c9b013f1b8d3e747912d8c832f4b77ea995cacbf`.
- Integration branch: `sync/upstream-20260726`.
- No remote branch, push, or pull request was created.

## Absorbed Capabilities And Rollback Points

| Commit | Capability |
| --- | --- |
| `aafd966` | Uniform CSS double-border parsing |
| `b32e833` | Text-shadow and filter drop-shadow parsing/types |
| `d25c0d2` | CSS color-matrix solid-fill baking |
| `553f591` | Radial and box-aware angled linear gradients |
| `e6f4c43` | Fork-aware converter integration, browser tests, oracle scenes, changeset |
| `f79f990` | Executable upstream-main adapter gate and absorbed-path governance |

## Fork Semantics Preserved

- Frame integration uses the configured composed traversal to decide whether a
  color-filter target is a visual leaf; Shadow DOM and projected children block
  unsafe partial baking.
- Double-border metadata is destructured before node serialization. Its inner
  line is an absolute synthetic child in Auto Layout and reserves a child slot
  before real light- or composed-DOM children.
- Text effects and gradient box inputs were added without replacing glyph-aware
  font selection, nowrap sizing, text layout, or composed-parent styling.
- Image converter code was not changed. Object-position, exact `none` and
  `scale-down`, intrinsic dimensions, cancellation, and adapter-owned staging
  remain registered and covered by the full suite.

## Governance And Compatibility

- Seven exact upstream style/type runtime paths are recorded in
  `absorbedUpstreamPaths`. The governance check hashes normalized current and
  pinned-upstream content; any local drift becomes blocking and must move back
  under a fingerprinted capability.
- Governance result: 21 changed runtime paths, 7 exact absorbed upstream paths,
  14 governed fork paths, 6 capabilities, 0 unmapped runtime paths.
- `upstream-adapter:main` verifies the ref, exports the fixed commit, installs
  the upstream lockfile, builds and packs vanilla core, then runs the shared
  type/capability/image-fallback/basic-conversion consumer. Temporary source and
  consumer directories are cleaned in `finally` blocks.
- CI keeps upstream-main advisory for ordinary PRs and blocking for
  `sync/upstream-*` PRs.

## Verification Evidence

- Upstream parser tests: 4 files, 37 tests passed.
- Fork browser coverage: double-border, composed ordering, Auto Layout, rounded
  geometry, per-side exclusion, color-filter Shadow DOM gating, text/filter
  shadows, radial and angled gradients passed within the 215-test core suite.
- `pnpm test:upstream-core-delta`: 6 tests passed, including ref drift and
  absorbed-path drift failures.
- `pnpm upstream-core-delta:check`, `:stable -- --verify-latest`, and `:main` passed.
- `pnpm upstream-adapter:stable` and `pnpm upstream-adapter:main` passed.
- `pnpm check-types`, `pnpm build`, and `pnpm test` passed workspace-wide.
- `pnpm oracle:parity` passed 52 scenes; the six new scenes were explicitly
  reviewed and added to the scoreboard.
- `pnpm lint --diagnostic-level=error --max-diagnostics=none` passed 378 files
  in a clean LF checkout of the committed integration head.
