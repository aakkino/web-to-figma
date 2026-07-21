# Converter Guidelines

## Classification And Dispatch

`defaultClassify` is ordered from exclusions to specific leaf kinds and finally
`frame`. The caller hook receives both the element and default decision. Preserve
the default when an override does not apply:

~~~ts
const defaultKind = defaultClassify(node);
const kind = ctx.classify ? ctx.classify(node, defaultKind) : defaultKind;
if (kind === "skip") {
  return 0;
}
~~~

Add a new `ElementKind` only when it represents a distinct conversion path.
Update the union, classifier, exhaustive switch in `convertElement`, public
types when applicable, and classification/conversion tests together. The
`kind satisfies never` default is an intentional exhaustiveness guard.

## Walker Responsibilities

`converter/walk.ts` owns:

- visual child order via `sortNodesByStackingOrder`;
- GUID and child-index allocation;
- text-node and wrapped-line emission;
- inherited text-gradient/SVG viewbox context;
- auto-layout parent/child metadata;
- optional DOM trace paths.

A leaf converter should return node changes plus traversal metadata through
`ConversionResult`. It should not recursively walk children or append global
changes itself.

The walker catches failure at one node, warns, and continues. Preserve that
best-effort behavior for unsupported page content. Throw inside a converter for
an impossible local invariant; do not turn every unsupported CSS case into a
whole-document failure.

## Node And Style Converters

- Measure from the element's own document/window. Iframes have different
  realms and viewports; examples exist in
  `converter/nodes/frame/converter.ts` and
  `converter/layout/infer.ts`.
- Keep computed-style parsing in `converter/styles/` when more than one node
  kind can use it.
- Register binary data through `registerBlob`. Do not place raw buffers
  directly into unrelated node changes.
- Apply parent stack overrides to every emitted kind. Frames merge them in the
  frame converter; other leaf kinds use `withChildStackSpec`.
- Preserve source paint order. For example, the frame converter emits a solid
  background before background-image gradients.

## Loaders And Caches

`DedupCache` stores completed values, shares in-flight promises, and removes a
failed in-flight entry so a later request can retry. Font/image cache keys must
represent all request fields that affect the returned bytes or metrics.

Default loaders are public extension points:

- `FontLoader` returns bytes plus resolved font metadata.
- `ImageLoader` returns bytes and MIME type.
- loaders may fetch, but node converters should consume their typed result and
  remain unaware of extension/background proxy details.

Do not cache failed loads permanently, and do not create a new converter inside
every UI render or repeated conversion when the caller can retain one.

## Trace Contract

Trace mode must be optional, must add no path work when disabled, and must not
change encoded payload bytes. DOM paths are built incrementally from real DOM
child positions; wrapped pieces of one text node share the same owner path.
Changes to `TraceEntry` affect `internal/oracle-harness` and require the
cross-layer guide.

Reference files:

- `packages/dom-to-figma/src/converter/walk.ts`
- `packages/dom-to-figma/src/converter/convert.ts`
- `packages/dom-to-figma/src/converter/dedup-cache.ts`
- `packages/dom-to-figma/src/converter/trace.ts`

