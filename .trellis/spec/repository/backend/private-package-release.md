# Private Package Release Contract

## 1. Scope / Trigger

This contract applies whenever the repository changes package identity,
published package contents, release workflows, Changesets configuration, or
GitHub Packages access. The only publishable packages are, in this order:

1. `@aakkino/fig-kiwi`
2. `@aakkino/composed-dom`
3. `@aakkino/dom-to-figma`

The source repository may remain public, but package binaries are private.
Never upload candidate tarballs as Actions artifacts or publish them through
`pkg.pr.new` or the public npm registry.

## 2. Signatures

```sh
pnpm release:policy
pnpm release:preflight --source-sha <40-lowercase-hex-main-sha>
pnpm release:publish
pnpm release:metadata
pnpm test:release
```

`release:preflight` creates `.artifacts/private-release/manifest.json` and one
locally inspected tarball per package. `release:publish` must consume those
exact bytes in the same protected job. `release:metadata` consumes only the
non-binary manifest after publication succeeds.

## 3. Contracts

- Registry: `https://npm.pkg.github.com` for the `@aakkino` scope.
- Workflow input: `source_sha`, exactly 40 lowercase hexadecimal characters.
- Publish credentials: `NODE_AUTH_TOKEN` and `GH_TOKEN`, both provided only to
  the publish step from that job's `GITHUB_TOKEN`.
- Metadata credential: `GH_TOKEN` with repository contents write permission.
- Protected environment: `package-publish`, attached to the job that builds,
  packs, inspects, publishes, and verifies.
- Source identity: checkout `HEAD`, fetched `origin/main`, manifest
  `sourceSha`, package repository metadata, tags, and Releases must resolve to
  the approved SHA.
- Package state: `publishConfig.registry` must be GitHub Packages; public
  access, npm provenance, direct `npm publish`, and migrated active `@figit/*`
  dependency edges are forbidden.
- Publication order is fixed. A package version is either absent, exactly
  matching the staged artifact, or conflicting. Only absent versions publish.

## 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| Source SHA is malformed, not `origin/main`, or checkout is dirty | Stop before packing or publishing |
| Tarball bytes, size, SHA-512, package name/version, files, exports, or dependencies differ from the manifest | Stop; do not publish that artifact |
| Existing registry version matches integrity, repository, dependencies, peers, and exports | Treat as idempotent success and verify it |
| Existing registry version differs | Stop as an immutable-version conflict |
| Authorized clean install/import fails | Stop before continuing to the next package |
| Anonymous probe returns explicit 401, 403, or 404 | Accept as denied access |
| Anonymous probe succeeds, times out, has a network error, or returns 5xx | Fail; never infer privacy from an inconclusive result |
| A later package fails | Do not promote any `latest` dist-tag or create metadata |
| Any existing tag points elsewhere | Inspect all metadata first, then stop without creating refs |
| Existing tag points to the approved SHA and Release exists | Accept as idempotent success |

Diagnostics must redact credentials and remain bounded.

## 5. Good / Base / Bad Cases

- Good: all three versions are absent; publish and verify each serially, then
  promote all `latest` tags and reconcile repository tags/Releases.
- Base: an interrupted run left one or more byte-identical versions present;
  verify them, publish only missing versions, then finish promotion and
  metadata.
- Bad: an existing version has different integrity or metadata, anonymous
  access succeeds, a transient error is reported as denial, or a tarball leaves
  the protected job. The run must fail closed.

## 6. Tests Required

- `pnpm test:release`: assert absent/matching/conflicting registry states,
  scoped REST path encoding, explicit denial classification, staged-byte
  tampering rejection, serial stopping, no partial promotion, authorized
  import, metadata preflight, and release-surface policy.
- `pnpm release:policy`: assert the exact publishable allowlist, owned scope,
  GitHub registry, fork metadata, dependency graph, and guarded workflows.
- `pnpm release:preflight --source-sha <sha>`: build real tarballs, inspect file
  allowlists and exports, and install/import them in clean consumers.
- Before handoff, also run typecheck, build, repository tests, compatibility
  gates, and `git diff --check`. Report gated skips and repository-wide lint
  baselines explicitly.
- The approved live run must verify private visibility, owner access,
  anonymous denial, owning-repository Actions access, and any deliberately
  granted cross-repository consumer separately.

## 7. Wrong vs Correct

### Wrong

```yaml
- run: npm publish --provenance
- uses: actions/upload-artifact@v4
  with:
    path: .artifacts/private-release/*.tgz
```

This selects the public registry/provenance path or exposes private candidate
binaries through a public repository artifact.

### Correct

```yaml
- run: pnpm release:preflight --source-sha "${{ inputs.source_sha }}"
- run: pnpm release:publish
  env:
    NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Build, inspect, publish, and verify the exact local tarballs inside one
protected job. Upload only `manifest.json` for metadata reconciliation.

