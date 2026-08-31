# C1+C2 Local Review Branch Preparation

## Result

The first local review branch was created successfully:

- Branch: `review/local-main-governance-adapter-20260825`
- Base: `606ee8aa9ca4915ec28dd7853fd5b42283ff54ea`
- C1 checkpoint: `81abcdfc47d0c6a61dff9d4f8b593fa61e47a10f`
- Head: `82787e6240ed4d4410e41c6c948ec4da6c511f22`
- Commit count above base: `2`

After the separately authorized CI argument fix, the current PR/branch head is
`38450080b059b514baa49cf834797f23cbb84dc6`, three commits above base. The
accepted C1+C2 content head remains `82787e62...`; the added commit changes
only three approved command lines in `.github/workflows/ci.yml`.

The branch was pushed and PR `#2` was created after separate explicit
authorizations. It has not been checked out. No merge, auto-merge, protection
change, force-push, or later-cohort action occurred.

## Preconditions

`git fetch --prune origin` completed successfully. The refreshed
`origin/main` remained exactly equal to the prevalidated base
`606ee8aa9ca4915ec28dd7853fd5b42283ff54ea`. The target branch did not exist
locally, in the refreshed remote-tracking refs, or in the read-only
`git ls-remote --heads origin` result before creation.

Both curated objects exist and retain the accepted parent chain:

```text
606ee8aa9ca4915ec28dd7853fd5b42283ff54ea
  -> 81abcdfc47d0c6a61dff9d4f8b593fa61e47a10f
  -> 82787e6240ed4d4410e41c6c948ec4da6c511f22
```

## Content Verification

The cumulative diff contains exactly the 15 approved C1+C2 paths. Fourteen
non-registry blobs match their approved historical source commits exactly:
C1-only content matches `41ff3991...`, C2 implementation content matches
`86a83e9f...`, and the retained C2 documentation split matches `f874f03f...`.
The three C2 task metadata paths from `f874f03f...` are absent.

`docs/upstream-core-delta.json` differs from the historical C1 registry at
exactly the six approved target leaves: stable version/ref/commit,
upstream-main commit/resolvedAt, and `image-presentation.upstreamState`. C2
carries the C1 registry blob byte-for-byte.

The head is two commits above the refreshed base, has merge base
`606ee8aa...` with `sync/upstream-20260726`, and has zero commit intersection
with the 47 sync-only commits. No task or workspace path appears in the branch
diff.

The four C1+C2 validation reports parse, point at `82787e62...`, contain no
reported errors, and the focused/full governance reports are byte-identical.
The archived validation records the full gate as 395 passed, 5 skipped, 0
failed, plus successful lint, type-check, build, oracle parity, governance,
stable target, stable adapter, and upstream-main checks.

## Push Publication

At `2026-08-25T20:13:12+08:00`, the following exact non-force push command
returned exit `0`:

```text
git -c safe.directory=D:/desktop_directory/web-to-figma push --set-upstream origin refs/heads/review/local-main-governance-adapter-20260825:refs/heads/review/local-main-governance-adapter-20260825
```

The post-push fetch and `git ls-remote --heads origin` resolved the remote
branch to `82787e6240ed4d4410e41c6c948ec4da6c511f22`. Local, remote-tracking,
and live remote refs agree. `origin/main` remained
`606ee8aa9ca4915ec28dd7853fd5b42283ff54ea`.

Remote branch URL:

`https://github.com/aakkino/web-to-figma/tree/review/local-main-governance-adapter-20260825`

GitHub's PR query for this head returned `[]` both immediately before and
after the push. The server suggested a PR creation URL, but it was not opened
or used:

`https://github.com/aakkino/web-to-figma/pull/new/review/local-main-governance-adapter-20260825`

## PR Creation

At `2026-08-25T20:19:17+08:00`, after a fresh fetch and a second all-state PR
query returned `[]`, this exact command returned exit `0`:

```text
gh pr create --repo $repo --base main --head $branch --title 'feat(adapter): govern upstream deltas and stable fallback' --body $body
```

Here `$repo` was `aakkino/web-to-figma`, `$branch` was
`review/local-main-governance-adapter-20260825`, and `$body` was the reviewed
draft from `## Summary` through `## Rollback`, excluding only its local
draft-status wrapper.

Created PR: `https://github.com/aakkino/web-to-figma/pull/2`

The post-create query verified:

- number `2`, state `OPEN`, base `main`, and the authorized head branch;
- base OID `606ee8aa9ca4915ec28dd7853fd5b42283ff54ea` and head OID
  `82787e6240ed4d4410e41c6c948ec4da6c511f22`;
- exactly 2 commits and 15 files;
- body byte-equivalent to the reviewed substantive draft;
- auto-merge disabled and merge state `BLOCKED`;
- six initial checks in progress: repository gate, package preview, upstream
  governance, stable compatibility, upstream-main compatibility, and Tier-0
  parity.

