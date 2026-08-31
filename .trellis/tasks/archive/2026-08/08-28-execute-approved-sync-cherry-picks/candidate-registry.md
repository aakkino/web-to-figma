# Candidate Registry

| Cohort | Approval | Task | Dependency |
| --- | --- | --- | --- |
| FD1 | merged and contained (`62eef8d`, reconciled `d3459aa`, merge `687a8509`) | archived rebuild; `08-29-promote-fd1-to-main`; PR #20 | complete in `origin/main@687a8509` |
| BG1 | merged and contained (`92c8452f`, merge `98c10d5f`) | `archive/2026-08/08-28-rebuild-bg1-css-raster-backgrounds`; `08-28-promote-bg1-to-main`; PR #14 | complete |
| BG2 | merged and contained (`a1c06bd`, merge `1c26bc2`) | `08-28-rebuild-bg2-lazy-background-sources`; PR #16 | complete in `origin/main@1c26bc2a` |
| LA1 | merged and contained (`394e1f8`, merge `df9fbdf`) | `archive/2026-08/08-29-rebuild-la1-lazy-activation-preflight`; PR #17 | complete |
| LA2 | represented/superseded; zero product diff | archived `08-29-rebuild-la2-infinite-scroll-stabilization` | complete |
| CP1 | merged and contained (`d52369b`, merge `0a311e1`) | `archive/2026-08/08-29-rebuild-cp1-replayable-capture-artifacts`; PR #18 | complete |
| CP2 | merged and contained (`41425ef`, merge `decde39a`) | archived `08-29-rebuild-cp2-capture-persistence-integration`; PR #19 | complete in `origin/main@decde39a` |

Architectural boundaries such as adapter, converter, storage, messaging,
publishing, and lockfiles are not candidate rows. They require explicit scope
inside an approved cohort or a separately justified deliverable.

## FD1 Reconciliation

- Target revalidated immediately before execution:
  `main@dd91f18346d7326ab71c1a77769bfe7aed310af3`.
- Rebuilt against current contracts with new patch identity; no historical
  cherry-pick was used.
- Execution commit:
  `62eef8de9ff01b4d58c905a8f8e2949da00703b8` on
  `task/rebuild-fd1-font-diagnostics`.
- Directed Biome, 39 extension tests including headless Chromium, type-check,
  Chrome MV3 build, Firefox MV2 build, and `git diff --check` passed.
- Independent review fixed Unicode C1/format-control privacy filtering and
  found no remaining issue.
- The dirty sync root branch, HEAD, staged state, tracked dirty-file hashes,
  and prior worktree occupancy were preserved.
- Promotion child `08-29-promote-fd1-to-main` merged current fork main into the
  preserved source without rewriting `62eef8d`, producing reviewed head
  `d3459aa` and the exact four-file payload.
- Directed/focused/extension/repository gates, Chrome/Firefox builds, six CI
  checks, and a real-extension `1 exact / 1 fallback / 1 unavailable` smoke
  passed. PR #20 merged as `687a8509`; refreshed `origin/main` contains all
  identities, and the source branch remains preserved.

## BG1 Reconciliation

- User authorized BG1 planning and later implementation on 2026-08-28 after
  FD1 reconciliation.
- Child `08-28-rebuild-bg1-css-raster-backgrounds` completed its local-delivery
  scope and was archived.
- Implementation commit: `30d33b9`; committed-shape governance fingerprint:
  `5b906e2` on `task/rebuild-bg1-css-raster-backgrounds`.
- Core, adapter, extension, compatibility, 47-scene oracle, touched-file lint,
  and governance checks passed. Repository-wide lint remains blocked only by
  371 pre-existing CRLF findings outside the BG1 diff.
- The isolated BG1 worktree remained clean and the dirty sync root remained
  untouched throughout local delivery and promotion.
- The archived child's branch, worktree, commit, approval status, acceptance
  checklist, and promotion boundary were backfilled after the planning defect
  was identified.
- Child `08-28-promote-bg1-to-main` promoted the four-commit final reviewed
  head `92c8452f` through PR #14 and merge commit `98c10d5f`. Refreshed
  `origin/main` contains both identities, the exact 23-file payload, and the
  source branch remains preserved.
## BG2 Reconciliation

- User authorized the reviewed end-to-end plan, local commit, push, PR
  creation, and merge through separate gates on 2026-08-29.
- The current-baseline rebuild produced reviewed head `a1c06bd` without
  cherry-picking historical S46/S47 evidence.
- Core, adapter, extension, compatibility, governance, 47-scene oracle,
  touched-file lint, full-workspace type/build/test, and `git diff --check`
  passed; all six PR checks succeeded.
- PR #16 preserved the one-commit, 22-file payload and merged through merge
  commit `1c26bc2a` without auto-merge, force-push, or protection bypass.
- Refreshed `origin/main@1c26bc2a` contains both reviewed head `a1c06bd` and
  merge commit `1c26bc2a`; the reviewed head is the merge commit's second
  parent and the remote source branch remains preserved.
- The dirty sync root remained untouched throughout implementation and remote
  promotion. On 2026-08-29 the user explicitly approved parallel planning for
  root cohorts LA1 and CP1. At that checkpoint LA2 and CP2 were deferred until
  prerequisite containment and separate approval; both later completed through
  their independently governed children as recorded below.

## LA1 And CP1 Planning Batch

- Both children plan against remote `origin/main@1c26bc2a` and must re-pin the
  moving target before implementation.
- Historical S49 (`dfd432b`) and S52 (`e1f134b`) are evidence only; neither old
  commit may be cherry-picked or replayed.
- Parallel planning and isolated-worktree development are authorized. Shared
  uncommitted work is prohibited, and merge is serialized: LA1 first, then CP1
  synchronized to contained LA1 `main` and fully revalidated.
- Task creation and planning do not authorize implementation. Each child needs
  separate final-plan approval before `task.py start`.

## LA1 And CP1 Reconciliation

- LA1 local commit `394e1f8` passed its local and remote gates, merged through
  PR #17 as `df9fbdf`, and was archived after the user confirmed manual smoke.
- CP1 synchronized the contained LA1 target, resolved the shared extension
  controller/settings contract, passed its repeated gates, and merged through
  PR #18 as `0a311e1`. Its child was archived after the user confirmed manual
  smoke.
- A refreshed `origin/main@0a311e1078c57af9cbf30a58d41c6f5fa6cbf4d8`
  contains both merge commits.
- LA2 subsequently passed focused browser/type/build verification and closed
  as represented/superseded by LA1 with zero product diff.
- CP2 changed only the combined output label, passed its local and six remote
  checks, and merged PR #19 as `decde39a60a220d6ea853f04c3893a0446fa76bf`.
- FD1 promotion then merged PR #20 as
  `687a8509969b24aba13ee414cc19b3d6aef1d20f`. The execution container now has
  seven completed cohorts across nine children, with all target-line outcomes
  contained in final `origin/main@687a8509`.
