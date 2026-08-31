# Seven-Role Routing And Dispatch Contract

## 1. Scope / Trigger

Use this contract whenever the main session selects a Trellis role or splits a
task into more than one work unit. Role selection is behavioral policy, not a
separate scheduler or task identity.

Micro work uses the built-in Codex bounded worker unless the main session is
already running the resolved micro model/effort. Research, implementation, and
checking use the Trellis-managed native roles. Debug, review, audit, and
release use the project-local Codex profiles under `.codex/agents/`.

## 2. Signatures

Every direct or Channel dispatch starts with this brief:

```text
Active task: <repository-relative task path>
Role: <research|implement|check|debug|review|audit|release>
Route: <model route from the route table>
Owned paths: <repository-relative paths, or read-only>
Depends on: <work-unit identifiers, or none>
Expected artifacts: <files or decision report>
Proof: <commands or inspectable evidence>
```

For Channel, the equivalent execution signature is:

```powershell
trellis channel spawn --agent <role> --file <path> --jsonl <manifest>
```

The main session supplies only applicable `--file` and `--jsonl` arguments and
includes the active-task line in the worker message.

## 3. Contracts

### Role contract

| Need | Role | Model route | Write boundary | Context family | Required proof |
| --- | --- | --- | --- | --- | --- |
| Persist missing evidence | `trellis-research` | `exploration` | Active task `research/` | Native research | Source-indexed report |
| Implement reviewed work | `trellis-implement` | `bounded_worker` or `hard_implementation` | Assigned paths | Implementation | Artifacts and focused checks |
| Verify and self-fix | `trellis-check` | `checking` or `hard_checking` | Task scope | Check | Findings and validation results |
| Reproduce and fix a failure | `trellis-debug` | `debugging` | Assigned failure scope | Implementation | Reproduction, root cause, regression proof |
| Independent correctness review | `trellis-review` | `review` | Read-only | Check | Severity-ordered file:line findings |
| Requirement/risk/evidence trace | `trellis-audit` | `audit` | Read-only | Check | Requirement/risk/evidence trace |
| Release-readiness decision | `trellis-release` | `release` | Read-only | Check plus operator evidence | `ready` or `blocked` |

### Model route contract

| Route | Model | Effort | Intent |
| --- | --- | --- | --- |
| `micro` | `gpt-5.3-codex-spark`; fallback `gpt-5.6-terra` | `medium`; fallback `low` | Tiny mechanical work |
| `exploration` | `gpt-5.6-terra` | `medium` | Exploration |
| `bounded_worker` | `gpt-5.6-terra` | `high` | Default bounded worker |
| `checking` | `gpt-5.6-terra` | `max` | Verification and self-fix |
| `hard_checking` | `gpt-5.6-sol` | `xhigh` | Check difficult or cross-boundary implementation |
| `coordination` | `gpt-5.6-sol` | `medium` | Main-session coordination |
| `debugging` | `gpt-5.6-sol` | `low` | Debugging without default max |
| `planning` | `gpt-5.6-sol` | `medium` | Planning |
| `hard_implementation` | `gpt-5.6-sol` | `medium` | Difficult implementation |
| `review` / `audit` / `release` | `gpt-5.6-sol` | `high` | Assurance gates |
| `memory_worker` | `gpt-5.6-terra` | `medium` | Memory search and extraction |
| `curator` | `gpt-5.6-sol` | `medium` | Memory synthesis and curation |

The project Codex config sets the main default to Sol/medium and the spawned
agent default to Terra/high. The native implement and check profiles stay
unpinned so explicit spawns can select Sol/medium hard implementation,
Terra/max routine checking, or Sol/xhigh hard checking. Research pins
Terra/medium, and debug/review/audit/release profiles pin their invariant model
routes.

Spark is availability-gated. The main session checks both the current Codex
model catalog and spawn surface before selecting it and falls back once to
Terra/low when either does not expose it. It must not loop retries or silently
substitute another model.

Planning and coordination describe the main session, not additional Trellis
roles. A project skill cannot hot-switch an already-running main thread, so
planning selects Sol/medium through the app/CLI model control or a new planning
thread. Micro and memory routes may use built-in bounded workers and do not
expand the seven-role set.

### Main-session ownership

The Sol/medium main session is coordination-only. It may select roles,
dispatch work, coordinate dependencies, verify evidence, integrate results,
commit, or run finish-work, but it must not directly modify implementation,
configuration, test, documentation, or spec files for an active task. Every
independent implementation unit is dispatched to `trellis-implement` and then
to `trellis-check`; dispatch `trellis-research` when evidence is missing.
A child role performs its assigned work directly and must not spawn another
Trellis role.

