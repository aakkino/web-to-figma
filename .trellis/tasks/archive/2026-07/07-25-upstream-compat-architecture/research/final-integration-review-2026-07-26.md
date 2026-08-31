# Final Integration Review: 2026-07-26

## Decision Summary

All six child tasks are completed and archived. The architecture now enforces
registered core deltas, supports a vanilla stable converter through the
adapter-owned fallback, and keeps generic upstream candidates separate from
product policy. No remote branch was pushed and no upstream PR was created.

The parent is ready for user review. It is not yet eligible for archive because
the parent PRD explicitly reserves final completion for that review.

## Child Deliverables

| Child | Result |
| --- | --- |
| Core delta governance | Added the machine-readable registry, fingerprints, budgets, stable/main targets, CI gates, and maintenance policy. |
| Vanilla upstream adapter fallback | Removed the hard runtime dependency on `createImagePreparation` by adding capability detection and adapter-owned staging. |
| DOM traversal port | Hardened composed traversal and produced an independently reviewable core hook plus upstream PR draft. |
| Image pipeline | Retired the fork-only core preparation API, kept scheduling and placeholders in the adapter, and split image presentation/cancellation candidates. |
| Text and font correctness | Hardened glyph-aware coverage, preserved single-line sizing, and produced independent upstream handoff units. |
| Patch retirement | Refreshed exact upstream targets, audited every registered capability, and retained all non-equivalent patches with explicit blockers. |

## Compatibility Targets

| Target | Resolved version or commit | Gate result |
| --- | --- | --- |
| Governance baseline | `ac830db5b89d2e8e7eede86f9419303988ae1938` | Passed; 14 runtime paths, zero unmapped runtime paths. |
| npm latest stable | `@figit/dom-to-figma@0.2.1` / `0bf06ecce52aabc2bc696980b83040860630e35f` | Blocking target and vanilla adapter fixture passed. |
| Reviewed `upstream/main` | `cc8d4864e6be53d0d5047fbf97283b112b3117f4` | Sync target resolved and report completed. |

The reviewed upstream head contains basic `object-fit` mapping but not the
fork's complete `object-position`, `none`, `scale-down`, and intrinsic-size
semantics. It is recorded as a partial overlap and does not authorize deletion.

## Delta Budget

The production runtime delta moved from the governed baseline of 15 files to
14 files after the staged image preparation API was retired. The first numeric
milestone (`<=10`) is not yet reached.

This is an explicit, accepted blocker path rather than a silent budget waiver:
all six retained capabilities have an owner (`abskino`), review date
(`2026-10-31`), upstream state, focused tests, fingerprints, and objective
removal conditions in `docs/upstream-core-delta.json`. Correctness and parity
remain higher priority than the numeric milestone.

## Verification Evidence

- Governance, stable-version, reviewed-main, and vanilla adapter checks passed.
- `pnpm check-types`, `pnpm build`, and `pnpm test` passed.
- The test gate passed 5 governance tests plus 401 workspace tests; 5
  environment-gated oracle-harness tests remained skipped.
- `pnpm oracle:parity` passed the current complete 46-scene corpus with the
  existing 15 tier-0 findings.
- The exact task diff passed the original `pnpm lint` command in an isolated
  LF checkout with zero errors. The primary Windows checkout has unrelated
  nested `.tmp` configuration and CRLF formatting drift.

## User Review Gate

Please confirm these two decisions before parent archive:

1. Accept the current outcome of 14 registered runtime delta files because no
   additional capability is present in an equivalent consumable upstream
   baseline.
2. Keep upstream PR drafts local; any push or upstream PR submission remains a
   separate explicitly approved action.

Accepted by the user on 2026-07-26. The parent task may be archived. This
acceptance does not authorize pushing a branch or creating an upstream PR.
