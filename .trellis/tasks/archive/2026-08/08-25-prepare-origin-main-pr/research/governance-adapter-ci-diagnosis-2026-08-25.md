# PR #2 CI Diagnosis

## Initial CI State Before Argument Fix

The authoritative query was scoped explicitly to
`aakkino/web-to-figma` to avoid resolving the upstream repository's unrelated
PR #2.

- PR: `https://github.com/aakkino/web-to-figma/pull/2`
- State: `OPEN`, not draft, mergeable, not merged, auto-merge disabled
- Merge state: `UNSTABLE`
- Base: `main` at `606ee8aa9ca4915ec28dd7853fd5b42283ff54ea`
- Head: `review/local-main-governance-adapter-20260825` at
  `82787e6240ed4d4410e41c6c948ec4da6c511f22`
- Scope: 2 commits, 15 files, submitted body equal to the task-local record

Local, remote-tracking, and live remote head refs still agree. Live
`origin/main` remains at the recorded base. No merge, auto-merge, push, PR
edit, check rerun, or repository-setting change occurred during diagnosis.

## Check Classification

`gh pr checks 2 --repo aakkino/web-to-figma --required` returns only the first
two checks below, and both passed.

| Check | Result | GitHub-required | Project role |
| --- | --- | --- | --- |
| Lint, typecheck, build, test | success | yes | Required repository gate |
| Tier-0 parity ratchet | success | yes | Required parity gate |
| Upstream core delta governance | failure | no | Project promotion evidence; no governance result was produced |
| Latest stable upstream compatibility | failure | no | Project promotion evidence; adapter steps were skipped |
| Upstream main compatibility | failure | no | Advisory for ordinary PRs; blocking only for `sync/upstream-*` by workflow policy |
| Publish to pkg.pr.new | failure | no | Optional preview tooling |

CI run:
`https://github.com/aakkino/web-to-figma/actions/runs/32846962293`

- Repository gate:
  `https://github.com/aakkino/web-to-figma/actions/runs/32846962293/job/97798788831`
- Tier-0 parity:
  `https://github.com/aakkino/web-to-figma/actions/runs/32846962293/job/97798788760`
- Governance:
  `https://github.com/aakkino/web-to-figma/actions/runs/32846962293/job/97798788904`
- Stable compatibility:
  `https://github.com/aakkino/web-to-figma/actions/runs/32846962293/job/97798788876`
- Upstream-main compatibility:
  `https://github.com/aakkino/web-to-figma/actions/runs/32846962293/job/97798788918`

## Compatibility Failure

The three failed jobs invoked these exact commands:

```text
pnpm upstream-core-delta:check -- --report .artifacts/upstream-core-delta.json
pnpm upstream-core-delta:stable -- --verify-latest --report .artifacts/stable-upstream.json
pnpm upstream-core-delta:main -- --report .artifacts/upstream-main.json
```

On the Linux runner with the pinned pnpm `10.33.2`, the standalone separator
was forwarded to the package script. The expanded Node commands therefore
contained a literal `--`, and `check-upstream-core-delta.mjs` rejected it with
`unknown argument: --`. The checker stopped during argument parsing, before it
could evaluate registry, stable, or upstream-main compatibility. The stable
adapter build and consumer steps were consequently skipped.

Windows pnpm `10.33.2` strips the same separator before invoking the script,
which explains why the recorded Windows validation could pass while the Linux
workflow failed. The failure is a cross-platform command-invocation defect,
not evidence of a target or registry mismatch.

The three faulty workflow lines were added by the approved C1 diff in
`.github/workflows/ci.yml`; the parser and package scripts are also part of
C1. This failure therefore comes from the proposed branch, even though the
curated behavior itself has passed local validation.

## Package Preview Failure

Preview run:
`https://github.com/aakkino/web-to-figma/actions/runs/32846962226`

Job:
`https://github.com/aakkino/web-to-figma/actions/runs/32846962226/job/97798788788`

The build passed, then this existing command ran:

```text
pnpm exec pkg-pr-new publish './packages/*' --packageManager=pnpm --comment=on
```

The service returned HTTP 404 with the explicit message that the
`pkg-pr-new` GitHub App is not installed on `aakkino/web-to-figma`.
`.github/workflows/pkg-pr-new.yml` is byte-identical between the PR base and
head, so this failure is external fork configuration rather than C1+C2 content.

## Minimal Remediation

Separate authorization is required before any remediation, push, or rerun.

1. Remove the extra separator from the three CI invocations:

```text
pnpm upstream-core-delta:check --report .artifacts/upstream-core-delta.json
pnpm upstream-core-delta:stable --verify-latest --report .artifacts/stable-upstream.json
pnpm upstream-core-delta:main --report .artifacts/upstream-main.json
```

2. Sync the same separator-free syntax in the new compatibility spec and fork
   maintenance command examples so the executable contract remains accurate.
3. Validate argument forwarding on Linux, then rerun the compatibility jobs
   after an authorized branch update. A rerun without the code correction will
   reproduce the same failure.
4. Handle package preview independently: install/authorize the App, or gate the
   optional workflow for repositories where it is unavailable. A plain rerun
   cannot resolve the missing-App 404.

## Authorized Remediation Result

The user authorized a narrower scope than item 2: only the three workflow
lines could change. The isolated LF worktree validation passed frozen install,
checker tests 5/5, all three corrected commands, lint over 354 files, report
parsing, and `git diff --check`, all at exit `0`. The diff was exactly
`.github/workflows/ci.yml`, 3 insertions and 3 deletions.

