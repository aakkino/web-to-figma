# Implementation Plan: Rebuild FD1 font diagnostics

1. Reconfirm `main` resolves to
   `dd91f18346d7326ab71c1a77769bfe7aed310af3`; stop on drift.
2. Snapshot root branch/HEAD, index and staged state, tracked dirty hashes, and
   all worktree occupancies.
3. Create an isolated FD1 branch/worktree from the approved target SHA.
4. Reinspect the target's font-recovery view, diagnostic type, UI conventions,
   and Vitest configuration before editing.
5. Implement a presentation-only diagnostics component and pure summary/safety
   helpers against current contracts.
6. Integrate the component in `FontRecoveryView` without changing command order
   or controller behavior.
7. Add focused tests for mixed statuses, missing optional metadata, compact
   exact-only output, command preservation, and privacy filtering.
8. Register the test only if required by the target's explicit Vitest list.
9. Review the diff against the four-file FD1 boundary and reject any package,
   lockfile, adapter, converter, storage, messaging, or release changes.
10. Run validation, commit/review FD1 as one rollback unit, and compare the
    preservation snapshot before touching the parent governance task.

## Validation Commands

```powershell
pnpm exec biome check apps/extension/entrypoints/content/app.tsx apps/extension/entrypoints/content/font-recovery-diagnostics.tsx apps/extension/entrypoints/content/font-recovery-diagnostics.test.tsx apps/extension/vitest.config.ts
pnpm --filter extension test
pnpm --filter extension check-types
pnpm --filter extension build
pnpm --filter extension build:firefox
git diff --check
```

## Stop Conditions

- `main` no longer matches the approved SHA.
- The current diagnostic contract cannot support the approved UI without an
  adapter/controller change.
- Privacy-safe rendering requires exposing raw source data.
- The diff exceeds the approved FD1 file/layer boundary.
- Required validation fails or unrelated root state changes.
