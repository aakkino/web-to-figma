# Implementation Plan: Release @aakkino/dom-to-figma 0.4.0

## Active Recovery Dependency

- [ ] Complete and merge child task
  `08-31-fix-private-release-metadata-recovery` before any further Release
  workflow dispatch or release-branch cleanup.
- [ ] Preserve private `@aakkino/dom-to-figma@0.4.0` and its recorded
  integrity; do not retry run `33355456677` or manually create metadata.
- [ ] After the child merge, obtain a fresh exact current-`origin/main` SHA,
  repeat release-readiness review, and obtain new operational authorization
  for explicit metadata recovery.

## Entry Gates

- [ ] Receive explicit user approval of the latest `prd.md`, `design.md`, and
  this plan in a subsequent message.
- [ ] Run `task.py start` only after that approval; do not interpret task
  creation or this planning turn as merge/publication authorization.
- [ ] Capture a fresh live-state snapshot before every remote mutation. Stop
  if PR #15, `origin/main`, registry versions, workflow configuration, release
  environment, or protected checks differ materially from the reviewed plan.

## Phase A: Revalidate The Release Candidate

- [ ] Confirm PR #15 is open, mergeable, and still points from
  `changeset-release/main` to `main`.
- [ ] Record the exact head and base SHAs; require the head to remain
  `1aa2e5b9433adc0297ab6c56567c3e8f31d3db10` unless a revised plan is reviewed.
- [ ] Re-read the complete PR diff and require only the two consumed
  Changesets, `dom-to-figma` version/changelog, and adapter peer floor changes.
- [ ] Confirm `@aakkino/dom-to-figma@0.4.0`, its owned tag, and its GitHub
  Release are absent; confirm existing allowlisted versions remain private.
- [ ] Confirm branch protection still requires the two named exact-head checks.
- [ ] Confirm `package-publish` still has the `main` branch policy, required
  reviewer, and `PACKAGE_PUBLISH_TOKEN` secret.

Rollback point: no remote state has changed. Report drift and return to
planning instead of adapting the scope silently.

## Phase B: Generate And Verify PR Checks

- [ ] Close PR #15 only after rechecking its state and head SHA.
- [ ] Confirm the closed PR still has the same head, then reopen it to emit the
  supported `pull_request: reopened` event.
- [ ] Verify CI and Package Release Assurance runs attach to the exact PR head.
- [ ] Wait for all runs to complete; require all six PR checks to succeed,
  including `Lint, typecheck, build, test`, `Tier-0 parity ratchet`, and
  `Inspect local package tarballs`.
- [ ] Re-read PR head, base, diff, mergeability, conversations, and registry
  absence after checks settle. Any head change invalidates all prior evidence.

Rollback point: leave the PR open. Failed checks block the release; diagnose
them in a separate debug path and do not merge.

## Phase C: Protected Merge And Source Pin

- [ ] Merge PR #15 through GitHub's ordinary protected merge operation; do not
  use admin bypass, direct push, force push, or branch deletion in the merge.
- [ ] Record the merge commit returned by GitHub and refresh remote refs.
- [ ] Require current `origin/main` to equal that exact merge commit and contain
  `@aakkino/dom-to-figma@0.4.0`, the approved changelog, peer floor, and no
  pending Changeset files from PR #15.
- [ ] Confirm the merge-triggered CI and Changesets version job do not reveal a
  new release diff or failure that invalidates publication.
- [ ] Recheck registry/tag/Release absence immediately before dispatch.

Rollback point: merged version metadata is durable repository history. Stop
before publication on any unexpected state; do not revert or rewrite `main`
inside this task.

## Phase D: Protected Publication

- [ ] Ensure `origin/main` has not advanced since Phase C.
- [ ] Dispatch `.github/workflows/release.yml` on `main` with
  `source_sha=<exact merge SHA>` and record the run URL/ID.
- [ ] Wait at the `package-publish` environment gate for the configured reviewer
  and do not bypass the protection rule.
