# Deterministic Harness Migration Contract

## 1. Scope / Trigger

Use this contract when changing the Harness export policy, migration CLI,
transaction/receipt logic, verification commands, rollback behavior, or the
Agent Skill that operates the migrator. The migrator installs or refreshes the
Harness in a disjoint target Git root; it is not a recursive overlay tool.

Authority is deliberately split:

```text
Agent/operator -> plan -> resolve -> approved apply -> receipt -> verify/rollback
                         CLI owns every target filesystem mutation
```

- `export-manifest.json` owns source disposition and migration policy.
- A canonical, digested plan authorizes the proposed action set.
- An external, digested receipt and its action journal authorize recovery.
- The Skill may explain output and collect decisions, but must invoke the CLI
  for planning, resolution, writes, verification, and rollback.
- Apply and rollback have no dirty-worktree, session, conflict, or post-image
  force bypass.

## 2. Signatures

The public command surface is fixed:

```text
python .trellis/scripts/harness_migrate.py plan \
  --template <root> --target <root> [--developer <name>] \
  [--profile <name>] [--adopt-partial] \
  [--format human|json] [--output <plan.json>]

python .trellis/scripts/harness_migrate.py resolve \
  --plan <plan.json> [--decision <id>=<choice>]... \
  --output <resolved-plan.json>

python .trellis/scripts/harness_migrate.py apply \
  --plan <resolved-plan.json> --approve [--backup <external-root>] \
  [--receipt <backup-contained-receipt.json>] [--format human|json]

python .trellis/scripts/harness_migrate.py verify \
  --receipt <receipt.json> [--format human|json]

python .trellis/scripts/harness_migrate.py rollback \
  --receipt <receipt.json> --approve [--format human|json]

python .trellis/scripts/harness_migrate.py recover-plan \
  --template <root> --target <root> --baseline <target-local-backup> \
  [--format human|json] [--output <recovery-plan.json>]

python .trellis/scripts/harness_migrate.py recover-resolve \
  --plan <recovery-plan.json> [--decision <id>=<choice>]... \
  --output <resolved-recovery-plan.json>

python .trellis/scripts/harness_migrate.py recover-apply \
  --plan <resolved-recovery-plan.json> --approve \
  [--backup <external-root>] [--receipt <backup-contained-receipt.json>] \
  [--format human|json]
```

Core Python boundaries:

```python
build_plan(template_value: str, target_value: str,
           developer: str | None = None,
           profile: str = "complete", adopt_partial: bool = False) -> Plan
resolve_plan(plan: Plan, selections: dict[str, str]) -> Plan
apply_plan(plan: Plan, backup_value: str | None = None,
           receipt_value: str | None = None) -> tuple[dict[str, Any], Path]
verify_receipt(receipt_path: Path,
               *, run_commands: bool = True) -> dict[str, Any]
rollback_receipt(receipt_path: Path) -> dict[str, Any]
```

Recovery uses `build_recovery_plan`, `resolve_recovery_plan`, and
`apply_recovery_plan`. It has a separate closed schema and canonical rebuild;
normal `Plan` parsing and behavior remain unchanged.

Exit codes are stable: `0` success, `2` invalid input, `3` blocked, `4`
unresolved decisions, `5` apply failure, `6` verification failure, and `7`
rollback refusal.

## 3. Contracts

### Manifest and planning

- Manifest schema `2` contains `migrationPolicy` schema `1`. Each normalized
  POSIX-relative rule has exactly `path`, `kind`, `modes`, `onExisting`,
  `onModified`, and `sourceRequired`.
- The top-level `migrationProfiles` object is manifest-owned and non-empty.
  Each non-empty profile name maps to an object with exactly one non-empty
  `include` string array. The shipped profiles are `complete` and
  `dispatch-only`; `complete` must include exactly `**`. `dispatch-only`
  includes only the dispatch governance/configuration surfaces: `AGENTS.md`,
  Codex config/hooks/agents, `.trellis/config.yaml`, workflow and role cards,
  the seven-role routing skill, and the model-routing spec. It must not select
  `.trellis/scripts/**`, `.trellis/tests/**`, the migration skill, or other
  generic specs.
- Profile include patterns use the same normalized POSIX-relative pattern
  grammar as export rules: forward slashes only; no backslash, NUL, colon,
  absolute path, `.`/`..`, parent traversal, or non-canonical spelling such as
  doubled separators. Duplicate patterns and a pattern that matches no
  exported source file are invalid. `*` and `?` do not cross `/`; `**` may.
  Profile selection filters the exported-file set before actions, conflicts,
  and decisions are constructed, while the normal most-specific migration-rule
  ownership resolution still applies to every selected path.
