# Image Delta Inventory

## Source Commits

### `4da4c51267abf635ee021091adf65d514667eb56`

| Area | Paths | Classification | Outcome |
| --- | --- | --- | --- |
| Capture scheduling, budgets, retries, diagnostics | `apps/extension/**`, `internal/browser-capture-adapter/**` | adapter/product policy | Keep outside core |
| Core preparation store and placeholder resolution | `converter/image-preparation.ts`, staged branches in `image-cache.ts`, image converter, and `figma.ts` | product staging mechanism | Retired after adapter fallback acceptance |
| Fetch/decode cancellation and object URL cleanup | `converter/nodes/image/loader.ts` | generic loader correctness | Keep as independent upstream candidate `image-loader-cancellation` |
| Staged core browser tests and README/API changes | `figma.image.browser.test.ts`, package README, staged changeset | obsolete core surface | Removed; adapter tests own the contract |

The completed `07-25-vanilla-upstream-adapter-fallback` task proves that the
adapter can freeze element-to-source mapping, cache loader bytes, emit terminal
transparent placeholders, reject late network requests, and prevent
post-clear cache publication without a core preparation hook.

### `0149d6299e5d55d20ef42a42fb06fd031549fb3f`

| Area | Paths | Classification | Outcome |
| --- | --- | --- | --- |
| CSS fit/position transform | image converter and `presentation.ts` | generic presentation correctness | Keep as `image-presentation` |
| PNG/GIF/JPEG intrinsic dimensions | image loader | presentation input | Keep with presentation candidate |
| Pure and browser tests | presentation, loader, and image browser tests | generic evidence | Keep and expand invalid-size coverage |
| Oracle scene and scoreboard | `img-02-object-fit.html`, scoreboard | parity evidence | Keep local; do not hand-edit baseline |

## Current Ownership

```text
adapter scheduler
  -> adapter prepared-resource store
  -> prepared-only ImageLoader
  -> vanilla core image cache / normalization
  -> image presentation transform
```

The core no longer exports `createImagePreparation`, accepts
`FigmaConverterConfig.imagePreparation`, or emits product placeholder reasons.
The adapter retains structural detection only for compatibility with older fork
packages.

## Registry State

- `staged-image-preparation`: retired; no authorized runtime paths remain.
- `image-presentation`: generic temporary patch, origin `0149d62`.
- `image-loader-cancellation`: generic temporary patch, origin `4da4c51`.
- Runtime delta count after retirement: 14, down from the baseline 15.

Stable-based local drafts:

- presentation: `draft/upstream-image-presentation` at `f7eec53`;
- loader cancellation: `draft/upstream-image-loader-cancellation` at `3986425`.

## Removal Conditions

- Remove `image-presentation` when the selected upstream baseline preserves all
  five CSS fit values, key position forms, intrinsic dimensions, and finite
  transforms with browser/oracle parity.
- Remove `image-loader-cancellation` when upstream forwards `AbortSignal`
  through direct fetch and image decode cleanup with focused tests.
- Do not reintroduce a core staging hook unless upstream maintainers request a
  generic mechanism that cannot be expressed through `ImageLoader`.
