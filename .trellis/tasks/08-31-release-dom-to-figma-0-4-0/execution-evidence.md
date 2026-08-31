# Release Execution Evidence

## Scope

This record covers only implementation-plan Phase A and Phase B. The only
remote mutation performed was the approved close/reopen transition on PR #15.
No merge, push, workflow dispatch, deployment approval, package publication,
tag or Release mutation, branch deletion, commit, or archive operation was
performed.

Evidence was collected from 2026-08-31T03:12Z through
2026-08-31T03:22:47Z. Commands targeted `aakkino/web-to-figma` explicitly.

## Phase A: Release Candidate Revalidation

### Pull request identity and diff

- PR: https://github.com/aakkino/web-to-figma/pull/15
- Title/state at the pre-mutation gate: `chore: release packages`, open,
  non-draft, mergeable, and blocked only by the then-missing required checks.
- Head branch/SHA: `changeset-release/main` at
  `1aa2e5b9433adc0297ab6c56567c3e8f31d3db10`.
- Base branch/SHA: `main` at
  `f4d3e9e2b89682b636ff297766c18b4bc8296307`.
- The compare was one commit ahead, zero commits behind, with five changed
  paths, 11 additions, and 13 deletions.
- The complete patch matched the approved release-only change:
  - deleted `.changeset/css-raster-backgrounds.md`;
  - deleted `.changeset/lazy-background-sources.md`;
  - changed `internal/browser-capture-adapter/package.json` peer floor from
    `@aakkino/dom-to-figma >=0.3.0` to `>=0.4.0`;
  - added the `0.4.0` changelog entries for PRs #14 and #16;
  - changed `packages/dom-to-figma/package.json` from `0.3.0` to `0.4.0`.

Representative reads:

```powershell
gh api repos/aakkino/web-to-figma/pulls/15
gh api repos/aakkino/web-to-figma/pulls/15/files?per_page=100
gh pr diff 15 --repo aakkino/web-to-figma
gh api repos/aakkino/web-to-figma/compare/f4d3e9e2b89682b636ff297766c18b4bc8296307...1aa2e5b9433adc0297ab6c56567c3e8f31d3db10
```

### Registry and owned metadata

- `fig-kiwi` package ID `14686353`: private, repository
  `aakkino/web-to-figma`, exactly version `0.2.0` (version ID `1178396168`).
- `composed-dom` package ID `14687051`: private, repository
  `aakkino/web-to-figma`, exactly version `0.1.1` (version ID `1178519831`).
- `dom-to-figma` package ID `14687053`: private, repository
  `aakkino/web-to-figma`, exactly version `0.3.0` (version ID `1178520190`).
- `@aakkino/dom-to-figma@0.4.0` was absent from the versions response.
- The owned Git ref and GitHub Release for
  `@aakkino/dom-to-figma@0.4.0` both returned explicit HTTP 404 responses.

Representative reads:

```powershell
gh api /users/aakkino/packages/npm/dom-to-figma
gh api /users/aakkino/packages/npm/dom-to-figma/versions?per_page=100
gh api /users/aakkino/packages/npm/fig-kiwi/versions?per_page=100
gh api /users/aakkino/packages/npm/composed-dom/versions?per_page=100
gh api repos/aakkino/web-to-figma/git/ref/tags/%40aakkino%2Fdom-to-figma%400.4.0
gh api repos/aakkino/web-to-figma/releases/tags/%40aakkino%2Fdom-to-figma%400.4.0
```

### Protection and release environment

- `main` required-status checks were strict and exactly
  `Lint, typecheck, build, test` and `Tier-0 parity ratchet`, both owned by
  GitHub Actions app ID `15368`.
- Admin enforcement and conversation resolution were enabled; force pushes
  and deletion were disabled.
- Environment `package-publish` retained a required-reviewer rule for user
  `aakkino` and a custom deployment branch policy containing only branch
  `main`.
- The environment secret list had exactly one name,
  `PACKAGE_PUBLISH_TOKEN`. No secret value was read or recorded.
- The active `CI` workflow and active `Package Release Assurance` workflow
  both accepted `pull_request` reopen events. Their six expected jobs were the
  five CI jobs plus `Inspect local package tarballs`.

Representative reads:

