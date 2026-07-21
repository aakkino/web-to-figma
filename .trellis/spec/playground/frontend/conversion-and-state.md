# Conversion And State

## Workflow Owner

`PlaygroundShell` intentionally owns the coupled workbench state: source HTML,
deferred preview, frame dimensions/name, layout mode, conversion result,
status, and busy flags. Keep leaf inspector/render helpers stateless or locally
stateful; do not introduce a global store for this single-screen flow.

Navigation resets source, name, result, and status from the new `Scene`.

## Preview And Conversion

- Editor changes flow through `useDeferredValue` into iframe `srcDoc`.
- The iframe `onLoad` starts conversion after the new DOM is ready.
- Dimension, name, and layout changes use a 300 ms timeout that is cleared on
  effect cleanup.
- Conversion reads `iframe.contentDocument.body`, which is available because
  `srcDoc` is same-origin.
- Invalid zero numeric input is normalized to at least 1 only at the converter
  call boundary.

Preserve the distinction between code-triggered iframe reload and
dimension/name-triggered conversion. Avoid converting against a half-loaded
document.

## Converter Cache

`src/lib/converter.ts` keeps one converter per `ConverterLayout` so image/font
caches stay warm while users rerun and toggle modes:

~~~ts
const cache = new Map<ConverterLayout, ReturnType<typeof createFigmaConverter>>();
~~~

Do not merge auto and absolute modes into one mutable converter or create a new
instance per keystroke.

## Async Status

Set and clear `isConverting`/`isCopying` in `try/finally`. Surface the error to
the workbench and keep the diagnostic console call behind a reasoned Biome
suppression. Clipboard copy must use the most recent successful
`ConvertResult` and stay disabled while conversion is in progress.

