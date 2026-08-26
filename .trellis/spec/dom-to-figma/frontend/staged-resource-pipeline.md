# Staged Resource Pipeline

This document records the optional native image capability and the adapter
fallback used by staged browser capture. The capture adapter owns scheduling,
policy, diagnostics, and fallback state; `@figit/dom-to-figma` owns final image
processing and conversion.

## Scenario: Prepared Images And Explicit Placeholders

### 1. Scope / Trigger

- Trigger: a caller must either finish native image processing before DOM
  conversion or prefetch and reuse vanilla loader bytes without a second
  network request during the walk.
- Scope: `packages/dom-to-figma/src/converter/image-preparation.ts`, the
  optional `FigmaConverterConfig.imagePreparation` hook, and the private
  adapter bridge that selects a native or adapter-owned strategy once.
- Exclusion: image concurrency, memory policy, retry decisions, extension
  transport, and user-facing capture state remain outside the published core.

### 2. Signatures

~~~ts
type ImageResolution =
  | { kind: "image"; image: PreparedImage }
  | { kind: "placeholder"; reason: ImagePlaceholderReason };

type ImagePreparation = {
  prepare(request: ImageRequest, signal?: AbortSignal):
    Promise<ImageResolution>;
  resolve(request: ImageRequest): ImageResolution;
  setPlaceholder(
    request: Pick<ImageRequest, "src"> &
      Partial<Pick<ImageRequest, "element">>,
    reason: ImagePlaceholderReason
  ): void;
  clear(): void;
};

type FigmaConverterConfig = {
  imageLoader?: ImageLoader;
  imagePreparation?: ImagePreparation;
};
~~~

The adapter bridge exposes only project-owned `ConversionBridge` and
`PreparedCapture` types. Upstream `ImagePreparation`, `ImageLoader`, and
`ConvertResult` stop at `bridges/dom-to-figma.ts`; the bridge returns only
`{ clipboardHtml }` to the capture engine.

~~~ts
createImagePreparation is callable
  ? nativeStagedStrategy
  : adapterStagedStrategy;
~~~

### 3. Contracts

- `createImagePreparation(imageLoader)` deduplicates by resolved `src`, runs
  `processImageFile` before caching, and reports `bytes.length` as the final
  Figma-ready byte count.
- A prepared element is recorded in a session-local `WeakMap`. Conversion
  lookup uses that element mapping before reading the element's current source,
  so a late `src`/`currentSrc` change becomes an explicit unplanned placeholder
  rather than a new network or processing operation.
- A placeholder resolution emits a transparent, image-shaped rectangle named
  `Image (skipped)`, preserving measured size, fills, borders, corner radius,
  opacity, effects, parent index, and stack properties. It registers no image
  blob.
- Supplying no `imagePreparation` keeps the existing `imageLoader` path. The
  default path does not call the new capability and must retain its existing
  payload behavior.
- The bridge checks `createImagePreparation` once at construction. When it is
  absent, the adapter caches the loader response by canonical `src`, freezes
  the element-to-source association in a `WeakMap`, and gives the converter a
  loader that returns only prepared bytes or a transparent PNG placeholder.
- Adapter fallback placeholders preserve visible image geometry through the
  vanilla core's supported image-loader semantics. Vanilla `0.2.1` names the
  node `Image` and registers the transparent blob; the native fork path names
  it `Image (skipped)` and registers no blob. The project-owned diagnostic
  reason remains identical and never enters converter configuration.
- Adapter fallback reports the loader response byte length. Vanilla core
  normalization and hashing still happen during conversion because those
  operations are not public APIs in the stable package.
- `FigmaConverter.clearCache()` clears the converter's image cache and the
  optional preparation capability. Abort is checked before a prepared result is
  cached; object URLs and image decode resources are released by the loader's
  normal cleanup path.
- Adapter fallback increments a generation on clear. Work from an older
  generation may settle for its original caller but cannot publish into the
  cleared cache. Native clear remains converter-owned to avoid duplicate work.
- The bridge throws `UnsupportedCaptureCapabilityError` only when a required
  base export is missing or a present preparation factory returns an invalid
  shape. Missing `createImagePreparation` alone selects fallback.

### 4. Validation & Error Matrix

| Condition | Required behavior | Forbidden behavior |
| --- | --- | --- |
| Hook omitted | Use the legacy loader/cache path | Change existing default payloads |
| Unique source is prepared twice | Return the same cached resolution | Fetch or process it again |
| Multiple elements share a source | Count and prepare one resource | Charge or process once per node |
| Element source changes after preparation | Resolve the frozen element mapping | Discover and schedule a late source |
| Native user/failed/budget placeholder | Emit `Image (skipped)` geometry with no blob | Drop the node or disturb sibling order |
| Vanilla user/failed/budget placeholder | Emit the same visible geometry with a transparent blob | Start a late project-loader request |
| Preparation signal aborts | Stop work and do not cache late success | Cache an aborted result |
| `clearCache()` | Remove preparation and conversion cache entries | Reuse stale bytes after clearing |
| Core lacks the optional hook | Select adapter fallback once | Negotiate again per image |
| Core lacks a required base export | Throw stable `unsupported-capability` | Fail later inside conversion |
| Clear races with preparation | Let the caller settle; reject cache publication | Repopulate a cleared generation |
| Diagnostic crosses the bridge | Keep codes and safe detail only | Expose URLs or upstream exceptions |

### 5. Good / Base / Bad Cases

- Good: the adapter prepares each locked unique source, passes the same
  capability to the converter, and conversion resolves every image without a
  second loader/process/hash operation.
- Base: an existing direct core caller supplies only `imageLoader`; conversion
  follows the historical behavior and output envelope.
- Good: a failed resource is marked with `load-failed`; native conversion emits
  `Image (skipped)` without a blob, while vanilla conversion preserves the
  visible transparent slot through its public image-loader semantics.
- Base: vanilla fallback caches raw response bytes and explicitly reports that
  byte length; stable core performs normalization and hashing during conversion.
- Bad: a vanilla converter is given the project loader directly, allowing an
  unplanned conversion-time network request after staging completed.

### 6. Tests Required

- Core browser tests assert default image output, one preparation per unique
  source, frozen element mapping, placeholder geometry/name/order, no blob for
  placeholders, abort behavior, and `clearCache()`.
- Adapter unit/browser tests assert that fake bridges load without the core,
  image stage events precede font and conversion events, retries preserve
  successful preparations, and skipped mode makes zero loader calls.
- The bridge boundary test asserts the only adapter source import of the core
  is `bridges/dom-to-figma.ts`; extension product sources have none.
- Capability tests pass structural native, fallback, and missing-base modules;
  they assert success, placeholder, failure, cancellation, clear, and stable
  `unsupported-capability` behavior.
- The stable compatibility check builds adapter/composed-DOM artifacts,
  installs the registry-pinned npm core in a temporary consumer, typechecks its
  imports, runs fallback preparation, and removes the consumer.
- A clean tarball consumer imports the root exports from `dist` and does not
  resolve workspace `src` files.

### 7. Wrong vs Correct

#### Wrong

~~~ts
await imageLoader(request);
await converter.convert(input); // conversion may decode/process later
~~~

#### Correct

~~~ts
const bridge = createDomToFigmaBridge({ imageLoader });
await bridge.imagePreparation.prepare(request, signal);
await bridge.convert(input, signal); // native or adapter cache, selected once
~~~

The optional hook is deliberately small and generic. Capture-specific retry,
budget, URL policy, and diagnostics stay in the adapter so the published core
does not acquire extension policy or session state.
