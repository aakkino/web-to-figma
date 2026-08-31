# Research: Package Rename And Publication Boundary

- Query: Determine the complete local package rename/publication boundary, all `@figit` dependency edges and release surfaces, and whether `fig-kiwi` must migrate.
- Scope: internal repository research (worktree snapshot; target-branch caveat below)
- Date: 2026-08-27

## Findings

### Target-main supplement from the coordinating session

After this worktree-scoped research completed, the coordinating session used
read-only GitHub API and registry checks against remote `main` at
`8ef6b90909a0f0112fae6d6220bcb124c64f8d4d`:

- remote `main` contains `dom-to-figma@0.3.0`,
  `composed-dom@0.1.1`, and `fig-kiwi@0.2.0`;
- only `.changeset/README.md` and `.changeset/config.json` remain, confirming
  the nine release changesets were consumed;
- the remote-main `packages/fig-kiwi` tree is
  `b617acf68b7c0a5da8b24fd1689ecc63b1762b7b`, exactly equal to the
  `@figit/fig-kiwi@0.2.0` tag tree;
- public npm exposes the same upstream Kiwi version, while the authenticated
  `aakkino` GitHub Packages listing contains no npm packages.

This resolves the evidence gap below. The final planning decision is to migrate
Kiwi with core and composed DOM despite current byte/source equivalence. That
removes every publishable `@figit/*` workspace, keeps the core runtime
dependency inside the owned release graph, and avoids creating a
non-publishable local mirror that could drift from the public dependency.

### Workspace and package inventory

The pnpm workspace includes exactly `packages/*`, `apps/*`, and `internal/*`
(`pnpm-workspace.yaml:1-4`). The root is private (`package.json:2-4`). On the
inspected worktree, package publication status is:

| Workspace | Name | Publishable now? | Evidence |
| --- | --- | --- | --- |
| `packages/dom-to-figma` | `@figit/dom-to-figma` | Yes | No `private`; public `publishConfig` at `packages/dom-to-figma/package.json:2-3,31-42` |
| `packages/composed-dom` | `@figit/composed-dom` | Yes | No `private`; public `publishConfig` at `packages/composed-dom/package.json:2-3,18-29` |
| `packages/fig-kiwi` | `@figit/fig-kiwi` | Yes | No `private`; public `publishConfig` at `packages/fig-kiwi/package.json:2-3,31-42` |
| `internal/browser-capture-adapter` | `@figit/browser-capture-adapter` | No | `private: true` at `internal/browser-capture-adapter/package.json:2-4` |
| `internal/oracle-harness` | `@figit/oracle-harness` | No | `private: true` at `internal/oracle-harness/package.json:2-4` |
| `internal/ui` | `@figit/ui` | No | `private: true` at `internal/ui/package.json:2-4` |
| `apps/extension` | `extension` | No | `private: true` at `apps/extension/package.json:2-5` |
| `apps/playground` | `playground` | No | `private: true` at `apps/playground/package.json:2-4` |

Thus the current publication boundary is all three directories under
`packages/*`, not only the two packages from the failed release. `private` is
the effective boundary for apps/internal packages; their `@figit` names are
workspace identities only and do not by themselves require migration.

All three publishable manifests still advertise the upstream repository and
Figit author. See `packages/dom-to-figma/package.json:6-14`,
`packages/composed-dom/package.json:6-11`, and
`packages/fig-kiwi/package.json:6-14`. A fork publication must update this
active package metadata to `aakkino/web-to-figma` even if historical changelog
links continue to identify upstream contributions.

### Release and preview surfaces

- The root release command builds every workspace and runs
  `changeset publish` (`package.json:9,19`).
- The Release workflow runs on every push to `main` and passes that command to
  `changesets/action` (`.github/workflows/release.yml:3-5,23-32`). It grants
  `contents: write`, `pull-requests: write`, and `id-token: write`, but the
  inspected workflow has no registry URL or package token setup
  (`.github/workflows/release.yml:14-17,30-32`).
- Changesets is globally configured with `access: public`, no ignored packages,
  and private-package version/tag disabled (`.changeset/config.json:3-14`). It
  still writes changelog links for `figitdesign/web-to-figma`
  (`.changeset/config.json:3-5`).
- The preview workflow publishes the literal glob `./packages/*` on both main
  and pull requests (`.github/workflows/pkg-pr-new.yml:3-6,23-27`). Therefore
  all three package directories are in the preview boundary too.
- The shared setup action only configures Node/pnpm and installs dependencies;
  it has no `registry-url`, `.npmrc`, or auth input
  (`.github/actions/setup/action.yml:7-18`).

