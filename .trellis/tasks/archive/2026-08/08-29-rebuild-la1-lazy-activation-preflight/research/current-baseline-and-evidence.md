# LA1 Current Baseline And Evidence

## Target

- Remote `origin/main` resolved by `git ls-remote` on 2026-08-29 to
  `1c26bc2a48dbe9a7dd642aeca6b546c3bd52ffec`.
- Local `refs/remotes/origin/main` matches that SHA.
- The dirty root is `sync/upstream-20260726@9c949a4`; it is evidence and must
  remain untouched by implementation.

## Historical Evidence

- Candidate S49: `dfd432b85ad83510efe4a892bc99fbaa03cdd051`.
- Historical task:
  `.trellis/tasks/archive/2026-08/07-31-browser-capture-lazy-activation-preflight/`.
- The old patch crossed adapter and extension state/settings boundaries and
  introduced `lazy-activation.ts`; it is not safe to cherry-pick onto current
  `main` because BG1/BG2 and workspace contracts have moved.

## Current-Target Findings

- Current `main` adapter performs analyze -> review -> revalidate -> image
  stage -> font preflight -> settle -> conversion.
- `lazy-activation.ts`, an activation phase, and `lazyActivation` settings are
  absent from current `main`.
- BG2 provides the staged lazy-background source pipeline LA1 must reuse.
- Existing `AbortController`, inventory, composed traversal, scheduler, and
  controller phase mapping are the integration points.

## Delivery Constraints

- LA1 and CP1 are independent roots but overlap in extension controller/UI
  files. Use isolated worktrees and serialize merge as LA1 then CP1.
- LA2 remains deferred until LA1 is merged, contained, and separately approved.
