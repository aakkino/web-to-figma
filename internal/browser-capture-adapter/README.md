# Browser capture adapter

`@figit/browser-capture-adapter` is a private consumer-side layer around the
public `@figit/dom-to-figma` API. It stabilizes a live page, resolves usable
font bytes, records browser CJK line boundaries, and restores temporary page
state before returning a conversion result.

The adapter depends on `@figit/composed-dom` and selects
`openComposedDomTree` by default. Fork cores with `domTraversal` support use
the same strategy for image waiting, font requests, CJK line-break preparation,
and the converter call. Pass
`domTraversal: lightDomTree` when a caller needs ordinary light-DOM semantics;
do not mix a preparation strategy with a different converter strategy. When
passing a pre-built `converter`, construct it with the same strategy yourself;
the adapter cannot rewrite an existing converter's configuration.

Compatibility matrix:

| Utility | Core converter | Adapter |
| --- | --- | --- |
| `@figit/composed-dom` `0.1.x` | `@figit/dom-to-figma` `>=0.2.0 <0.4.0` | private workspace package |

The bridge negotiates image preparation once when it is constructed. Fork
cores that export a structurally compatible `createImagePreparation` keep the
native staged path. Vanilla cores such as the pinned stable `0.2.1` use an
adapter-owned cache: preparation loads each canonical `src` once, conversion
reads only cached bytes, and skipped, failed, or unplanned images receive a
transparent PNG through the public `imageLoader` hook. The capture scheduler
continues to own the placeholder reason and safe diagnostics in both modes.

The vanilla fallback reports the loader response byte length because the
stable core performs format normalization and hashing during conversion. Its
transparent placeholder preserves visible geometry but the stable payload
names it `Image` and registers a tiny transparent blob; native fork cores emit
`Image (skipped)` without a blob. Call `clearCache()` between sessions that
must not reuse prepared bytes. A late preparation may resolve to its caller
after clearing, but a generation check prevents it from repopulating the
conversion cache.

The minimum core must still export `createFigmaConverter`,
`createDirectImageLoader`, and `createFontsourceLoader`, and support converter
`imageLoader`, `classify`, `layout`, `convert().toClipboardHtml()`, and
`clearCache()`. Missing one of these base capabilities throws
`UnsupportedCaptureCapabilityError`; missing `createImagePreparation` alone
does not. `assertStagedImageCapability` remains only as a deprecated migration
helper.

Vanilla `0.2.x` does not expose the fork's `domTraversal` hook, so its
converter remains light-DOM-only even though adapter preparation can inspect
open composed DOM. Use the vanilla compatibility path only for light-DOM
captures until the traversal subtask supplies an equivalent upstream boundary.

The utility and core package can be upgraded independently only when the
`DomTreeChild` / `composedParent` contract remains compatible. Closed Shadow
DOM, cross-origin iframe contents, and mutation observation are outside the
support boundary.

The adapter keeps text editable. When the original font bytes cannot be read,
it tries the configured bundled and fallback loaders, then reports the
requested and resolved font in `diagnostics`. Use `fontFailure: "strict"` when
an exact family, weight, and italic match is required; strict captures fail
before conversion instead of returning a partial text payload.

The extension supplies its background `fetchFont` transport. The adapter only
accepts that transport as an injected function; URL permissions, messaging,
credentials, and clipboard writes remain owned by the host application.

`inspectTypography(target)` is a read-only inventory API over the same composed
DOM strategy and font resolver. It groups visible text-node usage by ordered
font family stack, weight, style, size, line height, and letter spacing, then
returns exact/fallback/failed diagnostics. Its result never contains source
text, source code points, resource URLs, CSS rules, or font bytes.

Line breaks are measured for the current browser viewport only. They are
temporary DOM changes during conversion and are restored on success, timeout,
or error. `lineBreaks: "off"` disables all text measurement and mutation.
