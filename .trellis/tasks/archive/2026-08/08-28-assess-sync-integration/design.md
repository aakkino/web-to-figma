# Sync Integration Assessment Design

## Boundary

This task produces task-local research and planning evidence only. The Git
object database, refs, index, root checkout, product source, remote repository,
package registry, and PR state are read-only assessment inputs. Task-local
planning/report files are the only intended writes.

## Immutable Inputs

| Role | Ref | Expected SHA |
| --- | --- | --- |
| stabilized target | `baseline/origin-main-20260828` | `dd91f18346d7326ab71c1a77769bfe7aed310af3` |
| committed source | `sync/upstream-20260726` | `2172b181853e111dab5c9e261cc19426420f649f` |
| common history | merge base | `606ee8aa9ca4915ec28dd7853fd5b42283ff54ea` |

Local `main` and `origin/main` are observations, not substitutes for the
immutable target. Remote drift is reported separately and cannot rewrite the
comparison range.

## Evidence Model

The report keeps five evidence layers separate:

1. **Git identity and topology:** full SHA, parents, ranges, patch/cherry
   signals, path sets, blobs, and tree deltas.
2. **Baseline representation:** reachability, PR merge lineage, current target
   behavior, and semantic replacement evidence for the 37 baseline-side
   commits.
3. **Trellis provenance:** task requirements, research, checks, archived
   status, and the exact commit boundary each artifact reviewed.
4. **Executable evidence:** recorded or reproducible tests, CI, package gates,
   browser checks, oracle parity, governance, and release validation.
5. **Working-tree state:** index, tracked content, line-ending/stat noise,
   untracked and ignored paths. This layer never upgrades committed evidence.

The assessment reuses the historical L0-L5 review scale: commit only, task
provenance, task-local verification, bounded integration audit, remote PR/CI,
and reachability from the stabilized main line. Later evidence may supersede
an old disposition, but it must remain linked to its precise tree and scope.

## Ledger and Cohort Model

The authoritative set is:

```text
baseline/origin-main-20260828..sync/upstream-20260726
```

Each of its 73 SHAs owns one ledger row with category, task/capability group,
paths, evidence, baseline relationship, terminal disposition, and follow-up
gate. Cohorts may summarize adjacent rows, but totals and membership remain
machine-checkable.

The initial evidence partition is not a final disposition:

- compatibility foundation and architecture;
- selective style/effects intake;
- image/background and capture product cohorts;
- diagnostics and upstream research;
- Trellis, archive, journal, and later bookkeeping history.

The report then maps these groups against the 37 baseline-only commits and the
current baseline tree. This second pass is what distinguishes "already
represented" from "selective candidate" or "historical only."

## Disposition Contract

Every committed cohort ends in exactly one state:

| State | Meaning |
| --- | --- |
| represented | Required behavior/evidence is present on the pinned baseline. |
| superseded | Baseline intentionally replaced the old implementation or contract. |
| selective candidate | Product value remains, but must be ported or rebuilt in an isolated follow-up. |
| historical only | Useful audit, diagnosis, or provenance with no source intake. |
| exclude | Generated, obsolete, release-incompatible, duplicate, or bookkeeping content that must not enter main. |

"Selective candidate" requires a target package/path boundary, dependencies,
baseline invariants, validation commands, and a rollback unit. It does not
authorize implementation.

## Dirty-Worktree Model

The root checkout remains protected. Before and after evidence gathering, the
assessment records porcelain-v2 status, index entries, tracked diffs, and
content hashes. Tracked paths are evaluated in three comparisons:

```text
working tree vs sync@2172b18
working tree vs baseline@dd91f18
sync@2172b18 vs baseline@dd91f18
```

Paths reported modified but lacking a content diff are labeled line-ending or
stat noise rather than product changes. Untracked and ignored paths are grouped
by ownership and purpose; they are not enumerated into the committed ledger or
modified for convenience.

## Analysis Operations

Read-only Git operations use the process-local
`-c safe.directory=D:/desktop_directory/web-to-figma` option. Patch
applicability, if needed, uses a disposable index or isolated temporary tree
whose exact location is validated first; it never uses the root index. No
clean textual apply can produce a final disposition without semantic and test
evidence.

The primary output is:

```text
research/sync-integration-assessment-2026-08-28.md
```

It contains the snapshot, 73-row ledger, baseline-side map, evidence matrix,
dirty inventory, disposition matrix, whole-merge rejection, and proposed
follow-up task DAG.

## Follow-up Shape

The assessment recommends child or standalone tasks only for independently
valuable selective candidates. Existing likely boundaries include capture
artifact/persistence, CSS background and lazy-resource handling, lazy
activation, and font diagnostics; they remain hypotheses until the ledger and
baseline map prove they are neither represented nor superseded.

Compatibility foundations and the old style/effects stack must be compared to
the reviewed main replacements before any follow-up is proposed. Trellis,
journal, old package/release, and archive content are never bundled with a
product cohort.

## Safety and Rollback

- Any mismatch in the three immutable SHAs stops execution and returns to
  planning.
- The assessment records pre/post ref, index, and tracked-dirty hashes.
- No fetch is required for the pinned analysis. A live remote query is
  optional context and cannot update local refs.
- Task-local documents are the only rollback unit. No product rollback is
  needed because product files and refs are not written.
- Any need to preserve, transplant, or clean dirty content becomes a separate
  user-approved task rather than an implicit assessment action.
