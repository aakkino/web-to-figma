# Compatibility Fork Assessment

## Conclusion

This repository is a soft fork. The target is not to make every change ready
for upstream submission; it is to keep local behavior isolated enough that
regular upstream syncs have a small, explainable conflict surface.

The adapter can own discovery, lazy-source policy, scheduling, budgets,
prepared bytes, and diagnostics. The core must still participate in frame
conversion because only the core owns Figma node changes, blob registration,
paint ordering, and the final clipboard payload.

The fix should therefore be a complete local capability, organized as small
atomic commits and registered as a precise fork delta. An old vanilla core can
remain compatible for ordinary `<img>` conversion, but it cannot claim full CSS
background support unless it exposes the new capability. Missing capability
must be explicit; it must never silently drop a background.

## Spec Constraints

The assessment follows these project contracts:

- `dom-to-figma/frontend/upstream-compatibility.md`: register exact runtime
  paths, tests, fingerprints, owners, review dates, and `removeWhen`; use
  structural capability negotiation; keep the runtime delta within budget.
- `dom-to-figma/frontend/staged-resource-pipeline.md`: adapter owns staging,
  frozen source mapping, budgets, placeholders, and diagnostics; core receives
  prepared-only image loading and must not initiate an unplanned request.
- `dom-to-figma/frontend/architecture.md`: the published core boundary is
  `src/figma.ts`; DOM traversal and adapter policy must not leak into leaf
  converters or Kiwi encoding.
- `dom-to-figma/frontend/converter-guidelines.md`: frame/style converters own
  paint translation, blobs are registered through `registerBlob`, and source
  paint order is preserved.
- `dom-to-figma/frontend/type-safety.md` and `testing-guidelines.md`: public
  unions and exports require focused tests, browser coverage, and release
  compatibility checks.

## Compatibility Evidence

Checks were run against the reviewed refs from `docs/upstream-core-delta.json`:

| Target | Result | Evidence |
| --- | --- | --- |
| governance `fork-base/ac830db` | passed | 14 governed runtime files, 7 absorbed upstream files, 0 unmapped runtime paths |
| stable `@figit/dom-to-figma@0.2.1` | adapter consumer passed | `pnpm upstream-adapter:stable` |
| `upstream/main` at `cc8d4864e6be53d0d5047fbf97283b112b3117f4` | delta report passed | 14 runtime files, 0 unmapped runtime paths |
| `upstream/main` adapter consumer | passed after excluding one non-runtime symlink | temporary checkout built and packed the core, then the adapter consumer passed |

The repository script `pnpm upstream-adapter:main` currently fails before
build on Windows because upstream contains the symlink
`.claude/skills/opensrc -> ../../.agents/skills/opensrc`, which the bundled
`tar` cannot create. This is a test harness portability issue, not an API
compatibility failure. The correction task therefore includes a small,
isolated test-harness commit to make extraction Windows-safe before relying on
that command; the temporary sanitized checkout remains evidence of the
underlying API compatibility.

The current `upstream/main` report has 14 runtime files against a limit of 15.
There is only one runtime-file slot left in the governed core delta. Modifying
an `absorbedUpstreamPaths` file also requires moving it back under a registered
capability with a new fingerprint.

## Boundary Analysis

```text
computed DOM styles
  -> adapter inventory and source identity
  -> image/background staging and budget decisions
  -> bridge capability negotiation
  -> core frame conversion and blob registration
  -> Figma Paints and Kiwi clipboard payload
```

The current incompatibilities are structural:

- `resource-inventory.ts` only emits `HTMLImageElement` resources. CSS raster
  URLs are counted as unsupported diagnostics.
- `image-scheduler.ts` requires an `HTMLImageElement` for every resource, while
  a CSS background layer has no image element owner.
- `ImageRequest` and `ImageCache` are keyed by `HTMLImageElement` and source.
- `elementToFrameNodeChange()` is synchronous even though the image node path
  is asynchronous. A background URL cannot be fetched or processed during that
  synchronous frame fill step without either pre-staged synchronous data or a
  core conversion contract change.
- The existing `FigmaPaint` union already has IMAGE, gradient, opacity,
  transform, tile scale mode, and blend-mode fields. The main missing pieces
  are background-layer parsing, source identity, geometry, and async/prepared
  image integration, not a new Kiwi wire type.

## Fork Options

| Option | Compatibility | Assessment |
| --- | --- | --- |
| Adapter-only discovery plus existing core | Preserves old core | Cannot emit a frame background paint because the old frame converter never asks the adapter for one. It can only keep the current unsupported diagnostic or rewrite the DOM, which is outside scope and fragile. |
| Full repository fork | Low maintenance compatibility | Duplicates extension, adapter, and core ownership, conflicts with the upstream governance model, and makes the 15-file runtime budget difficult to audit. Reject. |
| Upstream-ready core capability plus adapter integration | Best fit | Keeps generic CSS-to-Figma parity in a reviewable core change, leaves scheduling and product policy in the adapter, preserves old core behavior for existing callers, and can be landed as a small upstream PR stack. Recommend. |

## Soft Fork Landing Strategy

Land the task as separate local commits, even though it is one end-to-end
feature. The separation is for future upstream synchronization and conflict
recovery, not for upstream submission:

### Commit A: core background capability

Keep generic CSS-to-Figma behavior inside `packages/dom-to-figma`, without
imports from the adapter or extension. Isolate new parsing and geometry in a
dedicated background domain module where possible, and minimize edits to
high-churn files such as `frame/converter.ts`, `styles/gradient.ts`,
`types/paint.ts`, and `figma.ts`.

Reuse existing Figma Paint fields and blob/image loader contracts whenever
possible. The core may contain the complete local background behavior; it does
not need to be upstream-ready, but its boundaries should be generic so an
upstream sync does not entangle capture policy with conversion logic.

### Commit B: fork-owned staged resource integration

This commit belongs in this fork because it implements capture policy rather
than DOM-to-Figma semantics:

- inventory CSS background URLs and deterministic lazy candidates;
- assign source identities and stage them before conversion;
- reuse the adapter's prepared-only loader, budgets, cancellation, frozen
  source mapping, revalidation, and placeholder diagnostics;
- negotiate the core capability structurally so stable vanilla cores keep
  ordinary image compatibility.

The adapter may use a small transport-level URL extractor, but it must not
reimplement Figma paint geometry. The core remains the owner of layer ordering
and paint construction.

### Commit C: fork-only fidelity fallback

Browser static rasterization for dynamic CSS Paint, attachment behavior, and
background compositions that cannot be represented by the Figma Paint model
should remain behind a generic optional hook or adapter capability. It must not
make the core depend on the capture engine, site scripts, or eyeondesign-
specific behavior.

This commit records viewport/state-bound fallback diagnostics and preserves the
visual result in this fork. During an upstream sync, it should be rebased or
merged independently from upstream's core parity changes.

### Commit D: local governance and regression evidence

Keep the Trellis research/design/implementation artifacts, upstream delta
registry entry, stable/main compatibility reports, and eyeondesign regression
in the fork-side changes. These are synchronization evidence, not upstream
submission requirements.

## Sync Procedure

For each upstream refresh:

1. Fetch the reviewed upstream ref and update the registry target commit.
2. Record the pre-sync fork delta with `pnpm upstream-core-delta:main`.
3. Merge or rebase upstream into the soft-fork integration branch while the
   local A/B/C commits remain identifiable.
4. Resolve conflicts by preserving the local capability boundary and adopting
   upstream changes outside that boundary; do not resolve by refreshing
   fingerprints blindly.
5. Run the governance, stable consumer, upstream-main consumer, package, and
   oracle checks. Add a new compatibility note when an upstream change only
   partially overlaps the background capability.

The goal is a repeatable sync procedure with bounded conflict resolution, not a
zero-delta fork.

## What Must Not Cross The Upstream Boundary

- adapter-owned budgets, placeholder reasons, scheduler state, or lazy-source
  allowlists in `FigmaConverterConfig`;
- execution of unknown page scripts, scroll simulation, or DOM rewriting;
- imports from `internal/browser-capture-adapter` into the published core;
- eyeondesign selectors or `data-*` names in core CSS parsing;
- a fork-only `imagePreparation` API reintroduced into the public core;
- a blanket rasterization of every background that would discard native Paint
  editability and make upstream parity harder to review.

## Recommended Compatibility Contract

The implementation design should use a structural optional capability rather
than a package-version branch:

1. The local core parses generic CSS background semantics and uses the existing
   image loader/blob boundary for expressible layers.
2. The adapter discovers CSS background and lazy candidates, stages all
   prepared bytes before conversion, and retains source/resource diagnostics.
3. Any new core hook describes prepared sources and rendered geometry, not
   adapter budgets, placeholder reasons, or scheduler state.
4. The bridge checks the capability before conversion. A core without it keeps
   existing `<img>` behavior and returns an explicit `unsupported-capability`
   result for CSS background support; it must not silently emit an empty fill.
5. Native IMAGE/gradient paints are used only when their layer semantics are
   expressible. Blend/attachment/dynamic paint cases use the fork's browser
   static fallback and a fallback diagnostic.

The exact hook shape belongs in `design.md`; it should not reintroduce the
retired fork-only `imagePreparation` field into `FigmaConverterConfig`.

## Risks And Gates

- The current core runtime delta has one file of headroom. Prefer reusing
  existing governed conversion paths and at most one new core runtime file;
  otherwise obtain an explicit registry/budget decision before implementation.
- If `gradient.ts` or `paint.ts` is changed, review the `absorbedUpstreamPaths`
  rule and register the local adaptation rather than refreshing fingerprints
  blindly.
- Core conversion must retain staged-before-convert ordering, cancellation,
  placeholder, deduplication, and revalidation behavior.
- Static raster fallback is viewport/state-specific and cannot preserve
  runtime scroll behavior or dynamic CSS paint editability. Diagnostics must
  state that limitation.
- Compatibility verification must include stable core, reviewed upstream main,
  a clean external consumer, core browser fixtures, adapter resource tests, and
  the eyeondesign regression.

## Decision

Proceed as a soft-fork local capability with low-drift boundaries: core
background conversion, adapter staging/lazy policy, and browser raster
fallback remain separate atomic commits and precise registry capabilities.
Before implementation, capture the sync boundaries, capability shape, old-core
behavior, and runtime-delta budget in `design.md` and `implement.md`.
