# Migrate Fork Packages to a Private Registry

## Goal

Establish a fork-owned, private npm-compatible distribution channel so the
public `aakkino/web-to-figma` repository can publish and consume its maintained
packages without claiming or requiring access to the upstream-owned `@figit`
npm scope.

The user value is a repeatable, least-privileged package release path whose
artifacts are installable only by explicitly authorized consumers while the
source fork remains public.

## Confirmed Facts

- Remote `main` was read-only verified at
  `8ef6b90909a0f0112fae6d6220bcb124c64f8d4d` on 2026-08-27. The local
  worktree and local `origin/main` tracking ref are older and are not valid
  implementation baselines.
- Release PR #9 merged the already-materialized package versions and consumed
  nine changesets: `@figit/dom-to-figma@0.3.0` and
  `@figit/composed-dom@0.1.1`.
- Release run `33045155450` built successfully, then npm rejected both package
  publishes with `ENEEDAUTH`. No package from that run was published and no
  GitHub Release/tag for either failed version was created.
- Public npm still reports `@figit/dom-to-figma@0.2.4`, has no visible
  `@figit/composed-dom`, and reports `@figit/fig-kiwi@0.2.0`; the upstream
  scope is controlled by another maintainer.
- `packages/dom-to-figma`, `packages/composed-dom`, and `packages/fig-kiwi`
  are all non-private publishable workspaces. The other apps/internal packages
  are protected by `private: true`.
- Core has a runtime workspace dependency on Kiwi. The remote `main` Kiwi tree
  exactly matches the existing `@figit/fig-kiwi@0.2.0` tag, but leaving the
  local package publishable under `@figit` would retain a forbidden future
  release path and freezing it as a mirror would create drift risk.
- The current Release workflow publishes on every push to `main`; with no
  pending changesets it can retry all registry-missing package versions.
- The repository is public and has no GitHub Release, open PR, configured
  deployment environment, or authenticated GitHub npm package visible for the
  owner at planning time.

## Approved-For-Review Decisions

These are the converged planning selections presented for user approval. They
are not implementation or publication authorization.

1. Use GitHub Packages' npm registry, not paid npm private packages or a
   self-hosted registry.
2. Use the owner-controlled personal scope `@aakkino`; defer an organization
   scope until organization governance is actually needed.
3. Migrate all three publishable packages:
   `@aakkino/dom-to-figma`, `@aakkino/composed-dom`, and
   `@aakkino/fig-kiwi`. Keep private workspace-only package names unchanged.
4. Limit privacy to controlled package distribution. The source repository
   remains public; private source is a separate, out-of-scope migration.
5. Start owner-only. Preserve explicit Actions access for
   `aakkino/web-to-figma`; grant future collaborators or repositories read
   access individually when requested.
6. Preserve the materialized versions under the new identities:
   `dom-to-figma@0.3.0`, `composed-dom@0.1.1`, and `fig-kiwi@0.2.0`.
   Do not restore consumed changesets or add a synthetic bump.
7. Replace automatic publishing on `main` with a protected, manually
   dispatched, exact-SHA first release that publishes staged tarballs serially
   and resumes idempotently after partial success.
8. Disable external `pkg.pr.new` publication for the three migrated packages.
   CI still packs, inspects, and installs candidates locally, but does not
   upload a publicly downloadable package preview.

## Requirements

- R1. Every publishable fork package uses the owner-controlled `@aakkino`
  scope and `https://npm.pkg.github.com`.
- R2. No active workflow, manifest, Changeset, preview wildcard, or release
  command can publish a fork artifact under `@figit/*` or to public npm.
- R3. The rename boundary includes all three publishable workspaces and every
  active dependency, peer, import, command filter, lockfile, fixture, current
  document, and package metadata edge. Historical and explicit upstream
  compatibility references remain accurate rather than being globally
  replaced.
- R4. Workspace builds, tests, exports, packed dependency resolution,
  downstream installs, and fork-specific behavioral/compatibility contracts
  remain intact.
- R5. Local development, CI, publication, and downstream auth use
  least-privileged credentials without committing or logging tokens. Package
  previews remain validation-only and create no externally downloadable
  artifact.