The migration cannot be complete by changing only the Release workflow. It
must update package-level `name`/`publishConfig`, Changesets configuration and
headers, the preview wildcard or explicit package list, setup/auth, and the
lockfile together. The target design should replace wildcard publication with
an explicit allowlist of the approved fork-owned packages; this is the most
direct guard against later accidentally publishing a newly added `packages/*`
directory.

The inspected branch still contains active Changesets targeting the upstream
scope: `@figit/dom-to-figma` in
`.changeset/bright-background-images.md:2`,
`.changeset/calm-images-fit.md:2`,
`.changeset/capture-open-shadow-dom.md:2`,
`.changeset/fixed-font-fallback-payload.md:2`,
`.changeset/lazy-background-sources.md:2`,
`.changeset/olive-suns-cough.md:2`,
`.changeset/shadow-spread-ring-stroke.md:2`,
`.changeset/single-line-text-auto-resize.md:2`,
`.changeset/text-align-aware-width-buffer.md:2`, and
`.changeset/upstream-style-effects-intake.md:2`; the composed-DOM changeset
targets both old names (`.changeset/composed-dom-utility.md:2-3`). These are
branch-sensitive and cannot be used as evidence for the already-consumed
Changesets on target `origin/main` without a target-tree comparison.

### Dependency and consumer graph

Manifest edges (also materialized as workspace links in
`pnpm-lock.yaml:51-83,118-128,170-181,204-211,290-325,354-380`) are:

| Consumer | Runtime/peer edge | Development/test edge |
| --- | --- | --- |
| `@figit/dom-to-figma` | `@figit/fig-kiwi` (`packages/dom-to-figma/package.json:65-68`) | `@figit/composed-dom` (`packages/dom-to-figma/package.json:70-72`) |
| `@figit/composed-dom` | None | None (`packages/composed-dom/package.json:52-58`) |
| `@figit/fig-kiwi` | None | None (`packages/fig-kiwi/package.json:68-78`) |
| private browser adapter | `@figit/composed-dom`; peer `@figit/dom-to-figma` (`internal/browser-capture-adapter/package.json:38-43`) | workspace core (`internal/browser-capture-adapter/package.json:45-47`) |
| private extension | adapter, core, UI (`apps/extension/package.json:18-27`) | Kiwi (`apps/extension/package.json:29-40`) |
| private playground | core and UI (`apps/playground/package.json:12-20`) | None |
| private oracle harness | core and Kiwi (`internal/oracle-harness/package.json:15-21`) | None |
| external smoke fixture | file-linked private adapter and registry core `0.2.0` (`published-package-test/package.json:15-18`) | None |

The corresponding source import boundary is broad:

- Core imports Kiwi at `packages/dom-to-figma/src/figma.ts:1-5`; core tests
  import composed DOM and Kiwi at
  `packages/dom-to-figma/src/figma.shadow-dom.browser.test.ts:1` and
  `packages/dom-to-figma/src/figma.oracle.browser.test.ts:11`.
- The private adapter imports composed DOM throughout its capture pipeline and
  imports core at `internal/browser-capture-adapter/src/bridges/dom-to-figma.ts:1-3`.
- Playground imports core at `apps/playground/src/lib/converter.ts:1-2` and UI
  from its components (for example
  `apps/playground/src/components/playground-shell.tsx:2-5`).
- Extension imports the adapter in active content code (for example
  `apps/extension/entrypoints/content/convert.ts:5-6`), imports Kiwi in browser
  tests (`apps/extension/entrypoints/content/font-spec.browser.test.ts:3-4`),
  and imports UI styles/components at
  `apps/extension/entrypoints/content/style.css:1` and
  `apps/extension/entrypoints/content/app.tsx:1`.
- Oracle imports both core and Kiwi, including
  `internal/oracle-harness/src/snapshot.ts:3-4` and
  `internal/oracle-harness/src/tier1.ts:1-6`.
- Root scripts filter by old package names (`package.json:16-24`); CI does the
  same (`.github/workflows/ci.yml:32-42,82-86,116-120,139-155`).
- User-facing install/import docs use old names in `README.md:8,34,41`,
  `packages/dom-to-figma/README.md:1,6,22-25,52-55`,
  `packages/composed-dom/README.md:1,7`, and
  `packages/fig-kiwi/README.md:1,6`.
- The independent smoke fixture has its own npm lock that resolves public
  registry tarballs for core and Kiwi
  (`published-package-test/package-lock.json:77-93`); it must be regenerated
  for the private registry rather than hand-edited.

Any renamed publishable package requires coordinated updates to manifest keys,
source imports, command filters, CI filters, docs/examples, Changeset package
headers, package changelog title/current dependency references, and both
lockfiles. The package `exports` paths themselves are filesystem paths and do
not change (`packages/dom-to-figma/package.json:34-50`,
`packages/composed-dom/package.json:21-37`,
`packages/fig-kiwi/package.json:34-50`).

