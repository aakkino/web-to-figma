# Rendering Contracts

This document records consumer-visible DOM-to-Figma rendering behavior where
CSS and Figma do not have a one-to-one representation. These are executable
conversion contracts, not release notes or general parity goals.

## Release Provenance

The contracts below were introduced after the published
`@figit/dom-to-figma@0.2.0` tag by commits `051ba3b`, `87db0f2`, and `ac830db`.
Each corresponding changeset declares `@figit/dom-to-figma: patch`; no
`@figit/fig-kiwi` change is declared. Unless a later release composition changes
the bump, they belong to the next patch release (normally `0.2.1`), not to
`0.2.0`.

A source checkout can therefore contain these contracts while the npm
`latest` package does not. Do not claim npm availability from source presence
alone: verify the package version, changelog, and registry dist-tag when release
status matters.

## Scenario: Post-0.2.0 Rendering Parity Fixes

### 1. Scope / Trigger

Read and preserve this scenario when changing any of:

- text-node width buffering or horizontal positioning;
- frame border parsing, stroke emission, child indices, or vector blobs;
- `box-shadow` parsing or frame stroke/effect selection;
- release notes or changesets for these rendering behaviors.

These fixes change emitted node fields and visual parity but do not change the
public `createFigmaConverter` signature or the Kiwi wire schema. They are patch
changes because supported input renders more accurately without requiring a
consumer migration.

### 2. Signatures

The public conversion API remains unchanged. The relevant internal boundaries
are:

~~~ts
type LeadingBufferFractions = Record<FigmaTextAlignHorizontal, number>;

export function decomposePerSideBorder(params: {
  computedStyle: CSSStyleDeclaration;
  width: number;
  height: number;
  frameGuid: FigmaGuid;
  createGuid: () => FigmaGuid;
  registerBlob: (blob: FigmaBlob) => number;
}): Array<FigmaVectorNodeChange> | null;

export function isPureRingShadow(effect: FigmaEffect): boolean;

export function ringShadowToStroke(effect: FigmaEffect): {
  strokeWeight: number;
  strokePaints: Array<FigmaPaint>;
  strokeAlign: "OUTSIDE";
};
~~~

`ConversionResult.reservedChildCount` is part of the internal border contract:
when border vectors occupy child positions, the walker must start real DOM
children after those reserved positions.

### 3. Contracts

#### Text width buffer

The width buffer remains in the emitted text-node width because it prevents
Figma font remeasurement from clipping or re-wrapping a fixed-width box. Only
its leading-edge share changes with alignment:

| Figma alignment | Leading fraction | Emitted `x` | Emitted width |
| --- | ---: | --- | --- |
| `LEFT` | `0` | `position.x` | `baseWidth + widthBuffer` |
| `JUSTIFIED` | `0` | `position.x` | `baseWidth + widthBuffer` |
| `CENTER` | `0.5` | `position.x - widthBuffer / 2` | `baseWidth + widthBuffer` |
| `RIGHT` | `1` | `position.x - widthBuffer` | `baseWidth + widthBuffer` |

This keeps the browser glyph origin fixed: slack trails left/justified text,
is split around centered text, and leads right-aligned text.

#### Per-side border colors

Decompose a frame border into filled VECTOR children only when all of these are
true:

- at least two sides have width greater than zero;
- every visible side uses `solid` style;
- at least two visible sides have different computed colors;
- every computed corner radius is at most `0.5px`;
- GUID and blob registration callbacks are available;
- the frame is neither inferred auto-layout nor transform-overridden.

For a successful decomposition:

- emit one filled, unstroked vector trapezoid per visible side;
- reproduce the CSS 45-degree miter geometry in frame-local coordinates;
- remove the parent frame stroke while preserving its fill;
- reserve the emitted border child positions so real children paint above the
  border and never reuse a `parentIndex.position`.

If any precondition fails, return `null` and preserve the existing single-frame
stroke path. In particular, do not flatten dashed, dotted, or double borders
into solid trapezoids, and do not approximate rounded per-side colors with flat
vectors.

#### Pure-ring box shadows

A shadow is a promotable pure ring only when it is a visible `DROP_SHADOW` with
zero x/y offset, zero blur radius, positive spread, and alpha greater than zero.
Promote it to a frame stroke only when the element has no real CSS border.

The promoted output must have:

- `strokeAlign: "OUTSIDE"`;
- `strokeWeight` equal to the CSS spread;
- one solid stroke paint using the shadow color and alpha;
- unchanged node size and corner radius;
- no duplicate effect for the promoted ring.

