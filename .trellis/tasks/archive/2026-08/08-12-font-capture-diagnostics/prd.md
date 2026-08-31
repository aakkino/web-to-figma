# Expose font capture mismatch diagnostics

## Goal

Make the font-recovery state explain exactly which font requests do not meet
the active capture mode, so users can distinguish strict mismatches from fonts
that are entirely unavailable and can make an informed retry, compatibility,
or cancellation decision.

## Background

- The recovery view currently shows only the total number of diagnostics from
  `state.capture.fontDiagnostics.length`.
- Each diagnostic already contains the requested family, weight, italic flag,
  status, resolved font metadata, a safe reason, and sanitized attempt labels.
- A request is deduplicated by normalized family, weight, and italic. The UI
  must not describe the count as text nodes, font files, or network requests.
- Diagnostics are already designed not to expose page text, code points, CSS
  rules, font URLs, or font bytes.

## Requirements

- Replace the count-only font-recovery message with an outcome summary showing
  total, exact, fallback, and unavailable request counts.
- Show every non-exact request in a compact diagnostic item suitable for the
  extension's 380px-wide, vertically scrollable workspace.
- Each item must identify the requested family, numeric weight, and normal or
  italic style.
- Fallback items must identify the actual resolved family, weight, and style.
- Failed items must show a concise, user-readable reason derived from the
  existing safe diagnostic fields.
- Each non-exact item must provide collapsed-by-default technical details that
  expose the diagnostic's already-sanitized attempt labels for deeper
  troubleshooting without overwhelming the primary recovery view.
- Exact requests may remain summarized rather than occupying one item each;
  the recovery decision is driven by non-exact requests.
- Preserve the existing Retry fonts, Use compatible fonts, and Cancel capture
  commands and their order.
- Keep diagnostic rendering presentation-only. Do not change font resolution,
  capture state transitions, settings persistence, or diagnostic contracts.
- Never display source page text, code points, CSS/font URLs, raw font bytes,
  or unsanitized exception content.
- Recovery content must remain readable and operable at desktop and narrow
  workspace widths.

## Acceptance Criteria

- [x] A recovery state with four diagnostics displays correct total, exact,
      fallback, and unavailable counts.
- [x] Every fallback or failed request displays its requested family, numeric
      weight, and style without exposing source content.
- [x] A fallback request displays its resolved family, weight, and style.
- [x] A failed request displays a meaningful reason and does not appear merely
      as an unchanged aggregate count.
- [x] Each non-exact request offers collapsed technical details containing its
      sanitized attempt labels; those details expose no URLs or source text.
- [x] Exact-only details do not overwhelm the recovery view.
- [x] Existing recovery buttons still dispatch `retry-fonts`,
      `switch-to-compatible`, and `cancel` respectively.
- [x] Focused UI tests cover mixed exact/fallback/failed diagnostics, missing
      optional resolved metadata, and privacy-safe rendered content.
- [x] Extension type-check, tests, Chrome build, and Firefox build pass.

## Out Of Scope

- Changing font candidate selection, glyph coverage ranges, fallback assets,
  or strict/compatible/fast-local semantics.
- Adding per-character font runs or new font download sources.
- Persisting diagnostics or adding diagnostics to output artifacts beyond the
  existing contracts.
- Redesigning image recovery or other workspace states.

## Notes

- This is a lightweight extension UI change and can remain PRD-only.
