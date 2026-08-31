# 技术设计

## Architecture

```text
DOM owner[data-bgset]
        |
        v
adapter inventory --(canonical source)--> image scheduler
        |                                      |
        +-- owner -> source map --------------+
                                               v
                                 bridge conversion context
                                               |
                                               v
core backgroundImageResolver -> computed CSS or frozen url() -> IMAGE paint
```

### Adapter boundary

`analyzeCaptureTarget` adds a `backgroundSources` map alongside the existing
`elementSources`. Its keys are live owner Elements and its values are resolved,
canonical URLs selected from explicit lazy metadata. Background resource usages
retain the owner and source attribute; the scheduler still stages a detached
image request keyed by URL.

`ConversionBridge.convert` receives an optional project-owned context:

```ts
type ConversionContext = {
  backgroundSources?: ReadonlyMap<Element, string>;
};
```

The context exists only for the current conversion and is cleared in `finally`.
It is not serialized or added to the Figma payload.

### Candidate normalization

The adapter accepts `data-bgset` only. It first handles the known site marker
`-xs-` when followed by a URL/path, taking the source before the marker. For
ordinary values it parses one or more URL candidates with width/density
descriptors and selects the smallest candidate at or above the rendered width
and DPR, falling back to the largest candidate. All candidates pass through the
existing HTTP(S)/data/blob URL resolver.

The parser is pure and receives `baseUrl`, rendered width, and DPR. It does not
read or execute page JavaScript. A source on an element with a non-`none`
computed background is inventory metadata only and is not injected as a second
layer.

### Core boundary

Add a generic `backgroundImageResolver(element: Element): string | null` to the
core converter config. `makeBackgroundSnapshotFromStyle` uses its result only
when computed `backgroundImage` is empty/`none`; the returned value is a CSS
background-image expression such as `url("https://...")`.

The frame converter and walk context thread this callback without adding any
adapter concepts to core. The adapter bridge supplies a closure over the
current conversion context and returns a quoted `url(...)` expression for a
frozen source. Existing computed layers and native/raster/dynamic behavior are
unchanged.

### Compatibility

- New core capability remains structural and optional. A stable core ignoring the
  resolver keeps existing image conversion and reports background capability
  gaps through the adapter.
- No core public config contains scheduler, budget, placeholder, or extension
  state.
- The exact core runtime paths are already registered under the CSS background
  capability; this change modifies those paths rather than adding a new runtime
  module.

## Failure And Safety

- Unknown data attributes are ignored.
- Invalid candidates, non-HTTP(S)/data/blob schemes, and empty values produce
  diagnostics without staging.
- A failed lazy background keeps the owner layer metadata and falls back to the
  existing transparent/placeholder behavior; it never fetches during core
  conversion.
- The owner/source map is session-local and is cleared after conversion, so a
  late conversion cannot reuse another capture's URLs.

## Rollback

The change can be disabled at the adapter bridge by omitting the background
source context. Core's resolver is optional and does not change ordinary
computed-style conversion when unused.
