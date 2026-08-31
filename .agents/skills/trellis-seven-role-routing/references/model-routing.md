# Trellis Seven-Role Model Routing Contract

## Route Table

| Route | Model | Effort | Intent |
| --- | --- | --- | --- |
| `micro` | `gpt-5.3-codex-spark`; fallback `gpt-5.6-terra` | Spark `medium`; fallback Terra `low` | Tiny mechanical work |
| `exploration` | `gpt-5.6-terra` | `medium` | Evidence and codebase exploration |
| `bounded_worker` | `gpt-5.6-terra` | `high` | Default bounded worker |
| `checking` | `gpt-5.6-terra` | `max` | Verification and self-fix |
| `hard_checking` | `gpt-5.6-sol` | `xhigh` | Verification after difficult or cross-boundary implementation |
| `coordination` | `gpt-5.6-sol` | `medium` | Main-session coordination |
| `debugging` | `gpt-5.6-sol` | `low` | Reproduction-first debugging |
| `planning` | `gpt-5.6-sol` | `medium` | Requirements and implementation planning |
| `hard_implementation` | `gpt-5.6-sol` | `medium` | Difficult implementation |
| `review` / `audit` / `release` | `gpt-5.6-sol` | `high` | Correctness, traceability, and readiness gates |
| `memory_worker` | `gpt-5.6-terra` | `medium` | Memory search and extraction |
| `curator` | `gpt-5.6-sol` | `medium` | Memory synthesis and durable curation |

## Seven-Role Mapping

- `trellis-research` uses `exploration`.
- `trellis-implement` uses `bounded_worker` by default. Classify work as
  `hard_implementation` only when it is ambiguous, cross-boundary, or requires
  difficult multi-step judgment.
- `trellis-check` uses `checking` after routine implementation and
  `hard_checking` after `hard_implementation`.
- `trellis-debug` uses `debugging`.
- `trellis-review`, `trellis-audit`, and `trellis-release` use their matching
  high-effort Sol routes.

The main session uses `coordination` as a pure coordinator for active
implementation tasks: it dispatches every substantive implementation,
configuration, test, documentation, and spec change, but does not perform
those changes itself. Before doing substantive Trellis planning, select
`planning`; this is a main-session model choice, not an eighth Trellis role.
Micro uses Codex's built-in bounded worker unless the main session is
already running the resolved micro model/effort. Memory routes likewise use a
built-in bounded worker or the main session, not a new Trellis role.

A skill cannot silently change the model of an already-running main thread.
Use the app/CLI model control before planning, or start a planning thread with
Sol/medium. Do not claim the planning route was applied when the active thread
still uses the coordination default.

## Resolution Rules

Codex resolves custom-agent model settings independently. A model or effort in
the agent profile wins. Otherwise an explicit spawn override wins, then the
project `[agents]` default, then the parent session.

The project sets the main default to Sol/medium and the sub-agent default to
Terra/high. The native implement profile remains unpinned, so routine work
inherits Terra/high and `hard_implementation` can use explicit Sol/medium
overrides. Research is pinned to Terra/medium. Check remains unpinned so the
main session can explicitly select Terra/max `checking` or Sol/xhigh
`hard_checking`. Debug and the three read-only assurance roles are pinned in
their project-owned profiles.

## Spark Fallback

Before selecting `micro`, inspect the current Codex model catalog and spawn
surface. Use `gpt-5.3-codex-spark` at medium only when both expose it for the
current account. Otherwise use `gpt-5.6-terra` at low. Do not retry an
unavailable Spark route in a loop. As of the 2026-08-05 verification, Spark is
absent from this account's catalog, so the effective micro route is Terra/low.

## Channel Boundary

This contract is enforced by direct Codex profiles and spawn overrides.
`trellis channel spawn` accepts `--model` but has no reasoning-effort flag, and
Channel role cards do not inherit direct-agent profiles. Use direct Codex when
the exact model/effort pair is required. A Channel dispatch must state any
model override explicitly and must not claim effort enforcement it cannot
prove.
