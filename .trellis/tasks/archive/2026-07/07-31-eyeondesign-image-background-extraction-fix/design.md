# CSS Background And Lazy Image Compatibility Design

## Status

Planning artifact for `eyeondesign-image-background-extraction-fix`.
Implementation must not start until this design and `implement.md` are
reviewed. The repository is a soft fork; the design optimizes for low drift and
repeatable upstream synchronization rather than upstream PR acceptance.

## Goals

- Discover CSS raster background resources before conversion.
- Convert expressible background layers into ordered Figma IMAGE, gradient, or
  solid paints with real blobs.
- Preserve CSS layer geometry: size, position, repeat/tile, clipping, origin,
  source selection, and supported blend modes.
- Render unsupported static compositions through a deterministic canvas
  fallback bound to the current browser capture state.
- Resolve explicit lazy `<img>` candidates without executing page scripts or
  rewriting page DOM.
- Keep the adapter-owned staged-resource contract and ordinary `<img>` behavior
  compatible with the released vanilla core.

## Non-Goals

- Executing arbitrary lazy-loading framework code, scrolling to activate page
  content, or changing page DOM to force activation.
- Preserving future scroll behavior or dynamic CSS Paint editability in a
  static Figma clipboard payload.
- Supporting cross-origin proxying beyond the existing injected image loader.
- Adding site selectors, eyeondesign-specific attributes, or adapter state to
  the published core.
- Replacing the full DOM layout or Figma wire format.

## Governing Contracts

The design follows:

- `dom-to-figma/frontend/upstream-compatibility.md`
- `dom-to-figma/frontend/staged-resource-pipeline.md`
- `dom-to-figma/frontend/architecture.md`
- `dom-to-figma/frontend/converter-guidelines.md`
- `dom-to-figma/frontend/layout-and-parity.md`
- `dom-to-figma/frontend/type-safety.md`
- `dom-to-figma/frontend/testing-guidelines.md`
- `guides/cross-layer-thinking-guide.md`

The archived eyeondesign diagnosis is the source evidence. It proves that the
target photos are CSS `background-image` resources and that HTTP staging is not
the failure.

## Data Flow

```text
DOM/computed style
  -> adapter inventory
     - canonical source identities
     - background/lazy usages
     - frozen element source map
  -> adapter image stage
     - deduped prepared bytes
     - budget/cancel/placeholder decisions
  -> bridge capability negotiation
  -> core conversion
     - parse background layers
     - use prepared image loader
     - native Paint or canvas/raster fallback
     - register blobs
  -> Figma node changes
  -> Kiwi clipboard payload
```

Analysis never fetches. The image stage completes before fonts and conversion.
The converter never starts a request for a source that the adapter did not
stage; an unplanned source gets the existing terminal placeholder behavior.

## Source Identity And Inventory

### Canonical source

Both layers use the document base URI and the existing accepted protocols:
`data:`, `blob:`, `http:`, and `https:`. Canonicalization is:

```text
new URL(rawSource, owner.ownerDocument.baseURI).toString()
```

The canonical URL is the byte-cache key. The resource ID is a session-local
diagnostic ID and must not be treated as a URL.

### Resource model

Extend the adapter inventory without breaking existing active-image fields:

```ts
type CaptureResourceKind =
  | "active-image"
  | "lazy-image"
  | "background-image";

type CaptureResourceUsage = {
  kind: CaptureResourceKind;
  owner: Element;
  layerIndex?: number;
  sourceAttribute?: string;
};

type CaptureInventoryResource = {
  resourceId: string;
  src: string;
  kind: CaptureResourceKind;
  nodeCount: number;
  // Detached HTMLImageElement owners are allowed for background resources.
  elements: ReadonlyArray<HTMLImageElement>;
  usages: ReadonlyArray<CaptureResourceUsage>;
};
```

The detached image for a CSS background is created from the owner document and
is never inserted or assigned a `src`; assigning `src` would cause an
uncontrolled browser request. The scheduler receives `src` explicitly.

Resources with the same canonical source share one prepared response even when
their usages are different. Each usage retains its owner and layer index so
geometry is calculated per element.

The plan keeps existing `imageNodeCount` and
`uniqueImageResourceCount` semantics for active images, and adds counts for
background layers, lazy candidates, total unique sources, and fallback layers.
The revision includes sorted canonical sources plus the serialized background
and lazy usage descriptors. Attribute-only changes that do not alter a source
remain count-only; source or layer changes require `resource-set-changed`.

## Lazy Source Policy

Lazy resolution is deterministic and adapter-owned:

1. Use `currentSrc`, selected `srcset`, or `src` when it is an active source.
2. If the active source is empty, or is an explicit data placeholder with a
   usable lazy candidate, inspect this allowlist in order:
   `data-srcset`, `data-src`, `data-lazy-srcset`, `data-lazy-src`,
   `data-original-src`, `data-original`.
