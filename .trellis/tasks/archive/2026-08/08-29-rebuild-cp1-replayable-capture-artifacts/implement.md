# Implementation Plan: CP1 replayable capture artifacts

1. Revalidate remote `main`, record its exact SHA, fingerprint the dirty root,
   and create an isolated CP1 worktree/branch from the approved target.
2. Inspect S52 and its archived task only as behavioral evidence. Rebuild V1
   project-owned types, source/diagnostic sanitizer, SHA-256, byte ceilings,
   parser, validator, immutable artifact, and stable errors against current
   controller/settings contracts.
3. Implement clipboard and Blob file sinks, file selection/opening, safe names,
   object URL cleanup, combined all-settled execution, and named retry.
4. Integrate source snapshot, artifact preparation, opening, ready/output views,
   per-sink results, stale-operation guards, and guarded `New capture` into the
   existing workspace/controller seams.
5. Add codec, security/privacy, sink, controller, and browser tests. Prove no
   converter dependency, no duplicate payload, no storage history, no added
   permission, and no recapture on output/retry.
6. While LA1 proceeds independently, track shared-file conflicts without
   importing LA1 uncommitted changes. After LA1 containment, synchronize CP1
   to refreshed `main`, resolve by current contracts, and rerun every gate.
7. Run Chrome/Firefox and HTTP/HTTPS smoke, exact-diff review, preservation
   review, commit one CP1 patch identity, open one PR, merge second, refresh
   `origin/main`, and record containment before CP2 planning.

## Validation Commands

```powershell
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

Run targeted Biome and focused Vitest files while iterating. Inspect built
Chromium and Firefox manifests to prove no `downloads` permission. Classify a
workspace failure as pre-existing only after independent reproduction.

## Review Gates And Rollback

- Schema/checksum/size gate before workspace wiring.
- Privacy and no-converter-import gate before file output.
- User-activation, partial-failure, stale-result, and reset gate before commit.
- LA1 containment/rebase and full-regression gate before CP1 merge.
- Roll back the single CP1 PR if replay/output cannot meet these contracts;
  retain clipboard-only output rather than weakening validation or permissions.
