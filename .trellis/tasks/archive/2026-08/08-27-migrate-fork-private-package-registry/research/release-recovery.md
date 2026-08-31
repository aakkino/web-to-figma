# Research: Release-State Recovery And Validation

- Query: Recover the merged-but-unpublished `0.3.0` / `0.1.1` state without
  publishing fork artifacts to `@figit/*`; identify validation gates,
  partial-publication rollback points, and affected files.
- Scope: mixed (remote repository state, local dependency implementation, live
  registry reads, and official Changesets/GitHub documentation)
- Date: 2026-08-27
- Authoritative source snapshot: remote `aakkino/web-to-figma` `main` at
  `8ef6b90909a0f0112fae6d6220bcb124c64f8d4d`, queried read-only through `gh`.

## Findings

### 1. Source-of-truth warning

The checked-out worktree is `sync/upstream-20260726` at `07bbcd7`, and its local
`main` and `origin/main` tracking refs are stale. The local tracking ref was
`ea3982d`, while the live GitHub API reported remote `main` at `8ef6b90`.
Therefore worktree file contents and local `origin/main` must not be used as the
release recovery baseline. All `main` file/line citations below refer to the
remote `8ef6b90` content read through the GitHub Contents API.

The local tag namespace is also not authoritative for the fork: it includes
upstream tags through `@figit/dom-to-figma@0.2.4`, while the fork's live GitHub
tag refs only contain that package through `0.2.1`. Registry state, fork refs,
and locally fetched upstream refs are three distinct evidence sources.

### 2. Exact merged release state

- PR #9 merged release-branch commit `33e50b8` into `main` as `8ef6b90` at
  `2026-08-27T06:14:25Z`. The merge changed 14 files.
- The release commit removed nine changesets, updated both changelogs, raised
  `@figit/dom-to-figma` to `0.3.0`, raised `@figit/composed-dom` to `0.1.1`, and
  raised the private adapter peer floor. This is visible in the fixed commit
  file list and in current manifests:
  - `packages/dom-to-figma/package.json:2-3` names/version the package
    `@figit/dom-to-figma@0.3.0`.
  - `packages/composed-dom/package.json:2-3` names/version the package
    `@figit/composed-dom@0.1.1`.
  - `internal/browser-capture-adapter/package.json:38-46` requires
    `@figit/dom-to-figma >=0.3.0` and links both workspace packages.
  - `packages/dom-to-figma/CHANGELOG.md:3-32` already materializes the `0.3.0`
    release notes.
  - `packages/composed-dom/CHANGELOG.md:3-10` already materializes the `0.1.1`
    release notes.
- At `8ef6b90`, `.changeset/` contains only `README.md` and `config.json`; there
  are no pending release changesets. The consumed records were:
  `calm-images-fit`, `capture-open-shadow-dom`, `composed-dom-utility`,
  `fixed-font-fallback-payload`, `olive-suns-cough`,
  `rendering-parity-intake`, `shadow-spread-ring-stroke`,
  `single-line-text-auto-resize`, and `text-align-aware-width-buffer`.
- The Changesets release branch still exists remotely at `33e50b8`, but PR #9
  is closed/merged and there are no open PRs. This branch is historical cleanup,
  not an alternate source of unconsumed changesets.

Do not revert the merge or recreate the nine changesets as the default
recovery. Reverting would downgrade manifests/changelogs and reintroduce old
`@figit`-named release inputs; recreating changesets would duplicate already
materialized release notes and produce another semver bump.

### 3. What failed, and what did not happen

Release run `33045155450` ran against exactly `8ef6b90`. Build completed, then
`changeset publish` queried all three public packages. It skipped
`@figit/fig-kiwi@0.2.0` because that version already exists, attempted
`@figit/composed-dom@0.1.1` and `@figit/dom-to-figma@0.3.0`, and both failed with
`ENEEDAUTH` against `https://registry.npmjs.org`.

