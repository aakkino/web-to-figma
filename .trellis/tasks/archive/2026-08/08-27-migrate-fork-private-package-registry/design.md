# Design: Fork-Owned Private Package Registry

## Status

Planning proposal for approval. No implementation or registry mutation has
been performed.

Authoritative source baseline at planning time:
`aakkino/web-to-figma` remote `main` at
`8ef6b90909a0f0112fae6d6220bcb124c64f8d4d` (2026-08-27).
Implementation must recheck and pin a fresh approved SHA.

## Decision Summary

| Decision | Selected design | Reason |
| --- | --- | --- |
| Registry | GitHub Packages npm registry | Native to the existing GitHub workflow, private-by-default packages, granular access, short-lived workflow token, no separate registry service |
| Scope | Personal `@aakkino` | Already controlled by the fork owner; avoids creating and governing an organization before there is a team |
| Publishable boundary | Migrate all three publishable packages | `dom-to-figma`, `composed-dom`, and runtime dependency `fig-kiwi` are all currently publishable; leaving Kiwi publishable under `@figit` violates the deny boundary and freezing a local mirror creates future drift risk |
| Internal packages | Keep private workspace-only names unchanged | `@figit/browser-capture-adapter`, `@figit/oracle-harness`, and `@figit/ui` have `private: true`; renaming them adds churn without improving registry safety |
| Privacy objective | Controlled package distribution only | Source repository stays public; source privacy requires a separate repository migration and is out of scope |
| Initial consumers | Owner-only, plus the owning repository's Actions access | Least privilege matches the known consumer set; named users/repos can be granted read access later without changing package identity |
| Version recovery | Preserve `0.3.0`, `0.1.1`, and `0.2.0` under new names | New registry coordinates are unused; preserves materialized changelogs and compatibility ranges without recreating consumed changesets |
| First release | Manual, protected, SHA-pinned, serial, idempotent | Prevents another push-triggered publish and provides per-package verification/resume points |
| Package previews | Disable external `pkg.pr.new` publication | A public ephemeral package contradicts owner-only binary distribution; CI retains local pack/install validation |

## Package Boundary

| Current identity | New identity | Initial version | Dependency role |
| --- | --- | --- | --- |
| `@figit/fig-kiwi` | `@aakkino/fig-kiwi` | `0.2.0` | Leaf runtime codec |
| `@figit/composed-dom` | `@aakkino/composed-dom` | `0.1.1` | Independent DOM traversal package; core dev/test dependency |
| `@figit/dom-to-figma` | `@aakkino/dom-to-figma` | `0.3.0` | Primary public API; runtime-depends on owned Kiwi |

All three manifests set the fork repository metadata and
`publishConfig.registry=https://npm.pkg.github.com`. They must not contain
`access: public` or npm provenance settings. Changesets uses private/restricted
access and the fork repository identity.

Private workspace package names may retain `@figit/*`, but every dependency,
peer dependency, import, filter, fixture, and current-facing document that
refers to one of the three migrated packages changes to `@aakkino/*`.

Intentional exceptions remain under `@figit`:

- pinned upstream compatibility targets and fixtures;
- historical changelog entries describing upstream releases;
- private workspace-only package identities protected by `private: true`.

The implementation uses an explicit semantic allowlist. A global text replace
is forbidden because it would corrupt upstream compatibility tests.

## Release Architecture

### Version automation

Pushes to `main` may continue to run Changesets version-PR automation, but that
job has no publish command and no package-write credential. Its permissions are
limited to the repository content and pull-request operations it needs.

### Publish automation

Publication is a separate `workflow_dispatch` path using a protected
`package-publish` environment. It requires an exact 40-character source SHA,
checks that the SHA is the approved remote `main`, checks that the workflow tree
is clean, and uses an explicit package allowlist in dependency order:

```text
@aakkino/fig-kiwi
  -> @aakkino/composed-dom
  -> @aakkino/dom-to-figma
```

`composed-dom` is independent of Kiwi, but publishing it between the leaf and
primary package keeps a deterministic allowlist and makes the primary package
the final consumer-facing promotion point.

The workflow is split by permission:

1. Build/pack checks use `contents: read` and no registry write token.
2. The protected publish job gets `packages: write`, receives the per-run
   `GITHUB_TOKEN` only as `NODE_AUTH_TOKEN`, and publishes staged tarballs.
3. Metadata reconciliation gets `contents: write` only after registry and
   consumer verification succeeds, then creates exact owned-name tags and
   GitHub Releases at the pinned SHA.

No PAT is stored for publishing. `id-token: write` and npm provenance flags are
removed because the selected registry does not document npm provenance support.

### Serial, idempotent publication

A repository script owns the allowlist and release state machine. For each
package it:

1. Packs once and records name, version, file list, byte size, SHA-512, source
   SHA, dependency map, and export targets.
2. Queries the authenticated target registry for the exact coordinate.
3. If absent, publishes the exact tarball under a temporary migration tag.
4. If present with matching integrity and metadata, records it complete.
5. If present but mismatched, stops without overwriting.
6. Verifies private visibility, authorized download, and unauthorized denial
   before moving to the next package.

