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
exact bytes in the same protected job, then write
`.artifacts/private-release/result.json` only after every verification, smoke
test, and dist-tag promotion succeeds. `release:metadata` consumes only the
non-binary manifest and source-bound result after publication succeeds.

## 3. Contracts

- Registry: `https://npm.pkg.github.com` for the `@aakkino` scope.
- Workflow input: `source_sha`, exactly 40 lowercase hexadecimal characters.
- Publish credentials: `NODE_AUTH_TOKEN` and package-visibility `GH_TOKEN`
  both come only from the protected environment secret
  `PACKAGE_PUBLISH_TOKEN`, a classic PAT with `read:packages` and
  `write:packages`. There is no `GITHUB_TOKEN` fallback for either operation.
- Actions-access credential: `ACTIONS_PACKAGE_TOKEN` is the run-scoped
  `GITHUB_TOKEN` with `packages: read`. It is used only for an independent clean
  install/import after private visibility succeeds; it must not publish or
  replace the PAT-based verification.
- Each registry subprocess receives only its intended identity. PAT-based npm
  operations do not inherit GitHub or Actions tokens; the Actions probe does
  not inherit the PAT; anonymous probes and post-install import subprocesses
  receive none of them.
- Metadata credential: `GH_TOKEN` with repository contents write permission.
- Protected environment: `package-publish`, attached to the job that builds,
  packs, inspects, publishes, and verifies.
- Source identity: checkout `HEAD`, fetched `origin/main`, manifest
  `sourceSha`, package repository metadata, tags, and Releases must resolve to
  the approved SHA.
- Package state: `publishConfig.registry` must be GitHub Packages and
  `publishConfig.access` must be explicitly `restricted`; every publish also
  passes `--access restricted`. Public access, npm provenance, unguarded direct
  `npm publish`, and migrated active `@figit/*` dependency edges are forbidden.
- GitHub's user-owned REST package path is
  `/users/aakkino/packages/npm/<leaf>`, where a scoped npm package uses its
  unscoped leaf (`fig-kiwi`, not `@aakkino/fig-kiwi` or its encoded form).
- A package created with public visibility cannot be changed back to private.
  Visibility verification must hard-fail; it must never attempt or claim a
  visibility patch.
- A package first created by a workflow `GITHUB_TOKEN` inherits the source
  repository's visibility. Because this source repository is public, first
  publication must use the environment classic PAT directly. Keep repository
  metadata linked to `aakkino/web-to-figma`; that source attribution does not
  replace or weaken the PAT publication boundary.
- Publication order is fixed. A package version is either absent, exactly
  matching the staged artifact, or conflicting. Only absent versions publish.
- The publish result contains every allowlisted coordinate in fixed order with
  only `name`, `version`, `integrity`, and its closed initial Registry state
  (`absent` or `matching`). Its source SHA and every identity must exactly
  match the manifest before any metadata API call.
- Normal metadata reconciliation selects only coordinates whose persisted
  initial state was `absent`. An empty selection is a successful no-op and
  must make no Tag or Release reads. Historical matching coordinates are not
  metadata candidates merely because they remain in the release manifest.
- The workflow recovery input `recover_missing_metadata` is a boolean that
  defaults to `false`. It affects only metadata selection; it does not change
  publication, Registry verification, or the result document.
- Tag inspection must dereference lightweight or annotated refs to a commit.
  Release inspection must resolve the Release's `target_commitish` to a commit;
  resolving only `tag_name` does not prove the recorded Release target.
- GitHub Packages may omit package-manifest fields such as `exports` from
  `npm view`. Treat that response as authoritative only for the exact
  coordinate and declared `dist.integrity`. For immutable-content comparison,
  authenticated `npm pack --ignore-scripts` must download the registry
  tarball, its bytes must match the declared SHA-512 integrity before parsing,
  and `package/package.json` must supply repository, dependencies, peers, and
  exports. Tar extraction runs without registry or GitHub credentials.

## 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| Source SHA is malformed, not `origin/main`, or checkout is dirty | Stop before packing or publishing |
| Tarball bytes, size, SHA-512, package name/version, files, exports, or dependencies differ from the manifest | Stop; do not publish that artifact |
| Existing registry version matches integrity, repository, dependencies, peers, and exports | Treat as idempotent success and verify it |
| Existing registry version differs | Stop as an immutable-version conflict |
| `npm view` omits exports or other manifest fields | Download the authenticated registry tarball and compare its manifest; do not treat omission as mismatch or success |
| Downloaded bytes differ from declared `dist.integrity` | Stop before tar parsing or any further publication |
| Package API reports public visibility | Stop and use only the approved single-incident recovery workflow; never patch visibility |
| Private visibility passes but the owning repository token cannot install/import | Stop and instruct the operator to grant `aakkino/web-to-figma` under **Manage Actions access**; never substitute the PAT |
| Authorized clean install/import fails | Stop before continuing to the next package |
| Anonymous probe returns explicit 401, 403, or 404 | Accept as denied access |
| Anonymous probe succeeds, times out, has a network error, or returns 5xx | Fail; never infer privacy from an inconclusive result |
| A later package fails | Do not promote any `latest` dist-tag or create metadata |
| Any selected existing tag points elsewhere | Inspect all selected metadata first, then stop without creating refs |
| A selected Release names another tag or resolves to another commit | Stop before creating any Tag or Release |
| An inspected Tag and Release both exist but resolve to different commits | Stop before metadata history resolution or writes |
| Existing selected tag and Release resolve to the approved SHA | Accept as idempotent success |
| Result is missing, reordered, duplicated, malformed, or differs from the manifest | Stop before metadata reads |
| Normal result selection is empty | Succeed without historical metadata reads or writes |
| Explicit recovery history is ambiguous, malformed, non-increasing, or not ancestral | Stop before metadata writes |

