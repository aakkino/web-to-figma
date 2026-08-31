# 原版上游适配器降级实施计划

## Dependencies

- Blocking: `07-25-upstream-core-delta-governance` must define the stable version and CI matrix first.

## Step 1: Lock The Contract

- [x] Capture native staged behavior for success, placeholder, failure, abort, and cache clearing.
- [x] Verify the exact loader and converter APIs available in the pinned stable upstream package.
- [x] Define canonical image request identity and stale-generation behavior.

## Step 2: Introduce Strategy Selection

- [x] Replace the unconditional staged capability assertion with one-time strategy selection.
- [x] Keep the existing native strategy behavior unchanged.
- [x] Preserve the public `ConversionBridge` and `ImagePreparationPort` contracts.

## Step 3: Implement Adapter-Owned Staging

- [x] Add the preparation cache and converter-facing loader wrapper inside the adapter.
- [x] Implement placeholder, no-late-load fallback, abort propagation, generation-safe clearing, and deterministic cleanup.
- [x] Ensure product diagnostics remain owned by the capture adapter rather than the core.

## Step 4: Test Real Package Compatibility

- [x] Extend bridge unit tests to cover both capability strategies.
- [x] Keep `import-boundary.test.ts` passing.
- [x] Build a temporary or CI-only consumer against the pinned vanilla stable package.
- [x] Run image scheduler, capture adapter, extension integration, and oracle parity tests.
- [x] Exercise the resolved `upstream/main` snapshot under the parent matrix policy.

## Step 5: Document Support

- [x] Document minimum base APIs, supported version range, chosen strategy diagnostics, and fallback limitations.
- [x] Confirm the implementation leaves `packages/dom-to-figma/src` and its delta registry unchanged.

## Verification

- `pnpm test`: passed across all workspace projects.
- `pnpm check-types`: passed.
- `pnpm build`: passed.
- `pnpm upstream-adapter:stable`: typechecked and executed a temporary consumer against registry-pinned `@figit/dom-to-figma@0.2.1`.
- `pnpm upstream-core-delta:check`: 15 registered runtime paths, zero unmapped paths.
- `pnpm oracle:parity`: passed 46 scenes.

## Exit Condition

The shipping adapter behaves identically with the fork core and can complete its supported capture path with the pinned vanilla upstream package without relying on `createImagePreparation`. Only then may the image task retire the core staging API.