3. Select a `srcset` candidate using the current document viewport and device
   pixel ratio. The selected candidate is the staged source; alternatives are
   diagnostic metadata only.
4. A valid data-only candidate is mapped to the actual image element in the
   frozen source registry. No attribute is written back to the page.
5. An empty or malformed candidate produces `lazy-unresolved`; unknown
   `data-*` attributes are not executed or guessed.

Lazy attributes do not invent CSS backgrounds. A `data-bg` or framework-specific
attribute is only evidence and remains unresolved unless the page has already
materialized a computed `background-image` URL.

The core receives a generic `imageSourceResolver(element)` callback. Its default
behavior remains `currentSrc || src`; the adapter callback returns the frozen
lazy source for elements staged by inventory. This is a source-selection hook,
not a scheduler or placeholder API.

## Core Conversion Design

### Background layer parser

Add a background-domain module beside the existing style parsers. It owns:

- top-level comma splitting that respects function parentheses and strings;
- `url()` and `image-set()` candidate extraction;
- linear/radial gradient delegation to the existing gradient implementation;
- `background-size`, `background-position`, and repeat geometry;
- background origin/clip and attachment snapshots;
- per-layer blend mode and source order;
- a support classification: `native`, `canvas-fallback`, or `unsupported`.

The parser reads computed style from the element's own document/window. It does
not fetch and does not know adapter resource IDs.

`image-set()` chooses the density closest to the current device pixel ratio,
preferring the smallest candidate at or above the ratio and otherwise the
largest available candidate. Unsupported functions such as `paint()` and
unknown image functions are retained as explicit unsupported layer descriptors,
not dropped by the parser.

### Paint strategy

The frame converter remains the owner of background fill ordering:

1. background color at the bottom;
2. CSS background layers from bottom to top in the Figma fill order;
3. existing borders/effects and child content remain unchanged.

Native paints are used for:

- solid background color;
- existing linear/radial gradients;
- raster URL/image-set layers with no-repeat or two-axis tile semantics that
  can be expressed by the existing IMAGE transform/scale fields;
- blend modes whose per-fill result matches the CSS layer stack.

The existing IMAGE paint fields are reused: `transform`, `imageScaleMode`,
`blendMode`, `originalImageWidth`, `originalImageHeight`, and `dataBlob`. No
new Kiwi wire field is planned.

The image cache gains a source-keyed path for background images while retaining
the existing element-keyed path for ordinary `<img>` nodes. Both paths call
the same `ImageLoader` and `processImageFile`, and both deduplicate by canonical
source. The background request uses a detached image owner and an explicit
`src`, so old loader implementations that inspect `element` remain callable.

Frame conversion becomes async at the existing `convertElement` boundary. The
walker is already async and preserves node order; no DOM traversal ownership
changes are required.

### Native geometry rules

- `no-repeat` uses an IMAGE transform derived from the resolved positioning
  area, image intrinsic size, size keyword/length, and position offset.
- Two-axis `repeat` uses `imageScaleMode: "TILE"` with the resolved tile scale.
- `repeat-x`, `repeat-y`, `round`, and `space` use canvas fallback because the
  current Figma IMAGE model cannot independently express one-axis or spaced
  repetition.
- Sprite-like crops use the image transform and frame clipping when that
  preserves the visible source rectangle; otherwise they use canvas fallback.
- `background-clip` and `background-origin` are native only when the frame
  bounds and fill transform represent the same region. Border-radius/content-
  box combinations that cannot be represented use canvas fallback.
- `background-attachment` is always evaluated at the capture state. `scroll`
  may remain native when its current geometry is identical; `fixed` and
  `local` use the static fallback when scroll offsets affect the result.

## Static Raster Fallback

### Deterministic canvas renderer

The default renderer receives a resolved background snapshot and prepared image
bytes. It renders one image covering the element's background paint box, then
uses that single IMAGE paint in the frame:

```ts
type BackgroundRasterizer = (request: {
  element: Element;
  snapshot: BackgroundSnapshot;
  loadPreparedImage: (src: string) => Promise<ImageFile>;
  signal?: AbortSignal;
}) => Promise<ImageFile | null>;
```

The renderer must:

- create a bounded canvas at capture CSS pixels multiplied by the current DPR,
  with a hard dimension guard;
- draw background color, gradients, and prepared image layers in CSS order;
- implement tile, round, space, clip, origin, position, and current scroll
  offsets;
- map supported CSS blend modes to `globalCompositeOperation`;
- encode a PNG blob and return it for the normal core image processing path;
- abort and release object URLs/bitmaps on cancellation or failure.

This renderer is deterministic for the same computed snapshot, viewport,
device pixel ratio, and prepared bytes. It does not fetch directly.

### Dynamic CSS Paint