The initial checks later completed with two successes and four failures. The
repository lint/type-check/build/test gate and Tier-0 parity succeeded. The
three compatibility jobs failed before running their checks because the
workflow invoked package scripts with an extra `--`, which the checker reports
as `unknown argument: --`. The package preview failed because the
`pkg-pr-new` GitHub App is not installed on `aakkino/web-to-figma` and its
service returned 404. The observed PR merge state is therefore `UNSTABLE`.
These are recorded as follow-up evidence only; no branch or PR correction was
authorized or performed.

GitHub currently marks only the repository gate and Tier-0 parity as required;
both passed. The four failed checks are not GitHub-required. Governance and
stable compatibility still need valid remote results under this project's
promotion contract, while upstream-main compatibility is advisory for an
ordinary review branch. The package-preview failure is an optional external
App configuration condition. The independent diagnosis is recorded in
`governance-adapter-ci-diagnosis-2026-08-25.md`.

## CI Argument Fix

The exact three-line workflow correction removed the redundant first `--`
from the governance, stable, and upstream-main pnpm invocations. It was applied
in the isolated pure-LF worktree `D:\w2f-pr2-ci`; the final diff was exactly
`.github/workflows/ci.yml`, with 3 insertions and 3 deletions.

Every required local command returned exit `0`: frozen install; checker unit
tests (5/5); the three corrected pnpm commands; lint (354 files); report
parsing; and `git diff --check`. Governance reported 15 runtime, 5 tests, and
0 unmapped paths. Stable resolved `0.2.4`, upstream main resolved
`859efea8...`, and all three reports contained zero errors.

```text
pnpm install --frozen-lockfile                                      # exit 0
node --test scripts/check-upstream-core-delta.test.mjs              # exit 0
pnpm upstream-core-delta:check --report .artifacts/upstream-core-delta.json
                                                                    # exit 0
pnpm upstream-core-delta:stable --verify-latest --report .artifacts/stable-upstream.json
                                                                    # exit 0
pnpm upstream-core-delta:main --report .artifacts/upstream-main.json
                                                                    # exit 0
pnpm lint --diagnostic-level=error --max-diagnostics=none           # exit 0
git -c safe.directory=D:/desktop_directory/web-to-figma -c core.autocrlf=false -C D:\w2f-pr2-ci diff --check
                                                                    # exit 0
```

`git ... commit -m "fix(ci): forward compatibility arguments"` returned exit
`0` and created `38450080b059b514baa49cf834797f23cbb84dc6`. At
`2026-08-25T20:35:40+08:00`, this exact normal push returned exit `0`:

```text
git -c safe.directory=D:/desktop_directory/web-to-figma -C D:\w2f-pr2-ci push origin refs/heads/review/local-main-governance-adapter-20260825:refs/heads/review/local-main-governance-adapter-20260825
```

Post-push local, remote-tracking, live remote, and PR heads all resolved to the
new commit. `origin/main` stayed `606ee8aa...`; PR #2 stayed OPEN and unmerged,
with unchanged base, title, and body and auto-merge disabled. It now has 3
commits and the same 15 files.

Check URLs:

- CI: `https://github.com/aakkino/web-to-figma/actions/runs/32848465691`
- Repository: `https://github.com/aakkino/web-to-figma/actions/runs/32848465691/job/97803549846`
- Tier-0: `https://github.com/aakkino/web-to-figma/actions/runs/32848465691/job/97803549765`
- Governance: `https://github.com/aakkino/web-to-figma/actions/runs/32848465691/job/97803549638`
- Stable: `https://github.com/aakkino/web-to-figma/actions/runs/32848465691/job/97803549639`
- Upstream main: `https://github.com/aakkino/web-to-figma/actions/runs/32848465691/job/97803549472`
- Preview: `https://github.com/aakkino/web-to-figma/actions/runs/32848465681`

All six checks started. Governance and upstream-main compatibility succeeded.
Stable passed argument parsing but failed because the runner lacked the pinned
tag `@figit/dom-to-figma@0.2.4`; preview repeated the known App 404. No second
fix was authorized or made.

At final observation all six checks had completed: repository, Tier-0,
governance, and upstream-main succeeded; stable and preview failed for the two
conditions above. PR merge state remained `UNSTABLE`.

The worktree was clean at the new commit. Standard `git worktree remove`
removed its Git registration but returned `255` because the dependency
directory was not empty. The unregistered `D:\w2f-pr2-ci` residual was not
force-deleted or recursively removed.

## Stable Tag Fetch Fix

The current PR/branch head is
`5a953fdc0ddeb644957f0d1f2286a8d1e5db5bea`, four commits above base. The
second CI-only commit adds one stable-job step and changes no other file/job:

```yaml
- name: Fetch reviewed stable tag
  run: |
    stable_ref="$(node -p "JSON.parse(require('fs').readFileSync('docs/upstream-core-delta.json', 'utf8')).targets.stable.ref")"
    git fetch --no-tags https://github.com/figitdesign/web-to-figma.git "refs/tags/${stable_ref}:refs/tags/${stable_ref}"
```

Local commands and exits:

