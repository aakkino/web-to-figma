# Implementation Plan: LA1 lazy activation preflight

1. Revalidate remote `main`, record its exact SHA, confirm BG2 containment,
   fingerprint the dirty root, and create an isolated LA1 worktree/branch.
2. Inspect S49 only as behavioral evidence. Rebuild activation types, limits,
   traversal, restoration, quiet-window observation, inventory refresh, and
   diagnostics against the current adapter contracts.
3. Integrate activation before image staging while preserving the existing off
   revalidation path, cancellation controller, frozen inventory, and font/
   conversion sequence.
4. Add extension settings normalization, adapter wiring, advanced control,
   phase/view/progress mapping, busy guards, and typography activation-off.
5. Add focused adapter browser tests and extension settings/controller tests.
   Prove scope bounds, restoration, budget termination, cancellation, privacy,
   de-duplication, and no late conversion fetch.
6. Run directed and full-scope validation, then perform Chrome/Firefox and live
   page/element smoke. Record any gated/manual result honestly.
7. Review the exact diff for CP1 overlap, preservation, and scope. Commit one
   LA1 patch identity, open one PR, require checks/review, merge first, refresh
   `origin/main`, and record containment before LA2 planning.

## Validation Commands

```powershell
pnpm --filter @figit/browser-capture-adapter test
pnpm --filter @figit/browser-capture-adapter check-types
pnpm --filter @figit/browser-capture-adapter build
pnpm --filter extension test
pnpm --filter extension check-types
pnpm --filter extension build
pnpm --filter extension build:firefox
pnpm lint
pnpm check-types
pnpm build
pnpm test
git diff --check
```

Run targeted Biome on touched files while iterating. Repository-wide failures
may be classified as pre-existing only after reproducing them outside the LA1
diff.

## Review Gates And Rollback

- Target/preservation gate before branch creation.
- Adapter contract and privacy gate before extension wiring.
- Browser scope/restoration gate before commit.
- Cross-task overlap review before LA1 merge and CP1 rebase.
- Runtime rollback is `lazyActivation: "off"`; delivery rollback is the single
  LA1 PR. Do not weaken restoration or make traversal unbounded to pass smoke.
