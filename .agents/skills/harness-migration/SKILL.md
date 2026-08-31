---
name: harness-migration
description: "Migrate or refresh this Trellis Codex Harness in a separate Git project through its deterministic CLI; use for fresh installs or existing Trellis upgrades, not ordinary official trellis updates."
---

# Harness Migration

Use this skill when a user wants to install, migrate, refresh, or upgrade this
Harness in another project. Keep normal `trellis update` requests outside this
skill unless they are part of migration verification.

The migration CLI is the sole filesystem authority. Use the source template's
`.trellis/scripts/harness_migrate.py` throughout the migration. `plan`
establishes the explicit `--template` and `--target` roots; `resolve` and
`apply` consume its saved plan, while `verify` and `rollback` consume its
receipt. Do not append root arguments to commands that do not accept them, or
perform copying, deletion, ownership classification, backup creation, or
rollback outside that CLI.

For a deliberately reviewed partial target, use normal `plan --adopt-partial
--profile complete`. The profile flag is explicit for this flow even though
ordinary plans default to `complete`. It accepts only the CLI-classified `unsupported_partial`
state and uses only the current template and manifest export. It never takes a
baseline or reads a historical backup. Historical `recover-*` commands remain
a separate, optional workflow; they do not gate direct adoption.

1. Confirm the template and target roots. A target must be a Git worktree.
   Let `plan` report the target state; do not classify it from directory names.
   For an explicitly fresh migration, request the developer name; do not supply
   one for an existing Trellis target. If the reported state differs from the
   requested flow, or is unsafe, stop rather than guessing. For the explicit
   direct-adoption flow, use only `--adopt-partial --profile complete`.
2. Run `plan --format json --output <plan.json>` before discussing changes.
   Use `--profile <name>` only when the requested migration scope maps to a
   manifest-owned profile; omitting it preserves the default complete migration.
   Read [the plan contract](references/plan-contract.md) to interpret its
   structured output.
3. Stop when `blockers` is non-empty. Present `conflicts` and every unresolved
   `decisions` entry, then obtain a choice from that entry's `allowedChoices`.
   Never invent a decision ID or choice. Use `resolve --plan <plan.json>
   --decision <id>=<choice> --output <resolved-plan.json>`; it does not modify
   the target.
4. Read [the operator flow](references/operator-flow.md) before apply,
   verification, or rollback. Treat security-sensitive Codex configuration,
   project instructions, specs, skills, and the official baseline as semantic
   decisions requiring user direction.
5. Immediately before `apply`, request explicit authorization to apply the
   fully resolved plan, including its recorded profile. Only after that authorization, run `apply --plan
   <resolved-plan.json> --approve --format json`. Do not infer approval from
   earlier discussion or from selecting decisions.
6. Run `verify --receipt <receipt.json> --format json` after apply. A report
   with failed checks, unresolved sidecars, or status other than `success` is
   incomplete; report the receipt, sidecars, and manual merge work without
   claiming migration success.
7. Immediately before `rollback`, request explicit authorization to restore
   the receipt-owned paths. Only after it is granted, run `rollback --receipt
   <receipt.json> --approve --format json`. Stop if the CLI refuses the action.

For direct adoption, persist and review the exact normal plan and resolve only
its normal CLI-issued choices. `adoptPartial`, `targetState`, and `profile` are
digest-bound and canonically replayed before backup creation. Preserve task,
workspace, developer, current-task, and runtime state; do not infer a choice
for a shared path. New direct-adoption receipts also record filtered digests
for retained project state, excluding only exact journal destinations, so
verification rejects project-state changes made by its commands. Historical
recovery remains independently authorized and never authorizes a
direct-adoption apply.

The CLI validates roots, current Git/session safety, plan and receipt digests,
and external backups. Report JSON emitted by `plan`, `apply`, `verify`, and
`rollback`, plus the resolved-plan JSON written by `resolve`, alongside stderr
diagnostics. Do not bypass a blocker, stale plan, unresolved decision, failed
verification, or rollback refusal.