```text
pnpm install --frozen-lockfile                                      # exit 0
structured YAML parse                                               # exit 0
node --test scripts/check-upstream-core-delta.test.mjs              # exit 0, 5/5
pnpm upstream-core-delta:check --report .artifacts/tagfix-governance.json
                                                                    # exit 0
pnpm upstream-core-delta:stable --verify-latest --report .artifacts/tagfix-stable.json
                                                                    # exit 0
pnpm upstream-core-delta:main --report .artifacts/tagfix-upstream-main.json
                                                                    # exit 0
pnpm lint --diagnostic-level=error --max-diagnostics=none           # exit 0, 354 files
git ... diff --check                                                # exit 0
```

In clean no-tags clone `D:\w2f-tag-proof`, the pinned tag resolved with exit
`128` before fetch. The registry-derived exact `git fetch --no-tags` returned
exit `0`; the tag then peeled to `859efea8d7f8330783c6c4e3e520fd673e877336`
and the clean stable checker returned exit `0`.

`git ... commit -m "fix(ci): fetch reviewed stable tag"` returned exit `0`
and created `5a953fdc0ddeb644957f0d1f2286a8d1e5db5bea`. At
`2026-08-25T21:03:26+08:00`, the normal same-branch push returned exit `0`.
Post-push remote and PR heads matched the commit; base, title, body, merge, and
auto-merge state were unchanged. The PR has 4 commits and the same 15 files.

Final check URLs and status:

- CI: `https://github.com/aakkino/web-to-figma/actions/runs/32851098013` - success
- Repository: `https://github.com/aakkino/web-to-figma/actions/runs/32851098013/job/97811976484` - success
- Tier-0: `https://github.com/aakkino/web-to-figma/actions/runs/32851098013/job/97811976347` - success
- Governance: `https://github.com/aakkino/web-to-figma/actions/runs/32851098013/job/97811976554` - success
- Stable: `https://github.com/aakkino/web-to-figma/actions/runs/32851098013/job/97811976462` - success
- Upstream main: `https://github.com/aakkino/web-to-figma/actions/runs/32851098013/job/97811976182` - success
- Preview: `https://github.com/aakkino/web-to-figma/actions/runs/32851097433/job/97811973384` - known optional missing-App failure

The LF worktree was clean before standard removal. Its Git registration was
removed, but dependency residual `D:\w2f-pr2-tag` remained after remove exit
`255`. The independent proof clone remains at `D:\w2f-tag-proof`. Neither was
force-deleted or recursively removed.

## Checkout And Remote Boundary

The shared checkout remained on `sync/upstream-20260726` at
`07bbcd751c34a378caeb91b10681842f37c64b7d`. Its existing six tracked modified
paths were not switched, cleaned, staged, edited, or committed. The only
remote state changes were the separately authorized review branch pushes and
PR creation/body synchronization/merge. No auto-merge, protection, branch
deletion, code push, or unrelated PR change was made during merge closeout.

GitHub-required checks and all project compatibility checks have passed.
The optional package preview still fails because its App is absent; it is not
required and is not a project compatibility gate.

## PR Body Synchronization

At `2026-08-25T21:15:13+08:00`, the separately authorized body-only
`gh pr edit` returned exit `0`. The live body now records current head
`5a953fdc0ddeb644957f0d1f2286a8d1e5db5bea`, 4 commits, both narrow CI
follow-ups, all five successful project gates, and the non-required external
Preview failure. A post-edit byte comparison against the task-local body
record passed. PR #2 remained OPEN and unmerged with auto-merge disabled;
base, head, title, refs, commits, files, and checks were unchanged.

## Merge Result

The user explicitly authorized merging PR #2. Immediately before merge, a
fresh fetch and live GitHub query verified:

- `origin/main` and PR base were
  `606ee8aa9ca4915ec28dd7853fd5b42283ff54ea`;
- local, remote, and PR head were
  `5a953fdc0ddeb644957f0d1f2286a8d1e5db5bea`;
- the PR was OPEN, unmerged, MERGEABLE, and had auto-merge disabled;
- all 4 reviewed commits were present;
- both GitHub-required checks were successful, as were all project
  compatibility checks.

At `2026-08-26T11:08:52+08:00`, this command returned exit `0`:

```text
gh pr merge 2 --repo aakkino/web-to-figma --merge
```

GitHub recorded `mergedAt: 2026-08-26T11:08:56+08:00` and merge commit
`c9e4e3914dab262adcc4b37556543843e13708ab`. The commit has exactly these two
parents:

```text
606ee8aa9ca4915ec28dd7853fd5b42283ff54ea
5a953fdc0ddeb644957f0d1f2286a8d1e5db5bea
```

After `git fetch --prune origin`, `origin/main` pointed directly at the merge
commit. Each of the four reviewed commits was verified as its ancestor. PR #2
reported `MERGED`, and its original head remained
`5a953fdc0ddeb644957f0d1f2286a8d1e5db5bea`. The live remote review branch was
still present at that head; it was not deleted. The shared checkout remained
on `sync/upstream-20260726` at `07bbcd75...` with an empty staged set.

The next promotion unit must be reconstructed and revalidated against new
`origin/main` before any branch, push, or PR action.