When multiple pure rings exist, promote only the widest one. Preserve narrower
rings and all blur/offset shadows as effects. A real CSS border always owns the
frame stroke; in that case the ring remains a `DROP_SHADOW` effect rather than
overwriting the border.

### 4. Validation & Error Matrix

These inputs use best-effort fallbacks; they do not throw merely because Figma
cannot represent the CSS exactly.

| Condition | Required result | Forbidden result |
| --- | --- | --- |
| Left/justified text | Buffer trails; `x` is unchanged | Unconditional half-buffer shift |
| Centered text | Buffer splits evenly | Moving all slack to one edge |
| Right-aligned text | Full buffer leads the glyph origin | Trailing-only buffer |
| Different solid side colors, square corners | Filled border vectors; parent stroke removed | Collapsing every side to one color |
| Uniform color or only widths differ | Existing frame stroke path | Unnecessary vector children |
| Mixed border styles | Existing frame stroke path | Solid-vector approximation |
| Any corner radius above `0.5px` | Existing frame stroke path | Flat trapezoids across rounded corners |
| Inferred or transformed frame | Existing frame stroke path | Children with invalid layout/geometry |
| Pure ring and no CSS border | Widest ring becomes OUTSIDE stroke | Invisible zero-blur DROP_SHADOW only |
| CSS border plus pure ring | Border keeps stroke; ring stays effect | Ring overwrites the border |
| Blur, offset, non-positive spread, or transparent shadow | Preserve normal effect behavior | Promotion to OUTSIDE stroke |

Missing GUID/blob callbacks or a decomposition that yields fewer than two
valid vectors returns `null`. Impossible local invariants may still throw under
the general converter policy, while the walker catches one-node failures and
continues the document.

### 5. Good / Base / Bad Cases

- Good: four square, visible, solid sides with distinct colors emit four
  correctly colored vectors and no parent stroke.
- Good: `box-shadow: 0 0 0 6px #be185d` on a borderless `8px`-radius frame emits
  a `6px` OUTSIDE stroke, keeps the frame size, and follows the radius.
- Good: left-aligned text keeps its measured browser x-position while retaining
  the full buffered width.
- Base: a uniform solid border stays one frame stroke; a blurred shadow stays a
  `DROP_SHADOW`; centered text keeps the historical half-buffer split.
- Bad: mixed dashed/dotted sides are emitted as solid vectors, a ring overwrites
  a real border, or every alignment subtracts `widthBuffer / 2`.

### 6. Tests Required

Use browser tests because all three behaviors consume computed CSS or measured
DOM geometry.

- `figma.layout.browser.test.ts`: assert the emitted text x-position and width;
  cover left, center, and right alignment whenever buffer placement changes.
- `figma.border.browser.test.ts`: assert vector count, distinct solid paints,
  miter geometry, parent GUIDs/indices, removed parent stroke, preserved fill,
  and the uniform/mixed-style/per-side-width fallbacks.
- `figma.shadow.browser.test.ts`: assert OUTSIDE alignment, spread-as-weight,
  paint, unchanged size/radius, removed promoted effect, blurred-shadow
  fallback, and CSS-border precedence.
- Oracle corpus: retain minimal `bord` and `fx` scenes and run
  `pnpm oracle:parity`; text changes must also inspect geometry-x findings.
- Package gate: run `pnpm --filter @figit/dom-to-figma test`, `check-types`, and
  `build`.
- Release gate: keep a patch changeset for each independently releasable
  consumer-visible fix. Do not bump `@figit/fig-kiwi` without a Kiwi package or
  schema change.

### 7. Wrong vs Correct

#### Wrong

~~~ts
// Assumes every run is centered and shifts the common left-aligned case.
const adjustedPosition = {
  x: position.x - widthBuffer / 2,
  y: Math.max(0, position.y),
};
~~~

#### Correct

~~~ts
const leadingFraction: Record<FigmaTextAlignHorizontal, number> = {
  LEFT: 0,
  CENTER: 0.5,
  RIGHT: 1,
  JUSTIFIED: 0,
};
const leadingBuffer = widthBuffer * leadingFraction[textAlign];
const adjustedPosition = {
  x: position.x - leadingBuffer,
  y: Math.max(0, position.y),
};
~~~

Apply the same rule to paint fallbacks: preserve the established frame
stroke/effect path when decomposition or promotion preconditions are not fully
met. Never trade a known limitation for a visually incorrect approximation.

## Scenario: Glyph-Aware Font Loading

### 1. Scope / Trigger

