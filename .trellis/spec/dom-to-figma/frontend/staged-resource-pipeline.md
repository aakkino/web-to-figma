# Staged Resource Pipeline

This document records the optional image capability used by staged browser
capture. The capture adapter owns scheduling, policy, diagnostics, and
placeholders; `@figit/dom-to-figma` owns final image processing and the
conversion-time lookup.

## Scenario: Prepared Images And Explicit Placeholders

### 1. Scope / Trigger

- Trigger: a caller must finish image decoding, format conversion, and hashing
  before DOM conversion while reusing the exact result during the walk.
- Scope: `packages/dom-to-figma/src/converter/image-preparation.ts`, the
  optional `FigmaConverterConfig.imagePreparation` hook, and the private
  adapter bridge that maps project-owned requests into it.
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
- `FigmaConverter.clearCache()` clears the converter's image cache and the
  optional preparation capability. Abort is checked before a prepared result is
  cached; object URLs and image decode resources are released by the loader's
  normal cleanup path.
- The bridge checks the installed core module structurally for
  `createImagePreparation`. A missing hook throws
  `UnsupportedCaptureCapabilityError` with code `unsupported-capability`; it
  never silently falls back to conversion-time image work while claiming a
  staged capture.

### 4. Validation & Error Matrix

| Condition | Required behavior | Forbidden behavior |
| --- | --- | --- |
| Hook omitted | Use the legacy loader/cache path | Change existing default payloads |
| Unique source is prepared twice | Return the same cached resolution | Fetch or process it again |
| Multiple elements share a source | Count and prepare one resource | Charge or process once per node |
| Element source changes after preparation | Resolve the frozen element mapping | Discover and schedule a late source |
| User/failed/budget placeholder | Emit transparent geometry with no blob | Drop the node or disturb sibling order |
| Preparation signal aborts | Stop work and do not cache late success | Cache an aborted result |
| `clearCache()` | Remove preparation and conversion cache entries | Reuse stale bytes after clearing |
| Core lacks the optional hook | Throw stable `unsupported-capability` | Pretend staged reuse is available |
| Diagnostic crosses the bridge | Keep codes and safe detail only | Expose URLs or upstream exceptions |

### 5. Good / Base / Bad Cases

- Good: the adapter prepares each locked unique source, passes the same
  capability to the converter, and conversion resolves every image without a
  second loader/process/hash operation.
- Base: an existing direct core caller supplies only `imageLoader`; conversion
  follows the historical behavior and output envelope.
- Good: a failed resource is marked with `load-failed`, and conversion keeps
  its measured image slot as `Image (skipped)` with no registered blob.
- Bad: preload only populates raw response bytes and reports success before
  PNG/JPEG/GIF normalization and hashing finish.
- Bad: an old core missing `createImagePreparation` is allowed to run the
  converter's lazy image path after the adapter reported preparation complete.

### 6. Tests Required

- Core browser tests assert default image output, one preparation per unique
  source, frozen element mapping, placeholder geometry/name/order, no blob for
  placeholders, abort behavior, and `clearCache()`.
- Adapter unit/browser tests assert that fake bridges load without the core,
  image stage events precede font and conversion events, retries preserve
  successful preparations, and skipped mode makes zero loader calls.
- The bridge boundary test asserts the only adapter source import of the core
  is `bridges/dom-to-figma.ts`; extension product sources have none.
- The capability test passes a module without `createImagePreparation` and
  asserts `UnsupportedCaptureCapabilityError.code` is
  `unsupported-capability`.
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
const preparation = createImagePreparation(imageLoader);
await preparation.prepare(request, signal);
const converter = createFigmaConverter({ imageLoader, imagePreparation: preparation });
await converter.convert(input); // lookup only for prepared elements
~~~

The optional hook is deliberately small and generic. Capture-specific retry,
budget, URL policy, and diagnostics stay in the adapter so the published core
does not acquire extension policy or session state.
