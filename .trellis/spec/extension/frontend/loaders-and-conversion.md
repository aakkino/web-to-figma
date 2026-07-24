# Loaders And Conversion

## Converter Lifetime

`entrypoints/content/convert.ts` creates one lazy
`BrowserCaptureAdapter` instance. Keep it stable across copies so page
font/image caches remain warm. Configure cross-context behavior at creation:

- page-aware font resolver with Fontsource fallback and the injected background
  font transport, plus the extension's local CJK catalog and stable
  Latin/Arabic fallback for unmatched families;
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
extension supplies local Noto Sans TC weights for CJK aliases and a local
Noto Sans Arabic 400 file for unmatched Latin/Arabic families; callers that do
not supply a catalog use the generic Fontsource loader. It reports the
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
