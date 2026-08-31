# Design: BG2 lazy background source rebuild

## Baseline And Evidence Boundary

Planning is pinned to `origin/main@98c10d5f`, which contains the reviewed BG1
head `92c8452f`. S46/S47 and the archived July task describe desired behavior,
but their code shape is not authoritative. Execution must refresh the target
and reconstruct the patch against the actual files on that target.

```text
historical S46/S47 evidence
          |
          v
explicit data-bgset parser (adapter-owned)
          |
          v
BG1 resource inventory -> existing scheduler -> prepared-only loader
          |                                      |
          +-- owner -> canonical source ---------+
                                                 v
                                  capture-local bridge context
                                                 |
                                                 v
                         generic core background resolver
                                                 |
                                                 v
                       existing BG1 snapshot/paint/raster path
```

## Ownership And Contracts

### Adapter

`internal/browser-capture-adapter` owns the explicit attribute allowlist,
candidate parsing, canonicalization, inventory usage, scheduler participation,
capture-local owner/source map, diagnostics, and cleanup.

The parser is pure. It receives the raw value, base URL, rendered width, and
device pixel ratio; it returns one canonical allowed source or a typed absence.
It does not execute site code or perform I/O.

Inventory adds a read-only `backgroundSources` map keyed by live owner Element.
When computed BG1 analysis already found an image layer, lazy metadata remains
inactive and is not added as a second layer. Otherwise its usage is registered
with `kind: "background-image"` and flows through the existing deduplicated
scheduler.

### Bridge

The conversion bridge accepts an optional capture-local context:

```ts
type ConversionContext = {
  backgroundSources?: ReadonlyMap<Element, string>;
};
```

The bridge closes a generic resolver over the active context, returns a safely
escaped `url("...")` expression for the owning element, and clears the active
map in `finally` and on cache reset. The context is neither serialized nor
stored in the extension.

### Core

The published converter may add:

```ts
type BackgroundImageResolver = (element: Element) => string | null;

type FigmaConverterConfig = {
  backgroundImageResolver?: BackgroundImageResolver;
};
```

The background snapshot uses the resolver only when computed
`background-image` is empty or `none`. Existing computed CSS always wins. The
resolved expression enters the existing BG1 parser, native IMAGE paint path,
raster fallback, prepared-only image loader, diagnostics, and cancellation
flow. Core never parses `data-bgset`.

Because this is a public optional config seam in a published package, execution
must include a changeset, type/export review, compatibility checks, and a
governed delta fingerprint refresh if the refreshed target still needs it.

### Extension

The extension remains a consumer of the adapter API. Expected product-source
scope is zero; an eyeondesign-shaped test fixture may be updated to prove the
captured plan/result. Any required permission, message, storage, UI, or capture
lifecycle change is unexpected scope expansion and returns the task to Plan.

## Data And Failure Flow

1. Walk the same composed DOM used by BG1 and inspect only `data-bgset`.
2. Parse and canonicalize without fetch or mutation.
3. If computed CSS has no image layer, register one background usage and its
   owner/source mapping.
4. Prepare the canonical source through the existing scheduler before fonts
   and conversion; URL deduplication is shared across resource kinds.
5. Pass the map to the bridge for this conversion only.
6. Resolve the frozen CSS expression in core and use the existing BG1 paint
   pipeline.
7. On success, failure, abort, or reset, clear map, prepared resources, and core
   cache according to their existing ownership boundaries.

Invalid metadata does not stage. Preparation failure follows the current
placeholder/failed diagnostic contract. Missing core support preserves
ordinary images and reports an explicit unsupported capability rather than
fetching late or silently omitting an unblocked planned background.

## Compatibility And Preservation

- Direct core consumers that omit the resolver retain BG1 computed-style
  behavior exactly.
- Stable supported cores without the new resolver remain structurally usable
  for ordinary images; BG2 plans receive explicit unsupported results.
- BG1 capability advertising remains authoritative unless execution proves a
  separate BG2 capability bit is required. Do not add a bit only to mirror the
  historical patch.
- The dirty sync root and every unrelated worktree are read-only evidence. Use
  a new isolated worktree from refreshed `origin/main` for implementation.
- No old commit, archive, manifest, lockfile, or release state is transplanted.

## Remote Promotion And Completion

Local review and remote promotion remain distinct states within this task:

```text
reviewed local BG2 head
  -> refresh remote base and verify exact delta
  -> explicit push authorization
  -> push immutable source branch head
  -> explicit PR authorization
  -> PR to main with required CI/review
  -> explicit merge authorization
  -> merge commit
  -> refresh origin/main and prove containment
  -> reconcile execution and top-level governance parents
```

The task owns every state transition and is not complete at the local commit.
Remote identity checks must prove that the pushed head equals the reviewed
local head and that the PR payload contains no unrelated root/worktree state.
Target drift, failing CI, unresolved review, merge conflict, or payload mismatch
stops promotion and returns to the owning review/planning gate.

Use the repository's established merge-commit method so the reviewed BG2 head
and GitHub merge identity remain separately auditable. Direct `main` push,
force-push, auto-merge, protection bypass, and silent history rewrite are
forbidden.

## Rollback

The complete delivery is one BG2 branch/PR and one merge rollback boundary.
Before promotion, discard or revert the isolated branch without touching BG1
or `main`. After merge, rollback by reverting the BG2 merge commit; never
rewrite `main`. Preserve the source branch until refreshed target containment
and both parent reconciliations are complete.