- Rule kinds are `replaceable_managed`, `merge_required`, `preserve`,
  `runtime_excluded`, `fresh_only_skeleton`, and `support_only`. Every exported
  source file has exactly one most-specific disposition; equal-specificity
  overlap and unmatched required rules are invalid.
- `plan` is non-mutating except for an explicitly requested `--output`. It
  resolves explicit template/target roots and classifies `fresh` versus
  `existing_trellis`. Actions sort by `(path, operation)`, decisions by `id`,
  and blockers/conflicts lexicographically. `planDigest` hashes the complete
  plan without `planDigest` as ASCII JSON with sorted keys, compact separators,
  and one trailing LF.
- The plan schema is closed: unknown or missing top-level, action, or decision
  fields are rejected. It records canonical roots, target state, template and
  manifest versions/digests, per-action source/target/destination digests,
  stable decision IDs, allowed choices, the required string `profile`,
  blockers, conflicts, logical
  verification commands, and `planDigest`.
- `plan --adopt-partial --profile complete` emits a normal schema-2 plan only
  for the authoritative `unsupported_partial` target state. Its required
  boolean `adoptPartial`, input state, and profile are digested and replayed
  canonically by normal apply. The `--profile complete` flag is explicit for
  adoption even though ordinary planning defaults to that profile. It takes no
  baseline and reads no historical backup. Fresh, existing, unsafe, linked,
  non-Git, dirty, or active-session targets are refused before backup or target
  writes. Schema-1 ordinary plans remain supported unchanged.
- `plan --profile <name>` defaults to `complete`; the strict target overlay
  uses `--profile dispatch-only`. An unknown name is refused by manifest
  export selection. A selected profile is part of the serialized plan and
  `planDigest`, so changing it without recomputing the digest is invalid.
- `resolve` accepts only known `ID=choice` pairs and only declared choices. It
  preserves the plan's selected `profile`, derives `copy`, `sidecar`,
  `preserve`, or `skip`, checks destination collisions, and writes a newly
  digested plan; hand-edited plans are invalid.
- `.trellis/.version` and `.trellis/.template-hashes.json` are one official
  baseline decision. Snapshot adoption is allowed only when every referenced
  official-managed file matches the resolved snapshot image.

### Apply and recovery

- Apply rebinds the authority to live state before backup: validate the plan
  digest/schema, canonical and disjoint roots, current manifest digest,
  blockers, all decisions, canonical rebuilt plan, baseline parity, every
  target/sidecar pre-image, and every transformed or ordinary source digest.
- Canonical rebuilding calls `build_plan` with the recorded `plan.profile` and
  `adoptPartial` mode,
  resolves the recorded choices, and compares the complete serialized plan.
  Thus a re-digested switch from `dispatch-only` to `complete` is blocked as
  `plan no longer matches the canonical migration plan`; an unknown recorded
  profile is refused during manifest selection. Both failures happen before
  backup creation or target writes.
- A target must be the root of a clean Git worktree. Recursively inspect
  `.trellis/.runtime/sessions/`; any non-placeholder JSON, unreadable/non-file
  entry, symlink, junction, or reparse point blocks before target writes.
  `{}`, `[]`, and `null` JSON placeholders do not represent active sessions.
- Roots and every traversed path must remain canonical and contained. Same or
  nested template/target roots, rebinding through links/reparse points, and
  symlink traversal are unsupported.
- Backup is external to template and target. Validate each copied pre-image,
  then atomically write a `prepared` receipt before the first target write.
  Each journal entry transitions `prepared -> applying -> applied`, with the
  receipt rewritten before and after replacement. Thus an interrupted receipt
  whose global status is still `prepared` and whose entry is `applying` remains
  a recovery authority.
- The closed receipt schema records canonical roots, its own contained path,
  plan digest, target state, backup root, journal, preserved-root digests,
  logical verification commands, verification report, status, and
  `receiptDigest`; optional fields are string `failure` and the recovery-only
  `baselineRoot`, closed `baselineAudit`, and `quarantinedTargetStates`, which
  must appear together only on an `unsupported_partial` receipt.
  Status values are `prepared`, `applied`, `apply_failed`, `verified`,
  `verified_incomplete`, `verification_failed`, `rollback_failed`, and
  `rolled_back`. Receipt/root/path rebinding, unknown fields, invalid state
  transitions, incomplete preserved coverage, or pre-image tampering is fatal.
