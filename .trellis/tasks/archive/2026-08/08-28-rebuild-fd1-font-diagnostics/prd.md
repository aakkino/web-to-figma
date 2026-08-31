# Execute approved sync rebuilds and ports

## Goal

Rebuild the FD1 font-capture mismatch diagnostics on the stabilized baseline so
users can distinguish exact, fallback, and unavailable font requests before
choosing retry, compatible mode, or cancellation.

## Background

Child A is complete and archived at
`.trellis/tasks/archive/2026-08/08-28-import-existing-sync-integration-audit`.
Its byte-verified assessment classifies FD1 source commit
`49966ef87924d3b0b2f4c3de92fc431d300bb9e9` as a selective candidate. The
assessment records old L2 evidence but no current-baseline validation.

Repository inspection confirms `main@dd91f18346d7326ab71c1a77769bfe7aed310af3`
still has only the aggregate font-request count and does not contain
`font-recovery-diagnostics.tsx` or its test. The dirty root checkout is on the
sync branch and is not an execution target.

## Requirements

- Rebuild FD1 with new patch identity from an isolated worktree based on the
  approved `main` SHA; do not cherry-pick the historical commit.
- Replace the count-only recovery message with totals for exact, fallback, and
  unavailable unique font requests.
- Render one compact item for every non-exact request. Identify requested
  family, numeric weight, and normal/italic style.
- For fallback results, identify actual resolved family, weight, and style.
- For unavailable results, show a concise reason derived only from safe
  diagnostic fields.
- Provide collapsed-by-default technical details containing only sanitized
  attempt labels. Never display page text, code points, CSS/font URLs, raw font
  bytes, or unsanitized exceptions.
- Keep exact requests summarized rather than rendering one item per request.
- Preserve the existing `retry-fonts`, `switch-to-compatible`, and `cancel`
  commands and their order.
- Keep the change presentation-only. Do not change font resolution, adapter
  contracts, controller transitions, settings persistence, or capture output.
- Keep the recovery UI readable and operable in the extension's narrow,
  vertically scrollable content workspace.

## Acceptance Criteria

- [x] Mixed diagnostics display correct total, exact, fallback, and unavailable
      counts.
- [x] Every fallback/failed request displays requested family, numeric weight,
      and style; fallback also displays resolved metadata.
- [x] Failed requests display a meaningful safe reason rather than only an
      aggregate count.
- [x] Each non-exact request has collapsed technical details with sanitized
      attempt labels and no URL, source text, or code-point leakage.
- [x] Exact-only diagnostics remain compact.
- [x] Existing recovery buttons still dispatch `retry-fonts`,
      `switch-to-compatible`, and `cancel` in the existing order.
- [x] Focused tests cover mixed outcomes, missing optional resolved metadata,
      status summaries, and privacy-safe rendering.
- [x] Directed lint, extension tests, type-check, Chrome build, and Firefox
      build pass on the target worktree.
- [x] Root dirty files, staged state, and existing worktree occupancy remain
      unchanged.

## Out Of Scope

- BG1, BG2, LA1, LA2, CP1, and CP2; they remain unapproved for this batch.
- Changing font candidate selection, glyph coverage, fallback assets, or
  strict/compatible/fast-local semantics.
- Persisting diagnostics or adding them to capture artifacts.
- Redesigning image recovery or other workspace states.
- Any whole-branch operation or literal historical cherry-pick.

## Key Decisions

- First batch scope is FD1 only.
- Strategy is current-baseline rebuild/port with new patch identity.
- Approved target is `main@dd91f18346d7326ab71c1a77769bfe7aed310af3`,
  subject to an exact pre-execution drift check.
- The historical FD1 implementation and archived PRD are evidence, not source
  files to transplant blindly.
