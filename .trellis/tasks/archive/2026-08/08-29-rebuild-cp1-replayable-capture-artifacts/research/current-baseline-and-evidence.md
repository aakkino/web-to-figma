# CP1 Current Baseline And Evidence

## Target

- Remote `origin/main` resolved by `git ls-remote` on 2026-08-29 to
  `1c26bc2a48dbe9a7dd642aeca6b546c3bd52ffec`.
- Local `refs/remotes/origin/main` matches that SHA.
- The dirty root is `sync/upstream-20260726@9c949a4`; it is evidence and must
  remain untouched by implementation.

## Historical Evidence

- Candidate S52: `e1f134b0d022e13a530ad15e139e24373789c1cb`.
- Historical task:
  `.trellis/tasks/archive/2026-08/07-24-figit-capture-artifact/`.
- The old patch created artifact/output modules and changed controller/UI,
  package, test config, and lockfile paths. Current `main` has evolved, so only
  behavior and tests may be reused as evidence; the patch is not replayed.

## Current-Target Findings

- `capture-artifact.ts` and `capture-output.ts` are absent on current `main`.
- Current workspace already exposes ready/output/open/retry states, an
  `engineFactory`, output capability plumbing, and a clipboard-only port whose
  file/open operations explicitly report unavailable.
- These seams allow CP1 to remain extension-owned and avoid converter changes.
- The lockfile already contains `@noble/hashes`, but the target extension
  manifest must be checked before deciding whether a direct importer change is
  needed; dependency/lockfile edits must remain minimal.

## Delivery Constraints

- CP1 overlaps LA1 in controller, UI, engine wiring, tests, and possibly
  settings. Use separate worktrees, merge LA1 first, then synchronize CP1 and
  rerun all extension/workspace/browser gates.
- CP2 remains deferred until CP1 is merged, contained, and separately approved.
