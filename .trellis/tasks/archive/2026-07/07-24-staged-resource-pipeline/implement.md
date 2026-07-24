# 实施计划

## 0. Contract Baseline And API Spike

- [x] Record the current adapter/core image timing with a fixture containing repeated, slow and failing images; assert current conversion output as a baseline.
- [x] Introduce project-owned capture settings, plan, command/event, diagnostics, error and `PreparedCapture` types without importing or re-exporting `@figit/dom-to-figma`.
- [x] Define a minimal `ConversionBridge` and fake implementation; make state-machine tests load without the upstream package.
- [x] Spike current root-level image APIs against the three required guarantees: full preprocessing before conversion, exact cache reuse, and structural placeholder emission.
- [x] Review gate: if all guarantees are possible without an upstream change, document the public path and skip section 3's hook; otherwise approve only the narrow optional capability from `design.md`.

## 1. Inventory And Plan State Machine

- [x] Implement no-network composed-DOM image inventory for `<img>` using `currentSrc || src`, with node/unique counts and element-to-resource mapping.
- [x] Add conservative CSS `background-image: url(...)` detection as an unsupported count, without adding it to scheduling totals.
- [x] Implement target connectivity and one-shot pre-start revalidation for resource-set, reference-count and unsupported-count changes.
- [x] Lock the plan at image-stage start and make later DOM/resource changes resolve as unplanned placeholders rather than expanding totals.
- [x] Add reducer/state-machine coverage for all legal commands, invalid commands, session replacement, monotonic events and terminal immutability.

## 2. Image Scheduler, Recovery And Budgets

- [x] Implement a four-worker unique-resource queue with session signal, 15-second item deadlines and a 60-second attempt deadline.
- [x] Emit true progress with completed/total, failures, elapsed and prepared byte count; keep URL details private.
- [x] Implement per-resource outcomes and retry only the failed set while retaining successful prepared tokens.
- [x] Implement all-success auto-advance and failure review actions: retry failed, placeholders, cancel.
- [x] Implement 64 MiB soft review and 128 MiB hard stop with serialized assignment/budget transitions.
- [x] Implement explicit user-skipped, failed, budget-skipped and unplanned-late placeholder reasons.
- [x] Verify skipped mode performs zero image-loader calls and prepared images are never fetched or processed again during conversion.

## 3. Minimal Upstream Image Capability (Conditional)

- [x] Add the smallest root-exported, optional image preparation/resolution capability required by the API spike; do not add extension policies to the public package.
- [x] Preserve `imageLoader` and default converter behavior when the capability is omitted.
- [x] Render explicit placeholder resolutions as transparent image-shaped nodes with preserved geometry, style and parent Auto Layout properties, without blobs.
- [x] Add optional abort support at the preparation boundary and cleanup for object URLs/canvas work where applicable.
- [x] Add tests for byte-identical default output, one preparation per unique source, conversion cache reuse, placeholder geometry/name/order and cache clear.
- [x] Add a minor changeset and validate root exports from an isolated package consumer; prohibit deep imports in adapter code.

## 4. Dom-To-Figma Bridge Decoupling

- [x] Move every adapter upstream import/re-export into the dedicated bridge boundary; replace upstream font/converter public types with project-owned structural types.
- [x] Build the real bridge that maps layout, traversal, classify exclusion, fonts and prepared images into the upstream converter.
- [x] Convert the upstream result to exact `clipboardHtml` inside the bridge and return only `PreparedCapture`.
- [x] Add structural capability detection and explicit unsupported/degraded diagnostics for replacement/older engines missing full prepared-image reuse.
- [x] Remove direct upstream imports from extension product modules; retain dependency declaration only where needed to satisfy the peer at assembly time.
- [x] Add an import-boundary test/lint assertion covering adapter public modules and extension source.

## 5. Font Modes And Ordered Capture

- [x] Refactor font requests/resolution to project-owned types while preserving existing page, transport, bundled and fallback behavior.
- [x] Implement compatible mode and exact/fallback progress diagnostics.
- [x] Implement fast-local mode with no page URL, background or public CDN font request.
- [x] Implement strict preflight and recovery commands for retry, compatible switch and cancel before DOM conversion.
- [x] Reorder capture to image preparation -> font preparation -> bounded settle -> CJK preparation -> conversion -> cleanup.
- [x] Adjust settle behavior so an explicit image stage is not followed by a second opaque image wait.
- [x] Verify all cleanup runs on success, failure and cancellation and that font failures cannot silently drop text.

## 6. Abortable Extension Transport

- [x] Extend the typed resource protocol with session/request ids and cancellation while preserving HTTP(S)-only, credential-omitting behavior.
- [x] Track background `AbortController` instances and remove them in `finally`; make cancel idempotent.
- [x] Pass the content/session signal through direct page fetch and privileged transport; locally reject and suppress late responses.
- [x] Map transport errors to stable safe codes without persisting raw URLs.
- [x] Test invalid/refused URL, HTTP error, timeout, explicit cancel, duplicate cancel, worker completion and stale response paths.

## 7. Validation And Handoff

- [x] Run adapter pure and browser tests, core tests/build, extension types/builds and isolated public-package smoke.
- [x] Inspect default clipboard payload parity for non-staged existing callers and staged captures with repeated images.
- [x] Run Chromium manual smoke on data/blob/http(s), repeated, slow and failed images; run Firefox smoke for messaging cancellation.
- [x] Document the stable capture contract/events for the workspace and artifact child tasks.
- [x] Update relevant Trellis specs only for behavior proven by implementation/tests.

## Validation Commands

```powershell
pnpm --filter @figit/browser-capture-adapter check-types
pnpm --filter @figit/browser-capture-adapter test
pnpm --filter @figit/browser-capture-adapter build
pnpm --filter @figit/dom-to-figma check-types
pnpm --filter @figit/dom-to-figma test
pnpm --filter @figit/dom-to-figma build
pnpm --filter extension check-types
pnpm --filter extension build
pnpm --filter extension build:firefox
pnpm check-types
pnpm test
git diff --check
```

If the existing full-repository Biome scan still reports unrelated historical/generated-file findings, run and record targeted Biome checks over every changed source/test file; do not format unrelated user work.

## Review Gates

1. Contract gate: public adapter types and fake state machine are upstream-independent.
2. API gate: upstream change is demonstrably necessary and no broader than full preparation/cache/placeholder semantics.
3. Behavior gate: image stage order, retry, cancellation and budgets pass deterministic tests.
4. Compatibility gate: default upstream payload/API remain compatible and isolated install succeeds.
5. Handoff gate: downstream UI/artifact contracts are documented and contain no upstream types.

## Rollback Points

- If plan locking produces mismatched element mapping, roll back the staged consumer switch while keeping pure inventory tests.
- If the optional upstream hook alters default conversion, revert that hook and return to the API gate; do not hide the change behind adapter conditionals.
- If background cancellation is browser-specific, keep session-gated stale-result rejection but do not ship the feature until Chromium and Firefox privileged requests are both bounded.
- If memory accounting cannot observe final encoded image bytes, fail the capability gate instead of estimating from response headers/raw bytes.
