# Loaders And Conversion

## Converter Lifetime

`entrypoints/content/convert.ts` creates one lazy
`BrowserCaptureAdapter` instance. Keep it stable across copies so page
font/image caches remain warm. Configure cross-context behavior at creation:

- page-aware font resolver with Fontsource fallback and the injected background
  font transport, plus the extension's fixed local CJK fallback;
- direct image loader with background-proxy fallback;
- classifier that skips extension UI and inaccessible cross-origin iframes.

Do not instantiate a converter in a React render or per pointer movement.

## Font And Capture Adapter

The private `@figit/browser-capture-adapter` owns page capture preparation while
the content entrypoint keeps clipboard writes and user-facing UI. Its public
boundary is:

~~~ts
createBrowserCaptureAdapter({
  fonts: { transport: createBackgroundFontTransport() },
  settleTimeoutMs: 5000,
  motion: "freeze",
  lineBreaks: "auto",
  fontFailure: "fallback",
});
~~~

The resolver scans readable `@font-face` rules, then tries the injected
HTTP(S) transport, explicit bundled fonts, and a fallback loader. The
extension fallback is a fixed local Noto Sans TC catalog; it does not depend on
the requested family matching an alias. Callers that do not supply the
extension loader use the generic Fontsource loader. The resolver reports the
requested and resolved family/weight/italic for every unique request.
`fontFailure: "strict"` rejects before conversion when a request is not exact;
fallback mode continues with a diagnostic.

Capture preparation has one total settle deadline. It waits for
`document.fonts.ready`, images, and two animation frames, then continues after
timeout with pending-resource diagnostics. `motion: "freeze"` pauses only
currently running Web Animations in the capture root and restores their
current time and play state in `finally`; `motion: "live"` does not inspect
animations. `lineBreaks: "auto"` may insert viewport-specific CJK line breaks
temporarily and must restore text and inline styles after success or failure.

## Font Loading

The adapter's resolver scans accessible `CSSFontFaceRule` entries once,
chooses a parseable URL and nearest family/style/weight range, and falls back
when cross-origin stylesheet rules cannot be inspected, no parseable URL exists,
the page fetch fails, or the requested family/style cannot be matched.

Keep the global font URL regex cloned per parse because `RegExp.exec` mutates
state. Accept only formats/font extensions that fontkit can parse. A best-effort
page match must never prevent the fallback loader from running.

### Common Mistake: Treating Parseable Bytes As Sufficient

**Symptom**: A page with Chinese text and a Latin-only web font captures images
and layout correctly, but text nodes paste with missing glyphs.

**Cause**: A font can parse successfully and have a matching name-table family
while still mapping a required character to `.notdef`.

**Fix**: Aggregate target code points per style request, validate every
candidate's glyph coverage, and use the fixed local CJK fallback when an exact
candidate misses any target character. Page-declared `@font-face` bytes still
win when they cover the full request.

**Prevention**: Test mixed Latin/CJK content with parseable Latin-only page font
bytes, and assert both fallback diagnostics and the emitted Figma font family.

## Scenario: Glyph-Aware Fixed CJK Fallback

### 1. Scope / Trigger

Read and preserve this scenario when changing font request collection,
resolver caching, font byte validation, extension fallback assets, or emitted
TEXT node font metadata. This is a cross-layer adapter-to-core contract.

### 2. Signatures

~~~ts
interface FontProperties {
  family: string;
  weight: number;
  italic: boolean;
  codePoints?: ReadonlyArray<number>;
}

interface LoadedFont {
  actualFamily: string;
  resolvedFamily?: string;
  resolvedWeight?: number;
  resolvedItalic?: boolean;
}
~~~

`codePoints` is optional for loader compatibility. When present it is sorted,
unique, excludes whitespace/control-only characters, and never contains source
text. `actualFamily` is the family parsed from the bytes and is the family that
must be emitted in consumer-visible Figma fields.

### 3. Contracts

- Aggregate code points by normalized `family + weight + italic` before
  preflight; include the normalized code-point signature in resolver and core
  font-cache keys.
