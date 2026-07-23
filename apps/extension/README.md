# Figit browser extension

The extension keeps the popup-to-content synchronous trigger and writes the
clipboard item from the content script. The conversion itself runs through
`@figit/browser-capture-adapter`, which prepares the page before calling the
published `@figit/dom-to-figma` API.

## Capture behavior

- Page `@font-face` URLs are tried directly first. CSSOM entries that cannot
  be inspected are skipped rather than bypassing browser security.
- Failed cross-origin font requests use the existing typed `fetchFont` message
  and background worker. The worker accepts only HTTP(S), omits credentials,
  and returns base64 bytes through the shared protocol.
- Common Traditional Chinese system-font aliases (`PingFang TC`, `Heiti TC`,
  `Microsoft JhengHei`, and related names) have a local Noto Sans TC fallback
  catalog with the nearest available weight. This keeps CJK glyph data valid
  when the operating-system font cannot be extracted; page-declared web fonts
  still take precedence.
- An unmatched family uses the bundled Noto Sans Arabic 400 font as a stable
  Latin/Arabic/number fallback. The payload still requests the original family
  so Figma can use it when the destination has it; the bundled bytes only feed
  conversion-time metrics. Fontsource remains the generic adapter fallback for
  callers that do not supply an extension catalog.
- Result diagnostics identify the requested and resolved family, weight, italic
  state, source, and attempt errors.
- The default failure mode keeps editable text and uses the nearest parseable
  font. Hosts that require exact metrics can use the adapter's `strict` mode;
  it fails before conversion instead of returning a partial text payload.
- The adapter waits up to five seconds for fonts, images, and two stable paint
  frames. A timeout continues the capture and reports the pending phase.
- CSS/Web Animations in the capture root are paused at their current time and
  restored after conversion. Video, canvas, custom timers, and animations
  created after the snapshot are outside this guarantee.
- CJK line boundaries are measured for the current viewport and temporarily
  encoded as newlines. The default is conservative `auto`; callers can use
  `lineBreaks: "off"` for pages that need the core package's original text
  behavior. Every temporary text and inline-style change is restored on both
  success and failure.

The adapter does not own extension permissions, runtime messaging, clipboard
writes, or page-specific selectors. It is a private workspace package until
the API has been validated across more sites.

## Verification

Run the static gates from the repository root:

```sh
pnpm --filter extension check-types
pnpm --filter extension build
pnpm --filter extension build:firefox
```

When upgrading `@figit/dom-to-figma`, run the adapter tests and build first,
then the extension gates. The adapter intentionally consumes only the public
converter and loader contracts, so a tokenizer or `FontLoader` change should
surface in those checks before a release is updated.