`paint(...)` and other runtime-generated sources have no URL or portable pixel
decoder. The converter calls the optional injected `BackgroundRasterizer` with
the live element snapshot. A host that can capture the rendered element may
return bytes. Without a host rasterizer, the core emits a structured
`unsupported-background-source` diagnostic and the adapter records the layer
as unresolved; it does not silently return an empty successful background.

The extension uses the default canvas renderer for computable layers and does
not execute page worklets. A future host screenshot implementation can be
injected without changing the core paint contract.

### Fallback paint

The raster result is registered through `registerBlob` and emitted as one
IMAGE paint with identity transform and `STRETCH` scale mode. Diagnostics carry:

- `resourceId`/owner and layer index;
- `mode: "native" | "raster-fallback" | "unsupported" | "placeholder"`;
- reason (`blend`, `clip`, `repeat`, `attachment`, `dynamic-paint`, etc.);
- capture viewport/DPR and whether editability or runtime scrolling was lost.

## Adapter And Bridge Design

### Capability negotiation

The core publishes a structural capability descriptor for background conversion
and image source resolution. The bridge keeps base exports compatible with
stable vanilla cores and treats the new capability as optional:

- capability present: pass the generic resolver/rasterizer and enable full
  background staging;
- capability absent: ordinary `<img>` conversion continues through the adapter
  fallback; CSS background support is marked `unsupported-capability` and
  cannot be reported as successfully extracted.

The core config must not expose adapter budgets, placeholder reasons,
`ImagePreparationPort`, or scheduler state.

### Prepared source lookup

The adapter image strategy continues to key prepared bytes by canonical `src`.
It additionally exposes a frozen `resolveElementSource(element)` function for
lazy image elements. Core background requests use the canonical URL directly,
so background and `<img>` usages share the same prepared response.

`clear()` replaces the source registry and increments the generation. A late
image or rasterizer result cannot repopulate a cleared generation.

### Diagnostics

Extend capture diagnostics with a background summary while preserving existing
image progress fields:

```ts
type BackgroundDiagnostic = {
  ownerPath?: string;
  resourceId?: string;
  layerIndex?: number;
  mode: "native" | "raster-fallback" | "unsupported" | "placeholder";
  reason?: string;
  source?: string;
};
```

URLs remain internal to resource diagnostics and are not exposed in font-safe
or user-facing messages. A source load failure is represented by the existing
image failure/placeholder status plus the background usage references.

## Soft Fork Compatibility

The local feature is kept in atomic commits:

1. core background parser/cache/frame integration;
2. adapter inventory, lazy resolution, and staged source map;
3. canvas fallback and diagnostics;
4. fixtures, eyeondesign regression evidence, and governance registry.

The core change must avoid broad rewrites of upstream-hot files. Prefer one
background-domain module and additive seams in existing frame/cache/config
paths. If the design needs more than the one remaining governed runtime slot,
update the capability budget explicitly before implementation; do not flatten
all logic into `frame/converter.ts` or silently remove an existing capability.

After an upstream refresh, rebase/merge the four commits in order, review the
exact diff against the reviewed upstream commit, then run the governance and
stable/main consumer gates. A partial upstream overlap retains the local
capability and its `removeWhen` condition.

## Failure Matrix

| Condition | Required result |
| --- | --- |
| Active or lazy image source prepared | Core loads prepared bytes and emits IMAGE paint/node |
| CSS URL source prepared | Background layer emits native IMAGE or raster fallback |
| Same source in many elements/layers | One prepared/processed blob, per-owner geometry |
| Source changes after review | Revalidation returns `resource-set-changed` |
| User skip, budget, load failure, cancel | Transparent placeholder or recovery state, never late fetch |
| Native core capability missing | Ordinary images work; background gets explicit unsupported diagnostic |
| Unsupported static semantics | Canvas raster fallback with reason |
| Dynamic CSS Paint without host rasterizer | Explicit unsupported diagnostic; no silent empty success |
| Raster canvas exceeds dimension/memory guard | Structured fallback failure and placeholder/recovery path |
| Core converter node failure | Existing best-effort walker warning/continue behavior is preserved |

## Verification Shape

- Pure Node tests cover layer parsing, URL/base resolution, image-set choice,
  size/position/repeat math, source identity, and diagnostic classification.
- Browser core tests cover native paints, source-key deduplication, async frame
  conversion, canvas fallback bytes, blend/clip/attachment snapshots, and
  unchanged ordinary image behavior.
- Adapter browser tests cover inventory without fetch, active/lazy/background
  resource counts, source freezing, revalidation, scheduler budgets, and
  bridge capability fallback.
- Oracle fixtures cover a CSS background card and mixed native/fallback layers;
  the eyeondesign regression asserts the card payload contains the expected
  image blob/paint path.
- Compatibility tests cover stable `@figit/dom-to-figma@0.2.1`, reviewed
  `upstream/main`, and a clean external consumer without workspace source
  imports.