Only after all three pass does it promote the intended consumer tag. Tag and
GitHub Release reconciliation is also idempotent: create missing correct
metadata, accept already-correct metadata, and stop on any conflicting target.

This intentionally does not use Changesets CLI's concurrent `publish` loop for
the first private publication. Future releases may reuse the same serial path;
the allowlist and exact-version skip behavior make reruns safe.

## Authentication And Access

### Repository and CI

The scoped registry mapping is non-secret. Release setup configures
`@aakkino` to `https://npm.pkg.github.com`; the default registry remains public
npm for third-party dependencies. Only jobs that actually install private
owned packages receive `packages: read` and a per-run `GITHUB_TOKEN`.

### Local and downstream consumers

Documentation provides:

- a scope-to-registry mapping for `@aakkino`;
- a placeholder environment variable or user-level npm config entry;
- PAT classic `read:packages` as the minimum local credential;
- explicit instructions never to commit a token.

Other repositories use their own `GITHUB_TOKEN` only after being granted
package Actions access. Named collaborators receive read access only.

### First-publication access reconciliation

GitHub creates npm packages private by default. After each first publication,
the operator verifies visibility and access. If repository inheritance grants
more than the owner, disable inheritance and explicitly retain Actions access
for `aakkino/web-to-figma`. An unauthenticated client and an authenticated but
unauthorized identity must both fail to install.

## Release-State Reconciliation

The merged release PR has already consumed nine changesets and materialized the
`0.3.0` / `0.1.1` changelogs. The migration therefore:

- does not revert release commit `8ef6b90`;
- does not recreate the nine changesets;
- does not add a synthetic migration bump;
- publishes the same code under new package identities;
- publishes owned Kiwi `0.2.0`, whose remote `main` package tree exactly
  matches the existing upstream `0.2.0` tag at planning time;
- creates only `@aakkino/*` tags and GitHub Releases after registry success;
- leaves historical `@figit/*` tags and public npm versions untouched;
- never retries failed run `33045155450`.

The stale `changeset-release/main` branch is not deleted in this task unless a
separate destructive cleanup is explicitly approved after publication.

## Compatibility And Data Flow

```text
workspace source names
  -> pnpm lockfile workspace links
  -> build outputs
  -> packed manifest (workspace protocol rewritten to semver)
  -> GitHub Packages registry metadata/tarballs
  -> authenticated clean consumer install
  -> runtime import/export smoke
```

The pack gate proves that no `workspace:` protocol remains, the owned package
dependencies use owned names and valid ranges, every declared export exists,
and no secret or unintended file is included. Workspace tests alone are not
sufficient because workspace links bypass registry resolution.

The upstream compatibility path remains separate:

```text
fork packages under test: @aakkino/*
upstream comparison target: @figit/dom-to-figma at pinned upstream version/ref
```

Scripts that currently overload one string for both roles must be updated
semantically so the two identities cannot be confused.

## Validation Contract

From an isolated worktree at the approved remote SHA:

1. Frozen install, lint, typecheck, build, full test, and parity gate.
2. Stable/upstream-main compatibility and core-delta governance gates.
3. Static release-policy test enumerating every workspace manifest and failing
   any publishable `@figit/*`, public npm destination, unapproved scope/registry,
   or package outside the allowlist.
4. No `pkg.pr.new` or other external preview publication; pull requests run
   local pack/inspect/install checks without uploading tarballs.
5. Pack inspection for all three packages, including integrity and dependency
   resolution.
6. Clean tarball install/import tests outside workspace resolution.
7. Authenticated registry absence/match preflight.
8. Authorized and unauthorized consumer checks after each publish.
9. Registry/tag/Release/run reconciliation at the exact source SHA.
10. Public npm negative checks for forbidden `0.3.0` / `0.1.1` coordinates.

The existing `pkg.pr.new` workflow is disabled for the three migrated
packages. It is a public ephemeral distribution channel and therefore cannot
satisfy owner-only binary access. Pull requests still exercise the exact pack,
manifest inspection, and clean local install path, but do not upload candidate
tarballs. A private prerelease channel is deferred to a separate approved task.

## Rollback And Resume

Before registry write, rollback is simply to stop and revoke any suspect token.
After a package version is written, it is immutable operational state:

- keep a matching private version and resume the next missing package;
- do not overwrite or reuse the coordinate;
- do not promote the consumer tag until the complete set passes;
- remove or restore dist-tags and revoke package/repository access to stop
  consumption;
- publish a corrected new version for ordinary defects;
- use package deletion only for wrong bytes or unintended visibility, with
  separate destructive approval and preserved incident evidence;
- reconcile missing tags/Releases idempotently after package state is correct.

## Deferred Items

- Moving source to a private repository.
- Creating a GitHub organization and migrating from `@aakkino` to an org scope.
- Adding collaborators, teams, or downstream repositories before they exist.
- Replacing GitHub Packages with paid npm or a self-hosted registry.
- Stronger artifact attestations beyond the selected registry's supported
  package metadata, workflow audit trail, and recorded tarball integrity.
- Deleting the stale release branch or any historical tags/releases.
