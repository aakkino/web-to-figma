# Design: Controlled dom-to-figma 0.4.0 Release

## Status And Boundaries

This is an operational release plan, not a code-change design. It coordinates
four existing boundaries without modifying them:

1. Changesets PR #15 owns version and changelog materialization.
2. GitHub branch protection owns merge authorization.
3. `.github/workflows/release.yml` and `package-publish` own registry writes.
4. `scripts/private-release.mjs` owns artifact verification and metadata
   reconciliation.

The task is complex because it performs irreversible package publication and
several dependent remote transitions. It remains one task because the release
is one transactional outcome; independent child delivery would create unsafe
partial ownership between merge, publish, metadata, and cleanup.

## Release Identity

The implementation captures distinct immutable identities at each boundary:

| Identity | Purpose | Invalidation rule |
| --- | --- | --- |
| PR head SHA | Binds diff and PR checks | Any head change requires a full PR recheck |
| PR base SHA | Detects base movement before merge | Any base change requires diff/mergeability revalidation |
| Merge SHA | Binds merged release tree | Must become the exact current `origin/main` |
| Workflow `source_sha` | Binds build, publish, and metadata | Must equal the reviewed merge SHA and current `origin/main` |
| Tarball integrity | Binds immutable registry bytes | Any mismatch is a hard conflict |

No identity may be inferred from a branch name after the relevant transition.

## Control Flow

```text
live preflight
  -> close/reopen PR #15 at unchanged head
  -> wait for all exact-head checks
  -> protected merge
  -> capture and revalidate exact origin/main merge SHA
  -> dispatch Release(source_sha = merge SHA)
  -> package-publish reviewer approval
  -> build/policy/preflight/revalidate main
  -> verify existing fig-kiwi + composed-dom
  -> publish and verify dom-to-figma 0.4.0
  -> promote tags and reconcile Git tags/Releases
  -> verify live state
  -> delete changeset-release/main
  -> fast-forward local main and record evidence
```

Every arrow is a gate. A mismatch or failure stops progress; later operations
must not run merely because an earlier stage was previously successful.

## PR Check Recovery

PR #15 was created or updated by `changesets/action` using `GITHUB_TOKEN`, so
its current head has no `pull_request` check runs. Both relevant workflows
listen to `reopened`:

- CI runs the two protected contexts plus compatibility jobs.
- Package Release Assurance builds, enforces release policy, packs, and
  clean-consumer smoke-tests the exact PR head.

The controlled recovery is:

1. Re-read PR state and exact head/base/diff.
2. Close only PR #15.
3. Confirm it is closed with the same head.
4. Reopen only PR #15.
5. Confirm both workflows create runs at that exact head.

If the head changes between steps, stop. Do not add an empty commit, rewrite
the bot branch, or use a check from a different SHA.

## Merge And Concurrency Contract

The merge uses GitHub's normal merge operation and lets protection enforce
strict required checks, conversation resolution, and admin enforcement. The
merge response is not enough by itself: fetch or query `origin/main`, record
its 40-character SHA, and verify the expected version tree at that SHA.

Publication requires an exclusive `main` window. Immediately before dispatch,
the recorded merge SHA must still equal current `origin/main`. The workflow
performs the same check at checkout and again immediately before registry
writes. If another merge advances `main`, the run must stop and the operator
must decide whether to review and publish the newer tree; this plan never
silently substitutes it.

## Publication Contract

The Release workflow packs the fixed allowlist in dependency order:

```text
@aakkino/fig-kiwi@0.2.0       existing, must match
@aakkino/composed-dom@0.1.1    existing, must match
@aakkino/dom-to-figma@0.4.0    absent, may publish
```

The existing packages are part of verification, not release scope expansion.
For each coordinate, the script compares registry integrity and the downloaded
tarball manifest before accepting it. It then verifies private visibility,
owning-repository Actions access, PAT-authorized installation/import, and
anonymous denial. Only after every package passes may it promote `latest` and
start metadata reconciliation.

Candidate tarballs never leave the protected publish job. Only the non-binary
manifest is uploaded for the metadata job.

## Metadata And Final-State Contract

For every manifest artifact, metadata reconciliation accepts a missing tag and
Release or an already-correct pair at `source_sha`; any conflicting tag target
is a hard stop. The new required pair is:

```text
@aakkino/dom-to-figma@0.4.0 -> approved merge SHA
```

After workflow success, independent live reads verify the package record,
exact version, visibility, registry integrity, repository link, tag target,
Release target, and workflow SHA. Only then may the Changesets release branch
be deleted.

## Failure And Resume

- Before merge: leave the PR open and fix or reassess failed checks.
- After merge but before publish: do not revert version metadata merely to
  retry; fix any release blocker through a separately reviewed change.
- During publish: preserve run logs and the non-binary manifest. A matching
  immutable version is resumable; a mismatch or public package is an incident.
- After publish but before metadata: rerun the same exact SHA so idempotent
  package verification can complete metadata reconciliation.
- Never delete a package, version, tag, or Release as routine rollback.
- Do not delete `changeset-release/main` until the complete release is proven.

## Audit Evidence

The task record must retain the PR URL and final head, all PR check URLs and
conclusions, merge SHA, Release run URL and conclusion, environment approval
outcome, manifest integrity for `0.4.0`, package/version API evidence, tag and
Release targets, deleted branch confirmation, and final local/remote alignment.

