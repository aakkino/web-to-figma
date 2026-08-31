# Implementation Plan: Approved candidate execution governance

1. [x] Preserve completed FD1, BG1, and BG2 reconciliation and containment
   records.
2. [x] Plan and execute LA1 and CP1 as independent children from the same
   revalidated target while preserving the dirty sync root.
3. [x] Merge LA1 first, synchronize CP1 to the contained LA1 target, repeat its
   full gate, and merge CP1 second.
4. [x] Archive both completed children and reconcile the execution registry
   against refreshed `origin/main@0a311e1`.
5. [x] Obtain explicit scope approval for LA2 and CP2 planning and create them
   as independent children against refreshed `origin/main@0a311e1`.
6. [x] Obtain separate final-plan approval for LA2 verification and CP2's
   narrow label reconciliation; planning approval does not activate either.
7. [x] Complete and archive both children, then perform execution-container and
   top-level parent reconciliation separately.

## Validation

- Trellis task-tree and context-manifest validation.
- Per-child acceptance, test, preservation, and rollback evidence.
- Final mapping of every candidate cohort to completed, deferred, or declined.
