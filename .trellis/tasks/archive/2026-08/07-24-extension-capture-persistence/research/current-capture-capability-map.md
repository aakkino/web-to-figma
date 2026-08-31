# Current Capture Capability Map

## Scope

Local repository inspection for the staged resource pipeline, in-page workspace and `.figit` planning. This records the current implementation boundary; it is not a future design contract.

## Extension Entry Flow

- `apps/extension/entrypoints/popup/app.tsx` is the current primary action UI. It queries the active tab and injects a synchronous custom event for `copy-whole-page` or `start-picker`.
- `apps/extension/shared/triggers.ts` defines that popup-to-content event and documents its dependence on the popup user-activation chain.
- `apps/extension/entrypoints/content/index.tsx` mounts a ShadowRoot UI on all URLs at `document_idle`; it listens for the trigger and immediately starts whole-page copy.
- `apps/extension/entrypoints/content/app.tsx` currently renders only picker state and toasts, not a capture workspace.
- `apps/extension/entrypoints/content/convert.ts` owns a lazy adapter instance and always calls `navigator.clipboard.write` after capture.
- `apps/extension/wxt.config.ts` grants activeTab, clipboardWrite, scripting and storage plus all-url host access. It has no downloads permission.
- `apps/extension/entrypoints/background.ts` only registers privileged image/font fetch handlers. It does not register `action.onClicked`.

## Adapter Boundary

- `internal/browser-capture-adapter/src/types.ts` imports and re-exports `ConvertInput`, `ConvertResult`, converter config, font loader and font request types from `@figit/dom-to-figma`.
- `CaptureResult` currently extends upstream `ConvertResult`, so clipboard helpers and upstream document/bytes/base64 cross the adapter boundary.
- `internal/browser-capture-adapter/src/capture-adapter.ts` directly constructs `createFigmaConverter`, accepts an upstream converter and returns the upstream result plus diagnostics.
- Current capture order is motion freeze -> page settle -> font preflight -> CJK line preparation -> conversion -> cleanup.
- The adapter has no analyze/start split, progress event, decision token, per-session id or cancellation signal.

## Images

- `internal/browser-capture-adapter/src/page-stability.ts` collects DOM images only to await load/error within the overall settle deadline. Counts are returned only in final settle diagnostics.
- `packages/dom-to-figma/src/converter/image-cache.ts` deduplicates by `currentSrc || src` and calls the configured image loader, then the private `processImageFile` path.
- `packages/dom-to-figma/src/converter/nodes/image/loader.ts` fetches raw bytes, converts unsupported formats to PNG and computes the SHA-1 used by the Figma blob.
- `packages/dom-to-figma/src/converter/walk.ts` awaits each sibling during depth-first traversal. Image preparation is therefore interleaved with all other node conversion and is effectively sequential along the walk.
- A node conversion exception is caught by the walker and emits zero nodes. An image fetch/process failure currently removes the image node rather than retaining a placeholder.
- The root public API accepts `imageLoader`, but final PNG/hash processing and cache storage remain private. Caching raw loader results outside the package cannot prove Figma-ready preparation or avoid repeated format processing.
- `apps/extension/shared/loaders.ts` tries direct page fetch and then sends `fetchImage` to background. Neither path accepts AbortSignal.
- `apps/extension/entrypoints/background.ts` restricts proxy fetch to HTTP(S), uses `credentials: "omit"`, and returns base64. It does not track/cancel requests.
- Frame background conversion parses gradients only. CSS URL backgrounds are not embedded by the current image path.

## Fonts And Other Existing Options

- The adapter already supports `motion: freeze | live`, `lineBreaks: auto | off`, `settleTimeoutMs`, a composed DOM traversal and `fontFailure: fallback | strict`.
- The extension currently constructs only one fixed adapter configuration and does not pass user settings.
- Font resolver diagnostics distinguish exact/fallback/failed and retain family/weight/italic requests, but no real-time progress is emitted.
- Strict mode preflights before conversion because the upstream walker catches node errors. This is the correct precedent for preventing silent text loss.
- The proposed `fast-local` mode is new: current fallback behavior can still consult page sources/transport and a generic fallback loader.

## Output And Persistence

- `ConvertResult` already exposes `toClipboardHtml()`, so one conversion can produce the exact replay payload without serializing upstream document types.
- Current content code immediately writes a `ClipboardItem`; it does not retain ready state or support per-sink retry.
- Theme is the only persisted extension preference. There is no capture settings record, tab-session persistence, result history, file codec or download path.
- The current Figma HTML envelope contains private `NODE_CHANGES` payload data. It is replayable as clipboard HTML but is not a complete `.fig` file and is not a Plugin API import format.

## Planning Consequences

1. The product needs a project-owned capture state machine and result type before UI or file work starts.
2. Full image staging cannot be claimed from a raw-byte loader cache alone. The core package needs a narrow optional prepared-image/placeholder capability unless an equivalent root-level API is discovered during the implementation spike.
3. Background cancellation needs request/session identifiers, an AbortController registry and content-side stale response suppression.
4. The extension action must replace the popup route because a configured popup suppresses the toolbar click event used to open the in-page workspace.
5. `.figit` should persist only exact clipboard HTML plus project-owned metadata/diagnostics; this removes the artifact schema from upstream API churn.
