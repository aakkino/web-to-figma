# Founder Memo Signature Capture Root Cause

## Reproduction Context

- Source clone: `D:/desktop_directory/web-study-notes/useportal_clone`
- Dev page: `http://localhost:8123/`
- Reported target: Founder memo component
- Reported symptom: the handwritten signature becomes enlarged, disconnected
  black fragments after extension capture and Figma presentation; the nearby
  square avatar remains visually correct.

## Source Evidence

The signature element in `site/index.html` is:

```html
<img
  width="90"
  height="46"
  src="/images/n4JZTvwu5Fhky9J4pSaq3eeVwo.svg"
  style="display:block;width:100%;height:100%;object-position:left center;object-fit:contain"
>
```

Runtime inspection after scrolling the lazy image into view produced:

```text
response             200 image/svg+xml
response bytes       15921
natural/decoded size 90 x 46
rendered img rect    272.765 x 51.588
object-fit           contain
object-position      0% 50%
```

The clone and preserved original SVG both hash to:

```text
SHA-256 5DB5C9AAD4830DC1CC9CDC458D8ACFCE674AEAE4BE156DFFF13A38D212F1C8EB
```

The resource is therefore neither truncated nor incorrectly rewritten.

## Conversion Evidence

`packages/dom-to-figma/src/converter/nodes/image/converter.ts`:

1. measures `element.getBoundingClientRect()`;
2. reads `window.getComputedStyle(element)`;
3. uses style for opacity, border and effects;
4. ignores `computedStyle.objectFit` and `computedStyle.objectPosition`;
5. emits every image paint with `imageScaleMode: "FILL"`.

For this geometry, FILL scales the source by the box width:

```text
272.765 / 90 = 3.0307
46 * 3.0307 = 139.41 rendered height
51.588 / 139.41 = 0.370 visible height
```

Only the centered 37% horizontal slice remains. A browser comparison using the
same SVG and box with `object-fit: cover` reproduced the reported disconnected
strokes, while `contain left center` rendered the full signature.

## Ruled Out

- Clone asset corruption: original and clone hashes match.
- HTTP/resource failure: response status, MIME and byte length are valid.
- SVG decode failure: browser decodes the full 90 x 46 image.
- Lazy-load discovery: the adapter falls back from `currentSrc` to the declared
  `src`, and the captured output contains real image pixels rather than a
  placeholder.
- Staged preparation corruption: SVG normalization uses the decoded intrinsic
  canvas size; the visible failure matches FILL crop semantics, not broken PNG
  bytes.

## Ownership And Replaceability

The July staged-resource task decoupled capture product policy from the
upstream converter:

- adapter owns inventory, scheduling, timeout, budget, retry, cancellation and
  project-owned diagnostics;
- `bridges/dom-to-figma.ts` is the adapter's only source import of
  `@figit/dom-to-figma`;
- extension product modules import no upstream converter types;
- a fake `ConversionBridge` can replace the concrete core implementation.

It did not extract or inject the final image leaf converter. The core
`converter/convert.ts` statically imports `elementToImageNodeChange` and calls
it for `ElementKind = "image"`; `FigmaConverterConfig` exposes loader,
preparation, classification, layout and traversal hooks but no image-node
converter hook.

The defect therefore belongs to the current concrete `@figit/dom-to-figma`
implementation. Fixing it internally does not reduce engine replaceability as
long as `ConversionBridge`, adapter-owned types and extension modules remain
unchanged.

## Test Gap

`figma.image.browser.test.ts` verifies image blob registration, hashes,
measured node size, prepared cache reuse and placeholders. It has no
`object-fit`, `object-position`, aspect-ratio mismatch or non-centered fixture.
Repository search found the only emitted `imageScaleMode` assignment in the
image converter, hard-coded to FILL.

## Primary References

- `packages/dom-to-figma/src/converter/nodes/image/converter.ts`
- `packages/dom-to-figma/src/converter/convert.ts`
- `packages/dom-to-figma/src/figma.ts`
- `packages/dom-to-figma/src/figma.image.browser.test.ts`
- `internal/browser-capture-adapter/src/bridges/dom-to-figma.ts`
- `internal/browser-capture-adapter/src/import-boundary.test.ts`
- `.trellis/spec/dom-to-figma/frontend/staged-resource-pipeline.md`
- `.trellis/tasks/archive/2026-07/07-24-staged-resource-pipeline/design.md`
