---
name: trellis-seven-role-routing
description: "Use when classifying or dispatching this project's Trellis research, implementation, checking, debugging, review, audit, or release-readiness work."
---

# Trellis Seven-Role Routing

Use Trellis's three native roles for the standard path:

- `trellis-research` for persisted evidence gathering.
- `trellis-implement` for a reviewed implementation unit.
- `trellis-check` for specification checks, mechanical fixes, and validation.

Use the project-local Codex roles only when their trigger is present:

- `trellis-debug` for a reproducible failure or failed prior fix.
- `trellis-review` for independent correctness judgment after mechanical checks.
- `trellis-audit` for high-risk requirement, policy, and evidence traceability.
- `trellis-release` for a read-only release-readiness decision.

The main session owns requirements, task trees, route selection, dispatch,
dependency ordering, result integration, commits, and finish-work. A dispatched
role must never spawn another Trellis role.

Before dispatching, read [the role contract](references/role-contract.md) and
[the model routing contract](references/model-routing.md). Every dispatch
prompt starts with `Active task: <task-path>` and declares the route, owned
paths, dependencies, expected artifacts, and proof. Run at most three
independent units concurrently; overlapping ownership requires explicit
ordering.

Use a direct platform sub-agent for one isolated result. Load the bundled
`trellis-channel` skill only when the work needs durable multi-round messages,
progress inspection, interruption, or cross-provider collaboration.
