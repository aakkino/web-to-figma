# Explore Figma MCP DOM capture integration

## Goal

Determine whether and how this npm workspace can provide DOM capture capabilities
to `D:\desktop_directory\figma-mcp-explore`, whose `figma-mcp-go` tooling uses the
Figma Plugin API for agent-driven Figma operations. Produce an evidence-backed MVP
scope and integration contract before any implementation begins.

## User Value

Enable an agent workflow that can acquire structured visual and layout state from
a live web page, then use the existing Figma Plugin API control plane to recreate,
inspect, or update that page in Figma.

## Confirmed Facts

- `@figit/dom-to-figma` is not a DOM-to-HTML serializer. It is a browser-only
  DOM measurement and Figma compilation pipeline: it walks a live DOM, reads
  computed styles and geometry, and emits a private Figma `NODE_CHANGES`
  document plus Kiwi/clipboard bytes.
- The converter already returns raw node changes, binary/base64 output, and an
  optional DOM-path-to-Figma-GUID trace. It supports frames, text, images,
  vectors, groups, paints, effects, and inferred auto layout with fallback.
- The existing browser extension is already a working capture runtime for the
  current tab. It supports whole-page or picked-element conversion and proxies
  failed cross-origin image fetches through its background worker. Page fonts
  are discovered from readable `@font-face` rules, fetched directly, and fall
  back to Fontsource; the registered background `fetchFont` message is not
  currently used by that loader. Its only output boundary is a user-activated
  clipboard write.
- Capture remains best effort: pseudo-elements are not traversed as DOM nodes,
  cross-origin iframe contents are skipped, and some inherited or unsupported
  visuals need explicit fallback policy.
- `figma-mcp-go` routes agent/CLI JSON calls through local HTTP `/rpc`, then a
  WebSocket, the Figma plugin UI iframe, and finally the plugin main thread that
  invokes the Figma Plugin API.
- The installed Figma Plugin API exposes node constructors and a subset-oriented
  `createNodeFromJSXAsync`, but no supported API for pasting or importing the
  private Kiwi/clipboard payload. Direct reuse of `base64` therefore cannot
  complete an agent-controlled import through Plugin API alone.
- `figma-mcp-explore` already contains specialized acquisition work: independent
  Playwright website evidence capture and a Dashi hydrated-DOM adapter that
  produces raster/hybrid DeckSpec for Figma Slides. The missing capability is a
  general capture session and import contract, not all capture from zero.
- DeckSpec is intentionally scoped to Figma Slides and a canonical 1920x1080
  canvas. The active flat-layout standard explicitly avoids turning it into an
  arbitrary-web-page geometry IR.
- The target repository currently has two Go control paths. The CLI-first path
  has operation IDs, deadlines, responsiveness checks, and progress handling;
  the root MCP path has a simpler fixed-timeout bridge. A long-running web import
  needs the stronger lifecycle semantics shared by both surfaces.
- A complete pure-Go port cannot remove the browser runtime: the current engine
  depends on the browser's computed style, layout boxes, text ranges, image/canvas
  decoding, and hydrated DOM. Go can control Chromium, but it cannot reproduce
  arbitrary modern web layout without retaining a browser engine.
- A complete end-to-end Go implementation is also impossible within the current
  Figma architecture because the Figma Plugin API executes in the plugin's
  JavaScript/TypeScript sandbox. Go may own orchestration and scene planning;
  final document mutation remains plugin code.
- As verified against the live registry and upstream repository on 2026-07-22,
  the current published versions are `@figit/dom-to-figma@0.2.0` and
  `@figit/fig-kiwi@0.2.0`. The converter release adds opt-in source tracing,
  leaf-frame 2D CSS transform preservation, and a pure-JavaScript SHA-1 fallback
  for raster images in non-secure browser contexts. The Kiwi release exposes
  the tree-ordering and sent-versus-copy-back diff utilities used by the oracle.
- The 0.2 trace is directly useful for a capture artifact, but it is not durable
  synchronization identity: it maps private payload GUIDs to capture-time DOM
  paths and viewport rectangles, not to Plugin API node IDs, and DOM paths may
  change across captures.
- Upstream `main` is three patch commits ahead of the 0.2.0 tags. Release PR #28
  prepares `@figit/dom-to-figma@0.2.1` with alignment-aware text width buffers,
  per-side solid border colors, and pure-ring box-shadow strokes. It is not yet
  published, and it does not change the proposed capture/import boundary.
- The local `published-package-test` fixture still depends on 0.1.0, so it is not
  evidence that the published 0.2.0 artifact works in the integration target.

## Requirements

- Inspect both repositories and trace their current runtime boundaries, public APIs,
  data models, transports, and build/package constraints.
- Identify the actual DOM acquisition entry point in this repository and distinguish
  HTML serialization from computed-style, geometry, asset, pseudo-element, and
  browser-state capture.
- Identify where a capture capability can enter the `figma-mcp-go` agent/tool flow
  without unnecessarily coupling browser execution to the Figma plugin runtime.
- Compare viable integration shapes and recommend one with explicit trade-offs.
- Compare a pure-Go rewrite, Go-controlled Chromium with a Go scene lowerer, and
  a Go coordinator that embeds/reuses the existing browser JavaScript engine.
- Define the minimum data contract between capture and Figma reconstruction,
  including asset transport, coordinate system, identity, errors, and versioning.
- Define an MVP that can be validated end to end and list intentionally deferred
  capabilities.
- Treat this phase as planning only; do not change either product implementation.

## Acceptance Criteria

- [x] Current capture and Figma-control flows are documented with repository file
      evidence rather than assumptions.
- [x] At least two integration options are compared on fidelity, coupling,
      deployment complexity, extensibility, and failure isolation.
- [x] A recommended architecture names component ownership, process boundaries,
      transport, and the end-to-end data flow.
- [x] The proposed capture-to-Figma contract includes a concrete payload outline and
      compatibility/versioning strategy.
- [ ] MVP scope, validation approach, risks, unresolved product decisions, and
      explicit non-goals are recorded.
- [ ] Complex-task planning artifacts `design.md` and `implement.md` are ready for
      user review before implementation is activated.

## Out Of Scope For Planning

- Implementing or publishing an npm package.
- Modifying `figma-mcp-go`, its Figma plugin, or this repository's runtime code.
- Promising arbitrary-web-page pixel parity before the existing capture semantics
  and target reconstruction constraints are verified.

## Open Questions

- Which end-user workflow should the first integration optimize: importing a page
  into Figma, giving the agent read-only page context, or maintaining a repeatable
  page-to-Figma synchronization loop?
- Is the reason for considering Go migration a single-binary/no-Node deployment
  goal, or a strict requirement to eliminate browser-side JavaScript?

## Notes

- The nearest actual symbol is `createFigmaConverter`, not `dom_to_html`.
- Repository evidence and the initial option analysis are recorded under
  `research/repository-evidence.md` and `design.md`.
