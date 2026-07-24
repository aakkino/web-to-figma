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

## Scenario: Composed DOM Traversal Policy

### 1. Scope / Trigger

- Trigger: a consumer needs open Shadow DOM and slot projection without making
  the published converter depend on the capture adapter or browser extension.
- Scope: `@figit/composed-dom`, the converter's optional traversal hook, and
  the private capture adapter's preparation/conversion boundary.

### 2. Signatures

~~~ts
type DomTraversalChild = {
  readonly node: Node;
  readonly composedParent: Element;
};

type DomTraversalStrategy = {
  readonly children: (
    parent: Element
  ) => ReadonlyArray<DomTraversalChild>;
};

createFigmaConverter({
  domTraversal?: DomTraversalStrategy,
});
~~~

`@figit/composed-dom` extends the structural shape with
`walk(root): Iterable<{ node; composedParent; depth }>` and exports only
`lightDomTree` and `openComposedDomTree` from its package root.

### 3. Contracts

- The converter defaults to `lightDomTraversal`, which snapshots
  `parent.childNodes` in order and preserves existing consumer behavior.
- `openComposedDomTree` replaces an open host's light children with shadow
  children, expands `assignedNodes({ flatten: true })`, and uses fallback slot
  children when nothing is assigned. It deduplicates nodes and guards slot
  recursion; `walk(root)` yields descendants, not `root` itself.
- `composedParent` is the flattened visual parent used for relative geometry;
  it may differ from `node.parentElement` for shadow and slotted nodes.
- The adapter defaults to `openComposedDomTree` and passes the same strategy to
  page settling, font requests, CJK line breaks, and the converter. A caller
  selecting `lightDomTree` must use it for the whole capture. If a caller
  supplies a pre-built converter, the adapter cannot rewrite its configuration;
  the caller must construct that converter with the selected strategy.
- Closed roots, cross-origin iframe documents, mutation observation, and
  visibility filtering are outside the utility contract. Consumers own those
  policies.
- Published artifacts must expose `dist` through their root `exports`; a
  tarball must not resolve an adapter's workspace-only `src/*.ts` entry.

### 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| No `domTraversal` in core config | Walk light DOM exactly as before. |
| Open shadow root or assigned slot | Visit projected nodes once, in composed order, with a usable `composedParent`. |
| Empty/default/fallback slot | Use fallback children; do not emit the slot element itself. |
| Closed root or cross-origin iframe | Leave contents inaccessible; do not guess or throw solely for that boundary. |
| Strategy used by preparation differs from converter | Reject this integration during review; adapter-created converters must receive the selected strategy. |
| Packed adapter imported from a clean project | Resolve `dist/index.mjs` and declaration files, never `src/index.ts`. |

### 5. Good/Base/Bad Cases

- Good: the adapter selects one strategy, uses its walker for resources, then
  passes the same strategy into `createFigmaConverter`.
- Base: a direct core consumer omits the option and receives only light-DOM
  children with no new runtime dependency.
- Bad: resource settling sees slotted images while the converter walks the host's
  light DOM, or a packed adapter points Node at TypeScript source under
  `node_modules`.

### 6. Tests Required

- Chromium utility fixtures assert child order, named/default/fallback slots,
  nested open roots, duplicate assignment protection, text nodes, and iframe
  realms without main-window constructors.
- Core browser tests assert default light behavior and explicit composed
  behavior, including relative positions and auto-layout inference.
- Adapter tests assert one strategy reaches settle, font, line-break, and
  converter phases; the extension must pass both MV3 and MV2 builds.
- Release smoke packs utility/core/adapter, installs them outside the workspace,
  checks root `exports` resolve to `dist`, and runs a Chromium conversion/clipboard
  assertion.

### 7. Wrong vs Correct

#### Wrong

~~~ts
const images = collectImagesWithComposedTraversal(root);
const converter = createFigmaConverter();
~~~

#### Correct

~~~ts
const domTraversal = options.domTraversal ?? openComposedDomTree;
const images = collectImages(root, domTraversal);
const converter = createFigmaConverter({ domTraversal });
~~~

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
