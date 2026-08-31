# Reconcile CP2 capture persistence integration

## Goal

Complete the remaining CP2-facing integration detail on top of contained CP1
so the combined output command uses the approved product label while current
artifact, persistence, privacy, reset, and output contracts remain unchanged.

## Background

- The planning target is
  `origin/main@0a311e1078c57af9cbf30a58d41c6f5fa6cbf4d8`, refreshed on
  2026-08-29 after CP1 merged through PR #18.
- Historical S55 commit `2361077a2ab5c7aa004007d597e20ba5a9ea2314`
  changes only the combined output label from `Copy and save` to
  `Copy & Save`. Historical S56 commit
  `e281719bb1aba2e9f626fbdfd492748f6618bf8c` records integration docs.
- Neither historical commit is an ancestor of current `main`. CP1 independently
  rebuilt the substantive `.figit`, output, retry, reset, privacy, and storage
  contracts, and current documentation already describes those behaviors.
- Current `origin/main` still renders `Copy and save` for the combined output
  command, leaving one confirmed presentation delta.

## Requirements

- Do not cherry-pick, replay, or transplant historical S55/S56.
- Change only the combined clipboard+file command label to `Copy & Save`.
- Preserve clipboard-only `Copy to Figma`, file-only `Save .figit`, sink
  selection, artifact immutability, partial success, retry, discard, and reset
  behavior.
- Do not add payload/history/source metadata to extension storage, introduce a
  downloads permission, change `.figit` V1, or reopen CP1 controller state.
- Reconcile README/spec wording only where the current contract is actually
  stale; do not copy historical docs wholesale or overwrite dirty root Trellis
  guidance.
- Deliver any code change as one isolated CP2 commit/PR based on a freshly
  pinned `main`, with the dirty sync root untouched.

## Acceptance Criteria

- [ ] The combined output command renders exactly `Copy & Save`.
- [ ] Clipboard-only and file-only labels remain unchanged.
- [ ] Existing output/controller tests pass without behavior changes.
- [ ] Extension type-check, Chrome MV3 build, Firefox MV2 build, directed
      Biome, workspace gates, and `git diff --check` pass or record only
      independently reproduced pre-existing failures.
- [ ] Documentation accurately describes the current CP1 contracts and the
      final combined command label without importing stale architecture.
- [ ] The final diff contains no artifact schema, output sink, storage,
      permission, controller, lockfile, or unrelated product changes.

## Out Of Scope

- Capture history, recent files, automatic persistence, payload storage,
  compression, encryption, cloud sync, or a new `.figit` version.
- Changes to LA1/LA2 activation, conversion semantics, or resource handling.
- Deleting preserved worktrees or local/remote branches.

## Key Decision

CP2 is a lightweight presentation/documentation reconciliation, not a second
persistence implementation. The only confirmed product delta is the combined
output label.
