# Original Audit Contract For Tail Reconciliation

This compact context distills the authoritative 2026-08-28 assessment without
replacing it. Reviewers can consult the full archived report for row-level
evidence.

## Frozen Identities

- Original source: `sync/upstream-20260726@2172b181853e111dab5c9e261cc19426420f649f`.
- Original target: `baseline/origin-main-20260828@dd91f18346d7326ab71c1a77769bfe7aed310af3`.
- Merge base: `606ee8aa9ca4915ec28dd7853fd5b42283ff54ea`.
- Original divergence: 37 target-only and 73 sync-only commits.

## Ledger Contract

The 73 sync rows form a linear ordered chain and each has one terminal state:

- represented: 5;
- superseded: 10;
- selective candidate: 11;
- historical only: 12;
- excluded: 35.

The 11 candidate commits form seven capability cohorts: BG1, BG2, LA1, LA2,
CP1, CP2, and FD1. Dependency order is `BG1 -> BG2`, `LA1 -> LA2`, and
`CP1 -> CP2`; FD1 is independent. Historical commit identity is evidence only,
not permission to replay it.

## Non-Negotiable Decision

Do not merge, rebase, squash, or replay the whole sync branch. The target owns
newer compatibility, rendering, package, registry, release, and governance
contracts. Whole-branch integration would mix obsolete implementations and
bookkeeping with the candidates and would weaken review and rollback units.

Each valuable delta must be rebuilt against the current target through a narrow
unit. Historical/audit material remains provenance, and task archives/journals
are not target product value.

## Preservation Contract

The root sync checkout is dirty and must remain untouched. Do not stage,
normalize, stash, clean, restore, move, delete, or transplant unrelated tracked
or untracked state. Record branch/HEAD, staged paths, index identity, protected
file hashes, and worktree occupancy before and after authorized mutations.

## Closure Extension

The original report is complete only through S73. Tail reconciliation must
append every later sync-only commit in exact Git order, assign exactly one
terminal state per row, re-evaluate any durable delta against the current
target, and preserve the whole-branch rejection. Counts and tips must be
re-pinned because the source and target may have advanced.
