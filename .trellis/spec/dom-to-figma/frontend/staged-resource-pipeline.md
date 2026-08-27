# Adapter-Owned Image Staging

This document records the staged browser-capture contract after retirement of
the fork-only core preparation API. The capture adapter owns scheduling,
policy, diagnostics, frozen source mapping, and prepared bytes.
`@aakkino/dom-to-figma` owns ordinary image loading, format normalization,
hashing, intrinsic dimensions, and final image presentation.

## Scenario: Prepared Images And Explicit Placeholders

### 1. Scope / Trigger

- Trigger: browser capture must finish or skip every planned image before DOM
  conversion and must not start an unplanned network request during the walk.
- Scope: the adapter-owned `ImagePreparationPort`, its prepared-resource store,
  and the converter's public `imageLoader` option.
- Exclusion: the public converter does not expose scheduler state, placeholder
  reasons, budgets, or a preparation hook.

### 2. Signatures

```ts
type ImagePreparationPort = {
  prepare(request: ImageRequest, signal?: AbortSignal):
    Promise<{ status: "prepared"; byteLength: number }>;
  setPlaceholder(
    request: Pick<ImageRequest, "src"> &
      Partial<Pick<ImageRequest, "element">>,
    reason: ImagePlaceholderReason
  ): void;
  clear(): void;
};

type FigmaConverterConfig = {
  imageLoader?: ImageLoader;
};
```

The bridge may still detect a structurally compatible legacy
`createImagePreparation` export so older fork builds remain usable during
migration. New core code and new upstream proposals must not depend on it.

### 3. Contracts

- The adapter freezes each prepared element to its canonical source in a
  session-local `WeakMap` and caches the loader response by source.
- Conversion receives an `imageLoader` that returns only prepared bytes or the
  transparent PNG placeholder. It never delegates an unplanned request to the
  product loader.
- Budgets, concurrency, retries, placeholder reasons, and safe diagnostics
  remain adapter-owned. None enters `FigmaConverterConfig`.
- The core `imageLoader` path normalizes formats, hashes final bytes, reads
  intrinsic dimensions, and applies `object-fit` / `object-position`.
- Adapter `clear()` increments a generation, clears prepared and in-flight
  indexes, and replaces the element-source `WeakMap`. Older work may settle for
  its caller but cannot republish into the cleared generation.
- The fallback placeholder preserves visible geometry through vanilla image
  semantics. Its payload is named `Image` and includes one transparent blob;
  diagnostic reason remains available only on the adapter result.
- `FigmaConverter.clearCache()` clears only converter-owned font and processed
  image caches. Adapter session cleanup is performed by the bridge before the
  converter cache is cleared.

### 4. Validation & Error Matrix

| Condition | Required behavior | Forbidden behavior |
| --- | --- | --- |
| Unique source prepared twice | Share one loader response | Fetch once per element |
| Element source changes after preparation | Resolve the frozen source | Schedule the late source |
| User, failure, or budget placeholder | Return transparent PNG to conversion | Call the product loader |
| Preparation signal aborts | Reject and do not publish late success | Populate the prepared cache |
| Clear races with preparation | Let caller settle; reject cache publication | Repopulate cleared generation |
| Core lacks legacy preparation export | Use adapter staging | Treat absence as unsupported |
| Core lacks required base export | Throw stable `unsupported-capability` | Fail later in conversion |
| Converter sees an unplanned source | Cache a terminal placeholder decision | Start a network request |

### 5. Good / Base / Bad Cases

- Good: the adapter prepares each locked source once, then the converter reads
  those bytes through the ordinary `imageLoader` contract.
- Base: a direct core caller supplies no adapter and receives the normal direct
  loader/cache behavior.
- Good: a skipped source keeps image geometry through a transparent PNG while
  its reason stays in adapter diagnostics.
- Bad: adding `imagePreparation`, budget fields, or placeholder reasons back to
  `FigmaConverterConfig`.

### 6. Tests Required

- Adapter bridge tests assert success, skipped, failed, cancellation, frozen
  source, late request, clear generation, and missing base export behavior.
- Capture scheduler/browser tests assert image events complete before font and
  conversion events and that skipped mode performs zero product-loader calls.
- Core browser tests assert normal image output and consumer-visible fit,
  position, intrinsic-size, scale-mode, and transform fields.
- Stable compatibility installs the pinned vanilla core and proves the adapter
  fallback without workspace source imports.
- Oracle parity covers the asymmetric image fit scene.

### 7. Wrong vs Correct

#### Wrong

```ts
createFigmaConverter({ imagePreparation, imageLoader });
```

#### Correct

```ts
await bridge.imagePreparation.prepare(request, signal);
await bridge.convert(input, signal);
```

The bridge owns the staged store and passes a prepared-only `imageLoader` to
the converter internally.