Read and preserve this scenario when changing `FontLoader`, font request cache
identity, text transformation, loaded-font metadata, or emitted Figma font
fields. The converter owns glyph demand and payload consistency; consumers own
font catalogs, network access, fallback order, and diagnostics.

### 2. Signatures

~~~ts
type FontProperties = {
  family: string;
  weight: number;
  italic: boolean;
  codePoints?: ReadonlyArray<number>;
};

type FontFile = {
  bytes: ArrayBuffer;
  resolvedFamily?: string;
  resolvedWeight?: number;
  resolvedItalic?: boolean;
};
~~~

`codePoints` is an optional capability hint. Existing loaders may ignore it.

### 3. Contracts

- Collect code points from the transformed text run with Unicode code-point
  iteration, not UTF-16 code units. Sort, deduplicate, and omit whitespace.
- Never pass source text through the loader request, cache key, or diagnostics.
- Include normalized code-point demand in the long-lived font-cache identity.
  Equivalent sets deduplicate regardless of order; different sets resolve
  independently so a Latin-only result is not reused for later CJK text.
- Parse and measure exactly the bytes returned by the loader. When the loader
  reports resolved family, weight, or italic values, use them consistently for
  top-level `fontName`, derived font metadata, style naming, and synthesized
  PostScript metadata.
- Keep catalog selection, glyph-coverage policy, transport, product fallback
  order, and failure diagnostics outside the converter core.

### 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| Loader ignores `codePoints` | Conversion remains source- and runtime-compatible. |
| Same glyph set arrives in another order | Reuse the cached resolution. |
| Same style requests a different glyph set | Resolve a separate cache entry. |
| Loader substitutes family/style/weight | Emit the resolved metadata that matches returned bytes. |
| Loader returns a font collection | Reject the local load; collections remain unsupported. |
| Font load rejects | Remove the failed in-flight cache entry so a later request may retry. |

### 5. Good / Base / Bad Cases

- Good: transformed mixed text produces a sorted Latin/CJK/non-BMP request,
  the consumer selects covering bytes, and the payload declares that resolved
  font.
- Base: a legacy loader accepts family/weight/italic, ignores the optional
  field, and converts text exactly as before.
- Bad: cache only by requested family/style, expose source text, or declare the
  requested family while glyphs and metrics came from substituted bytes.

### 6. Tests Required

- Pure tests assert sorting, deduplication, whitespace omission, and non-BMP
  handling without source-text retention.
- Cache tests assert order-independent reuse, glyph-demand separation, and a
  loader that ignores the optional field.
- Browser payload tests assert transformed-text requests and consistent
  resolved family/style/PostScript metadata.
- Consumer resolver tests own actual glyph-coverage selection and fallback
  diagnostics; run core, adapter, extension, and oracle parity gates.

### 7. Wrong vs Correct

#### Wrong

~~~ts
const loaded = await fontCache.get(requestedFont);
return { fontName: { family: requestedFont.family } };
~~~

#### Correct

~~~ts
const loaded = await fontCache.get({
  ...requestedFont,
  codePoints: collectFontCodePoints(transformedText),
});
return { fontName: { family: loaded.actualFamily } };
~~~

## Scenario: Browser-Enforced Single-Line Text

### 1. Scope / Trigger

Read and preserve this scenario when changing text range measurement, CSS
`white-space` handling, `textAutoResize`, or Figma text-box sizing. It prevents
Figma's font remeasurement from wrapping browser-enforced single-line labels.

### 2. Signatures

The public converter and Kiwi schema remain unchanged. The internal decision
uses browser evidence and emits an existing TEXT field:

~~~ts
function shouldAutoResizeSingleLineText(input: {
  isSingleLine: boolean;
  whiteSpace: string;
  textOverflow: string;
  text: string;
}): boolean;

type EligibleTextChange = {
  textAutoResize: "WIDTH_AND_HEIGHT";
  stackChildAlignSelf?: "AUTO";
};
~~~

### 3. Contracts

- Emit `WIDTH_AND_HEIGHT` only when Range client rects form one visual line,
  computed `white-space` is exactly `pre` or `nowrap`, the source contains no
  explicit line break, and `text-overflow` is not `ellipsis`.
- `white-space: normal` remains fixed even when it happens to fit on one line in
  the current viewport. Explicit/visual multiline and truncated text also keep
  the field absent, preserving Figma's `NONE` default.
- Create ranges from `node.ownerDocument` and read styles through
  `element.ownerDocument.defaultView`; iframe nodes must not use the main realm.
