# Local PR Draft

This artifact is local only. Creating the PR requires separate explicit user
authorization.

## Title

```text
feat(extension): surface font recovery diagnostics
```

## Body

```markdown
## Summary

Promote the reviewed FD1 font-recovery diagnostics onto the current `main`
line while preserving all later main-line capture, lazy activation, artifact,
output, settings, and controller behavior.

This PR preserves the original reviewed implementation commit
`62eef8de9ff01b4d58c905a8f8e2949da00703b8`. Current
`main@decde39a60a220d6ea853f04c3893a0446fa76bf` was merged into that branch,
producing reconciled head
`d3459aa954ef1b6035c1f370d628ac50b8263329` with exact parents `62eef8d` and
`decde39a`.

## Exact Payload

Relative to the PR base, the payload is exactly four extension files with 461
insertions and five deletions:

- `apps/extension/entrypoints/content/app.tsx`
- `apps/extension/entrypoints/content/font-recovery-diagnostics.tsx`
- `apps/extension/entrypoints/content/font-recovery-diagnostics.test.tsx`
- `apps/extension/vitest.config.ts`

The two FD1 module blobs are byte-identical to the independently reviewed
`62eef8d` versions. The reconciled `app.tsx` only imports and renders the
diagnostics component in the existing font-recovery view. The reconciled
Vitest config retains every current project and test entry and adds the FD1
test.

## Behavior And Privacy

- Summarizes exact, fallback, and unavailable font requests.
- Shows requested and resolved family/weight/style for fallback outcomes and a
  fixed safe reason for unavailable outcomes.
- Keeps technical attempt labels collapsed and projects them onto a fixed safe
  vocabulary.
- Rejects Unicode `Cc` and `Cf` controls, URLs, code points, raw errors, and
  source text from displayed diagnostics.
- Preserves retry, compatible-font, and cancel command order and existing
  capture state transitions.

## Validation

Validated on Node `v24.6.0`, pnpm `10.33.2`, and reconciled head `d3459aa`:

- directed Biome: four approved files passed;
- focused FD1 test: 1 file, 6/6 tests passed;
- extension tests: 10 files, 61/61 tests passed;
- extension type-check: passed;
- Chrome MV3 build: passed, 20.58 MB;
- Firefox MV2 build: passed, 20.58 MB, with only the existing WXT
  data-collection advisory;
- repository type-check and build: all eight workspace projects passed;
- full repository tests: upstream governance 7/7, fig-kiwi 41/41,
  composed-dom 5/5, core 281/281, adapter 87/87, extension 61/61, and Oracle
  102 passed with five explicitly gated skips;
- `git diff --check origin/main...HEAD`: passed.

The Windows whole-repository `pnpm lint` command reports the known CRLF
working-tree presentation failure. On the reconciled checkout it reported 396
formatting errors; the same command was independently reproduced against an
exact detached `decde39a` checkout with `core.autocrlf=true`, where it reported
398 CRLF formatting errors. No unrelated file was normalized. The exact
four-file directed Biome gate passed. Linux PR CI remains required and is not
waived by this classification.

## Real-Extension Smoke

A real Chrome MV3 bundle was loaded in headed/offscreen Playwright Chromium
`147.0.7727.15` at a 360 by 800 viewport. Strict capture rendered the exact
combined summary `3 font requests: 1 exact, 1 fallback, 1 unavailable.`

The fallback request `Noto Sans TC Thin / 500 / normal` resolved visibly to
`Noto Sans TC Thin / 400 / normal`; the unavailable URL-shaped family rendered
as `family unavailable`. Retry/compatible/cancel order, collapsed details,
narrow-workspace containment, and absence of the sensitive host/path all
passed.

## Exclusions

This PR does not change font resolution, the adapter or converter contract,
storage, messaging, permissions, dependencies, lockfiles, CI, release files,
Oracle baselines, BG1/BG2, LA1/LA2, CP1/CP2, or unrelated tests. It does not
replay historical S65 and does not rewrite `62eef8d`.

## Preservation And Rollback

The unrelated dirty root checkout remained
`sync/upstream-20260726@9c949a4a7a7560b460562014232d982c1f21533c`
with zero staged paths; all 17 pre-execution tracked dirty-path SHA-256 values
matched after reconciliation and smoke. Unrelated worktree occupancy and heads
were unchanged.

Rollback after merge is one reviewed PR reverting the GitHub merge commit. Do
not rewrite `main`, force-push the source branch, or delete preservation
evidence as rollback.

## Governance

Parent execution task: `08-28-execute-approved-sync-cherry-picks`.
Original local-delivery task:
`archive/2026-08/08-28-rebuild-fd1-font-diagnostics`.
Promotion task: `08-29-promote-fd1-to-main`.
```
