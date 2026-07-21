# Architecture

## Public Boundary

`packages/dom-to-figma/src/figma.ts` is the only package entrypoint declared by
`package.json` and `tsdown.config.ts`. Add public API there deliberately and
export types separately from runtime values.

`createFigmaConverter(config)` owns long-lived loader caches. Each call to
`convert(input)` creates fresh node changes, blobs, GUID allocation, and an
optional trace:

~~~ts
const fontCache = createFontCache(fontLoader);
const imageCache = createImageCache(imageLoader);

const convert = async (input: ConvertInput) => {
  const nodeChanges: Array<FigmaNodeChange> = [];
  const blobManager = new BlobManager();
  let idCounter = ROOT_RESERVED_GUIDS;
  // Build one independent clipboard document.
};
~~~

Preserve this lifetime split. Reusing a converter should reuse expensive
font/image loads; it must not leak nodes, blobs, GUIDs, or trace entries between
results. `clearCache()` clears both long-lived caches.

## Conversion Flow

1. `figma.ts` builds a single-frame or multi-frame root template.
2. `converter/walk.ts` traverses measured DOM nodes, assigns GUIDs, maintains
   parent/child order, records trace entries, and carries inherited context.
3. `converter/classify.ts` maps elements to a closed `ElementKind`.
4. `converter/convert.ts` dispatches each kind to a focused converter under
   `converter/nodes/`.
5. Style parsers under `converter/styles/` and type definitions under
   `converter/types/` build the node changes.
6. `@figit/fig-kiwi` encodes the document and composes the clipboard envelope.

Keep DOM traversal out of leaf converters and keep Kiwi wire encoding out of
the DOM conversion modules.

## Directory Ownership

- `converter/nodes/<kind>/` owns one DOM/Figma node mapping.
- `converter/styles/` translates computed CSS values into paints, borders,
  effects, and opacity.
- `converter/nodes/text/primitives/` owns font loading, glyph processing, and
  text layout.
- `converter/nodes/vector/` owns SVG parsing, vector networks, and scaling.
- `converter/layout/infer.ts` is the only auto-layout inference engine.
- `converter/types/` describes emitted Figma data, not arbitrary application
  view models.
- `src/__fixtures__/` contains deterministic fonts and vetted oracle fixtures.

Avoid adding a generic utility directory. Put helpers beside the domain that
owns their invariant and search for an existing parser/cache/geometry helper
first.

## Runtime Assumptions

The public converter requires a real modern browser: computed styles, ranges,
canvas/image decoding, Web Crypto, Blob, and ClipboardItem are part of the
runtime. Do not make a DOM-dependent module appear Node-safe. Pure helpers can
and should remain testable in Node where their inputs do not require browser
measurement.

