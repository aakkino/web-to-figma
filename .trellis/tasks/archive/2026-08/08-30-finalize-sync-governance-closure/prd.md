# Finalize sync governance closure

## Goal

Complete the governance-only closure of
`08-28-govern-sync-branch-cherry-picks` without staging product code or
unrelated dirty work. Repair the archived Trellis context references, account
for the post-ledger source tail, archive this closure child, make the original
parent archive the final commit on `sync/upstream-20260726`, and attest that
terminal commit with a local annotated tag.

## Background

- All approved product cohorts and the S79 oracle specification are contained
  in `origin/main@1c98bb0e0d04682f619a5aadccdd5027959ac2e0`.
- The existing extended ledger ends at S87 `3c2ebb8`, while the current source
  tip is S88 candidate `c54ee85`, the reconciliation-child archive commit.
- The original parent remains in `planning` with its final three acceptance
  criteria open.
- Eight archived task directories failed `task.py validate` because their
  JSONL manifests still referenced pre-archive active task paths; this task
  repairs those references before the terminal archive handoff.
- Six task-tree archive directories are wholly untracked on both the sync and
  target lines. Their complete task evidence must be committed so validation
  remains reproducible from a clean checkout rather than depending on local
  untracked files.
- The root checkout contains unrelated product, experiment, screenshot, agent
  configuration, and Trellis changes that must remain untouched.
- `task.py archive` stages the broad `.trellis/tasks/archive` path by default;
  this task must therefore use `--no-commit` and explicit path staging.

## Requirements

- Treat this task as the fourth direct child of
  `08-28-govern-sync-branch-cherry-picks`.
- Change only the closure task, the original parent task, the archived
  reconciliation ledger, and the exact archived JSONL manifests required to
  restore validation. Archive moves of this closure child and the original
  parent are also owned.
- Do not stage or modify product code, `.gitignore`, `.agents/`, `.claude/`,
  `.codex/`, `.tmp/`, screenshots, experiment directories, unrelated Trellis
  tasks, or workspace journal files.
- Replace stale active-task references in the eight failing archived task
  manifests with their actual archive paths. Do not rewrite task evidence or
  acceptance decisions.
- Include the complete archived directories for the audit-import, FD1 rebuild,
  LA1, CP1, LA2, and CP2 nodes because none of their files are currently
  tracked. Do not include any other untracked archive directory.
- Extend the source-tail evidence through S88 `c54ee85` and preserve the
  semantic-disposition contract. The closure-child archive and final parent
  archive commits are terminal governance-only rows attested by the annotated
  tag, avoiding a self-referential post-terminal commit.
- Refresh the parent closure evidence to target
  `origin/main@1c98bb0e0d04682f619a5aadccdd5027959ac2e0` and mark acceptance only
  when Git ancestry, ledger coverage, validation, and staged-path checks pass.
- Run archive operations with `--no-commit`. Stage only exact owned paths,
  inspect `git diff --cached --name-status`, and abort the commit if any path is
  outside the allowlist.
- Archive this closure child before the original parent. The original parent
  archive commit must be the last commit on `sync/upstream-20260726`.
- Create the local annotated tag
  `archive/sync-upstream-20260726-terminal-20260830` at the final parent archive
  commit. Its annotation must record the terminal SHA, target SHA, S88 and the
  two final governance dispositions, and semantic rather than literal closure.
- Do not push the tag, delete branches or worktrees, clean files, stash work,
  or publish any remote mutation.

## Acceptance Criteria

- [x] All 14 pre-existing task-tree nodes plus this closure child pass
      `python ./.trellis/scripts/task.py validate <task-dir>` from their
      current pre-archive active or archive locations.
- [ ] Every file required to validate the 15-node tree is present in the
      penultimate commit; validation does not depend on local untracked task
      evidence.
- [ ] After the two archive operations, this closure child and the original
      parent pass validation from their final archive locations.
- [x] `origin/main` remains at or contains `1c98bb0e`, and the reviewed BG1,
      BG2, LA1, CP1, CP2, FD1, and S79 commits remain ancestors; LA2 remains an
      evidence-backed represented/superseded zero-diff outcome.
- [x] The committed-source closure evidence accounts for S88 exactly once.
- [ ] The annotated terminal tag accounts for both final governance-only
      archive commits exactly once.
- [x] No approved product capability or durable governance contract remains
      available only from the frozen sync branch.
- [ ] The penultimate commit contains only exact closure-owned Trellis paths
      and archives this closure child.
- [ ] The final branch commit archives
      `08-28-govern-sync-branch-cherry-picks` and contains only its source/archive
      relocation plus relationship metadata necessarily changed by that archive.
- [x] The staged set is empty at the pre-archive handoff, and unrelated
      tracked/untracked work remains present and unstaged.
- [ ] The staged set is empty after each archive commit, and unrelated
      tracked/untracked work remains present and unstaged.
- [ ] Local annotated tag
      `archive/sync-upstream-20260726-terminal-20260830` resolves to the final
      parent archive commit, and no later source-branch commit exists.
- [ ] No product code, remote ref, branch, worktree, or unrelated Trellis state
      is modified by this task.

## Out Of Scope

- Product implementation or product-test changes.
- Reopening completed cohort decisions.
- Publishing the terminal tag or deleting the frozen source branch.
- Cleaning, normalizing, committing, or assigning ownership to unrelated
  working-tree content.

## Key Decisions

- This is a lightweight PRD-only task, but its commit and tag gates are strict
  because the final source identity must not move afterward.
- Exact-path manual staging is required; broad archive staging and `git add -A`
  are prohibited.
- The annotated tag is the non-self-referential terminal attestation for the
  final archive rows.
- This child records evidence-backed pre-archive gates only. Its archive commit,
  the final parent archive commit, and the terminal tag are explicit handoff
  gates that must be verified after this active task directory has moved.
