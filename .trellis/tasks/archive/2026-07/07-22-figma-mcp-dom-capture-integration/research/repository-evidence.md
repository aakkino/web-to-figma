# Repository Evidence: DOM Capture And Figma Control

## Scope

This note records the code and planning evidence used to assess integration
between `web-to-figma` and
`D:\desktop_directory\figma-mcp-explore\figma-mcp-go`. It distinguishes
observed behavior from proposed design.

## `web-to-figma`

### Published 0.2 line and current upstream state

- Live registry metadata on 2026-07-22 reports `latest = 0.2.0` for both
  `@figit/dom-to-figma` and `@figit/fig-kiwi`. Both tags resolve to release
  commit `f653c70`; the packages were published at 2026-07-22 09:27 UTC.
- The actual `@figit/dom-to-figma@0.2.0` tarball contains seven files and is
  158,956 bytes compressed (629,788 bytes unpacked). The
  `@figit/fig-kiwi@0.2.0` tarball also contains seven files and is 78,284 bytes
  compressed (659,116 bytes unpacked). Each ships only its ESM bundle, source
  map, declarations, README, LICENSE, and package manifest; the private oracle
  harness and source tests are not part of either published artifact.
- `@figit/dom-to-figma@0.2.0` adds `FigmaConverterConfig.trace`, optional
  `ConvertResult.trace`, and exported `ConvertTrace` / `TraceEntry` types. Each
  trace entry relates an emitted private GUID to `domPath`, viewport `rect`,
  classified `kind`, tag, and optional text. Allocation and DOM-path work are
  skipped when tracing is disabled, and browser tests assert byte-identical
  payload output with tracing on or off.
- The converter now preserves a non-translation 2D CSS transform on leaf frame
  elements by combining untransformed `offsetWidth` / `offsetHeight` with a
  Figma matrix. This assumes the default center transform origin. 3D transforms,
  custom origins, and transformed containers with convertible descendants keep
  the prior flattened bounding-box behavior.
- Raster image hashing now prefers `crypto.subtle` but falls back to an internal
  SHA-1 implementation when Web Crypto is unavailable on `about:blank`, plain
  HTTP, or file-like non-secure contexts. This prevents the image node from being
  dropped; it does not bypass image-fetch CORS, which still requires an injected
  loader or extension background proxy.
- `@figit/fig-kiwi@0.2.0` publicly exports `diffFigmaTrees`, `Mismatch`,
  `treeOrder`, and `OracleNode`. The comparer pairs frames by name and nodes by
  tree order, normalizes omitted Figma defaults, and uses numeric/geometry
  tolerances. It is a parity diagnostic for sent and copied-back Kiwi payloads,
  not a Plugin API importer.
- Release commit #21 also adds the private three-tier parity system: local
  payload-versus-browser checks, Figma Kiwi copy-back checks, screenshot pixel
  comparisons, a committed score ratchet, and a findings ledger. This is
  maintenance infrastructure rather than a new runtime dependency for consumers.
- Upstream `main` at `ac830db` is three commits ahead of 0.2.0. The changes fix
  alignment-aware placement of the text measurement buffer, decompose differing
  solid border-side colors into vector trapezoids, and convert a pure spread-only
  box shadow into an outside stroke. Release PR #28 has generated a 0.2.1
  changelog, but live registry metadata still reports 0.2.0 as `latest`.
- Current-source verification passed: 16 converter test files / 134 tests, five
  Kiwi test files / 41 tests, and production builds for both packages. The local
  `published-package-test` directory remains pinned to 0.1.0 and therefore does
  not validate the new published artifact.

### Public conversion boundary

- `packages/dom-to-figma/src/figma.ts` exports `createFigmaConverter`.
- Each `convert()` call creates fresh GUIDs, node changes, blobs, and optional
  trace entries while the converter instance retains font/image caches.
- `ConvertResult` exposes:
  - `document: FigmaClipboard`;
  - encoded Kiwi `bytes` and `base64`;
  - clipboard helpers;
  - optional `ConvertTrace`.
- `packages/dom-to-figma/src/converter/types/clipboard.ts` identifies the raw
  document as Figma-private `NODE_CHANGES`, not a public Plugin API schema.

### What is actually captured

- `converter/walk.ts` traverses live DOM child nodes, measures element and text
  rectangles, preserves visual stacking order, splits wrapped text when needed,
  and records DOM paths.
- `converter/classify.ts` maps DOM elements to frame, group, vector, image,
  text, form-with-placeholder, skip, or fallback frame behavior.
- Leaf converters translate computed styles into Figma-shaped frames, text,
  image fills, vector data, gradients, borders, effects, transforms, and layout
  fields.
- Text conversion loads font bytes for metrics and embeds glyph-derived data in
  the Kiwi payload. The requested Figma family still has to resolve at paste
  time for fully editable text.
- `trace.ts` maps emitted private GUIDs to DOM paths and source rectangles. It
  does not yet map to actual Plugin API node IDs because paste owns node creation.

### Existing browser runtime

- `apps/extension/entrypoints/content/convert.ts` runs the converter in a real
  active-tab content script and supports whole-page or picked-element capture.
- `apps/extension/shared/loaders.ts` and `background.ts` retry failed public
  HTTP(S) image loads through a background-worker CORS proxy.
- `apps/extension/shared/page-font-loader.ts` scans readable `@font-face` rules,
  tries a direct font fetch, and falls back to Fontsource. The messaging and
  background layers register `fetchFont`, but the current page font loader does
  not call that message.
- The extension currently discards the structured result after writing its
  clipboard envelope. Its runtime protocol only supports asset fetches; there
  is no agent-facing capture request or result session.