Diagnostics must redact credentials and remain bounded.

## 5. Good / Base / Bad Cases

- Good: all three versions are absent; publish and verify each serially, then
  promote all `latest` tags and reconcile repository tags/Releases.
- Base: an interrupted run left one or more byte-identical versions present;
  verify them, publish only missing versions, then finish promotion. Normal
  metadata owns only versions initially absent in that invocation; an
  explicitly authorized recovery may select a matching version only under the
  predicates below.
- Bad: an existing version has different integrity or metadata, anonymous
  access succeeds, a transient error is reported as denial, or a tarball leaves
  the protected job. The run must fail closed.

## 6. Tests Required

- `pnpm test:release`: assert absent/matching/conflicting registry states,
  scoped REST path encoding, explicit denial classification, staged-byte
  tampering rejection, serial stopping, no partial promotion, authorized
  import, metadata preflight, GitHub `npm view` manifest-field omission,
  downloaded-tarball integrity-before-parse ordering, credential-free tar
  extraction, publish-result validation and selection, recovery history,
  Release target resolution, empty selection, and release-surface policy.
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
- Verification order after each publish is private visibility first, owning
  repository Actions-token install/import second, then PAT-authorized and
  anonymous-denial checks.

## 7. Public Fig Kiwi Incident Recovery

The only approved destructive recovery surface is
`recover-public-fig-kiwi.yml` plus
`pnpm release:recover-public-fig-kiwi`. It is deliberately not a generic
package deletion tool. Before deleting, it requires the exact
`RECOVERY_CONFIRM` phrase and incident source SHA, then verifies all preserved
evidence: owner/repository, npm leaf name, package ID, public visibility, the
single version and version ID, version coordinate, and registry integrity.

| Fixed evidence | Required value |
| --- | --- |
| Confirmation | `DELETE_PUBLIC_FIG_KIWI_0.2.0_FF5410E6` |
| Incident source SHA | `ff5410e61de4e9243d8f46967fb5de6199e5ee12` |
| Package / version IDs | `14684516` / `1178055708` |
| Coordinate | `@aakkino/fig-kiwi@0.2.0` |
| Repository | `aakkino/web-to-figma` |
| Integrity | `sha512-5oEQUbje4kv1eSKPVkeFHXs11wEK/ujPeKFWLS00wb/YzZR1Ow8SruI7nma5xpUXQkCFa4EZp1yuzcG+qUMEhQ==` |

The package API does not provide a reliable source commit for every npm
version. The exact incident SHA is therefore an explicit operator input and
fixed script constant; the recorded tarball integrity and repository link are
the registry-side evidence. If registry metadata exposes `gitHead`, it must
also match. Any absent or mismatched required evidence stops recovery.
The workflow itself checks out the dispatch ref and requires that checkout to
equal current `origin/main`; it must never check out the incident SHA as
recovery code.

Only after those checks may the script call the fixed
`DELETE /users/aakkino/packages/npm/fig-kiwi` endpoint with `packages: write`,
then require an explicit 404 from the same package path. The workflow
`GITHUB_TOKEN` must also have package admin access; GitHub grants that access
to the repository that published or is explicitly connected to the package.
There is no PAT fallback.
Deletion is valid only while `0.2.0` is the package's unique version. After
deletion, the ordinary protected release workflow rebuilds the coordinate with
explicit restricted access. Never add package name, version, ID, endpoint, or
integrity arguments to this recovery command.

## 8. Wrong vs Correct

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
    NODE_AUTH_TOKEN: ${{ secrets.PACKAGE_PUBLISH_TOKEN }}
    GH_TOKEN: ${{ secrets.PACKAGE_PUBLISH_TOKEN }}
    ACTIONS_PACKAGE_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Build, inspect, publish, and verify the exact local tarballs inside one
protected job. Upload only `manifest.json` and `result.json` for metadata
reconciliation.

## 9. Missing Metadata Recovery

Normal mode never infers metadata ownership from a matching Registry version.
When `recover_missing_metadata` is explicitly enabled, a matching coordinate
may enter the ordinary metadata reconciler only after all of these predicates
hold:

1. The current run's result records `matching`, and its source, coordinate,
   version, and integrity exactly match the fixed-order manifest.
2. The exact package-version Tag and GitHub Release are both absent. A correct
   pair already at the current reviewed SHA is an idempotent no-op; a partial
   pair is an error.
3. Every owned same-package Tag has a valid semantic version and unambiguous
   commit SHA. The candidate version is strictly greater than the unique
   highest owned version.
4. That unique predecessor commit is an ancestor of the reviewed source SHA.
5. Registry bytes and package metadata already passed the protected publish
   job's ordinary `matching` verification.

Package ordering, tag absence alone, an arbitrary historical SHA, and optional
Registry `gitHead` are never provenance. All selected Tag and Release states
must be inspected before the first write, and an existing Release must name the
selected Tag and resolve to the selected source commit.

The known compatibility case is the immutable private
`@aakkino/dom-to-figma@0.4.0` partial publication. Recovery must preserve its
bytes and all historical package Tags. After this correction is reviewed and
merged, the parent release task must capture the new current `origin/main` SHA,
obtain fresh protected-environment authorization, and use the ordinary Release
workflow with explicit recovery enabled. This child must not dispatch that run
or manually mutate Registry versions, Tags, Releases, or branches.