- When an eligible TEXT element is a child of inferred Auto Layout, also emit
  `stackChildAlignSelf: "AUTO"` (Plugin API `INHERIT`). Otherwise Figma combines
  inherited stretch with auto resize as horizontal FILL plus vertical HUG and
  the label still wraps.
- Preserve measured size, width buffer, transform, baselines, glyph data,
  alignment, and parent geometry. Only the eligible Auto Layout child alignment
  changes from inherited stretch to `AUTO`.

### 4. Validation & Error Matrix

| Input | Required result | Forbidden result |
| --- | --- | --- |
| One visual line + `pre` | `WIDTH_AND_HEIGHT` | Fixed box that Figma re-wraps |
| One visual line + `nowrap` | `WIDTH_AND_HEIGHT` | Width derived from a different realm |
| Eligible child of Auto Layout | `WIDTH_AND_HEIGHT` + child `AUTO` | Horizontal FILL + vertical HUG |
| One visual line + `normal` | Field absent | Losing responsive fixed-width intent |
| Explicit or visual multiline | Field absent | Figma unwrapping the paragraph |
| `text-overflow: ellipsis` | Field absent | Expanding truncated content |

An element without an owning window is an impossible browser-runtime invariant
and throws locally; the walker retains its existing per-node best-effort catch.

### 5. Good / Base / Bad Cases

- Good: `Join beta` in a `white-space: pre` button emits
  `WIDTH_AND_HEIGHT`, while the button remains its measured size.
- Base: an ordinary single-line heading with `white-space: normal` remains a
  fixed text box.
- Bad: all one-line ranges become auto width, ellipsis expands, or a multiline
  `pre` block becomes one Figma line.

### 6. Tests Required

- Browser tests assert the final TEXT payload for `pre`/`nowrap` positives and
  normal, explicit-newline, visual-multiline, and ellipsis negatives.
- The Portal-style button fixture asserts characters, typography, text
  position, parent size/alignment, and `stackChildAlignSelf: "AUTO"`.
- Keep a minimal `txt` oracle scene and run package test/type/build plus
  `pnpm oracle:parity`.
- Keep a core patch changeset; no Kiwi or adapter bump is required.

### 7. Wrong vs Correct

#### Wrong

~~~ts
textAutoResize: isSingleLine ? "WIDTH_AND_HEIGHT" : undefined;
~~~

#### Correct

~~~ts
...(isSingleLine &&
  (whiteSpace === "pre" || whiteSpace === "nowrap") &&
  textOverflow !== "ellipsis" &&
  !/[\r\n\u2028\u2029]/u.test(text) && {
    textAutoResize: "WIDTH_AND_HEIGHT",
    ...(parentIsAutoLayout && { stackChildAlignSelf: "AUTO" }),
  });
~~~

## Scenario: Replaced-Image Fit And Position

### 1. Scope / Trigger

Read and preserve this scenario when changing `<img>` conversion, processed
image metadata, IMAGE paint scale modes/transforms, or staged image reuse. The
browser's measured image box remains the node geometry; this contract controls
how the intrinsic image is presented inside that box.

### 2. Signatures

The public converter and preparation method signatures remain unchanged.
Processed image dimensions are optional additive metadata so existing
consumer-created prepared resolutions remain assignable.

~~~ts
type ImageBlobInfo = {
  hash: Array<number>;
  bytes: Array<number>;
  width?: number;
  height?: number;
};

function resolveImagePresentation(input: {
  fit: string;
  position: string;
  box: { width: number; height: number };
  intrinsic: { width: number; height: number };
}): {
  imageScaleMode: "FILL" | "FIT" | "STRETCH";
  transform: FigmaTransform;
};
~~~

### 3. Contracts

- Read computed style from `element.ownerDocument.defaultView`, not the main
  window, so iframe elements use their own realm.
- CSS `fill` emits serialized `STRETCH` with an identity transform. Centered
  `contain` and `cover` use native `FIT` and `FILL` respectively.
- Non-centered `contain` / `cover`, `none`, and `scale-down` use `STRETCH`.
  For each axis, map normalized node coordinates back to normalized source
  coordinates with `scale = box / rendered` and
  `translation = -offset / rendered`.
- Position percentages use CSS free space (`box - rendered`), including
  negative free space for cover crops. Preserve pixel and edge offsets.
- `none` uses scale `1`; `scale-down` uses the smaller result of `none` and
  `contain`. Unknown fit values use the browser default `fill` semantics.