- Clipboard writing depends on propagated user activation from the extension
  popup. That is suitable for the current manual workflow, not unattended agent
  capture.

### Known capture gaps

- Pseudo-elements are not children in the DOM walk. They need native extraction
  or raster fallback.
- Cross-origin iframe contents are explicitly skipped by the extension.
- Canvas/WebGL/video and arbitrary filters/compositing do not have a general
  editable-node representation.
- Picked-element inherited backgrounds only promote an opaque solid ancestor;
  gradients/images/translucent stacks are intentionally not flattened.
- The public converter is browser-only and must not be presented as Node-safe.

## `figma-mcp-explore/figma-mcp-go`

### Control flow

Observed root MCP/CLI path:

```text
Agent or CLI
  -> local HTTP POST /rpc
  -> Go BridgeRequest JSON
  -> WebSocket plugin session
  -> Figma plugin UI iframe
  -> parent.postMessage
  -> plugin main request dispatcher
  -> Figma Plugin API handler
```

Evidence:

- `internal/leader.go` registers `/rpc` and `/ws`.
- `internal/types.go` carries generic `tool`, `nodeIds`, and `params` maps.
- `plugin/src/ui/App.svelte` forwards WebSocket JSON to plugin main.
- `plugin/src/main.ts` dispatches read/write requests.
- `plugin/src/write-create.ts` creates frames, shapes, text, SVG, images,
  components, instances, and sections through Plugin API.

### Import constraints

- The installed `@figma/plugin-typings` has no clipboard paste or Kiwi import
  API. `createNodeFromJSXAsync` is a bulk-construction convenience with an
  explicitly incomplete feature surface, not a private-payload importer.
- Existing write tools are useful primitives but are too chatty for a large
  DOM tree and do not cover every private node-change field.
- Plugin-created text requires `figma.loadFontAsync`; missing fonts must be
  discovered before mutation or handled by an explicit fallback.
- The root bridge accepts WebSocket frames up to 100 MiB but has fixed request
  timeouts. Large JSON/base64 crossing Go, WebSocket, UI JSON parsing, and
  plugin `postMessage` is still a memory and responsiveness risk.
- The CLI-first bridge already carries operation IDs, deadlines, progress,
  liveness probes, and bounded runtime idempotency. Web import should build on
  those semantics rather than the older fixed-timeout behavior.

### Existing acquisition and adapter work

- `typographynerd-homepage-visual-capture` and
  `zahnarzt-wernitz-homepage-visual-capture` use Playwright to persist
  screenshots, hydrated DOM, assets, and design inventories for later Figma
  recreation.
- `adapters/dashi-ppt-skill/lib/browser-capture.mjs` captures a pinned hydrated
  DOM at deterministic dimensions, checks pseudo content and stacking/font
  safety, and emits raster/hybrid evidence.
- The Dashi adapter lowers source-specific evidence to DeckSpec, then the
  CLI-first renderer creates Figma Slides.
- `.trellis/tasks/07-17-flat-layout-adapter-standard` fixes DeckSpec as the
  Slides renderer boundary and deliberately keeps HTML DOM evidence
  source-specific. This should remain intact for Slides workflows.

## Consequences

1. A third runtime is mandatory. DOM acquisition belongs in a browser extension
   content script or Playwright page, never in the Figma plugin main runtime.
2. The existing Kiwi/clipboard output cannot be sent directly to Plugin API.
   Closed-loop import needs either a new Plugin API scene plan/importer or
   unsupported OS-level paste automation.
3. Large capture payloads should not pass through the model response. Tools
   should exchange small IDs and summaries while a local artifact store owns
   the versioned plan and assets.
4. Capture and import should be separate operations. Acquisition is read-only;
   Figma mutation needs a target session, preflight, idempotency, and rollback.
5. DeckSpec is a valid reuse path only when the requested product is Figma
   Slides. General Figma Design import needs a different target contract.
6. Continuous synchronization is possible only after the first import returns
   stable source-ID to Figma-node-ID mappings and defines conflict policy.

## Go Port Feasibility Evidence

- The non-test `@figit/dom-to-figma` implementation is approximately 9,755 lines
  across 77 TypeScript files. The largest specialized areas are text/font/glyph
  handling (about 3,437 lines), vector conversion (about 1,990 lines), auto-layout
  inference (about 815 lines), and style parsing (about 658 lines).
- `@figit/fig-kiwi` adds about 1,131 non-test TypeScript lines and a 687,874-byte,
  27,429-line private Figma schema snapshot.
- The converter has at least 1,951 lines of browser and unit test source across
  14 test files, plus oracle/parity infrastructure outside that count.
- Browser layout is not an incidental dependency. Production code repeatedly
  calls `getComputedStyle`, `getBoundingClientRect`, `Range.getClientRects`,
  canvas/image APIs, DOM construction, and Web Crypto.
- The Go modules in `figma-mcp-go` contain transport, MCP, image/PDF, and text
  utilities but no browser engine or CDP dependency. Existing target-side DOM
  capture launches Chromium through Playwright and evaluates JavaScript in the
  page for geometry and computed styles.
- Porting Kiwi encoding to Go is technically separable, but it preserves a
  private clipboard protocol that the Figma Plugin API still cannot import.
  Therefore it does not close the agent-to-Figma loop by itself.

## Unresolved Product Intent

The code cannot decide whether V1 should provide:

- a read-only capture artifact for agent reasoning;
- a closed-loop current-page/element import into Figma Design;
- a Slides-only DOM-to-DeckSpec adapter; or
- persistent incremental synchronization.

That choice changes the target contract and MVP by an order of magnitude and
must be made by the user before execution planning.