```powershell
gh api repos/aakkino/web-to-figma/branches/main/protection
gh api repos/aakkino/web-to-figma/environments/package-publish
gh api repos/aakkino/web-to-figma/environments/package-publish/deployment-branch-policies
gh api repos/aakkino/web-to-figma/environments/package-publish/secrets
gh workflow list --repo aakkino/web-to-figma --all
gh api -H "Accept: application/vnd.github.raw+json" repos/aakkino/web-to-figma/contents/.github/workflows/ci.yml?ref=f4d3e9e2b89682b636ff297766c18b4bc8296307
gh api -H "Accept: application/vnd.github.raw+json" repos/aakkino/web-to-figma/contents/.github/workflows/pkg-pr-new.yml?ref=f4d3e9e2b89682b636ff297766c18b4bc8296307
```

## Phase B: Supported PR Check Generation

### Authorized transition

- At `2026-08-31T03:17:29Z`, actor `aakkino` closed only PR #15.
- The closed-state read proved `merged=false`, the same five paths, head SHA
  `1aa2e5b9433adc0297ab6c56567c3e8f31d3db10`, and base SHA
  `f4d3e9e2b89682b636ff297766c18b4bc8296307`.
- Registry, protection, environment, secret-name, tag, and Release conditions
  were re-read and remained unchanged before the second mutation.
- At `2026-08-31T03:18:51Z`, actor `aakkino` reopened only PR #15.
- The reopened PR remained at the same head and base SHAs.

Commands:

```powershell
gh pr close 15 --repo aakkino/web-to-figma
gh api repos/aakkino/web-to-figma/pulls/15
gh pr reopen 15 --repo aakkino/web-to-figma
gh api repos/aakkino/web-to-figma/issues/15/events?per_page=100
```

### Exact-head workflow runs and checks

Both supported `pull_request: reopened` runs were created at
`2026-08-31T03:18:53Z`, attached to exact head SHA
`1aa2e5b9433adc0297ab6c56567c3e8f31d3db10`, and completed successfully:

- CI run `33353451237`:
  https://github.com/aakkino/web-to-figma/actions/runs/33353451237
- Package Release Assurance run `33353451238`:
  https://github.com/aakkino/web-to-figma/actions/runs/33353451238

All six expected checks were `completed/success` at that exact head:

| Check | Check ID | Completed UTC | Evidence |
| --- | ---: | --- | --- |
| Upstream core delta governance | `99371027693` | `2026-08-31T03:19:18Z` | https://github.com/aakkino/web-to-figma/actions/runs/33353451237/job/99371027693 |
| Latest stable upstream compatibility | `99371027848` | `2026-08-31T03:19:30Z` | https://github.com/aakkino/web-to-figma/actions/runs/33353451237/job/99371027848 |
| Upstream main compatibility | `99371027834` | `2026-08-31T03:19:41Z` | https://github.com/aakkino/web-to-figma/actions/runs/33353451237/job/99371027834 |
| Inspect local package tarballs | `99371027635` | `2026-08-31T03:19:44Z` | https://github.com/aakkino/web-to-figma/actions/runs/33353451238/job/99371027635 |
| Tier-0 parity ratchet | `99371027786` | `2026-08-31T03:20:00Z` | https://github.com/aakkino/web-to-figma/actions/runs/33353451237/job/99371027786 |
| Lint, typecheck, build, test | `99371027836` | `2026-08-31T03:20:33Z` | https://github.com/aakkino/web-to-figma/actions/runs/33353451237/job/99371027836 |

Older exact-head workflow attempts `33351335555` and `33351335529` existed and
ended with failure when the PR was closed. They are superseded by the later
supported reopen-event runs above. The final PR rollup contains exactly the six
successful checks listed in the table.

Representative reads:

```powershell
gh run view 33353451237 --repo aakkino/web-to-figma --json status,conclusion,headSha,jobs,url
gh run view 33353451238 --repo aakkino/web-to-figma --json status,conclusion,headSha,jobs,url
gh api repos/aakkino/web-to-figma/commits/1aa2e5b9433adc0297ab6c56567c3e8f31d3db10/check-runs
gh pr view 15 --repo aakkino/web-to-figma --json state,mergeable,mergeStateStatus,headRefOid,baseRefOid,statusCheckRollup,files,url
```

## Phase B Postconditions And Determination

The final read after all checks settled established:

- PR #15 is open, non-draft, `MERGEABLE`, and `CLEAN`.
- Head and base remain exactly
  `1aa2e5b9433adc0297ab6c56567c3e8f31d3db10` and
  `f4d3e9e2b89682b636ff297766c18b4bc8296307`.
