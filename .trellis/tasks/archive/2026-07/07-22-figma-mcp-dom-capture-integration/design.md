# Design: Brokered Web Capture For Figma Agent Tools

Status: draft; the primary end-user workflow is not yet approved.

## Decision Summary

For a general Figma Design workflow, use a brokered capture architecture:

1. a browser-side capture client measures the live page;
2. the local Go bridge stores a versioned capture artifact and returns a small
   summary plus `captureId` to the agent;
3. a separate import request targets a Figma plugin session;
4. one plugin-side bulk importer validates and creates the scene, returning
   source-to-Figma identity mappings.

Do not put DOM acquisition in the Figma plugin, send private Kiwi bytes to a
nonexistent Plugin API importer, or expand Slides DeckSpec into a universal web
layout format.

## Option Comparison

| Option | Fidelity | Coupling / complexity | Automation | Failure isolation | Assessment |
| --- | --- | --- | --- | --- | --- |
| Keep current clipboard workflow | Highest reuse of current converter | Low code change, but relies on user gesture and OS paste | Partial | Capture and paste failures are ambiguous | Useful baseline, not an agent-controlled integration |
| Read-only capture, then existing atomic Figma tools | Capture can be rich; reconstruction is agent-approximate | Smallest new boundary | Closed loop but many tool calls | Good acquisition isolation, weak render determinism | Good diagnostic MVP if import is not required |
| Brokered artifact plus bulk Plugin API importer | High for supported node kinds with explicit fallbacks | Moderate/high; new contract and importer | Fully agent controlled | Strong preflight, staging, rollback, and retry semantics | Recommended for general Figma Design import |
| DOM-to-DeckSpec adapter | High raster/hybrid fidelity for fixed slides | Reuses substantial target code | Fully agent controlled | Existing validation and replace safety | Recommended only for Figma Slides at the declared canvas |
| Continuous DOM/Figma sync | Potentially high after first import | Highest identity, conflict, event, and lifecycle cost | Fully automatic | Hardest partial-failure semantics | Defer until one-shot import is stable |

`figma.createNodeFromJSXAsync` may accelerate the first tree construction, but
its feature subset makes it an importer implementation experiment, not the
cross-project contract.

## Proposed Runtime Topology

```text
                              +---------------------------+
                              | Browser capture client    |
                              | extension or Playwright   |
                              +-------------+-------------+
                                            |
                                      capture protocol
                                            |
Agent -> MCP / CLI -> Go coordinator + capture registry + artifact store
                                            |
                                      import by captureId
                                            |
                              +-------------v-------------+
                              | selected Figma session    |
                              | UI bridge -> main importer|
                              +-------------+-------------+
                                            |
                                      Figma Plugin API
```

### Capture client

The client owns all APIs that require a real page: DOM traversal, computed
styles, ranges, geometry, loaded page state, image/font acquisition, and source
trace identities.

Recommended driver order depends on product intent:

- Browser extension first for the user's authenticated current tab and picked
  elements. It already embeds the converter, a background image-fetch fallback,
  and page-font discovery with Fontsource fallback.
- Playwright first for reproducible URL/fixture capture in CI or unattended
  workflows. The target repository already has a proven harness pattern.
- Both can later implement the same capture-client protocol.

### Go coordinator

The coordinator owns capture and Figma session selection, request deadlines,
operation IDs, artifact lifetime, small tool responses, and routing. It should
not parse CSS or contain source-specific rendering policy.

Capture clients should use a separate endpoint/session type from Figma plugin
sessions. Status output must distinguish them so an agent cannot accidentally
route a Figma mutation to a browser client.

### Artifact store

Large trees and binary assets stay local and out of MCP text results. The store
uses content-addressed assets and an expiring `captureId`. Tool output contains
metadata, diagnostics, hashes, node/asset counts, and a reference only.

An initial implementation may use a confined temporary directory. A later
daemon can expose tokenized loopback artifact URLs for chunked plugin-UI fetches.

### Plugin importer

The importer owns translation from a versioned Plugin API scene plan to actual
Figma nodes. It must:

- validate the complete plan before mutation;
- preflight fonts and asset availability;
- create under one staging root and remove it on failure;
- emit progress for long work;
- commit one undo boundary after success;
- attach stable capture/source IDs as plugin data;
- return actual Figma node IDs plus warnings and fallback accounting.

The importer should be shared by MCP and CLI surfaces. The stronger CLI-first
deadline/idempotency semantics are the baseline that the root MCP bridge needs
to converge on.