- R6. The already-merged versions/changelogs remain the release baseline; the
  nine consumed changesets are not recreated and old `@figit` tags/releases
  are not manufactured.
- R7. Version-PR automation and package publication have separate triggers and
  permissions. The first publication is protected, manual, SHA-pinned, serial,
  auditable, and safe to resume.
- R8. GitHub packages remain private and owner-only except for explicit Actions
  access to the owning repository. Source visibility remains public.
- R9. Registry writes, environment/access changes, tags, Releases, branch
  cleanup, and destructive recovery require a separate operational approval
  after implementation and dry-run verification.
- R10. Package tarballs are built once, inspected before write, and verified
  after write by coordinate, integrity, visibility, dependency graph, and
  authorized/unauthorized consumer behavior.

## Acceptance Criteria

- [ ] A machine-enforced policy proves every non-private workspace is in the
  approved `@aakkino` allowlist and no active release path can publish
  `@figit/*` or use public npm.
- [ ] The three migrated manifests, packed manifests, registry records, tags,
  and GitHub Releases use exactly the approved names and preserved versions.
- [ ] An isolated worktree at the approved remote SHA passes frozen install,
  lint, typecheck, build, test, oracle parity, stable/upstream compatibility,
  and core-delta governance.
- [ ] Pack inspection proves correct exports/files, no `workspace:` protocol,
  owned dependency names/ranges, size under 256 MB, and recorded SHA-512 for
  every package.
- [ ] A clean non-workspace consumer installs/imports staged tarballs, then an
  authorized consumer installs the private packages while an unauthorized
  consumer cannot resolve them.
- [ ] Pull requests run local pack/inspect/install validation without
  publishing to `pkg.pr.new` or another public preview channel.
- [ ] The first release publishes packages one at a time under a staging tag,
  verifies each durable write, and promotes the consumer tag only after the
  complete set succeeds.
- [ ] Publish credentials are per-run or read-only PATs as appropriate, never
  committed/logged, and workflow permissions are separated by job.
- [ ] Release metadata and audit evidence point to the approved source SHA;
  unsupported npm provenance is not claimed.
- [ ] Public npm still lacks `@figit/dom-to-figma@0.3.0` and
  `@figit/composed-dom@0.1.1`, and no unrelated refs/releases/packages exist.
- [ ] Partial-publication resume, dist-tag rollback, access revocation, and
  destructive incident escalation are documented and tested with mocked
  boundaries without destructive live-registry operations.
- [ ] Final CI and Release status is verified after the controlled publication.

## In Scope

- Registry/scope/package identity and package metadata migration.
- Dependency/import/filter/docs/lockfile updates for the three migrated names.
- Release-policy validation, removal of public package previews, and an
  explicit private publish allowlist.
- Split version/publish automation, least-privileged authentication, serial
  publish/reconciliation tooling, and clean consumer validation.
- Owner-only GitHub package access plus owning-repository Actions access.
- Controlled first publication and release-state reconciliation after a
  separate operational approval.

## Out Of Scope

- Making the GitHub source repository private or moving it.
- Creating a GitHub organization solely for package scope ownership.
- Renaming private workspace-only packages that cannot be published.
- Publishing, patching, deprecating, or claiming any upstream `@figit` package.
- Retrying Release run `33045155450`.
- Recreating consumed changesets or rewriting accurate upstream history.
- Deleting the stale release branch, packages, versions, tags, or Releases
  without separate destructive approval.
- Adding unknown future collaborators/teams/repositories during the initial
  owner-only rollout.

## Planning Evidence

- `research/package-boundary.md` maps workspaces, consumers, release/preview
  surfaces, intentional upstream references, and validation scope.
- `research/release-recovery.md` records remote-main/release/npm state,
  Changesets partial-publication behavior, version options, and rollback gates.
- `research/github-packages-registry.md` records current official registry,
  privacy, auth, access, billing, and provenance constraints.
- `design.md` defines boundaries, contracts, release data flow, and rollback.
- `implement.md` defines ordered implementation, validation, approval, and
  operational gates.