- [ ] Monitor the publish job through source validation, build, policy,
  preflight, immediate pre-publish main revalidation, serial package
  verification/publication, and non-binary manifest upload.
- [ ] Require unchanged `fig-kiwi@0.2.0` and `composed-dom@0.1.1` to report
  matching/idempotent state and only `dom-to-figma@0.4.0` to report absent then
  published.
- [ ] Require the metadata job to reconcile tags and GitHub Releases at the
  same `source_sha`.
- [ ] Preserve the workflow conclusion and `0.4.0` manifest integrity without
  downloading or exposing candidate tarball artifacts.

Rollback point: cancel or stop on failure. Preserve matching published bytes
and rerun the same SHA after a recoverable correction. Treat mismatched bytes,
public visibility, or credential exposure as an incident requiring separate
authorization.

## Phase E: Independent Live Verification

- [ ] Query GitHub Packages for `dom-to-figma@0.4.0`; require private
  visibility, repository `aakkino/web-to-figma`, and one new exact version.
- [ ] Compare authenticated registry integrity and downloaded manifest metadata
  to the workflow manifest evidence.
- [ ] Confirm owning-repository Actions access, PAT-authorized install/import,
  and explicit anonymous denial were successful in the protected run.
- [ ] Resolve Git tag `@aakkino/dom-to-figma@0.4.0` to the exact approved merge
  SHA and require the GitHub Release for that tag to exist and target it.
- [ ] Confirm the Release workflow's publish and metadata jobs both succeeded
  for the exact `source_sha` and no newer failing rerun supersedes the evidence.

## Phase F: Cleanup And Local Reconciliation

- [ ] Recheck Phase E immediately before cleanup.
- [ ] Delete only remote `changeset-release/main`; confirm `main` and unrelated
  refs are unchanged.
- [ ] Fast-forward local `main` to `origin/main` without discarding unrelated
  local work. If the task artifacts are the only local changes, preserve them
  for the Trellis commit rather than forcing a clean checkout.
- [ ] Verify local `main` and `origin/main` resolve to the approved release SHA,
  remote `changeset-release/main` is absent, and the worktree has no unexpected
  changes.
- [ ] Record all acceptance evidence in the task before the final quality and
  finish-work gates.

## Quality And Finish Gates

- [ ] Dispatch `trellis-check` on the full operational result and acceptance
  evidence using the curated check context.
- [ ] Independently re-read PR, workflow, registry, tag, Release, branch, and
  local Git state after the checker completes.
- [ ] Run the required spec-update decision and record whether the deferred
  Changesets bot-token check-trigger gap warrants a separate task.
- [ ] Commit only Trellis task/evidence changes owned by this task, using the
  repository's normal commit flow.
- [ ] Archive the task only after all acceptance criteria have evidence.

## Validation Commands And Queries

Representative commands; exact IDs and SHAs must come from the immediately
preceding live read rather than copied planning values:

```powershell
gh pr view 15 --repo aakkino/web-to-figma --json state,mergeable,mergeStateStatus,headRefOid,baseRefOid,statusCheckRollup,files,commits,url
gh api repos/aakkino/web-to-figma/commits/<pr-head-sha>/check-runs
gh api /users/aakkino/packages/npm/dom-to-figma/versions --paginate
gh api /users/aakkino/packages/npm/dom-to-figma
gh api repos/aakkino/web-to-figma/branches/main/protection
gh api repos/aakkino/web-to-figma/environments/package-publish
gh workflow run Release --repo aakkino/web-to-figma --ref main -f source_sha=<merge-sha>
gh run view <release-run-id> --repo aakkino/web-to-figma --json status,conclusion,headSha,jobs,url
gh api repos/aakkino/web-to-figma/git/ref/tags/%40aakkino%2Fdom-to-figma%400.4.0
gh api repos/aakkino/web-to-figma/releases/tags/%40aakkino%2Fdom-to-figma%400.4.0
git fetch --prune origin
git rev-parse HEAD origin/main
git status --short
```