Commit `38450080b059b514baa49cf834797f23cbb84dc6` (`fix(ci): forward
compatibility arguments`) was normally pushed at
`2026-08-25T20:35:40+08:00`; commit and push both returned exit `0`.

- CI run: `https://github.com/aakkino/web-to-figma/actions/runs/32848465691`
- Preview run: `https://github.com/aakkino/web-to-figma/actions/runs/32848465681`

Governance and upstream-main compatibility succeeded with the corrected
syntax. Stable moved beyond parsing and then failed because the runner had not
fetched the pinned `@figit/dom-to-figma@0.2.4` tag. Preview repeated the known
missing-App 404. The repository and Tier-0 checks also succeeded, for a final
result of four successes and two failures. No further branch or PR change was
authorized.

## Stable Tag-Fetch Diagnosis

Run `32848465691` is authoritative for commit
`38450080b059b514baa49cf834797f23cbb84dc6`:

`https://github.com/aakkino/web-to-figma/actions/runs/32848465691`

The stable job failed here:

`https://github.com/aakkino/web-to-figma/actions/runs/32848465691/job/97803549639`

The corrected command reached the checker, which then ran:

```text
git rev-parse --verify @figit/dom-to-figma@0.2.4^{commit}
```

Git returned `fatal: Needed a single revision`. This is an absent-ref failure,
not a stable version, commit, adapter, or registry mismatch. The later adapter
build and consumer steps were skipped.

The stable job's `actions/checkout@v6` configuration uses `fetch-depth: 0` but
leaves `fetch-tags: false`. More importantly, its checkout source is the fork
`aakkino/web-to-figma`. A live remote query shows that this fork has only the
`0.2.0` and `0.2.1` package tags; it does not have
`@figit/dom-to-figma@0.2.4`. Enabling `fetch-tags: true` on the existing
checkout therefore cannot supply the missing tag.

The tag exists on `figitdesign/web-to-figma` as annotated tag object
`a312898056343d6bceda0263cfe7a6fdb981d004`, peeled to the registry's pinned
commit `859efea8d7f8330783c6c4e3e520fd673e877336`.

Upstream-main compatibility succeeded for a separate reason. Its isolated job
adds the upstream remote and runs:

```text
git fetch --no-tags upstream main
```

That creates `upstream/main` at `859efea8...`, exactly the ref required by the
upstream-main checker. GitHub Actions jobs do not share repositories, so this
fetch cannot make the stable tag available in the stable job.

### Single Recommended Remediation

After fresh authorization, add one read-only targeted fetch step to the stable
job before its checker:

```text
git fetch --no-tags https://github.com/figitdesign/web-to-figma.git "refs/tags/@figit/dom-to-figma@0.2.4:refs/tags/@figit/dom-to-figma@0.2.4"
```

This fetches only the reviewed annotated tag and its reachable object, requires
no write operation or elevated upstream permission, avoids all-tag or
all-upstream-history transfer, and lets the checker enforce its existing
contract that the named stable ref must resolve to the pinned commit. Keep
`fetch-depth: 0` and the upstream-main fetch
unchanged; `fetch-tags: true` against the fork is not a substitute. Validate
the exact fetch and stable checker locally, then normally push and let the new
PR run execute. No rerun before the branch fix can change the result.

Preview remains independent. Run
`https://github.com/aakkino/web-to-figma/actions/runs/32848465681` and job
`https://github.com/aakkino/web-to-figma/actions/runs/32848465681/job/97803549141`
repeat the known missing-`pkg-pr-new`-App HTTP 404; the CI argument fix did not
touch that workflow or external repository configuration.

## Stable Tag Fix Result

The authorized patch added one step to the stable job and no other file or
job. It derives `targets.stable.ref` from `docs/upstream-core-delta.json`, then
executes this dynamic exact fetch against the existing authoritative URL:

```text
git fetch --no-tags https://github.com/figitdesign/web-to-figma.git "refs/tags/${stable_ref}:refs/tags/${stable_ref}"
```

The LF worktree passed YAML structured parsing, frozen install, checker tests
5/5, governance/stable/upstream-main commands, lint over 354 files, scope
inspection, report parsing, and `git diff --check`; every command returned
exit `0`. The diff was exactly `.github/workflows/ci.yml`, 5 insertions and no
deletions.

The independent no-tags clone `D:\w2f-tag-proof` initially listed no tags and
`rev-parse @figit/dom-to-figma@0.2.4^{commit}` returned exit `128`. After
deriving the ref from the registry, the exact fetch returned exit `0`, the
only tag peeled to `859efea8d7f8330783c6c4e3e520fd673e877336`, and the clean
stable checker returned exit `0`.

Commit `5a953fdc0ddeb644957f0d1f2286a8d1e5db5bea` (`fix(ci): fetch reviewed
stable tag`) and its normal push both returned exit `0`; the push began at
`2026-08-25T21:03:26+08:00`.

CI run `https://github.com/aakkino/web-to-figma/actions/runs/32851098013`
completed successfully. Stable, governance, upstream-main, repository, and
Tier-0 jobs all passed. Preview run
`https://github.com/aakkino/web-to-figma/actions/runs/32851097433` repeated the
independent missing-App failure.

The clean worktree registration was removed; standard removal returned `255`
because dependencies remained in `D:\w2f-pr2-tag`. The independent proof
clone remains at `D:\w2f-tag-proof`. Neither residual was recursively or
force-deleted.