- The full patch remains the approved five-path release diff.
- There are zero review threads and therefore zero unresolved conversations.
- All six exact-head checks are successful.
- `dom-to-figma` remains private with only `0.3.0`; `0.4.0`, its owned tag,
  and its GitHub Release remain absent.
- Branch protection, environment reviewer/branch policy, and the environment
  secret name remain unchanged.

**Determination: Phase A and Phase B are complete and PR #15 is merge-ready at
the exact reviewed head SHA.** This is not evidence that Phase C or any later
release phase has been performed.

## Local Worktree

Final `git status --short` before creating this evidence file was:

```text
?? .trellis/tasks/08-31-release-dom-to-figma-0-4-0/
```

The task directory was already untracked before this unit began. This unit
created only `execution-evidence.md` inside it and did not alter unrelated user
work.

## Failed Release Run 33355456677

Read-only debugging of the authorized exact-SHA dispatch found a partial,
immutable publication and a deterministic metadata defect. Run
https://github.com/aakkino/web-to-figma/actions/runs/33355456677 targeted
`adc52aea87e1f6f25f53d43028527e5dd8489892`, passed the `package-publish`
approval by `aakkino`, and completed `failure`.

- Publish job `99376612791` succeeded, including package verification,
  publication, dist-tag promotion, and upload of the 928-byte non-binary
  manifest (artifact `9744995492`).
- Metadata job `99376834517`, step 5, failed because historical
  `@aakkino/fig-kiwi@0.2.0` correctly points to its original release SHA
  `dd91f18346d7326ab71c1a77769bfe7aed310af3`, while the current metadata loop
  requires every allowlisted artifact tag to point to the new source SHA.
- Private `@aakkino/dom-to-figma@0.4.0` now exists as version ID `1189572169`
  with integrity
  `sha512-LNXSShqjYWV3et9c11DEDXOZQOat3W8e5UIE2oGPA14Gm5+/O2SmL+d0jNmaw+2BySJ1UqmhFre0T4Irhdq/Yg==`;
  `latest` and `migration` select `0.4.0`. Preserve these immutable bytes.
- The new `@aakkino/dom-to-figma@0.4.0` Git tag and GitHub Release are absent.
  Historical tags/Releases are unchanged; `origin/main` remains the approved
  SHA; `changeset-release/main` remains present.
- Classification: **BLOCKED**, not retry-safe. Same-SHA retry deterministically
  repeats the historical-tag conflict. Recovery requires a reviewed
  code/config correction and new workflow authorization; no retry is
  authorized.

Full job/step, package, integrity, metadata, branch, and recovery evidence is
in `research/release-run-33355456677-debug.md`.

## Post-Merge Release-Test Gate

Recorded at `2026-08-31T03:45:01Z` after PR #15 merged. This is local test
evidence only; it performed no remote mutation.

- Approved source SHA: `adc52aea87e1f6f25f53d43028527e5dd8489892`.
- An isolated detached Git worktree was created at `C:\wt` with
  `git worktree add --detach C:\wt adc52aea87e1f6f25f53d43028527e5dd8489892`.
  A first attempt under the longer system-temp path failed during checkout due
  to Windows filename-length limits in archived screenshot paths; it was
  removed before the short-path retry.
- Exact-tree identity check returned
  `adc52aea87e1f6f25f53d43028527e5dd8489892`. `git -C C:\wt status --porcelain=v1`
  was empty before dependency installation and before the test command.
- Environment: Node `v24.6.0`, pnpm `10.33.2`. The worktree initially had no
  `node_modules`; dependency setup used `pnpm install --frozen-lockfile`.
  The lockfile was current and pnpm installed all nine workspace projects
  without a resolution change.
- Command: `pnpm test:release` (equivalent to
  `node --test scripts/release-policy.test.mjs scripts/private-release.test.mjs scripts/recover-public-fig-kiwi.test.mjs`).
- Result: exit code `0`; Node test output reported `tests 38`, `pass 38`,
  `fail 0`, `cancelled 0`, `skipped 0`, `todo 0`, and
  `duration_ms 640.0719`.
- Cleanup: `git worktree remove --force C:\wt` deregistered the temporary
  worktree (the subsequent `git worktree list --porcelain` contains only the
  primary worktree), but Windows left `C:\wt` non-empty. A direct recursive
  removal of that verified disposable directory was blocked by the local
  execution policy, so the remaining directory is explicitly recorded for
  manual cleanup. No product or configuration files in the primary worktree
  were changed by this gate.
