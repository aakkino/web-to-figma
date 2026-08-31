# Release @aakkino/dom-to-figma 0.4.0

## Goal

Release the already-reviewed CSS raster background and lazy background source
features as private `@aakkino/dom-to-figma@0.4.0`, using the repository's
protected, exact-SHA release path and leaving the repository, registry, and
release branch in a verified final state.

The user value is a consumable private package release whose source, artifact,
visibility, metadata, and audit trail can all be traced to one approved commit.

## Confirmed Facts

- PR #15, `chore: release packages`, is open from
  `changeset-release/main` at
  `1aa2e5b9433adc0297ab6c56567c3e8f31d3db10` into `main` at
  `f4d3e9e2b89682b636ff297766c18b4bc8296307` as of 2026-08-31.
- PR #15 is mergeable but `BLOCKED`; its head has no check runs. Protected
  `main` requires `Lint, typecheck, build, test` and `Tier-0 parity ratchet`,
  with strict checks and admin enforcement.
- The PR changes exactly five paths: it removes the two expected minor
  Changesets, adds the `0.4.0` changelog entries for PRs #14 and #16, changes
  `packages/dom-to-figma/package.json` from `0.3.0` to `0.4.0`, and raises
  the private browser capture adapter peer floor from `>=0.3.0` to `>=0.4.0`.
- GitHub Packages currently contains private
  `@aakkino/dom-to-figma@0.3.0` only; `0.4.0` is absent. The two other
  allowlisted coordinates remain `@aakkino/fig-kiwi@0.2.0` and
  `@aakkino/composed-dom@0.1.1`.
- `.github/workflows/release.yml` separates Changesets version-PR automation
  from a manual `workflow_dispatch` publish path. Publication requires an
  exact 40-character SHA equal to current `origin/main`, runs in the protected
  `package-publish` environment, and reconciles tags/Releases only after
  package publication succeeds.
- The `package-publish` environment has a required reviewer, accepts only
  `main`, and contains the `PACKAGE_PUBLISH_TOKEN` environment secret.
- The release state machine packs and verifies all three allowlisted packages
  in fixed order. Existing byte-identical versions are idempotent successes;
  only the absent `@aakkino/dom-to-figma@0.4.0` may be newly published.
- Closing and reopening PR #15 is the existing non-code mechanism for
  generating a fresh `pull_request` event for both CI and Package Release
  Assurance. Any changed PR head invalidates earlier evidence.
- PR #15 merged as
  `adc52aea87e1f6f25f53d43028527e5dd8489892`. Release run `33355456677`
  then completed the protected publish job and created private
  `@aakkino/dom-to-figma@0.4.0` with integrity
  `sha512-LNXSShqjYWV3et9c11DEDXOZQOat3W8e5UIE2oGPA14Gm5+/O2SmL+d0jNmaw+2BySJ1UqmhFre0T4Irhdq/Yg==`.
- The same run failed only in metadata reconciliation because the current
  implementation requires the unchanged historical
  `@aakkino/fig-kiwi@0.2.0` tag to point to the new release SHA instead of its
  correct original SHA `dd91f18346d7326ab71c1a77769bfe7aed310af3`.
- The published `0.4.0` bytes and dist-tags must be preserved. Its Git tag and
  GitHub Release are still absent; `changeset-release/main` is still present.
  Repeating the same workflow code would fail deterministically.

## Requirements

- R1. Keep the release scope limited to Changesets PR #15 and the new
  `@aakkino/dom-to-figma@0.4.0` coordinate. Do not version or newly publish an
  unrelated package.
- R2. Before any merge, revalidate that the PR head, base, five-path diff,
  version transition, changelog entries, peer range, and consumed Changesets
  still match the confirmed facts.
- R3. Trigger the missing PR workflows without changing product code. Require
  all six PR checks, including both protected contexts and Package Release
  Assurance, to pass at the exact final PR head SHA.
- R4. Merge PR #15 through the protected pull-request path only. Do not bypass
  branch protection, force-push, or push directly to `main`.
- R5. After merge, obtain the exact current `origin/main` SHA and require it to
  contain the approved release diff. Any concurrent movement of `main` before
  publication is a hard stop requiring a fresh review decision.
- R6. Publish only through `.github/workflows/release.yml` with the exact
  approved `source_sha` and the `package-publish` protected environment.
  Direct `npm publish`, `changeset publish`, and alternate workflows are
  forbidden.