- Page, transport, bundled, and fallback candidates pass through the same
  parse, name-table, and target-glyph validation.
- A coverage miss rejects that candidate for the entire style request. Do not
  create per-character font runs in this path.
- The extension fallback always selects among local weights 400/500/600/700 by
  nearest absolute distance; ties choose the lower weight and italic requests
  resolve to normal.
- Use each file's real name-table family: 400/700 are `Noto Sans TC Thin`, 500
  is `Noto Sans TC Thin Medium`, and 600 is `Noto Sans TC Thin SemiBold`.
- Top-level `fontName.family`, `fontMetaData[*].key.family`, and synthesized
  PostScript metadata use the actual resolved family, never a metrics-only
  fallback hidden behind the requested page family.
- Diagnostics may include code-point-independent attempt codes such as
  `glyph-coverage-miss`, but must not expose source text or code points.

### 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| Exact page font covers all target glyphs | Keep exact family/style/weight. |
| Parseable page font misses one target glyph | Record coverage miss and try the next source/fallback. |
| Requested weight lies between local variants | Choose nearest; on a tie choose the lower weight. |
| Italic requested from normal-only catalog | Return fallback with `resolvedItalic: false`. |
| Fixed fallback misses a target glyph | Return failed/throw under the configured failure policy. |
| Same style appears in separate text nodes | Merge code points and pin one resolution for the capture. |
| Diagnostics are serialized | Omit source text and the code-point list. |

### 5. Good / Base / Bad Cases

- Good: Latin-only Inter bytes plus mixed Latin/CJK text resolve to a local
  Noto Sans TC variant and emit that variant's real family in the TEXT payload.
- Base: an exact page font covering all requested characters remains exact.
- Bad: accepting parseable Latin-only bytes as exact, requiring an `Inter`
  alias, or emitting `Inter` while measuring and serializing fallback bytes.

### 6. Tests Required

- Adapter unit/browser tests assert sorted aggregation, coverage rejection,
  capture-level pinning, stable attempts, and exact/fallback diagnostics.
- Extension unit tests cover 400/500/600/700, boundary/tie weights, real family
  names, and italic downgrade; Chrome and Firefox builds must include assets.
- Core browser tests assert loader code points and that top-level `fontName`,
  `fontMetaData`, and PostScript metadata use the actual resolved family.
- Run adapter, core, and extension tests/type-check/build gates plus
  `git diff --check`.

### 7. Wrong vs Correct

#### Wrong

~~~ts
// Parseable bytes may still lack a glyph, and the requested family may lie.
return { bytes, fontName: { family: requested.family } };
~~~

#### Correct

~~~ts
validateGlyphCoverage(bytes, request.codePoints);
return {
  bytes,
  actualFamily: parsedFamily,
  fontName: { family: parsedFamily },
};
~~~

## Image Loading

`createBackgroundImageLoader` first delegates to
`createDirectImageLoader`. Any direct failure uses the typed background
message and converts base64 back to an ArrayBuffer. Keep MIME type with the
bytes; downstream image processing needs both.

The adapter selects `openComposedDomTree` from `@figit/composed-dom` by default
and passes that same strategy into the converter. Open Shadow DOM roots replace
a host's light-DOM children, and `<slot>` nodes are replaced by their assigned
nodes. The same strategy is used by the settle gate, font request collection,
and temporary CJK line-break pass so resources and text inside web components
are ready before conversion. Direct `@figit/dom-to-figma` consumers remain on
light DOM unless they explicitly provide a strategy. Closed shadow roots remain
inaccessible by browser security rules.

## Temporary DOM Changes

Copying a transparent selected element temporarily applies the first opaque
ancestor's solid background. `applyInheritedBackgroundIfNeeded` returns a
cleanup function, and `runConversion` executes it with `Promise.finally`.

Any future temporary page mutation must follow the same shape:

~~~ts
const restore = applyTemporaryState(element);
runConversion(input, restore);
~~~

Restore the exact prior inline value on success or failure. Do not attempt to
flatten gradients or translucent ancestor stacks into an invented solid fill.

## User Feedback