Live registry reads on 2026-08-27 confirmed:

- public npm has `@figit/dom-to-figma` only through `0.2.4`;
- public npm has no `@figit/composed-dom` package;
- public npm has `@figit/fig-kiwi` through `0.2.0`;
- exact reads for `@figit/dom-to-figma@0.3.0` and
  `@figit/composed-dom@0.1.1` return 404.

The fork has no GitHub Releases, no remote tags for either failed version, and
run `33045155450` produced no artifacts. The sibling CI run on the same SHA
passed lint/typecheck/build/test, parity, stable compatibility, upstream-main
compatibility, and core-delta governance. This proves repository CI at the
version commit, but it does not prove packed private artifacts or authenticated
consumer installation.

### 4. Why another push to `main` is unsafe today

- `.github/workflows/release.yml:3-5` triggers Release on every push to `main`.
- `.github/workflows/release.yml:23-32` always invokes `changesets/action@v1`
  with `publish: pnpm release`, grants write/OIDC permissions, and supplies no
  registry-specific authentication.
- `package.json:19` defines `release` as build plus `changeset publish`.
- `.changeset/config.json:3-14` still points changelog generation at
  `figitdesign/web-to-figma`, sets `access: public`, and does not ignore any
  package.
- `packages/dom-to-figma/package.json:31-33`,
  `packages/composed-dom/package.json:18-20`, and
  `packages/fig-kiwi/package.json:31-33` all request public publication.
- `.github/actions/setup/action.yml:10-18` configures Node and installation but
  no package scope, registry URL, or auth mapping.
- The repository currently has no deployment environment protection rules.
  Branch protection requires only `Lint, typecheck, build, test` and
  `Tier-0 parity ratchet`; neither gate checks publication destination.

Because there are no changesets after the merged release PR, the action takes
its publish path on every new `main` push. The Changesets v1 action itself says
this mode attempts to publish any unpublished packages. A migration merge must
therefore modify/quarantine the release path in that same commit; a preparatory
push that leaves the current workflow intact repeats the forbidden attempt.

### 5. Partial-publication behavior is not transactional

The installed `@changesets/cli` is `2.31.0`. Its implementation is relevant to
the exact workflow currently used:

- `node_modules/@changesets/cli/dist/changesets-cli.esm.js:668-672` sets npm
  publish concurrency to 10.
- The same file at `:996-1019` filters public packages, queries unpublished
  versions, and dispatches every publish through `Promise.all`.
- At `:1040-1080`, an exact local version already present in registry metadata
  is skipped; an absent version is queued.
- At `:1140-1174`, successful and failed publishes are separated only after
  all attempts; successful packages get local git tags before the command
  throws for failed siblings.

The exact `changesets/action@v1` code used by the failed run was resolved to
`a45c4d594aa4e2c509dc14a9f2b3b67ba3780d0d`. Its `src/run.ts` parses successful
`New tag:` output and pushes tags/creates GitHub Releases for those packages
before `src/index.ts` exits non-zero for a partial failure. Thus a red workflow
can mean any of the following:

1. no package published and no refs created (the observed `ENEEDAUTH` run);
2. a subset published, with tags/releases created for that successful subset;
3. registry publication succeeded but metadata/ref creation failed afterward.

The current concurrent `changeset publish` plus automatic tag/release path is
therefore unsuitable for a controlled first private publication. A failure
must always trigger per-package registry, tag, and Release reconciliation; the
workflow conclusion alone is insufficient.

### 6. Version recovery options

#### Option A: preserve `0.3.0` / `0.1.1` under the new owned names (recommended)

Rename the selected packages into the owned scope while retaining the versions
already merged. Package identity is `(registry, name, version)`, so the same
version numbers are unused under new names. Treat the existing changelog entries
as the first fork-owned private release baseline, update only the entries and
repository links whose identity is now incorrect, and do not restore consumed
changesets.

