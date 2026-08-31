# Research: GitHub Packages npm Registry

- Date checked: 2026-08-27
- Scope: current official GitHub and npm documentation, plus read-only account
  and registry checks for `aakkino`

## Recommendation

Use GitHub Packages' npm registry under the personal `@aakkino` scope for the
first private distribution channel. It fits the existing GitHub-hosted public
fork, supports private npm packages with granular access, lets the repository's
Actions workflow publish with its short-lived `GITHUB_TOKEN`, and avoids the
paid-account prerequisite of npm private packages. A self-hosted registry adds
availability, backup, patching, and credential-rotation responsibilities that
the current owner-only consumer set does not justify.

The read-only account query authenticated as `aakkino` and returned no existing
npm packages. This supports, but does not replace, an authenticated exact-name
availability check immediately before the first publication.

## Registry And Package Contracts

- GitHub's npm registry is `https://npm.pkg.github.com` and requires a lowercase
  personal or organization scope. Package manifests must use that scope and
  point their `repository` field at the publishing repository.
- `publishConfig.registry` is the package-level safety boundary. It prevents a
  publish command from silently falling back to the public npm registry.
- A newly published GitHub package is private by default. Visibility and access
  can then be managed independently for npm packages, including user, team, and
  repository Actions access.
- A package linked to a repository may inherit access permissions from it. The
  migration must audit and, for owner-only access, disable inherited access if
  it grants anyone beyond the owner, while explicitly preserving Actions access
  for `aakkino/web-to-figma`.
- GitHub Packages' npm tarball limit is 256 MB. The pack gate must record size
  and integrity before publication.

Official references:

- [Working with the npm registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)
- [Package permissions](https://docs.github.com/en/packages/learn-github-packages/about-permissions-for-github-packages)
- [Package access and visibility](https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility)
- [Publishing Node.js packages](https://docs.github.com/en/actions/tutorials/publish-packages/publish-nodejs-packages)

## Authentication Model

| Context | Credential | Minimum access | Repository contract |
| --- | --- | --- | --- |
| Publish workflow | Per-run `GITHUB_TOKEN` | `packages: write`; metadata job separately gets `contents: write` | `actions/setup-node` creates registry auth; token exists only in the publish step environment |
| Same-repository CI install | `GITHUB_TOKEN` | `packages: read` | Package grants Actions access to the repository |
| Other authorized repository | Its `GITHUB_TOKEN` after package Actions access is granted | `packages: read` | Explicit package-to-repository grant |
| Local owner/collaborator | Fine-scoped use is unavailable; GitHub requires PAT classic | `read:packages` only | Token lives in user config/environment, never the repository |
| Unauthorized client | None or account without package access | None | Exact package install/metadata must fail |

GitHub currently documents PAT classic as the supported personal token form
for Packages. Publishing from the owning workflow should use `GITHUB_TOKEN`,
not a long-lived PAT. Local instructions should show a placeholder environment
variable and scoped registry mapping, never a credential value.

## Cost And Alternatives

GitHub Free includes 500 MB package storage and 1 GB monthly data transfer for
private packages; GitHub Actions downloads using `GITHUB_TOKEN` do not count
against transfer. Usage above the allowance requires billing/budget handling.

Paid npm private packages remain a viable future alternative when npm-native
token ergonomics or npm organization teams outweigh migration cost, but npm
requires a paid user or organization plan for private packages. A registry
change would require another package distribution migration and consumer auth
update, so it is deferred rather than abstracted now.

Official references:

- [GitHub Packages billing](https://docs.github.com/en/billing/concepts/product-billing/github-packages)
- [npm private packages](https://docs.npmjs.com/about-private-packages/)
- [npm private package publishing](https://docs.npmjs.com/creating-and-publishing-private-packages/)

## Provenance And Audit

The repository's current `NPM_CONFIG_PROVENANCE=true`, `id-token: write`, and
package `publishConfig.provenance=true` are npm-registry provenance settings.
npm's official provenance documentation describes publication to the npm
registry and does not establish GitHub Packages npm provenance support. The
GitHub Packages migration should remove those settings rather than claim an
unsupported attestation.

For this registry, the audit record is the reviewed source SHA, protected
environment approval, workflow run, staged tarball SHA-512, registry metadata,
authorized install result, package tags, and GitHub Releases. A separate
artifact-attestation enhancement can be planned later if stronger attestations
are required.

Official reference:

- [npm provenance statements](https://docs.npmjs.com/generating-provenance-statements/)

## Operational Constraints

- Package name/version coordinates are immutable. A partially successful run
  must verify and resume missing coordinates; it must not overwrite a version.
- The first publication must be manual, protected, SHA-pinned, serial, and
  staged under a non-default dist-tag. Promote the consumer tag only after the
  complete set passes authenticated and unauthenticated checks.
- Deletion is an incident response, not normal rollback. GitHub allows package
  admins to delete and restore eligible private versions, but the default
  recovery is to remove/promote dist-tags, revoke access, preserve evidence,
  and publish a corrected new version.

Official reference:

- [Deleting and restoring packages](https://docs.github.com/en/packages/learn-github-packages/deleting-and-restoring-a-package)
