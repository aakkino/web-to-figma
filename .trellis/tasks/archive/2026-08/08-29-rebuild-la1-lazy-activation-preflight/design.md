# Design: LA1 lazy activation preflight

## Boundary And Flow

```text
analyze target -> review -> explicit Start
  -> auto: snapshot scroll contexts
           bounded activation + re-inventory
           restore + settle + final inventory
  -> off: current revalidation
  -> existing image stage -> fonts -> settle -> conversion -> output
```

The adapter owns traversal, budgets, inventory refresh, restoration, progress,
and diagnostics. The extension owns the persisted mode, advanced control,
phase-to-view mapping, and engine construction. The converter remains unaware
of scrolling or site activation behavior.

## Contracts

- Add an optional adapter option and effective setting with mode `auto | off`.
  Normalize absence to `auto` at the adapter/extension boundaries.
- Add `activating` to the closed capture phase union and a bounded progress
  object containing pass, step, container count, and elapsed time.
- Add privacy-safe activation diagnostics to prepared capture diagnostics.
  Additive optional public fields are preferred where existing fixtures and
  consumers would otherwise break.
- Activation accepts the analyzed target, inventory, composed traversal,
  exclusion predicate, signal, and fixed policy limits. It returns a final
  inventory plus diagnostics; it never prepares bytes itself.

## Traversal And Stability

- Page scope covers the document and in-scope scrollable containers. Element
  scope covers necessary ancestors and the selected subtree only.
- Each touched context records its original position and restores in reverse
  order from `finally`.
- Each position waits two animation frames and a bounded mutation quiet window,
  then compares a fresh inventory. Stop on stability or explicit budget.
- Default safety envelope: 10-second total deadline, two passes, 32 containers,
  and 64 scroll steps. Constants are implementation-owned, not user settings.
- After restoration, settle and inventory once more. Continued variation is
  reported as incomplete rather than retried without bound.

## Parallel Delivery Boundary

LA1 and CP1 use separate worktrees and commits. Shared extension files may be
edited independently, but no uncommitted content is shared. LA1 merges first.
CP1 then synchronizes the contained LA1 `main` and reruns all extension gates.

## Compatibility And Rollback

- `off` preserves current behavior and is the immediate runtime rollback.
- The PR is the code rollback unit. No core registry or changeset is expected
  because the adapter and extension packages are private.
- Any required `packages/dom-to-figma`, permission, messaging, or release
  expansion stops implementation and returns to planning.
