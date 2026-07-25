# 实施计划

## 0. Preflight Snapshot

- [x] Confirm GitHub identity is `aakkino`, source access is READ, and `aakkino/web-to-figma` still does not exist.
- [x] Record exact `HEAD`, `main` tracking config, remote URLs, tags, ahead/behind counts and `git status --porcelain=v2`.
- [x] Confirm common base is `ac830db5b89d2e8e7eede86f9419303988ae1938`; the initial local snapshot contains 35 commits, while a fresh upstream fetch revealed 5 new upstream commits.
- [x] Confirm no existing local or remote tags collide with `fork-base/ac830db` or `fork-v0.1.0`.

## 1. Create And Normalize Fork

- [x] Create the GitHub fork `aakkino/web-to-figma` from `figitdesign/web-to-figma` without cloning another worktree.
- [x] Normalize remotes so `origin` is the personal fork and `upstream` is the source repository for both expected fetch relationships.
- [x] Ensure local `main` tracks `origin/main`; fetch `upstream` without merging it.
- [x] Verify GitHub reports the correct parent and no unexpected remote was added.

## 2. Establish Immutable Baselines

- [x] Create annotated `fork-base/ac830db` at the full common-base commit.
- [x] Re-read HEAD, then create annotated `fork-v0.1.0` at that exact commit.
- [x] Initialize `origin/main` from the approved local snapshot with an exact `--force-with-lease`, then retain explicit upstream tracking.
- [x] Push the two explicit governance tags to `origin`; do not use a broad `--tags` push.

## 3. Verify Preservation

- [x] Verify local HEAD equals `origin/main` and the initial 35 local commits are reachable from the personal fork.
- [x] Verify `fork-base/ac830db...fork-v0.1.0` is `0 35`, current `upstream/main...main` is `5 41`, and the common base is unchanged.
- [x] Compare the 334-path preflight and postflight content manifests; SHA-256 remains `a8773e97a92565f848f438ffdf826c56bffc5a01bbdcfdd6b7e6407ce39e82fd` before task-record updates.
- [x] Verify no commit was amended/rebased and no package version, changeset, user fixture or generated artifact changed.

## 4. Protect Fork Main

- [x] Trigger/observe fork CI on the pushed `main` and collect actual check context names.
- [x] Configure `main` to block force pushes and deletion.
- [x] Enable PR and required-check protection using observed CI contexts; do not guess missing contexts.
- [x] Query branch protection back from GitHub and verify effective settings.

## 5. Record Sync Policy

- [x] Add a concise repository-owned fork maintenance document describing remotes, branch roles, forbidden direct sync actions, review commands and test gates.
- [x] Keep package-version alignment and untracked-fixture curation as explicit follow-up work rather than folding them into this task.
- [x] Run final Git configuration, remote, tag, GitHub parent/protection and worktree-preservation checks.

## Execution Record

- Initial snapshot: `6bf7b2171a13754c813f493bff3f54ed817e12bd` (`fork-v0.1.0`).
- Final verified HEAD: `896bec29f66661d199a70118bf6bd3ec08aa61f0`.
- Successful CI: `https://github.com/aakkino/web-to-figma/actions/runs/30142936629`.
- Required checks: `Lint, typecheck, build, test`; `Tier-0 parity ratchet`.
- Worktree preservation: 334 paths, SHA-256 `a8773e97a92565f848f438ffdf826c56bffc5a01bbdcfdd6b7e6407ce39e82fd` before updating this task record.

## Validation Commands

```powershell
git status --porcelain=v2 --branch
git remote -v
git config --get-regexp '^branch\.main\.'
git rev-list --left-right --count upstream/main...main
git merge-base upstream/main main
git show-ref --tags --dereference
gh repo view aakkino/web-to-figma --json nameWithOwner,isFork,parent,url,defaultBranchRef
gh api repos/aakkino/web-to-figma/branches/main/protection
git diff --check
```

## Review And Stop Points

1. Stop before creating the external GitHub fork if preflight no longer matches the reviewed facts.
2. Stop before pushing if remote normalization does not produce exactly `origin` and `upstream` with the expected URLs.
3. Stop before branch protection until initial CI exposes real check contexts.
4. Stop and report rather than resetting, stashing, cleaning or staging any pre-existing working-tree path.

## Rollback Points

- Restore local remote names/URLs from the preflight snapshot if normalization fails before push.
- Delete only newly created governance tags if their target verification fails; do not move an already published tag.
- Leave a successfully created GitHub fork intact as a backup if later protection configuration fails; resume protection idempotently.
- Never use reset, checkout, clean, rebase or amend as rollback mechanisms for this task.
