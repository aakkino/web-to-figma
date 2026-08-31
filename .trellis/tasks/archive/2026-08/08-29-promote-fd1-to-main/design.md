# Design: Promote FD1 font diagnostics to main

## Promotion Topology

```text
dd91f183 (original FD1 base)
  -> 62eef8d (immutable reviewed FD1 implementation)
                         \
decde39a (planning origin/main) -> merge current main into FD1 branch
                                   -> <reconciled-reviewed-head>
                                   -> ordinary non-force push
                                   -> one PR targeting main
                                   -> local, manual, CI, and review gates
                                   -> explicitly authorized GitHub merge commit
                                   -> refreshed origin/main containment proof
                                   -> execution-container and parent reconciliation
```

The preserved FD1 worktree is the only execution context. The dirty sync root
is preservation evidence only. The first implementation action refreshes
`origin/main`; the planning SHA is not assumed to remain current.

## Identity Contract

Record and keep distinct:

- original base: `dd91f18346d7326ab71c1a77769bfe7aed310af3`;
- immutable FD1 implementation: `62eef8de9ff01b4d58c905a8f8e2949da00703b8`;
- refreshed PR base: exact `origin/main` immediately before reconciliation;
- reconciled reviewed head: the merge commit whose parents are the preserved
  FD1 head and refreshed target;
- remote source head: must equal the reconciled reviewed head after push;
- GitHub merge commit and refreshed final `origin/main`.

No identity may be substituted silently. Target drift, an unexpected remote
branch/PR, or a different source head stops the task before mutation.

## Reconciliation Boundary

The reviewed FD1 payload owns:

- `apps/extension/entrypoints/content/font-recovery-diagnostics.tsx`;
- `apps/extension/entrypoints/content/font-recovery-diagnostics.test.tsx`;
- the direct font-recovery integration in
  `apps/extension/entrypoints/content/app.tsx`;
- the focused-test registration in `apps/extension/vitest.config.ts`.

Current main owns all later capture settings, lazy activation, replayable
artifact, output, reset, and controller behavior. The merge result combines
these contracts without redesigning either side. A clean automatic merge is
still independently reviewed at the file and behavior level; if Git produces
a conflict, resolution is restricted to retaining both current-main behavior
and the reviewed FD1 integration. Any need for a fifth product file or a
behavioral redesign returns to planning.

## Validation And Review

Validation binds to the committed reconciled head, not an uncommitted merge
tree. It covers:

- exact four-file base-to-head payload and whitespace integrity;
- FD1 UI/privacy tests, including Unicode control filtering;
- all extension unit/browser tests, type-check, and Chrome/Firefox builds;
- repository lint, type, build, and test gates used by the PR;
- a real-extension recovery-state smoke;
- independent review of current-main preservation, FD1 privacy, PR metadata,
  remote checks, and root/worktree preservation.

Repository-wide failures may be classified as pre-existing only after they are
reproduced on the exact refreshed base with the same command. A touched-file,
focused, extension, privacy, build, or CI failure is always material.

## Remote State Machine

The promotion repository is explicitly `aakkino/web-to-figma`: its `main`
branch is the PR base and `origin` is the push remote. The parent repository
`figitdesign/web-to-figma` remains the `upstream` compatibility input only.
Every `gh` command must pass `--repo aakkino/web-to-figma` so GitHub CLI fork
inference cannot substitute the parent repository.

```text
local-only
  -- explicit push approval --> remote branch
  -- explicit PR approval --> open PR
  -- successful CI + review + smoke + explicit merge approval --> merged
  -- containment proof --> reconciled and ready to archive
```

Planning and task activation authorize none of these transitions. Material PR
body or head updates require authorization appropriate to the mutation. Pushes
are ordinary non-force updates; merge uses GitHub's merge-commit method.

## Rollback

- Before push: leave the local branch/worktree intact; remote state is absent.
- After push, before PR: retain the remote branch unless deletion is separately
  authorized.
- After PR, before merge: close the PR only with authorization; `main` remains
  unchanged.
- After merge: use a reviewed revert PR for the GitHub merge commit. Never
  rewrite `main`, force-push the source, or delete preservation evidence as an
  implicit rollback.

## Governance Reconciliation

After containment, record branch, original and reconciled heads, PR URL,
checks, merge SHA, final main SHA, payload, preservation result, and rollback
in this task. Update `08-28-execute-approved-sync-cherry-picks` to show 9/9
children completed and FD1 merged/contained, then perform the top-level final
integration review. Archival and worktree/branch cleanup remain separate
operations.
