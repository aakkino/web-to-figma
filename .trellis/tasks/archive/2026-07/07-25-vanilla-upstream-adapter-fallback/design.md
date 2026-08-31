# 原版上游适配器降级设计

## Current Constraint

The bridge currently converts its image loader to the core type, calls `assertStagedImageCapability(domToFigma)`, constructs core-owned image preparation, and passes it back into `createFigmaConverter`. This centralizes the dependency correctly but makes a fork-only export mandatory.

## Capability Negotiation

Resolve capabilities once when constructing the bridge:

```text
createImagePreparation is callable
  -> native-staged strategy
otherwise
  -> adapter-staged strategy
```

The selected strategy must implement one adapter-owned internal contract: an `ImagePreparationPort` for the scheduler plus an `imageLoader` for the converter. The rest of the capture engine does not know which strategy is active.

## Native Strategy

Retain the existing path when the core exposes a structurally compatible factory. Wrap the returned object behind adapter types and preserve current cancellation and cache clearing behavior. This path protects fork parity while upstream work proceeds.

## Adapter Strategy

Move staging state to the adapter:

1. `prepare` calls the project-owned loader and stores the resolved resource by a canonical request key.
2. `setPlaceholder` stores a typed placeholder decision for the same key.
3. The converter-facing loader consumes prepared bytes or performs the defined direct-load fallback.
4. Placeholder mapping uses only upstream-supported hooks and output semantics; it must be proven by contract tests before implementation is accepted.
5. `clear` and bridge `clearCache` clear both adapter and converter caches.
6. Abort signals stop pending work and cannot publish a late result into a cleared generation.

Use generation tokens or an equivalent mechanism to prevent stale async preparations from repopulating the cache after `clear`.

## Type Boundary

Runtime capability checks operate on a narrow local structural type. Avoid importing optional fork-only types in modules outside the bridge. The stable-upstream matrix must compile or bundle a small consumer against the actual released package so workspace type declarations cannot hide incompatibility.

## Test Matrix

| Strategy | Source | Required cases |
| --- | --- | --- |
| Native staged | fork workspace | current parity and scheduling behavior |
| Adapter staged | vanilla stable package | load, placeholder, abort, clear, conversion |
| Missing required base API | structural fixture | stable actionable error |

Add a factory-injection seam only if needed to test both strategies without module mocking. Keep it private to the bridge package and avoid a new product-facing abstraction.

## Compatibility Limits

The adapter can compensate for optional preparation APIs, not arbitrary converter output changes. Minimum supported upstream versions must still expose the base converter, loader hooks, classifier hook, and result serialization used by the bridge. Those requirements belong in peer ranges and the compatibility report.