Conversion and clipboard errors are converted from `unknown` through
`toErrorMessage` and surfaced in a stable Sonner toast id. Preserve one
loading-to-result toast rather than stacking a toast for every async phase.

## Scenario: Adapter Font Transport And Cleanup Contract

### 1. Scope / Trigger

- Trigger: content conversion now delegates font acquisition, page settling,
  motion freezing, and temporary CJK line breaks to a shared private adapter.
- Scope: `apps/extension` supplies the privileged transport; the adapter never
  imports extension runtime APIs or writes to the clipboard.

### 2. Signatures

- `createBackgroundFontTransport(): FontTransport`
- `sendMessage("fetchFont", url: string): Promise<FetchUrlResult>`
- `createBrowserCaptureAdapter(options): BrowserCaptureAdapter`
- `adapter.capture(input): Promise<CaptureResult>`

### 3. Contracts

- The transport accepts only URLs selected by the adapter and returns
  `ArrayBuffer` bytes or `{ bytes, mimeType }`; serialized extension messages
  carry the bytes as base64.
- The adapter returns the published converter result plus `diagnostics.fonts`,
  `diagnostics.settle`, `diagnostics.motion`, `diagnostics.lineBreaks`, and
  `cleanupFailures`.
- Clipboard writes stay after `await adapter.capture(...)` in the content
  entrypoint so the existing synchronous trigger and toast flow remain intact.
- Background fetch retains HTTP(S)-only, credentials-omitted, non-2xx-rejected
  behavior; the adapter does not broaden permissions or URL schemes.

### 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| Readable same-origin font rule | Try page URL before extension transport. |
| CORS-blocked HTTP(S) font | Use `fetchFont` transport, then fallback if it fails. |
| Unreadable CSSOM, `local()`, invalid bytes, or no exact match | Record attempts and use extension-local bundled/fallback bytes or the adapter's Fontsource fallback. |
| `fontFailure: "strict"` with non-exact request | Reject before `converter.convert`. |
| Settle deadline expires | Continue conversion and expose pending fonts/images and phase. |
| Converter or cleanup throws | Run cleanup in reverse registration order and throw `CaptureError` with diagnostics. |
| Non-HTTP(S) transport URL | Reject before sending a background message. |
| A published-core compatibility test installs the adapter through a monorepo `file:` junction | Treat the result as a workspace build smoke, not isolation evidence; pack the adapter and install it in a clean temporary project. |

### 5. Good/Base/Bad Cases

- Good: capture uses one cached adapter, background font transport, and writes
  the returned clipboard item only after conversion succeeds.
- Base: page font fetch fails, the extension-local or Fontsource fallback
  resolves parseable bytes, and the result remains editable with an explicit
  fallback diagnostic.
- Bad: content code calls `fetchFont` directly for arbitrary URLs, constructs a
  new converter for every picker event, or writes clipboard data before
  adapter cleanup has run.

### 6. Tests Required

- Adapter unit tests assert exact/fallback/strict font diagnostics and request
  de-duplication.
- Chromium tests assert CJK text restoration on success and converter failure,
  zero-wait behavior, timeout phases for never-ready resources, animation
  current-time/play-state restoration, and `live` no-inspection behavior.
- Extension gates assert type-check and both Chrome MV3 and Firefox MV2 builds;
  the published-package smoke asserts clipboard decoding, editable text,
  console errors, failed requests, and HTTP errors.
- A registry compatibility gate must run `npm pack` for the private adapter,
  install that tarball beside the exact supported `@figit/dom-to-figma`
  version in a temporary project outside monorepo resolution paths, and assert
  both the resolved core version and a browser conversion. A local `file:`
  junction can resolve the adapter's workspace peer and is not sufficient.

### 7. Wrong vs Correct

#### Wrong

~~~ts
const result = await converter.convert(input);
await navigator.clipboard.write([result.toClipboardItem()]);
~~~

#### Correct

~~~ts
const result = await adapter.capture(input);
await navigator.clipboard.write([result.toClipboardItem()]);
~~~

The adapter owns temporary capture state and diagnostics; the content layer
owns the user-activation-sensitive clipboard operation.
