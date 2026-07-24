# 技术设计

## 设计目标

将一次捕获拆成可观察、可暂停和可取消的阶段，并把上游 DOM 转换器降为一个可替换能力实现。扩展 UI 只理解本项目的 capture contract；`@figit/dom-to-figma` 的输入、缓存和 `ConvertResult` 都终止在 bridge 内。

## 边界

```text
CaptureController / future callers
              |
              | project-owned commands + events
              v
@figit/browser-capture-adapter
  - composed-DOM inventory
  - plan/revalidation
  - stage state machine
  - scheduling, timeout, budget, cancellation
  - project-owned diagnostics/result
              |
              | minimal ConversionBridge
              v
bridges/dom-to-figma
  - maps settings/input/font/image capabilities
  - owns every @figit/dom-to-figma source import
  - converts upstream result to clipboardHtml immediately
              |
              v
@figit/dom-to-figma peer dependency
```

`apps/extension` may list the upstream package to satisfy the adapter peer at assembly time, but extension product modules do not import it. The adapter's contracts, state machine and tests remain loadable with a fake bridge.

## Project-Owned Contracts

The exact TypeScript names may follow repository conventions, but the public model has these roles:

- `CaptureSettings`: layout, motion, line breaks, settle timeout, image decision and font mode. It contains no loader or upstream config object.
- `CaptureTarget`: an element plus project-owned target metadata. DOM references remain session-local and never enter persisted output.
- `CapturePlan`: target identity, image node count, unique image resource count, unsupported CSS count and an internal locked resource map.
- `CaptureCommand`: analyze, start, retry failed images, continue with placeholders, continue after soft budget, switch font mode and cancel.
- `CaptureEvent`: session id, monotonic sequence, phase, progress, decision request, terminal failure/cancel or completed product.
- `PreparedCapture`: exact `clipboardHtml`, effective settings and project-owned diagnostics. It does not extend or expose `ConvertResult`.
- `ConversionBridge`: the narrow capability used by the orchestrator. It prepares image/font resources and converts a target, while keeping concrete prepared tokens opaque to callers.

All public discriminated unions are exhaustive. Errors crossing the boundary use stable project error codes plus safe detail; raw resource URLs and arbitrary upstream exception objects do not enter public diagnostics.

## State Machine

```text
idle
  -> analyzing -> review
  -> revalidating --resource-set-changed--> review
                  --target-lost----------> failed
                  --confirmed------------> preparing-images | preparing-fonts

preparing-images
  -> image-recovery | image-budget-review | preparing-fonts
image-recovery
  -> preparing-images (retry failed) | preparing-fonts (placeholders) | canceled
image-budget-review
  -> preparing-images (soft continue) | preparing-fonts (remaining placeholders) | canceled

preparing-fonts
  -> font-recovery (strict mismatch) | settling
font-recovery
  -> preparing-fonts (retry / compatible) | canceled

settling -> converting -> completed
any non-terminal state -> canceling -> canceled
unexpected failure -> failed
```

Only one command is accepted for the current state and session. Every emitted event carries a monotonically increasing sequence so the UI can reject duplicate or late delivery. Terminal sessions are immutable.

## Analysis And Plan Revalidation

Analysis traverses the target with the same `DomTreeStrategy` used by conversion. It collects actual `HTMLImageElement` instances and reads `currentSrc || src` after browser URL resolution. The plan keeps:

- total referencing nodes;
- exact resolved URL keys for unique scheduling, kept only in memory;
- element-to-resource mapping in a `WeakMap` or equivalent session-local structure;
- separately counted computed `background-image` URL references.

No `fetch`, canvas conversion or background message is allowed in analysis. CSS background parsing uses the platform CSS value/parser facilities available in the repo where practical; it only needs a conservative count and never claims unsupported values are processable.

Immediately before start, the engine performs one rescan. Target connectivity is checked first. The exact unique URL set controls reconfirmation; node reference changes and unsupported counts only update the plan. Once image preparation begins, the plan is frozen. A changed `src/currentSrc` during later conversion resolves through the frozen element mapping, not a newly discovered resource.

## Image Preparation

### Scheduling

The engine owns a bounded work queue with four workers. Each unique resource has a 15-second child deadline derived from the session signal; the whole attempt has a 60-second deadline. A stage timeout aborts all child controllers before an `image-recovery` event is emitted.

The queue records a resource outcome exactly once per attempt:

- `prepared`: an opaque bridge token plus final byte length;
- `failed`: stable code and retry eligibility;
- `placeholder`: user-skipped, failed-and-continued, budget-skipped or unplanned-late.

Retry creates a new attempt deadline over only failed resources. Previously prepared tokens stay in the session cache.

### Memory Budget

The bridge reports the final Figma-ready PNG/JPEG/GIF size, not raw response size or base64 transport overhead. The engine increments the total once per unique prepared resource.

- At or above 64 MiB, it stops assigning new work and enters soft review after already resolving in-flight completions safely.
- If the user continues, remaining work resumes under the existing hard ceiling.
- At or above 128 MiB, it aborts/settles in-flight work as defined by the scheduler and never starts another resource; only placeholder continuation or cancellation remains.

The implementation must avoid a race in which four simultaneous completions all schedule additional work after a threshold. Queue assignment and budget transitions occur through one serialized state update.

### Placeholder Semantics

