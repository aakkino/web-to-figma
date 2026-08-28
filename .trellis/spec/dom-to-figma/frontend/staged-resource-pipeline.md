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

## Scenario: CSS Raster Backgrounds (BG1)

### 1. Scope / Trigger

- Trigger: computed CSS uses `background-image: url(...)` or `image-set(...)`.
- Scope: computed-style discovery, adapter staging, frozen detached owners,
  core paint/raster conversion, and structured diagnostics.
- Exclusion: lazy `<img>` attributes, `data-bgset`, activation, and scrolling
  belong to BG2. BG1 must neither inventory nor execute them.

### 2. Signatures

```ts
type CaptureResourceKind = "image" | "background-image";

type CaptureResourceUsage = {
  kind: CaptureResourceKind;
  owner: Element;
  layerIndex?: number;
};

type CaptureInventoryResource = {
  resourceId: string;
  src: string;
  kind: CaptureResourceKind;
  elements: ReadonlyArray<HTMLImageElement>;
  usages: ReadonlyArray<CaptureResourceUsage>;
};

type FigmaConverterConfig = {
  imageSourceResolver?: (element: HTMLImageElement) => string | null;
  backgroundRasterizer?: BackgroundRasterizer;
  onBackgroundDiagnostic?: (diagnostic: BackgroundDiagnostic) => void;
};

type BackgroundRasterizer = (request: {
  element: Element;
  snapshot: BackgroundSnapshot;
  loadImage(source: string): Promise<ImageBlobInfo>;
  signal?: AbortSignal;
}) => Promise<ImageFile>;
```

The published core advertises support structurally through
`domToFigmaCapabilities.cssBackgroundImages === true`.

### 3. Contracts

- Ordinary `<img>` inventory resolves only active `currentSrc` / `src`.
  Unknown or lazy `data-*` attributes are outside BG1.
- Analysis resolves computed CSS URL and `image-set()` layers into detached
  image owners. It never assigns `src`, inserts owners, or fetches bytes.
- Canonical sources are deduplicated across image and background usages and
  staged once through the existing scheduler before fonts and conversion.
- The adapter freezes real image elements and detached owners in the same
  session-local source map. Core consumes it through `imageSourceResolver` and
  the prepared-only loader; conversion must not start an unplanned request.
- The bridge clears staged owner/source state and converter caches in `finally`
  after success or failure. A later capture cannot reuse session state.
- Expressible URL layers emit native IMAGE paints. Unsupported repeat,
  attachment, origin/clip, or geometry uses the bounded canvas rasterizer.
  Dynamic/unknown image functions require a host rasterizer or an explicit
  unsupported diagnostic.
- The conversion `AbortSignal` reaches rasterizers. Aborted work must not
  register a late blob or publish a successful background result.
- A stable core without the capability continues ordinary image conversion;
  each unblocked background usage gets one `unsupported-capability` result.

### 4. Validation & Error Matrix

| Condition | Required behavior | Forbidden behavior |
| --- | --- | --- |
| CSS URL is inventoried | Stage its canonical source before conversion | Fetch it during the frame walk |
| `data-srcset` or `data-bgset` exists alone | Leave it outside BG1 inventory | Treat BG2 metadata as computed CSS |
| One source has multiple usages | Stage once and retain every usage | Fetch once per owner/layer |
| Geometry is not exactly expressible | Rasterize or report unsupported | Emit knowingly incorrect native geometry |
| Rasterization is aborted | Reject and publish no late blob | Complete after cancellation |
| Conversion throws after staging | Clear adapter and converter state | Leak state into the next capture |
| Stable core lacks BG1 capability | Preserve `<img>` conversion and report backgrounds once | Omit silently or duplicate diagnostics |

### 5. Good / Base / Bad Cases

- Good: inventory records canonical source plus every owner/layer usage without
  fetching; staging prepares the source once.
- Base: direct core callers retain ordinary image-loader behavior.
- Good: `image-set()` selects the computed DPR candidate without DOM mutation.
- Bad: add a timeout or scroll and claim computed raster support.
- Bad: interpret `data-src*`, `data-original*`, or `data-bgset` as BG1 inputs.

### 6. Tests Required

- Inventory tests cover computed URL, `image-set()`, duplicate sources, shadow
  DOM, no-fetch analysis, revisions, and absence of BG2 lazy attributes.
- Scheduler/bridge tests assert image preparation precedes fonts/conversion,
  cleanup runs after failure, and stable-core diagnostics are not duplicated.
- Core tests cover layer order, position/size, repeat, origin/clip, attachment,
  blend mode, border/padding geometry fallback, and cancellation propagation.
- Browser/oracle tests require a decoded IMAGE paint or explicit raster/
  unsupported result. Stable and pinned-main adapter compatibility remain
  release gates.

### 7. Wrong vs Correct

#### Wrong

```ts
await waitForTimeout(15_000);
// Assumes lazy metadata and computed backgrounds are now staged.
```

#### Correct

```ts
const inventory = analyzeCaptureTarget({ element: document.body });
// Inventory contains active images and computed CSS backgrounds only.
await prepareAll(inventory.resources);
await bridge.convert({ element: document.body, width: 100, height: 100 });
```