If `fig-kiwi` is also migrated, publish its current `0.2.0` under the new name.
The upstream `@figit/fig-kiwi@0.2.0` and fork-owned renamed package are distinct
coordinates.

Advantages: preserves semantic history, preserves the private adapter's
`>=0.3.0` contract, minimizes unrelated version churn, and makes the failed
versions the exact first private releases. Caveat: automation must explicitly
recognize this as a migration baseline because there are no pending changesets.

#### Option B: add a migration patch (`0.3.1` / `0.1.2`)

Add new owned-name changesets so the rename itself creates a normal release PR.
This integrates naturally with future Changesets flow, but leaves `0.3.0` and
`0.1.1` as changelog-only, never-published coordinates under either identity.
Use only if the owner values a conventional post-migration changeset more than
an exact reconciliation of the failed versions.

#### Option C: reset the new packages to a fresh version line

Reset to `0.1.0` or `1.0.0` and rewrite migration-baseline changelog/peer
constraints. This cleanly signals a new distribution identity but discards
useful compatibility history and creates the largest consumer/documentation
change. It is not justified by the observed failure.

#### Rejected recovery: publish or bump the old `@figit/*` names

Any retry, patch bump, or restored changeset targeting `@figit/*` violates the
task's ownership boundary. It is not a recovery option.

### 7. Recommended staged release design

#### Gate 0: quarantine before any migration merge can publish

1. Make publish opt-in rather than an unconditional `main` push side effect.
   Version-PR automation may remain push-triggered, but the first private
   publication should be a separate manually dispatched job/environment with
   explicit approval and a pinned target commit.
2. Add a machine-enforced deny gate that enumerates every non-private workspace
   package and fails if a publishable package still has an `@figit/*` name,
   public npm registry destination, or an unapproved registry/scope pair.
3. Give versioning only repository PR/content permissions. Give publishing
   package-write/OIDC/token permission only in the publish job. The current
   combined job grants `contents`, `pull-requests`, and `id-token` together at
   `.github/workflows/release.yml:14-17`.
4. Pin the first release to an reviewed SHA and reject a dirty or moving
   checkout. Do not retry run `33045155450`.

#### Gate 1: isolated source and repository validation

From a clean isolated worktree at the reviewed migration SHA:

1. `pnpm install --frozen-lockfile`
2. `pnpm lint --diagnostic-level=error --max-diagnostics=none`
3. `pnpm check-types`
4. `pnpm build`
5. `pnpm test`
6. `pnpm oracle:parity`

These extend the current CI contract at `.github/workflows/ci.yml:23-45` and
`:141-165`. The migration should also retain the stable/upstream adapter gates
at `:74-138` because package renames cross those build filters and workspace
edges.

#### Gate 2: pack and inspect immutable candidate tarballs

Pack each publishable package into a clean staging directory before obtaining
write credentials. Record for each tarball: package name, version, file list,
size, SHA-512 integrity, and source commit. Inspect the packed `package.json`
and assert:

- name/scope and registry are exactly approved;
- visibility/access is private;
- no shipped dependency or peer dependency points to a migrated old
  `@figit/*` name;
- no `workspace:` protocol remains in the tarball;
- exports/main/types resolve to files present in the tarball;
- install and import succeed from the tarballs in an empty consumer project.

Workspace resolution is currently link-based in `pnpm-lock.yaml:54-80`,
`:169-178`, `:203-208`, and `:310-322`, so a green workspace build alone does
not prove the packed registry dependency graph.

#### Gate 3: authenticated registry preflight

For every exact target coordinate, query through the approved authenticated
registry configuration immediately before publish:

- If absent, it is eligible to publish.
- If present and integrity/provenance match the staged tarball and commit, mark
  it already complete and continue idempotently.
- If present but metadata or integrity differs, stop. Never overwrite or
  republish the version.

Also prove that an authorized read token can resolve the package and that an
unauthorized client cannot. A private-registry 404 can mean either absent or
unauthorized, so absence checks must use an authorized identity.

