# Design: Govern sync branch cherry-picks

## Governance Flow

```text
Child A: import immutable assessment
  -> verify source + SHA-256
  -> user approval manifest
  -> Child B: execute only approved units
  -> parent integration review
  -> Child C: reconcile the post-audit source tail
  -> Child D: validate and perform terminal governance closure
```

The parent is a coordination record, not an implementation target. Child A
owns the evidence artifact. Child B owns approved cohort product changes.
Child C owns the extended semantic-disposition ledger and the S79 durable-delta
decision. Child D owns only validation, archive placement, and terminal tag
attestation.

Final reconciliation resolves all seven candidate cohorts across nine Child B
execution children. LA2 closed through semantic containment without a product
or remote rollback unit; every changed cohort retained an independent review
and rollback identity. The product-integration checkpoint was `687a8509` after
FD1 PR #20; Child C then identified and ported the S79 durable oracle contract,
so the refreshed final target is `1c98bb0e` after PR #21.

## Decision Boundaries

The imported assessment remains authoritative for classification and historical
evidence. Execution-time facts that can drift, including target SHA, worktree
state, source commit availability, conflicts, and test behavior, must be checked
again in Child B without reopening the completed 73/37 commit audit.

The approval manifest is the contract between the children. It must name:

- exact cohort and source commit SHA(s);
- target ref and target SHA;
- rebuild/port strategy and the historical source commits used as evidence;
- dependency order and rollback unit;
- required validation and stop conditions.

## Candidate Boundaries

| Cohort | Sync rows | Dependency | Rollback boundary |
| --- | --- | --- | --- |
| BG1 CSS raster backgrounds | S42-S44 | root | one BG1 change/PR |
| BG2 lazy background sources | S46-S47 | BG1 | one BG2 change/PR |
| LA1 lazy activation | S49 | root | one LA1 change/PR |
| LA2 infinite-scroll edge | S59 | LA1 | one LA2 change/PR |
| CP1 capture artifact | S52 | root | one CP1 change/PR |
| CP2 capture persistence | S55-S56 | CP1 | one CP2 change/PR |
| FD1 font diagnostics | S65 | independent | one FD1 change/PR |

## Safety And Rollback

Execution uses an isolated worktree or otherwise proven-clean target context.
Each approved cohort stops at its validation/review gate before a dependent or
independent cohort begins. Failure rolls back only the current cohort; it must
not trigger a whole-branch integration or mutate unrelated dirty paths.

When a cohort's approved implementation task ends at a reviewed local branch,
its plan must explicitly own remote promotion or delegate it to a separate
child; promotion is never an implicit post-task step. The owning task handles
the remote base refresh, push/PR/CI/merge gates, final target-line containment
evidence, and downstream dependency signal. BG1 used a separate promotion
child; BG2's corrected plan owned the complete lifecycle and merged through PR
#16 at `origin/main@1c26bc2a`.