- A direct-adoption receipt is schema 3 with required `adoptPartial: true`,
  `targetState: unsupported_partial`, and closed `projectStateDigests`; its
  only optional field is the normal string `failure`, and it has no
  baseline/recovery fields. The digest set covers project-owned merge roots
  and exact config paths while filtering only the receipt's journal
  destinations. This permits an exact reviewed replacement to be verified by
  its installed post-image while retaining target-only and sidecar-retained
  project state in both verification sweeps. Schema-2 direct-adoption receipts
  remain readable for backward compatibility, alongside schema-1 ordinary and
  recovery receipts.
- Mutations use sibling temporary files plus `os.replace`. Apply writes only
  resolved `copy` and `sidecar` destinations. Support-only content is never an
  install action, and project-owned state remains covered by preserved digests.
- Recovery accepts only `unsupported_partial`, and only an explicitly selected
  direct target `.trellis/.backup-*` directory. The baseline must be a real,
  canonical directory tree with no link-like or special entries. Its version
  must equal the current template version; its closed version-2 template-hash
  document must reference regular files whose SHA-256 values match, except for
  an exact normalized path whose most-specific current complete-manifest rule
  is `merge_required`; and its parsed, non-empty `name=` developer identity
  must match a live target identity when one exists. Other preserved developer
  metadata may differ. Every non-`merge_required` mismatch remains blocked.
- The closed recovery plan records `transactionType: recovery`, the canonical
  baseline root/version/complete digest, template and manifest identity, a
  closed `baselineAudit`, sorted actionless `quarantinedTargetStates`, actions,
  decisions, commands, and `planDigest`. `baselineAudit` uses `verified` with
  no exclusions or `verified_with_quarantined_merge_required` with sorted
  entries containing path, expected digest, actual digest, `merge_required`,
  and fixed reason `baseline_digest_mismatch_merge_required`. Candidates are the
  intersection of baseline files and the current manifest-owned `complete`
  export. Recovery excludes preserve, runtime, support, fresh-skeleton, spec,
  task, workspace, developer, current-task, and runtime paths.
- Quarantined paths are removed before recovery actions and decisions are
  built. Their baseline bytes never enter source staging, sidecars, backup
  journals, apply, or rollback. The plan binds equal target pre/post digests,
  including `missing`, so canonical replay refuses target drift before backup.
- Recovery collisions expose only `sidecar`, `keep`, and `replace`. Apply
  canonically rebuilds the recovery plan and revalidates the complete baseline,
  source images, target images, decisions, Git cleanliness, and sessions before
  external backup creation or target writes. Mutation source bytes are staged
  and digest-checked before backup creation, and only those validated bytes may
  be written, so post-replay source drift cannot partially update the target.
- A recovery receipt has `targetState: unsupported_partial`, binds the
  canonical `baselineRoot`, repeats `baselineAudit` and
  `quarantinedTargetStates`, and preserves digests for the baseline and all
  project-owned Trellis roots. Verification proves quarantined target state is
  unchanged in both digest sweeps. The journal must not name a quarantined
  source or destination, and rollback never restores those bytes. It is never
  authority for a later normal migration; generate and approve a fresh normal
  `complete` plan after recovery verification, where excluded paths receive
  their ordinary current-source action or decision.

### Verification and rollback

- Verification first performs a complete installed and preserved digest pass.
  If any precheck fails or is uninspectable, run no commands. Otherwise execute
  the receipt's commands, then repeat the complete digest pass so commands
  cannot mutate installed or preserved state unnoticed.
- Resolve argv element zero with `shutil.which`, then pass that resolved path
  directly to `subprocess.run` with `shell=False`; this includes Windows paths
  such as `python.exe` and `trellis.CMD`. Report the original logical command
  array, not the machine-specific resolved path, in structured output.
- A nonzero command result fails unless a command-specific structured decoder
  proves the expected semantic state. The defined exception is the exact
  logical command `python .trellis/scripts/task.py current --json`: exit `1`,
  whitespace-only stderr, and a valid JSON object whose `current_task` field is
  `null` mean passed; additional object fields are currently tolerated. Prose,
  an array/scalar, a missing field, or empty output never qualifies.
- Sidecars make verification `incomplete`, not success. Digest or command
  failures make it `failed`. Verification tests that ship into targets must run
  without template-only `README.md` or `export-manifest.json`; source-export
  tests may be explicitly skipped when those `support_only` assets are absent.
