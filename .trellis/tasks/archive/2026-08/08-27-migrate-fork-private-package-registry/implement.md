# Implementation Plan: Fork-Owned Private Package Registry

## Entry Gates

- [ ] Receive explicit approval of the current `prd.md`, `design.md`, and this
  plan in a later user message.
- [ ] Only then run `task.py start`; planning approval alone is not permission
  to publish or mutate remote settings.
- [ ] Recheck remote `main`, open release PRs, Release runs, fork tags/Releases,
  public npm coordinates, and authenticated GitHub Packages coordinates.
- [ ] Record the approved remote `main` SHA and create a clean isolated
  worktree from that exact commit. Do not use the dirty
  `sync/upstream-20260726` worktree or stale local tracking refs.
- [ ] Confirm `@aakkino` remains the authenticated GitHub identity and the
  three exact package names are available.

## Phase A: Quarantine And Policy Guard

- [ ] Add a tested release-policy script that enumerates workspace manifests
  and has an explicit allowlist for the three owned publishable packages.
- [ ] Make the script fail on any non-private `@figit/*` package, public npm
  publish destination, unapproved scope/registry, publishable package outside
  the allowlist, or private package accidentally included in the allowlist.
- [ ] Split `.github/workflows/release.yml` into push-triggered version-PR
  automation without publishing and manually dispatched publication.
- [ ] Require a 40-character target SHA for publish dispatch and fail unless it
  equals the approved current remote `main`.
- [ ] Put the registry-write job behind `package-publish`; document the required
  environment/reviewer setup but do not create remote settings without the
  operation-specific approval gate below.
- [ ] Give versioning only content/PR permissions, publishing only
  `packages: write`, and final metadata reconciliation only `contents: write`.
- [ ] Remove `id-token: write`, `NPM_CONFIG_PROVENANCE`, and any npm-public
  authentication path.
- [ ] Disable `pkg-pr-new` publication for the three migrated packages and
  replace its release assurance with local CI pack/inspect/install checks that
  do not upload package tarballs.

Rollback point: before merging, the old release workflow still exists on
remote `main`; do not push any preparatory commit that leaves an unconditional
old-scope publish path active.

## Phase B: Rename The Publishable Graph

- [ ] Rename package identities:
  `@aakkino/fig-kiwi@0.2.0`,
  `@aakkino/composed-dom@0.1.1`, and
  `@aakkino/dom-to-figma@0.3.0`.
- [ ] Update all three manifests to fork author/homepage/repository/bugs
  metadata and `https://npm.pkg.github.com` publish configuration with private
  access semantics.
- [ ] Update core runtime/dev dependencies to owned Kiwi/composed names and
  update private consumer manifest dependencies/peers.
- [ ] Update source and test imports for only the three migrated identities.
- [ ] Update root and CI `pnpm --filter` commands for migrated package names.
- [ ] Preserve private-only `@figit/browser-capture-adapter`,
  `@figit/oracle-harness`, and `@figit/ui` identities.
- [ ] Preserve explicit upstream compatibility coordinates. Refactor mixed
  fixtures so fork-owned package-under-test names and pinned upstream target
  names are separate values.
- [ ] Update current package README/install examples and changelog headings;
  retain historical upstream names/links where they are factually historical,
  but correct fork-only release links.
- [ ] Update root README and `CONTRIBUTING.md` for the private registry,
  protected manual publish flow, and token-free repository rules.
- [ ] Update `.changeset/config.json` to the fork repository and private access
  policy. Do not restore the nine consumed changesets or create a synthetic
  version bump.
- [ ] Regenerate `pnpm-lock.yaml` with pnpm. Regenerate any maintained external
  consumer lockfile with its owning package manager; never hand-edit lock data.

Rollback point: revert the migration commit in the isolated branch before any
registry write. No old-scope publish should be executable from the branch.

## Phase C: Serial Release Tooling

- [ ] Add a release module/script with a hard-coded, reviewed dependency order:
  Kiwi, composed DOM, core.
- [ ] Support a no-write preflight/dry-run mode used by CI.
- [ ] Pack each package once to a clean staging directory and emit a machine-
  readable manifest with source SHA, package coordinate, files, size, SHA-512,
  dependencies, peers, exports, and tarball path.
- [ ] Reject tarballs over 256 MB, missing export targets, `workspace:` values,
  migrated `@figit/*` edges, unexpected files, or a coordinate outside the
  allowlist.
- [ ] Query exact target versions with authenticated GitHub Packages access.
  Treat absent as eligible, exact integrity/metadata match as already complete,
  and any mismatch as a hard stop.
