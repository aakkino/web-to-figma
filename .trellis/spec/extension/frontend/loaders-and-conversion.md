# Loaders And Conversion

## Converter Lifetime

`entrypoints/content/convert.ts` creates one lazy `FigmaConverter` instance.
Keep it stable across copies so page font/image caches remain warm. Configure
cross-context behavior at creation:

- page-aware font loader with Fontsource fallback;
- direct image loader with background-proxy fallback;
- classifier that skips extension UI and inaccessible cross-origin iframes.

Do not instantiate a converter in a React render or per pointer movement.

## Font Loading

`shared/page-font-loader.ts` scans accessible `CSSFontFaceRule` entries once,
chooses a parseable URL and nearest family/style/weight range, and falls back
when:

- cross-origin stylesheet rules cannot be inspected;
- no parseable URL exists;
- the page fetch fails;
- the requested family/style cannot be matched.

Keep the global font URL regex cloned per parse because `RegExp.exec` mutates
state. Accept only formats/font extensions that fontkit can parse. A best-effort
page match must never prevent the fallback loader from running.

## Image Loading

`createBackgroundImageLoader` first delegates to
`createDirectImageLoader`. Any direct failure uses the typed background
message and converts base64 back to an ArrayBuffer. Keep MIME type with the
bytes; downstream image processing needs both.

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

