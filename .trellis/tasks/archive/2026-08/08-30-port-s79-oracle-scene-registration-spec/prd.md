# Port S79 oracle scene-registration specification

## Goal

Semantically rebuild the durable oracle scene-registration contract from sync
row S79 against a freshly pinned `origin/main`, so future scene changes must
update and validate both committed registration projections.

## Background

Parent-task reconciliation proved that S79,
`37f53615d0dbd57c60edb09f278e16ff6a098e1c`, is the only durable delta after
S74 that is not represented on the target line. The historical commit changes
only:

- `.trellis/spec/oracle-harness/frontend/architecture.md`
- `.trellis/spec/oracle-harness/frontend/testing-guidelines.md`

At the planning pin, `origin/main` is
`687a8509969b24aba13ee414cc19b3d6aef1d20f`. Its implementation already has a
stable scene manifest snapshot and a separate scoreboard ratchet, but its two
spec files do not state the dual-projection registration contract. The target
uses `@figit/oracle-harness` for harness commands while the harness package
still depends on `@aakkino/dom-to-figma` and `@aakkino/fig-kiwi`.

## Requirements

- Re-pin `origin/main` immediately before implementation and build in a
  separate detached worktree derived from that exact target SHA.
- Reconstruct the S79 semantics against the target versions; do not cherry-pick
  `37f5361`, replay its commit identity, or overwrite later target edits.
- Update only the two oracle-harness spec files named above.
- State that adding, removing, renaming, or resizing a scene affects two
  independent committed projections:
  `internal/oracle-harness/src/__snapshots__/scenes.test.ts.snap` for the sorted
  `{ id, width, height }` discovery manifest, and
  `internal/oracle-harness/baseline/scoreboard.json` for the parity ratchet.
- Require manifest entries to use the discovered slash-separated scene id,
  resolved dimensions, and stable id order. Unrelated snapshot or scoreboard
  entries must not be hand-edited to force a gate to pass.
- State explicitly that `pnpm oracle:parity` validates the scoreboard but does
  not validate the discovery manifest snapshot.
- Require both `pnpm --filter @figit/oracle-harness test` and
  `pnpm oracle:parity` whenever scene registration inputs change, and identify
  `src/scenes.test.ts > produces a stable id/size manifest` as the registration
  test.
- Preserve the target line's mixed package naming and all unrelated content.
- Preserve the dirty sync checkout, index, staged set, tracked content, and all
  existing worktrees. Do not clean, stash, normalize, reset, or absorb them.
- Keep implementation, commit, push/PR, merge, branch deletion, tag publication,
  and worktree cleanup behind their documented authorization gates.

## Acceptance Criteria

- [ ] The implementation records the target SHA used as its isolated baseline.
- [ ] The diff contains exactly the two owned spec files and no product code,
      tests, snapshots, scoreboard data, task archives, or journals.
- [ ] Architecture guidance defines the two independent committed projections,
      their ordering/identity rules, and the separate unit/parity gates.
- [ ] Testing guidance names the stable id/size manifest test and states why
      parity cannot replace it.
- [ ] Target package names and existing target-line guidance remain accurate.
- [ ] Harness type-check, unit tests, parity, repository lint, Trellis validation,
      Markdown/whitespace checks, and `git diff --check` pass.
- [ ] Review evidence confirms the change was reconstructed against the pinned
      target and was not a literal cherry-pick of `37f5361`.
- [ ] Before/after evidence shows the dirty sync root, index, staged set,
      tracked content, and pre-existing worktree occupancy were preserved,
      accounting only for the explicitly authorized isolated worktree.
- [ ] No commit, push, PR, merge, tag, deletion, or cleanup occurs without its
      separate explicit authorization.

## Out Of Scope

- Changing oracle discovery, snapshot, scoreboard, or parity implementation.
- Updating the manifest snapshot or scoreboard when no scene input changed.
- Porting S79 task history, journal entries, or its Git identity.
- Reworking package names or broader oracle documentation.
- Whole-branch merge, rebase, squash, or direct work in the dirty sync checkout.

## Key Decisions

- This is a two-file semantic spec port, not a source-code change.
- Current target implementation and tests are authoritative for names and
  behavior; the S79 patch is evidence for the missing contract only.
- Unit and parity validation remain independent because they inspect different
  committed projections.
- The task starts only after a new explicit approval of this final child plan.

## Artifact Status

- Complex-task planning is complete: `prd.md`, `design.md`, `implement.md`, a
  task-local research note, and curated implement/check manifests exist.
- Blocking open questions: none.
- Status remains `planning`; implementation is not yet authorized.