- R7. Treat environment review as a deliberate deployment gate. Do not bypass
  it; wait for the configured reviewer to approve the run.
- R8. Accept an existing package version only when the protected release logic
  proves byte and metadata identity. Stop on conflicts, public visibility,
  inconclusive anonymous access, failed Actions access, or any other failed
  release invariant.
- R9. Declare release success only after the publish and metadata jobs succeed
  and live inspection confirms private visibility, expected integrity and
  package metadata, authorized access, anonymous denial, the owned tag, and
  the GitHub Release at the approved SHA.
- R10. Delete `changeset-release/main` only after R9 succeeds, then fast-forward
  local `main` to `origin/main` and verify a clean, aligned worktree.
- R11. Preserve audit evidence for the PR checks, merge commit, Release run,
  registry version, integrity, tag, Release, branch deletion, and final local
  alignment.

## Acceptance Criteria

- [ ] AC1 (R1-R2): PR #15 still has exactly the approved five-path release
  diff, and `@aakkino/dom-to-figma@0.4.0` is absent immediately before merge.
- [ ] AC2 (R3): all PR checks pass at the final head SHA, including the two
  protected checks and Package Release Assurance.
- [ ] AC3 (R4-R5): PR #15 is merged without bypassing protection, and the
  reviewed merge result is the exact current `origin/main` SHA used for the
  release.
- [ ] AC4 (R6-R8): the protected Release workflow succeeds for that exact SHA;
  unchanged package coordinates are verified idempotently and only
  `@aakkino/dom-to-figma@0.4.0` is newly published.
- [ ] AC5 (R9): GitHub Packages reports private
  `@aakkino/dom-to-figma@0.4.0` with the staged integrity, expected repository
  and package manifest metadata, authorized access, and anonymous denial.
- [ ] AC6 (R9): tag and GitHub Release
  `@aakkino/dom-to-figma@0.4.0` point to the approved release SHA, with no
  conflicting owned metadata.
- [ ] AC7 (R10-R11): `changeset-release/main` is removed, local `main` is clean
  and identical to `origin/main`, and the task records the relevant URLs,
  SHAs, and integrity evidence.

## In Scope

- Revalidate PR #15, registry absence, branch protection, release environment,
  and exact package diff.
- Retrigger and monitor PR CI and Package Release Assurance.
- Merge PR #15 through branch protection.
- Dispatch, approve, monitor, and verify the exact-SHA private Release run.
- Reconcile registry, access, tag, GitHub Release, release branch, and local
  `main` state.

## Out Of Scope

- Product-code, release-workflow, package-policy, Changesets configuration, or
  branch-protection changes.
- Any new version of `@aakkino/fig-kiwi` or `@aakkino/composed-dom`.
- Direct publication, public npm publication, provenance changes, or public
  package previews.
- Deleting or rewriting package versions, tags, Releases, or unrelated
  branches as ordinary recovery.
- Cleaning any branch in `upstream/figitdesign/web-to-figma`.

## Risks And Deferred Items

- Reopening PR #15 is a recoverable remote state change and may notify
  subscribers; it is required because the bot-created head currently has no
  PR checks.
- A new commit on `main` after the PR merge invalidates the planned
  `source_sha`; the workflow will fail closed, and this task must return to an
  explicit source review rather than substituting a newer SHA.
- A partial publish may leave an immutable, byte-identical `0.4.0` version
  without final metadata. Preserve it and rerun the same SHA idempotently;
  destructive deletion requires a separate incident decision.
- Broader Changesets automation improvements, including replacing bot-token
  PR generation so checks trigger automatically, are deferred to a separate
  task.

## Approved Child Dependency

Completing AC6 and AC7 requires child task
`08-31-fix-private-release-metadata-recovery`, approved for creation on
2026-08-31. It must complete and merge before this release resumes. The child
will:

- persist per-coordinate publish state into the non-binary manifest and
  reconcile metadata only for coordinates initially absent in that release;
- add a bounded, fail-closed source/version-history selector for the existing
  manifest-only `0.4.0` partial publication;
- preserve historical tag targets and reject arbitrary retargeting;
- add regression tests, update the release contract, pass CI/review, and merge
  before a newly reviewed exact-SHA recovery run.

Child creation is not implementation approval. Until its final plan is
separately approved, implemented, checked, reviewed, and merged, do not retry
the Release workflow, delete `0.4.0`, create metadata manually, retarget
historical tags, or delete the release branch.