- Derive intrinsic dimensions from processed PNG/JPEG/GIF bytes so staged lazy
  images do not depend on `naturalWidth`. Fall back to DOM natural dimensions
  for older prepared resolutions that omit optional metadata.
- Presentation is per element. Resource bytes and hashes remain deduplicated by
  source, and placeholders register no blob or paint.

### 4. Validation & Error Matrix

| Condition | Required result | Forbidden result |
| --- | --- | --- |
| `fill`, mismatched aspect ratio | Identity `STRETCH` | Cover crop |
| Centered `contain` | Native `FIT`, complete image | `FILL` crop |
| Non-centered `contain` | `STRETCH` with transparent free-space alignment | Silently centered `FIT` |
| Centered `cover` | Native `FILL` | Stretch distortion |
| Non-centered `cover` | Negative-free-space crop transform | Center-only crop |
| `none` | Intrinsic-size placement and clipping | Automatic up/down scaling |
| `scale-down` | Smaller of intrinsic and contained size | Enlargement above intrinsic size |
| Missing/zero dimensions | Stable identity `STRETCH` fallback | NaN/Infinity transform |
| Prepared placeholder | Existing geometry, no blob/fill | Loader or presentation work |

Unsupported or malformed final image bytes fail through the existing image
converter best-effort path; they do not trigger schema changes, derived raster
fallbacks, or adapter-specific behavior.

### 5. Good / Base / Bad Cases

- Good: a `90 x 46` image in a `273 x 52` `contain left center` box remains
  complete, left aligned, and shares its source blob with a separate cover node.
- Good: a square `cover right top` node crops using negative horizontal free
  space while keeping measured node size and border/effect fields.
- Base: centered contain/cover retain Figma's native modes; equal-aspect-ratio
  images remain visually unchanged.
- Bad: all images emit `FILL`, `FIT` is used for a non-centered contain image,
  or conversion fetches/decodes a staged image again to discover dimensions.

### 6. Tests Required

- Pure presentation tests: five fit values, positive/negative free space,
  percentages, computed pixels, `calc()`, edge offsets, zero sizes, and
  `scale-down` boundaries.
- Loader tests: intrinsic dimensions from PNG, GIF, and JPEG final bytes.
- `figma.image.browser.test.ts`: assert consumer-visible scale modes,
  transforms, original dimensions, reported-shape regression, direct/staged
  parity, one-source deduplication, and zero conversion-time staged loads.
- Oracle corpus: keep a non-symmetric image scene with non-centered contain and
  cover, then run `pnpm oracle:parity` without widening tolerances.
- Boundary/release gate: adapter tests, core test/type/build, and a core patch
  changeset; do not bump `@figit/fig-kiwi` without a schema/package change.

### 7. Wrong vs Correct

#### Wrong

~~~ts
const paint = {
  type: "IMAGE" as const,
  imageScaleMode: "FILL" as const,
};
~~~

#### Correct

~~~ts
const presentation = resolveImagePresentation({
  fit: computedStyle.objectFit,
  position: computedStyle.objectPosition,
  box: { width, height },
  intrinsic: { width: intrinsicWidth, height: intrinsicHeight },
});
const paint = {
  type: "IMAGE" as const,
  imageScaleMode: presentation.imageScaleMode,
  transform: presentation.transform,
};
~~~

## Reference Files

- `.changeset/text-align-aware-width-buffer.md`
- `.changeset/olive-suns-cough.md`
- `.changeset/shadow-spread-ring-stroke.md`
- `packages/dom-to-figma/src/converter/nodes/text/converter.ts`
- `packages/dom-to-figma/src/converter/nodes/frame/border-decomposition.ts`
- `packages/dom-to-figma/src/converter/nodes/frame/converter.ts`
- `packages/dom-to-figma/src/converter/styles/shadow.ts`
- `packages/dom-to-figma/src/figma.layout.browser.test.ts`
- `packages/dom-to-figma/src/figma.border.browser.test.ts`
- `packages/dom-to-figma/src/figma.shadow.browser.test.ts`
- `packages/dom-to-figma/src/figma.text.browser.test.ts`
- `packages/dom-to-figma/scripts/oracle-scenes/txt/txt-01-single-line-button.html`
- `.changeset/single-line-text-auto-resize.md`
- `.changeset/calm-images-fit.md`
- `packages/dom-to-figma/src/converter/nodes/image/presentation.ts`
- `packages/dom-to-figma/src/figma.image.browser.test.ts`
- `packages/dom-to-figma/scripts/oracle-scenes/img/img-02-object-fit.html`