- Rollback accepts recoverable receipt states, validates receipt/root/backup
  integrity and every live post-image before mutation, and restores only the
  reverse journal. For an `applying` entry with no recorded post-digest, live
  content must equal either its pre-image or expected post-image. Any unrelated
  post-apply edit refuses rollback.
- A partial rollback records `rollback_failed`; rerunning the same receipt is
  supported because already restored paths may equal their pre-images. Success
  records `rolled_back` and removes only empty parent directories created by
  the migration.

## 4. Validation & Error Matrix

| Condition | Required result | Exit |
| --- | --- | --- |
| Invalid JSON/schema, unknown plan field, bad `ID=choice` | Reject input; no target write | `2` |
| Missing/non-string plan `profile`, unknown `--profile`, malformed profile include pattern, duplicate profile pattern, or a profile pattern with no exported match | Reject plan/profile input; no target write | `2` |
| Changed `profile` without a matching digest | Reject as `plan digest or schema is invalid`; no target write | `3` |
| Same/nested/rebound root, non-Git root, dirty tree, recursive session/reparse blocker | Block before target write | `3` |
| Manifest digest changed, rebuilt profile plan differs, source/pre-image/sidecar digest stale | Block before target write | `3` |
| Unknown re-digested recorded profile during apply canonical rebuild | Refuse before backup or target write | `2` |
| Apply invoked without `--approve` | Refuse apply without backup or target mutation | `3` |
| Unresolved decision | Do not create backup or mutate target | `4` |
| Failure after prepared receipt or during mutation | Persist `apply_failed` when possible and report receipt for recovery | `5` |
| Precheck, command, post-command digest, or unresolved-sidecar verification is not success | Emit structured failed/incomplete report | `6` |
| Rollback missing `--approve`, invalid/rebound receipt, changed backup/post-image, or unprovable applying state | Refuse rollback without mutation | `7` |
| Rollback fails after partial restoration | Persist `rollback_failed`; preserve retry authority | `7` |
| Recovery target is not exactly `unsupported_partial`, or its explicit baseline is outside the direct target backup layout, wrong-version, malformed, hash-stale, identity-incompatible, link-like, or contains a special entry | Reject recovery before external backup or target write | `3` |
| Recovery plan/baseline/target/decision replay differs at apply | Reject recovery before external backup or target write | `3` |
| Baseline mismatch is not exact current `merge_required`, or a quarantine audit/state entry is malformed, duplicated, stale, or enters actions/journal | Reject before external backup or target write | `3` |

`plan` may return `3` while still emitting its structured blockers. There is no
`--force` equivalent for any row.

## 5. Good / Base / Bad Cases

- **Good:** A clean fresh Git root plans twice to byte-equivalent JSON without
  changing the target; resolution initializes the explicit developer, apply
  creates an external backup and prepared receipt, verify passes both digest
  sweeps, and rollback restores the original target digest exactly.
- **Good:** `plan --profile dispatch-only` emits only its selected dispatch
  surfaces, serializes `"profile": "dispatch-only"`, and keeps that value
  after resolve; apply canonically rebuilds the same narrow action set before
  any write.
- **Base:** An existing Trellis project preserves tasks, workspace, developer,
  current task, runtime, and specs. A modified managed file resolves to a
  `.harness-new` sidecar; apply succeeds but verification remains incomplete
  until the merge is reconciled.
- **Bad:** A plan becomes stale, the target gains an untracked file, or a
  nested session contains active JSON after planning. Apply rejects the live
  state before its first target mutation; approval does not override it.
- **Bad:** A caller changes a `dispatch-only` plan to `complete`. Without a new
  digest it fails digest validation; with a recalculated digest it still fails
  canonical rebuild because the complete profile produces a different plan.
  A recorded profile named `missing` is refused before backup or target writes.
- **Bad:** A check executable returns `1` and prints prose resembling "no
  current task". Verification fails because semantic acceptance requires the
  exact command and valid structured null state.

## 6. Tests Required

- Manifest coverage: assert every exported file maps once; latent equal-ranked
  overlaps, malformed types, caches/runtime records, and forged support-only
  install actions are rejected.
- Profile coverage: in
  `.trellis/tests/test_harness_migration_core.py`, assert that
  `test_dispatch_only_profile_selects_only_dispatch_surfaces` makes
  `dispatch-only` a strict subset of `complete`, includes its exact approved
  roots, and excludes migration scripts/tests, the migration skill, and other
  specs. Assert POSIX output paths and that an unknown profile is rejected.
  In `test_manifest_rejects_invalid_types_and_latent_equal_overlaps`, replace
  an include with `AGENTS\\md` and assert manifest loading rejects it.
