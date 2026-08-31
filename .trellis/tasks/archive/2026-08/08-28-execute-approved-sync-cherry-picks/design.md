# Design: Approved candidate execution governance

## Task Hierarchy

```text
sync branch governance
  -> imported audit (completed)
  -> approved execution governance (this task)
       -> FD1 rebuild (completed and archived)
            -> FD1 promotion (merged and contained through PR #20)
       -> BG1 local rebuild (completed and archived)
       -> BG1 promotion (merged and contained through PR #14)
            -> BG2 end-to-end child (merged and contained through PR #16)
       -> LA1 child (merged through PR #17; archived)
            -> LA2 verification child (represented/superseded; zero diff)
       -> CP1 child (merged through PR #18 after LA1 sync; archived)
            -> CP2 reconciliation child (merged through PR #19)
```

This task coordinates children and final reconciliation but never owns product
implementation; the children own every deliverable.

## Deferred Registry

| Cohort | State | Creation gate |
| --- | --- | --- |
| FD1 | promoted and contained through PR #20 | complete at `origin/main@687a8509` |
| BG1 | local delivery archived; promotion merged and contained | complete |
| BG2 | merged and contained through PR #16 | complete at `origin/main@1c26bc2a` |
| LA1 | merged and contained; child archived | complete through PR #17 |
| LA2 | represented/superseded by LA1; zero product diff; archived | complete |
| CP1 | merged and contained; child archived | complete through PR #18 |
| CP2 | merged and contained through PR #19; archived | complete at `origin/main@decde39a` |

## Boundary Rule

Architecture layers are authorized inside the cohort that needs them, not by
generic placeholder tasks. Scope expansion discovered during a child stops that
child and requires revised planning approval.

LA1 and CP1 used separate branches and worktrees. Their partially overlapping
extension controller/UI surface required serialized integration: LA1 merged
first, and CP1 synchronized that contained target and reran all checks before
its merge. LA2 then closed as semantic containment with no product rollback
unit, while CP2 remained a separate one-label rollback unit through PR #19.
FD1's separate promotion child preserved original `62eef8d`, reconciled head
`d3459aa`, and merge `687a8509` as distinct auditable identities.