### References that must remain `@figit`

Not every old-scope string belongs to the rename. The fork's compatibility
governance intentionally tests upstream package identity:

- The stable target is explicitly `@figit/dom-to-figma@0.2.1`
  (`docs/upstream-core-delta.json:9-13`).
- Fork-maintenance policy calls that upstream stable target out separately
  (`docs/fork-maintenance.md:117-137`).
- `scripts/upstream-adapter-fixture.mjs` constructs a temporary consumer whose
  core is the upstream `@figit/dom-to-figma` (`:29-41,61-69,95-99`).
- `scripts/check-upstream-main-adapter.mjs` builds and packs the upstream
  checkout by its upstream package name (`:57-64`).

These upstream-target strings should remain. However, the same fixture also
installs locally built adapter/composed packages under local names
(`scripts/upstream-adapter-fixture.mjs:44-57,170-185`). If composed DOM is
renamed, those local artifact names and generated imports/dependencies must
change while the injected upstream core name remains unchanged. This file
requires semantic edits, not a global replacement.

Historical changelog links and old dependency records are provenance, not
active resolution. They may retain `@figit` where they accurately describe an
old release; current headings and new release entries should use the fork-owned
identity. Examples of historical records are
`packages/dom-to-figma/CHANGELOG.md:34-35,51-52,62-63,86-87` and
`packages/fig-kiwi/CHANGELOG.md:7-34`.

### `fig-kiwi` decision

`fig-kiwi` is currently publishable and is explicitly governed as a published
package by Trellis: user-visible changes require Changesets
(`.trellis/spec/fig-kiwi/frontend/testing-guidelines.md:25-30`), schema changes
normally require a Changeset
(`.trellis/spec/fig-kiwi/backend/schema-tooling.md:30-38`), and repository
conventions identify it as released (`.trellis/spec/guides/repository-conventions.md:100-104`).
Therefore it cannot remain unchanged as a publishable `@figit/fig-kiwi`
workspace package; that leaves a future release path into an unowned scope.

It does **not** have to be renamed and privately published for this migration.
It can remain an upstream public dependency only if implementation converts
the local workspace copy into a non-publishable, pinned upstream mirror:

1. Prove that the local runtime/export/schema needed by the fork is compatible
   with the selected public `@figit/fig-kiwi` version. The local root export is
   a deliberate public API (`.trellis/spec/fig-kiwi/frontend/index.md:16-18`),
   and core crosses this codec boundary
   (`.trellis/spec/dom-to-figma/frontend/architecture.md:24-31`), so a version
   number match alone is insufficient.
2. Make the workspace package non-publishable (`private: true`), remove its
   public `publishConfig`, and exclude it explicitly from preview/release
   allowlists. With Changesets' current private-package policy
   (`.changeset/config.json:14`), it then cannot be versioned/tagged.
3. Keep the renamed core package's packed dependency as a normal, pinned
   `@figit/fig-kiwi` semver dependency and verify the produced tarball manifest
   plus clean external install. The current `workspace:*` link is recorded in
   `packages/dom-to-figma/package.json:65-67` and
   `pnpm-lock.yaml:311-315`; packing must prove it resolves to the intended
   public version rather than relying on workspace behavior.
4. Add a policy gate: any future local Kiwi runtime/schema/export divergence
   reopens the rename/publish decision before merge.

This upstream-dependency option is the minimum migration boundary and is
consistent with the failed release naming only core and composed DOM. It also
avoids imposing private-registry authentication for the transitive codec.

If local-vs-registry comparison shows any fork-only Kiwi behavior, or the owner
wants the fork to maintain Kiwi independently, then Kiwi must migrate with the
other two packages. In that case the complete publishable set is three owned
packages, and core's runtime dependency must change to the owned Kiwi name.
The repository evidence alone does not prove registry-tarball equivalence, so
the plan must make the comparison an approval gate rather than assume it.

### Original worktree-scoped recommendation

The worktree-only evidence supported this conditional boundary before the
target-main supplement resolved it:

1. **Always migrate and privately publish:** `dom-to-figma` and
   `composed-dom`. Both are current fork release artifacts, both are publicly
   publishable under `@figit`, and composed DOM is consumed by the private
   adapter while core exposes its traversal contract
   (`.trellis/spec/dom-to-figma/frontend/architecture.md:34-82`).
2. **Choose one explicit Kiwi mode:** either migrate/publish it under the owned
   scope, or freeze it as a non-publishable local mirror whose external packed
   dependency remains the upstream public package. Leaving its current manifest
   unchanged is not a valid option.