- [ ] Publish exact staged tarballs serially under a temporary migration tag.
  Never rebuild between inspection and publication.
- [ ] After each write, verify metadata, integrity, private visibility/access,
  authorized download/import, and unauthorized denial before continuing.
- [ ] Promote the consumer tag only after all three packages and the full clean
  consumer smoke pass.
- [ ] Reconcile owned package Git tags and GitHub Releases at the exact source
  SHA only after registry success. Make reruns accept already-correct metadata
  and stop on conflicts.
- [ ] Ensure logs redact tokens and never print npm/user configuration containing
  credentials.

Rollback point: published versions are immutable. On partial success, leave
matching private versions under the staging tag, revoke access if needed, fix
the failure, and rerun to continue missing coordinates. Do not delete or reuse
versions during ordinary recovery.

## Phase D: Local And CI Validation

Run from the isolated implementation worktree:

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm check-types
pnpm build
pnpm test
pnpm oracle:parity
pnpm upstream-adapter:stable
pnpm upstream-adapter:main
pnpm upstream-core-delta:check
```

- [ ] Run focused tests for the release-policy and serial-publish scripts,
  including absent, already-matching, mismatched, partial-success, tag-conflict,
  and unauthorized cases with mocked registry/GitHub boundaries.
- [ ] Run package-specific build/type/test gates for all three migrated
  packages and consumer builds for extension, playground, adapter, and oracle.
- [ ] Run release preflight in no-write mode and archive its package manifest as
  CI evidence.
- [ ] Install the staged tarballs in a new temporary consumer outside the
  workspace and import every public entrypoint.
- [ ] Prove the packed core resolves owned Kiwi and contains no workspace link.
- [ ] Run a repository-wide scoped search and classify every remaining
  `@figit` occurrence as private-workspace, upstream-compatibility, or history.
- [ ] Validate workflow syntax and job permissions without dispatching publish.

No live registry write occurs in this phase.

## Phase E: Code Review And Merge Gate

- [ ] Run `trellis-check` with the curated check context.
- [ ] Review the isolated diff for generated lockfile-only churn and accidental
  changes to unrelated user work.
- [ ] Verify the migration commit itself disables the old push-triggered
  publication before it reaches `main`.
- [ ] Present code/CI results and the exact source SHA for separate operational
  approval. Starting implementation does not implicitly authorize package
  publication, environment changes, tags, Releases, or deletions.

## Phase F: Approved Remote Setup And First Publication

Only after the user explicitly approves the operational run:

- [ ] Create/configure the protected `package-publish` environment with the
  approved reviewer and least-privileged deployment policy.
- [ ] Confirm the workflow repository's package Actions access and budget/quota.
- [ ] Dispatch the publish workflow for the exact reviewed SHA.
- [ ] After each package appears, confirm private visibility and owner-only
  access; disable inherited access if broader, then explicitly preserve
  `aakkino/web-to-figma` Actions access.
- [ ] Complete authorized owner install and an unauthorized install denial.
- [ ] Promote the consumer tag only when the complete set passes.
- [ ] Reconcile exactly three owned-name tags/Releases and no unrelated refs.
- [ ] Verify public npm still lacks
  `@figit/dom-to-figma@0.3.0` and
  `@figit/composed-dom@0.1.1`.
- [ ] Verify final CI/Release records point to the reviewed SHA and record
  tarball integrity, workflow URL, registry metadata, and access checks.
- [ ] Revoke or rotate any local read token used for the smoke test if it was
  temporary. The publish workflow retains no long-lived secret.

## Incident/Partial-Failure Procedure

- [ ] Stop the workflow and preserve run logs and staged manifest.
- [ ] Revoke package/repository access or the credential if exposure is
  suspected.
- [ ] Query each exact package, dist-tag, Git tag, and GitHub Release with an
  authorized identity; do not infer state from the workflow conclusion.
- [ ] Resume only missing packages when existing integrity and metadata match.
- [ ] Remove/promote dist-tags to control consumption; publish a corrected new
  version for ordinary defects.
- [ ] Request separate destructive approval before deleting/restoring a package
  version, tag, Release, branch, or other remote state.

## Completion Evidence

- [ ] Planning acceptance criteria mapped to command/run evidence.
- [ ] Clean isolated-worktree validation log.
- [ ] Pack manifest and SHA-512 for all three packages.
- [ ] Authorized success and unauthorized denial records.
- [ ] Exact registry versions, access settings, tags, Releases, and source SHA.
- [ ] Negative public-npm checks and final release-workflow status.
- [ ] Rollback/resume procedure exercised with mocks and recorded for the live
  run without destructive registry testing.