- Stable dry run: compare two full plan dictionaries, compare target digest
  before/after, assert developer path rebinding, official baseline pairing,
  closed-schema rejection, and deterministic decision/action ordering.
- Plan-profile binding: `test_fresh_plan_is_stable_and_non_mutating` asserts
  omitted `profile` is `complete` and equals explicit `complete`.
  `test_plan_profile_round_trips_and_is_digest_protected` asserts
  `dispatch-only` survives `plan_from_dict` and `resolve_plan`, validates its
  digest, rejects a changed profile without re-digesting, and rejects an
  unknown profile. CLI coverage in `test_harness_migration_cli.py` asserts
  `plan --help` exposes `--profile`, default parser value `complete`, and
  parser acceptance of `dispatch-only`.
- Pre-write safety: assert non-Git, dirty Git, same/nested roots, link/reparse
  traversal, non-directory parents, nested active session JSON, unreadable
  session entries, stale sources, stale targets, and stale sidecars leave user
  content unchanged and create no unauthorized backup/write.
- Canonical profile safety:
  `test_apply_revalidates_the_selected_profile_canonically` resolves a
  `dispatch-only` plan, forges its profile to `complete` with a recalculated
  digest, and asserts the canonical-plan refusal with no `.trellis` write.
  It then records `missing`, recalculates the digest, asserts the unknown
  profile refusal, and again asserts no target write.
- Transaction recovery: inject failure before and after replacements; assert
  prepared/applying journal evidence exists, `apply_failed` is recoverable,
  backup digests match pre-images, and rollback returns the complete target
  digest to its pre-apply value.
- Verification order: mutate an installed file before verification and assert
  command execution is skipped; mutate it during a passing command and assert
  the post-pass fails. Repeat with a late preserved-root entry to prove the
  first pass is complete rather than short-circuiting early.
- Command semantics: mock Windows-resolved `python.exe` and `trellis.CMD` paths,
  assert subprocess receives the resolved executable while the report retains
  the logical array; accept only the exact structured no-current-task result.
- Installed-suite isolation: execute installed verification tests in a fixture
  without support-only export assets and assert support-dependent source tests
  skip rather than fail or silently weaken runtime checks.
- Rollback guards: assert receipt/root/backup tampering and post-apply edits
  refuse all restoration; inject partial rollback failure, assert
  `rollback_failed`, rerun, and compare every restored pre-image and created
  parent cleanup.
- Recovery coverage: assert exact partial-state admission; explicit direct
  baseline selection; version, hash, developer, tree-shape, link/reparse,
  dirty-worktree, and active-session refusal; closed plan schema and digest;
  deterministic decisions and resolution choices; canonical stale
  target/baseline and post-replay source-drift refusal before
  backup; preservation of project-owned roots and application files; prepared
  failure receipts; verification; retryable rollback; and a post-recovery
  normal plan classified as `existing_trellis`.
- Quarantine coverage: assert the selected `.codex/config.toml` expected and
  actual digests, exact rule and reason; closed/ordered audit codecs; no action,
  decision, staged source, or journal entry; unchanged absent target state in
  apply and both verification sweeps; non-merge mismatch refusal; canonical
  replay refusal after audit, manifest, baseline, or target drift; rollback
  exclusion; and normal handling in a fresh post-recovery complete plan.

## 7. Wrong vs Correct

### Wrong

```python
# The caller silently broadens a reviewed dispatch migration after planning.
plan["profile"] = "complete"
plan["planDigest"] = recalculate_digest(plan)
copytree(template / ".trellis", target / ".trellis", dirs_exist_ok=True)
```

This changes the profile-owned action set, bypasses canonical revalidation,
and also bypasses ownership decisions, live-state rebinding, and recovery
guards.

### Correct

```text
plan --profile dispatch-only --format json --output plan.json
resolve --plan plan.json --decision <id>=<allowed-choice> --output resolved.json
apply --plan resolved.json --approve --backup <external-root> --format json
verify --receipt <external-root>/receipt.json --format json
# only when explicitly authorized:
rollback --receipt <external-root>/receipt.json --approve --format json
```

All target filesystem authority stays in the deterministic CLI, and every
destructive step remains bound to canonical digests, live safety checks, and a
recoverable receipt.