3. **Do not rename solely for publication:** private `@figit/ui`,
   `@figit/browser-capture-adapter`, and `@figit/oracle-harness`. They are not
   publishable. Rename them only if the user separately wants a complete
   internal namespace cleanup; doing so adds broad source churn without
   improving registry safety.
4. **Preserve upstream compatibility identifiers:** the stable/upstream core
   package names in the delta registry and compatibility fixtures. Introduce
   separate constants/fields if needed so "fork package under test" and
   "upstream compatibility target" cannot be conflated.

### Verification implied by the boundary

The implementation plan should require, in an isolated clean directory or
worktree:

- regenerate `pnpm-lock.yaml` and the independent
  `published-package-test/package-lock.json` through package managers;
- run root lint, typecheck, build, and test (`package.json:9-13`) plus the
  package gates documented by Trellis for core and Kiwi;
- pack every publication allowlist entry and inspect each tarball's
  `package/package.json` for name, registry/access metadata, repository,
  dependency names/ranges, exports, and files;
- install the packed core/composed packages outside workspace resolution and
  run the existing browser consumer contract. Trellis explicitly rejects a
  monorepo `file:` junction as isolation evidence
  (`.trellis/spec/extension/frontend/loaders-and-conversion.md`, scenario
  "Adapter Font Transport And Cleanup Contract", validation/test sections);
- run compatibility checks while confirming they still target upstream
  `@figit/dom-to-figma`, not the fork-owned package;
- statically search active manifests/workflows/Changesets to prove no
  publishable `@figit/*` artifact remains and that the preview/release allowlist
  contains only approved owned names.

## Files Found

- `package.json` - root release and old-name filter commands.
- `pnpm-workspace.yaml` - workspace inclusion boundary.
- `packages/{dom-to-figma,composed-dom,fig-kiwi}/package.json` - all current publishable manifests.
- `apps/*/package.json`, `internal/*/package.json` - private consumers and workspace-only `@figit` identities.
- `pnpm-lock.yaml` - workspace importer dependency graph.
- `.changeset/config.json` and `.changeset/*.md` - public access defaults and old package targets.
- `.github/workflows/{release,pkg-pr-new,ci}.yml` - release, preview, and old-name CI filters.
- `.github/actions/setup/action.yml` - registry/auth setup boundary.
- `README.md`, package READMEs/CHANGELOGs, `published-package-test/*` - user-facing and isolated-consumer names.
- `scripts/upstream-adapter-fixture.mjs`, `scripts/check-upstream-main-adapter.mjs`, `docs/upstream-core-delta.json` - mixed local/upstream name semantics.

## Related Specs

- `.trellis/spec/guides/repository-conventions.md` - workspace and published-package conventions.
- `.trellis/spec/guides/cross-layer-thinking-guide.md` - package-export changes require full consumer mapping.
- `.trellis/spec/dom-to-figma/frontend/{index,architecture,testing-guidelines,upstream-compatibility}.md` - core public boundary, consumers, pack/isolation, upstream target semantics.
- `.trellis/spec/fig-kiwi/frontend/{index,codec-guidelines,testing-guidelines}.md` - Kiwi public API and release boundary.
- `.trellis/spec/fig-kiwi/backend/{index,schema-tooling,testing-and-quality}.md` - schema/tooling publication implications.
- `.trellis/spec/{extension,playground,oracle-harness,ui}/frontend/*.md` - private workspace consumers and validation gates.

## Caveats / Not Found

- The checked-out worktree is `sync/upstream-20260726`, while the
  planning task targets current `origin/main`. The researcher role forbids all
  Git operations, so this file could not run `git show`/`ls-tree` to compare
  target manifests, consumed Changesets, release workflow, versions, or
  changelogs. The PRD says target main already contains unpublished
  `@figit/dom-to-figma@0.3.0` and `@figit/composed-dom@0.1.1` and has consumed
  nine Changesets; the worktree evidence above instead shows `0.2.0`, `0.1.0`,
  and active old-scope Changesets. Main-session target-tree verification is
  mandatory before design approval. The coordinating-session supplement above
  completed that target-tree verification.
- No `.npmrc`, registry URL, `NODE_AUTH_TOKEN`, `NPM_TOKEN`, or
  `packages: write` configuration was found in the inspected release/setup
  files. This is a not-found result for the worktree, not proof about GitHub
  repository secrets.
- No dedicated `composed-dom` Trellis package spec exists. Its contract is
  embedded in `.trellis/spec/dom-to-figma/frontend/architecture.md`; repository
  conventions still say only core/Kiwi require Changesets, which is stale now
  that composed DOM is publishable and has an active Changeset.
- The tree equality check proves source-tree identity at the planning baseline.
  Pack/integrity equivalence remains an implementation validation gate, not a
  remaining product decision.
