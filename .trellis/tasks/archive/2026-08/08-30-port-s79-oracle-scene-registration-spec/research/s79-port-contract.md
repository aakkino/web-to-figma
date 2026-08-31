# S79 Port Contract Evidence

Captured during child planning on 2026-08-30.

## Identities

- Historical source row: S79.
- Historical commit: `37f53615d0dbd57c60edb09f278e16ff6a098e1c`.
- Planning target: `origin/main@687a8509969b24aba13ee414cc19b3d6aef1d20f`.
- Historical patch scope: the oracle architecture and testing specs only.
- Parent review found no reachable or patch-equivalent target commit containing
  the durable registration rule.

## Target Evidence

- `internal/oracle-harness/src/scenes.ts` recursively discovers committed scene
  HTML, derives slash-separated ids, resolves size hints with defaults, and
  sorts by id.
- `internal/oracle-harness/src/scenes.test.ts` contains
  `produces a stable id/size manifest`, which snapshots sorted
  `{ id, width, height }` objects to
  `src/__snapshots__/scenes.test.ts.snap`.
- `internal/oracle-harness/baseline/scoreboard.json` is a distinct committed
  parity ratchet.
- Root `pnpm oracle:parity` invokes the private `@figit/oracle-harness`
  package's parity command. The harness depends on
  `@aakkino/dom-to-figma` and `@aakkino/fig-kiwi`; those names must not be
  rewritten as part of this port.

## Required Semantic Delta

The target specs must explain that scene add/remove/rename/resize operations
can change both independent committed projections. The discovery manifest
requires the harness unit suite; the scoreboard requires `pnpm oracle:parity`.
Passing parity alone does not prove the manifest snapshot is current.

The implementation must be rebuilt on the freshly pinned target versions. The
historical patch is evidence, not an authorized cherry-pick or source of target
file identity.