#### Gate 4: dependency-ordered, one-package-at-a-time first publish

Publish the prepacked tarballs serially, verifying each before continuing:

- if `fig-kiwi` migrates: renamed `fig-kiwi` -> renamed `composed-dom` ->
  renamed `dom-to-figma`;
- if upstream `@figit/fig-kiwi` remains a dependency: renamed `composed-dom` ->
  renamed `dom-to-figma`.

Use a non-default migration dist-tag where the selected registry supports it,
then promote to the intended consumer tag only after all packages and consumer
smokes pass. Do not let Changesets v2.31's concurrent publish loop control the
first migration.

#### Gate 5: post-publish reconciliation

For each package, verify exact-version metadata, private visibility/access,
tarball integrity, dependency names/ranges, provenance/audit evidence, and an
authorized clean install/import. Then test the full downstream consumer set.
Only after all packages pass should automation create fork-owned package tags
and GitHub Releases at the reviewed SHA. Finally verify:

- no `@figit/dom-to-figma@0.3.0` or `@figit/composed-dom@0.1.1` appeared on
  public npm;
- only intended owned-name tags/releases exist;
- the final CI and Release records point to the reviewed migration SHA;
- the stale `changeset-release/main` branch can be deleted as an independently
  approved cleanup after no open release PR references it.

### 8. Partial-publication rollback and resume points

| Checkpoint | Durable state | Default recovery | Escalation |
| --- | --- | --- | --- |
| Before first registry write | No package changed | Stop; revoke/rotate unused write credential if exposure is suspected | None |
| One dependency version published under migration tag | That version is immutable but not consumer-default | Verify integrity/visibility, record it complete, fix the cause, and resume with the next missing exact version | Delete only if content or visibility is wrong and registry policy permits |
| All versions published, consumer tag not promoted | Complete staged package set | Repeat authorized/unauthorized install checks; promote only when all pass | Revoke write credential and leave versions staged |
| Some consumer tags promoted | Some consumers may resolve new versions | Move/remove the new tag according to registry support, restore previous tag where one existed, and revoke write access | Notify consumers if any install was possible |
| Tags/releases partly created | Registry may be correct but source metadata is incomplete | Reconcile each exact tag/release against registry integrity and target SHA; create only missing correct metadata | Remove incorrect refs/releases only with separate destructive approval |
| Wrong package bytes or unintended public visibility | Security/integrity incident | Disable publish workflow, revoke credential, remove consumer tag/access, preserve logs, publish a corrected new version rather than overwrite | Use registry deletion/restore only as emergency response |

GitHub Packages permits deletion of a private package/version by an admin and
restoration within 30 days while the namespace remains available. Deletion is
not the normal rollback because consumers and audit history may already depend
on the immutable version. See the official GitHub package deletion/restore
documentation in External References.

### 9. Files and surfaces affected by implementation

Release-control core:

- `.github/workflows/release.yml` - trigger, permissions, version/publish split,
  environment gate, registry auth, sequential publish, post-publish refs.
- `.github/actions/setup/action.yml` - Node registry/scope setup if kept shared;
  do not leak publish auth into ordinary CI installs.
- `package.json` - release/validation scripts and all renamed package filters.
- `.changeset/config.json` - fork repository identity, private access policy,
  base branch, and package handling.
- `.github/workflows/ci.yml` - deny-list, pack/install validation, and renamed
  filters.
- `.github/workflows/pkg-pr-new.yml` - preview package set and renamed package
  identities; it currently publishes `./packages/*` at lines 23-27.

Package/version state:

- `packages/dom-to-figma/package.json` and `CHANGELOG.md`
- `packages/composed-dom/package.json` and `CHANGELOG.md`
- `packages/fig-kiwi/package.json` and `CHANGELOG.md` if that package migrates
- `internal/browser-capture-adapter/package.json` for peer/dependency ranges
- `pnpm-lock.yaml` for workspace importer names and packed dependency metadata