Placeholder resolution is a converter input decision, not temporary destructive DOM surgery. For a planned image marked placeholder, conversion emits a transparent node using the image element's measured geometry, border, corner radius, opacity and parent stack child properties. Its name is `Image (skipped)` or an equivalent explicit label. The result contains no image blob.

This prevents the current walker behavior, where an image loader exception is caught at node level and the node disappears, from changing Auto Layout sibling order.

## Font Preparation

The adapter owns a structural `FontRequest` (`family`, numeric `weight`, `italic`) and diagnostics. Existing page-font discovery and bundled-font behavior are retained but no longer re-export upstream font types.

- `compatible`: page direct fetch, allowed background transport, bundled fonts and generic fallback in that order; exact/fallback is reported.
- `fast-local`: skips page URLs, background transport and public CDN fallback. Only extension-bundled/local configured metrics are used while the requested family remains in the generated payload.
- `strict`: preflights every unique request and accepts only exact family/weight/italic. Any mismatch enters `font-recovery` before conversion.

Font progress increments per unique request. The bridge adapts the resolved project font record into the upstream `FontLoader` shape. The state machine never relies on a thrown upstream node conversion error to enforce strictness.

## Page Settle And Conversion Order

The ordered path is:

1. lock/revalidate target and resource plan;
2. freeze motion according to settings;
3. prepare or explicitly skip images;
4. prepare fonts;
5. run bounded page/layout settle and two-frame stabilization;
6. prepare CJK line breaks;
7. call the conversion bridge;
8. restore all temporary DOM/motion changes in LIFO `finally` cleanup;
9. emit `PreparedCapture`.

The settle helper must support an image-wait policy so the explicit image stage is not followed by another unexplained image wait. It may still observe layout/browser font readiness within `settleTimeoutMs`. Cleanup runs on success, failure and cancellation.

## Upstream Bridge And Minimal Hook

### Why Existing API Is Insufficient

The current public `ImageLoader` returns raw bytes. Figma format normalization, PNG conversion and SHA-1 happen later inside the converter's private image cache during depth-first walking. Preloading an `ImageLoader` cache therefore removes network latency but does not prove all image processing completed before fonts/conversion, cannot report Figma-ready memory, and cannot supply a structural placeholder. Full semantics require one small public capability unless repository investigation discovers an equivalent public path.

### Proposed Capability Shape

The implementation begins with an API spike and selects the smallest equivalent design. The preferred shape is an optional public image-resolution capability shared by preload and conversion:

- resolve/prepare an `ImageRequest` to either an embedded Figma-ready image record or an explicit placeholder record;
- cache/deduplicate by resolved source while still allowing a frozen element-to-resource mapping;
- accept an optional abort signal for preparation;
- expose final byte length;
- clear its cache through the converter lifecycle.

`FigmaConverterConfig.imageLoader` remains supported. When the new capability is absent, the converter constructs its existing loader/cache path and produces byte-identical output. The public root exports only the types/helper required to build the capability; adapter code never deep-imports converter internals.

The bridge creates one capability instance, calls it during the image stage, and passes the same instance to `createFigmaConverter()`. Conversion then performs cache lookup only. Placeholder records are rendered by the core image converter without registering a blob.

If the API spike finds a way to guarantee all these properties using current root exports, no upstream API is added. If a candidate replacement converter lacks the capability, bridge construction reports an explicit unsupported capability; it does not silently claim staged completion while doing work during DOM traversal.

### Compatibility

- Default `createFigmaConverter()` config and payload snapshots remain unchanged.
- Existing `imageLoader` consumers compile and behave as before.
- New exports receive a minor changeset and root-export/type tests.
- Bridge capability detection is structural; upstream-specific types do not escape it.
- A tarball/isolated consumer test verifies public exports without monorepo deep resolution.

## Extension Resource Transport

Resource transport uses typed request/session identifiers. The background keeps `requestId -> AbortController`, validates HTTP(S), and fetches with `credentials: "omit"`. Completion removes the controller in `finally`.

When the content signal aborts, it sends a cancel message and locally rejects/races the pending response. Because WebExtension messaging may still deliver a late payload, the content side checks both session id and request id before accepting it. `data:` and `blob:` stay on the page side and are never sent to the privileged proxy.

Raw URLs may appear in internal request messages but never in persisted/public diagnostics. Error mapping removes URLs and returns stable categories such as invalid URL, refused scheme, HTTP status, timeout, abort, decode and image-process failure.

## Verification Strategy

- Pure unit tests: state transitions, reconfirmation, scheduler, timeouts, budgets, retries, stale events and fake bridge ordering.
- Browser adapter tests: composed DOM/currentSrc inventory, CSS unsupported count, abortable image preparation, placeholders, font modes, cleanup and exact clipboard envelope.
- Core package tests when hook is needed: unchanged default snapshots, prepared cache reuse, placeholder geometry/stack semantics and public export compatibility.
- Extension transport tests: allowed schemes, credential omission, background abort map cleanup and late-response suppression.
- Package gates: adapter/core tests and builds, extension type/build for Chromium and Firefox, isolated install smoke, `git diff --check`.

## Rollout And Rollback

Land the project contracts and fake state machine first, then the smallest core hook, then the real bridge/transport. No UI consumer switches until the new capture path passes adapter and core behavior tests.

If the upstream hook changes default payloads, stop and revert the hook rather than compensating in the adapter. If cancellation cannot terminate background fetch reliably, keep local stale-result suppression but do not mark the requirement complete until the privileged request is also demonstrably aborted.