## Contract Outline

The agent-facing capture result is intentionally small:

```json
{
  "schema": "figit.web-capture/1",
  "captureId": "cap_...",
  "producer": {"name": "@figit/dom-to-figma", "version": "0.2.0"},
  "source": {
    "url": "https://example.test/page",
    "title": "Example",
    "capturedAt": "2026-07-22T00:00:00Z",
    "viewport": {"width": 1440, "height": 900, "dpr": 1},
    "root": {"selector": ":scope", "width": 1440, "height": 3200}
  },
  "scene": {
    "schema": "figit.plugin-scene/1",
    "nodeCount": 412,
    "assetCount": 27,
    "sha256": "..."
  },
  "diagnostics": {
    "warnings": [],
    "unsupported": {},
    "estimatedBytes": 0
  }
}
```

Binary assets and the full scene plan are stored behind `captureId`, not inline
in this response.

The mutating import request references that result:

```json
{
  "captureId": "cap_...",
  "target": {"sessionId": "figma-...", "parentId": null},
  "placement": {"x": 0, "y": 0},
  "fontPolicy": "require-exact",
  "fallbackPolicy": "report-and-rasterize",
  "operationId": "import_cap_..."
}
```

The response includes the created root ID, source-ID/Figma-ID mappings,
supported/native/raster/skipped counts, font substitutions, warnings, elapsed
time, and whether rollback was required.

## Scene Contract Direction

`figit.plugin-scene/1` is a target-specific creation plan, not raw HTML and not
a claim of universal layout IR. It should retain:

- stable source IDs and parent/child order;
- local transforms, measured bounds, visibility, opacity, and clipping;
- frame/group/text/image/SVG primitives;
- paints, borders, radii, effects, and auto-layout fields that Plugin API can
  reproduce;
- font requirements and text fit evidence;
- content-addressed image/SVG/raster assets;
- explicit unsupported-feature and fallback records.

The existing private `FigmaClipboard` may help implement a lowerer for common
fields, but it is not the public cross-project contract. Vector networks,
derived glyph blobs, and other private fields need either source-aware capture
data or declared fallback.

The 0.2 `ConvertTrace` should seed capture-local source identity and geometry,
but its private GUIDs and DOM paths must not be treated as durable identity
across captures. The importer still returns Plugin API node IDs, and a future
synchronization protocol needs an explicit cross-capture identity policy.
Likewise, `diffFigmaTrees` is useful for clipboard-baseline parity tests; it does
not remove the need for a Plugin API scene lowerer or structural readback suited
to nodes created by that importer.

## Compatibility

- Both envelope and scene plan carry exact schema identifiers.
- Importers reject unknown major versions before mutation.
- Minor additive fields are ignored only when the schema declares them optional.
- Capture artifacts record producer version, source hash where available,
  viewport/DPR, and policy versions for reproducibility.
- Source IDs remain stable within one capture. Incremental sync requires a later
  identity contract across captures and is not implied by V1.

## Go Reimplementation Feasibility

### Verdict

A Go-owned integration is feasible. A faithful, browser-free, pure-Go rewrite
is not a sensible V1 and would not make the final Figma plugin JavaScript-free.

The recommended interpretation of "move it into figma-mcp-go" is:

- Go owns commands, URL/session selection, Chromium lifecycle, capture artifact
  storage, schema validation, deadlines, retries, and Figma-session routing.
- The existing JavaScript converter runs inside the inspected Chromium page or
  browser-extension content script, where the real DOM and layout engine exist.
- A versioned scene plan crosses into Go.
- The Figma plugin's TypeScript importer applies that plan through Plugin API.

This can still ship as a Go-centered product. A built browser bundle can be
embedded into the Go executable with `go:embed` and injected over CDP, avoiding
a user-visible Node/npm runtime without rewriting the conversion engine.

### Migration Options

| Shape | Technically feasible | Preserves current fidelity | Removes Node install | Removes browser/JS | Recommendation |
| --- | --- | --- | --- | --- | --- |
| Pure Go HTML/CSS parser | Only for a narrow static subset | No; misses JS, hydration, browser layout and text metrics | Yes | Yes | Reject for arbitrary URLs |
| Go controls Chromium; all conversion rewritten in Go | Yes, after browser-side snapshot extraction | Uncertain; very large parity surface | Yes | No, page extraction still needs browser execution | Do not choose for V1 |
| Go controls Chromium and injects embedded converter JS | Yes | Highest reuse and easiest parity comparison | Yes | No | Recommended for URL/CI capture |
| Browser extension captures; Go brokers artifacts | Yes | Highest fidelity for authenticated current-tab state | Yes | No | Recommended for live-tab capture |
| Incrementally port pure lowerers to Go behind one scene contract | Yes | Can be guarded by differential tests | Yes | Partially | Optional optimization after V1 |