Consumer/docs/tests:

- every workspace manifest/import/filter using the renamed packages;
- package READMEs, root `README.md`, and `CONTRIBUTING.md` release instructions;
- a new release-policy validation script/test is preferable to YAML-only review;
- an isolated consumer fixture/script should exercise authenticated install and
  unauthorized rejection without committing credentials.

## Code Patterns

- All three `packages/*` manifests are non-private and therefore candidates for
  `changeset publish`; private apps/internal packages are filtered by Changesets.
- `packages/dom-to-figma/package.json:65-72` has a runtime workspace dependency
  on `fig-kiwi` and a dev dependency on `composed-dom`.
- `internal/browser-capture-adapter/package.json:38-46` is the strongest version
  coupling to the already merged `0.3.0` state.
- Changesets considers registry version presence, not pending changesets, when
  executing `publish`; after a release PR merge, no changesets is precisely the
  publish condition in the action.
- Publication, Git tag creation, tag push, and GitHub Release creation are
  separate effects. Validation and rollback must model them separately.

## External References

- [Changesets CLI introduction](https://github.com/changesets/changesets/blob/main/docs/intro-to-using-changesets.md) - `version` consumes changesets and writes versions/changelogs; `publish` then publishes package versions not present in the registry.
- [Changesets CLI publish behavior](https://github.com/changesets/changesets/blob/main/docs/command-line-options.md#publish) - publish checks package versions and creates local git tags.
- [Pinned Changesets Action v1 source used by run 33045155450](https://github.com/changesets/action/blob/a45c4d594aa4e2c509dc14a9f2b3b67ba3780d0d/src/run.ts) - successful subset detection, tag push, and GitHub Release creation.
- [Pinned Changesets Action v1 entry point](https://github.com/changesets/action/blob/a45c4d594aa4e2c509dc14a9f2b3b67ba3780d0d/src/index.ts) - no-changeset publish routing and non-zero exit after partial success.
- [GitHub package deletion and restoration](https://docs.github.com/en/packages/learn-github-packages/deleting-and-restoring-a-package) - admin requirements, private version deletion, and 30-day restoration window.

## Related Specs

- `.trellis/spec/guides/repository-conventions.md` - pnpm/Node conventions,
  repository-wide quality gates, and release/changeset expectations.
- `.trellis/spec/guides/cross-layer-thinking-guide.md` - the package identity
  must remain consistent across manifests, lockfile, workflows, packed
  artifacts, registry metadata, and consumers.
- `.trellis/spec/dom-to-figma/frontend/index.md` - public package exports and
  release checks remain part of the browser-runtime contract.
- `.trellis/spec/fig-kiwi/frontend/index.md` and
  `.trellis/spec/fig-kiwi/backend/index.md` - package export and tooling gates
  if `fig-kiwi` enters the migration boundary.
- `.trellis/tasks/08-27-migrate-fork-private-package-registry/research/package-boundary.md`
  - companion inventory for the final package-boundary decision.

## Caveats / Not Found

- No Git fetch was run. The stale local refs were deliberately not updated;
  current remote facts were read with `gh` instead.
- No product, workflow, manifest, secret, ref, release, or registry state was
  changed. No task was started and failed run `33045155450` was not retried.
- No remote GitHub deployment environments are configured at research time.
- The authenticated GitHub package listing for the current user returned no npm
  packages, but that does not prove organization package absence or future scope
  availability; the registry/scope research must make that decision separately.
- Registry delete/tag semantics vary. The rollback table uses generic safe
  defaults; the final design must substitute exact commands and permissions for
  the approved registry.
- Public npm 404s prove that the queried public coordinates are not visible to
  this client at research time. Private registry absence must be checked with an
  authorized identity because unauthorized access may also return 404.
- The task worktree is dirty with unrelated user work. Implementation must use
  an isolated worktree from the reviewed remote `main` SHA and must not include
  or revert those changes.
