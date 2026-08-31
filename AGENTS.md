<!-- TRELLIS:START -->
# Trellis Instructions

These instructions are for AI assistants working in this project.

This project is managed by Trellis. The working knowledge you need lives under `.trellis/`:

- `.trellis/workflow.md` — development phases, when to create tasks, skill routing
- `.trellis/spec/` — package- and layer-scoped coding guidelines (read before writing code in a given layer)
- `.trellis/workspace/` — per-developer journals and session traces
- `.trellis/tasks/` — active and archived tasks (PRDs, research, jsonl context)

If a Trellis command is available on your platform (e.g. `/trellis:finish-work`, `/trellis:continue`), prefer it over manual steps. Not every platform exposes every command.

If you're using Codex or another agent-capable tool, additional project-scoped helpers may live in:
- `.agents/skills/` — reusable Trellis skills
- `.codex/agents/` — optional custom subagents

Managed by Trellis. Edits outside this block are preserved; edits inside may be overwritten by a future `trellis update`.

<!-- TRELLIS:END -->

# Project Seven-Role Policy

Before classifying or dispatching Trellis research, implementation, checking,
debugging, review, audit, or release-readiness work, load the project-local
`trellis-seven-role-routing` skill. The main session owns role selection,
dispatch, integration, commits, and finish-work. Trellis sub-agents must work
directly on their assigned unit and must not spawn another Trellis sub-agent.

# Pure Coordination Dispatch Policy

For active Trellis implementation tasks, the main Codex session runs as the
`gpt-5.6-sol` / `medium` coordination layer. It may classify, plan, split
work, dispatch, verify evidence, integrate results, update task state, and
commit, but it must not directly modify implementation, configuration, test,
documentation, or spec files.

Each independent implementation unit must be dispatched to
`trellis-implement` at `gpt-5.6-terra` / `high`, followed by
`trellis-check` at `gpt-5.6-terra` / `max`. A complex or cross-boundary
implementation must instead be followed by `trellis-check` at
`gpt-5.6-sol` / `xhigh`. Dispatch
`trellis-research` when repository or external evidence is missing. Dispatch
complex or cross-boundary implementation with the `hard_implementation` route
(`gpt-5.6-sol` / `medium`); use the Sol assurance roles for their defined
debugging, review, audit, and release triggers.

This policy applies to the main session only. A dispatched worker performs its
assigned work directly and must not dispatch another Trellis worker. Pure
conversation, clarification, and task planning without an active task remain
main-session work.