### What Can Move Cleanly To Go

- capture/Figma session registries and pairing;
- URL and browser-process orchestration;
- artifact storage, hashing, limits, expiry, and content addressing;
- schema validation and compatibility checks;
- import operation IDs, deadlines, retries, progress, and result accounting;
- source-independent policy selection and scene-plan validation;
- CLI and MCP tool surfaces.

### What Must Retain A Browser Engine

- navigation, script execution, hydration, shadow/iframe policy, and live state;
- CSS cascade and computed styles;
- layout boxes, transforms, stacking, ranges, line wrapping, and glyph origins;
- browser image/canvas behavior and rendered fallback capture.

These operations may be requested by Go through CDP, but Go is orchestrating
Chromium rather than replacing it.

### High-Risk Full-Port Areas

- text shaping, font fallback, glyph metrics and private glyph blobs;
- SVG path normalization and vector-network encoding;
- auto-layout inference and its geometry parity fallback;
- color/gradient/effect compatibility;
- image format decoding and browser-equivalent behavior;
- the private Kiwi schema and envelope;
- cross-platform clipboard integration;
- differential maintenance whenever browser or Figma behavior changes.

The current implementation is roughly 9.8k non-test TypeScript lines plus the
Kiwi encoder and a 27k-line schema snapshot. A full Go rewrite is a new rendering
engine, not a routine language migration.

### Recommended Migration Sequence

1. Freeze the versioned capture/scene contract independently of language.
2. Produce a standalone browser bundle from the existing converter that returns
   an artifact rather than writing the clipboard.
3. Let Go launch/connect to Chromium and inject that embedded bundle, or receive
   the same artifact from the browser extension.
4. Add the plugin-side bulk scene importer and parity-test it against clipboard
   output on identical fixtures.
5. Move individual pure transformations to Go only when profiling or deployment
   evidence justifies it, guarded by differential fixtures.

This sequence provides a Go-owned product boundary without paying the fidelity
and maintenance cost of a premature full rewrite.

## Security And Operational Boundaries

- Bind all coordinator endpoints to loopback by default.
- Pair capture clients explicitly and distinguish read-only acquisition from
  Figma mutation consent.
- An extension must not silently expose arbitrary authenticated tabs to any
  process that can reach the port. V1 should capture only the active/picked tab
  under a visible paired state or equivalent explicit authorization.
- Constrain artifact paths and use unguessable expiring tokens for HTTP access.
- Do not log full capture params, page text, credentials, or base64 assets.
- Reject payloads over declared node, depth, asset, and byte limits before
  plugin mutation.

## Fidelity And Fallback Rules

- Exact fonts are preflighted. Missing fonts fail before mutation unless the
  request explicitly allows substitution or raster fallback.
- Pseudo-elements, canvas/WebGL/video, cross-origin iframe content, complex
  compositing, and unsupported vector/text semantics are never silently lost.
- A supported native node is editable; an unsupported visual is rasterized at
  a declared region or reported/skipped according to policy.
- Source and Figma screenshots at equal dimensions plus structural readback are
  required for acceptance. Schema success alone is insufficient.

## Validation Strategy

1. Contract fixtures validate schemas, bounds, hashes, limits, and rejection of
   malformed trees before a live bridge is required.
2. Browser tests capture deterministic fixtures covering frame, text, image,
   SVG, gradient, effect, auto layout, and explicit fallback cases.
3. Plugin unit tests validate preflight, staging rollback, one undo boundary,
   progress, and returned identity mappings.
4. Bridge tests validate separate session types, artifact expiry, target
   selection, deadlines, idempotent retry, and large-payload refusal.
5. A live vertical slice compares the current clipboard result and Plugin API
   import for the same fixture, then records screenshot diff and structural
   differences rather than assuming parity.

## Rollout Shape

1. Prove one read-only capture driver and artifact envelope.
2. Add a limited native importer for frame/text/image/SVG with strict fallback
   accounting.
3. Validate one-shot import on a pinned fixture and one real page.
4. Expand node/style coverage only when parity fixtures justify it.
5. Consider cross-capture stable identity and incremental sync after one-shot
   import is reliable.

The exact MVP and driver order remain blocked on the primary workflow decision
in `prd.md`.
