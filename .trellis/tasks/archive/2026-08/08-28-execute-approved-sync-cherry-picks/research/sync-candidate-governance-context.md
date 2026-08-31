# Sync Candidate Governance Context

Source assessment:
`.trellis/tasks/archive/2026-08/08-28-import-existing-sync-integration-audit/research/sync-integration-assessment-2026-08-28.md`

- Whole-branch merge, rebase, squash, and replay are rejected.
- Candidate status does not authorize historical commit application.
- Rebuild/port against current baseline contracts is the selected strategy.
- Candidate DAG is `BG1 -> BG2`, `LA1 -> LA2`, `CP1 -> CP2`, with FD1
  independent.
- FD1 is the only approved first batch. Every other cohort remains deferred.
- Dirty root state, target identity, private package/release contracts, and
  cohort-sized rollback boundaries must be preserved.
