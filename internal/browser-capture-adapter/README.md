# Browser capture adapter

`@figit/browser-capture-adapter` is a private consumer-side layer around the
public `@figit/dom-to-figma` API. It stabilizes a live page, resolves usable
font bytes, records browser CJK line boundaries, and restores temporary page
state before returning a conversion result.

The adapter depends on `@figit/composed-dom` and selects
`openComposedDomTree` by default. The same strategy is used for image waiting,
font requests, CJK line-break preparation, and the converter call. Pass
`domTraversal: lightDomTree` when a caller needs ordinary light-DOM semantics;
do not mix a preparation strategy with a different converter strategy. When
passing a pre-built `converter`, construct it with the same strategy yourself;
the adapter cannot rewrite an existing converter's configuration.

Compatibility matrix:

| Utility | Core converter | Adapter |
| --- | --- | --- |
| `@figit/composed-dom` `0.1.x` | `@figit/dom-to-figma` `>=0.3.0 <0.4.0` | private workspace package |

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

Line breaks are measured for the current browser viewport only. They are
temporary DOM changes during conversion and are restored on success, timeout,
or error. `lineBreaks: "off"` disables all text measurement and mutation.
