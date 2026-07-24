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
- Page and transported fonts are checked for the CJK and Latin code points used
  by the captured text. A parseable font that lacks a required glyph is not
  treated as an exact match.
- Any request that cannot be satisfied exactly uses the local Noto Sans TC
  composite catalog at the nearest available 400/500/600/700 weight. Ties use
  the lower weight and italic requests fall back to normal. The Figma payload
  names the selected font's real family; the 500 and 600 files therefore use
  `Noto Sans TC Thin Medium` and `Noto Sans TC Thin SemiBold` respectively.
- Fallback is selected once per family/weight/style during a capture, so mixed
  CJK/Latin text stays editable as one font run. Per-character font fallback,
  emoji, Arabic, and Hebrew coverage are outside this catalog's scope.
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

## Typography spec

After a page or element reaches Review, `Copy typography spec` scans that same
target and writes a separate editable Figma frame to the clipboard. It does
not run or modify the ordinary page capture session.

- Inspection keeps the complete computed typography token: ordered family
  stack, weight, style, font size, line height, and letter spacing. Text color
  is intentionally excluded.
- The report projects those tokens into one deduplicated font-resolution table,
  repeated core styles, and compact single-use variants. Core styles keep every
  line-height/letter-spacing variant and reference the font table by stable
  `F01`-style ids; no Top-N truncation drops long-tail records.
- Each report section is its own vertical container so Figma paste preserves
  semantic grouping and sibling order even on highly fragmented pages.
- Specimens use fixed Latin and CJK text. Page text, CSS rules, font URLs, font
  bytes, URL paths, queries, and hashes are not included.
- Page attribution is limited to `document.title` and `location.hostname`.
- Report DOM is mounted in an off-screen shadow root, converted with the
  existing adapter, and removed in `finally` after success or failure.

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