At most three independent units may run concurrently. Concurrent units must
not have overlapping ownership. Reusing a path is allowed only when dependency
ordering prevents simultaneous writes. Completion messages are not proof; the
main session verifies artifacts and commands before integration.

For every dispatch, record the selected route. Codex model resolution follows:
agent-profile pin, explicit spawn override, project `[agents]` default, then
parent session. Because a profile pin wins, hard implementation must use the
unpinned native implement profile with an explicit Sol/medium spawn override.

### Context families

- Implementation: `implement.jsonl`, every real referenced file, `prd.md`,
  optional `design.md`, and optional `implement.md`. Debug uses this family.
- Check: `check.jsonl`, every real referenced file, `prd.md`, optional
  `design.md`, and optional `implement.md`. Review, audit, and release use this
  family.
- Native roles keep their Trellis-managed context behavior. Custom roles pull
  only from the exact task path in the first prompt line.

### Optional Channel adapter

Use direct platform sub-agents for isolated work. Use `trellis channel` only
for durable multi-round messages, progress inspection, interruption, or
cross-provider collaboration. Channel loads `.trellis/agents/<name>.md`; it
does not inherit `.codex/agents/` profiles or direct-agent hook context.

Bundled `implement` and `check` cards remain Trellis-managed. Research, debug,
review, audit, and release cards are project-local adapters. A read-only
Channel card is an instruction boundary, not an enforced Codex sandbox.

Channel supports a model override but no reasoning-effort flag. Use the direct
Codex path whenever the exact model/effort pair is required. Never report a
Channel effort as enforced without provider-level evidence.

### Permission boundaries

- Research writes only under the active task's `research/` directory.
- Implement writes only inside assigned ownership.
- Check may self-fix issues inside task scope.
- Debug is workspace-write, reproduces first, applies the narrowest fix, and
  adds regression proof.
- Review, audit, and release use read-only Codex sandboxes.
- Release never tags, publishes, deploys, contacts an external system, or
  treats readiness as authorization.

## 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| `Active task:` is missing or invalid | Stop and ask the main session; do not infer another task |
| Manifest is missing or contains a nonexistent file | Stop and report the exact missing path |
| Two concurrent units own the same path | Serialize them with an explicit dependency |
| A child attempts another dispatch | Refuse; return control to the main session |
| A read-only role needs a fix | Report the finding; do not edit |
| Release evidence is incomplete | Return `blocked` with exact blockers |
| Channel requires enforced filesystem read-only | Use the direct Codex role instead |
| Proof command fails | Report failure; do not claim completion |
| Spark is absent from the current model catalog | Select Terra/low once; do not retry Spark |
| A route requires an exact effort through Channel | Use direct Codex or report the unenforced boundary |
| Routine implement becomes ambiguous or cross-boundary | Reclassify to `hard_implementation` before dispatch |

## 5. Good / Base / Bad Cases

- Good: The main session sends `trellis-debug` one owned failure scope, a real
  task path, the `debugging` route, implementation context, and a reproduction
  command. Debug runs Sol/low, fixes the cause, and returns a regression test
  plus rerun output.
- Base: A small, single-file edit stays in the main session and uses normal
  Trellis check/finish gates. A dispatched bounded worker uses Terra/high.
- Bad: A review role guesses the current task, edits the defect it finds, or
  uses the Terra default instead of its pinned Sol/high assurance route.

## 6. Tests Required

- Assert Trellis-managed hashes include only the native three Codex profiles
  and bundled Channel implement/check cards.
- Parse every custom TOML profile and assert sandbox, context family, no-spawn
  boundary, and pinned model route.
- Parse project Codex config and assert Sol/medium main and Terra/high
  sub-agent defaults, the Terra/medium research pin, and unpinned implement and
  check profiles that accept explicit route overrides.
- Assert the route table covers micro fallback, exploration, bounded work,
  coordination, debugging, planning, hard implementation, assurance, and
  memory routes.
- Assert the native Codex hook matcher remains limited to
  research/implement/check.
- Assert the project skill and Channel cards represent all seven roles.
- Assert legacy plugin entry points and live contract references are absent.
- Run `trellis update --dry-run` and verify custom role files are not reported
  as Trellis-managed conflicts.

## 7. Wrong vs Correct

Wrong:

```text
Please review the current task and fix anything you find.
```

Correct:

```text
Active task: .trellis/tasks/08-05-example
Role: review
Route: review
Owned paths: read-only
Depends on: check-1
Expected artifacts: severity-ordered findings with file:line evidence
Proof: inspect check.jsonl entries and recorded validation output
```

The correct brief selects an exact context, preserves the role's permission
boundary, and gives the main session evidence it can independently verify.
