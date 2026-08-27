# Repository Conventions

## Workspace And Runtime

- This is a pnpm 10 monorepo. Workspace roots are declared in
  `pnpm-workspace.yaml`: `packages/*`, `apps/*`, and `internal/*`.
- Use Node 24 locally (`.nvmrc`). Published packages declare Node 20 or newer,
  so do not introduce runtime APIs that violate their declared engines.
- Use ESM throughout. Package manifests set `"type": "module"`, build outputs
  are ESM, and Node tooling resolves repository-relative paths from
  `import.meta.dirname` rather than the caller's current directory.
- Import another workspace through its package export, such as
  `@aakkino/dom-to-figma` or `@figit/ui/components/button`. Do not cross package
  boundaries with deep relative paths.

Reference files:

- `package.json`
- `pnpm-workspace.yaml`
- `packages/dom-to-figma/package.json`
- `internal/ui/package.json`

## TypeScript

Every package extends `tsconfig.base.json` directly or through its framework.
The effective defaults include `strict`, `strictNullChecks`,
`noUncheckedIndexedAccess`, `isolatedModules`, and
`verbatimModuleSyntax`.

- Prefer `type` aliases. Biome enforces type aliases and generic array syntax,
  so write `Array<Item>` rather than `Item[]` in new TypeScript.
- Separate type-only imports with `import type`.
- Treat decoded JSON, browser messages, and external binary data as `unknown`
  until a local guard or assertion establishes the shape.
- Use discriminated unions for closed modes and outcomes. Existing examples
  include `ConvertInput` in `packages/dom-to-figma/src/figma.ts` and
  `ConfigResolution` in
  `internal/oracle-harness/src/figma/session.ts`.
- An interface is acceptable when an upstream framework requires declaration
  merging, as documented by the targeted Biome suppression in
  `apps/playground/src/router.tsx`.

## Formatting And Lint

- `biome.jsonc`, extending Ultracite, is the formatting and lint source of
  truth. Do not hand-format against a different style.
- Use two spaces, LF endings, UTF-8, a final newline, and double quotes in
  TypeScript. These rules come from `.editorconfig` and Biome.
- Keep imports direct. Biome warns on barrel files; package entrypoints such as
  `packages/fig-kiwi/src/index.ts` are deliberate public API boundaries, not a
  reason to add internal barrels.
- `console` calls are warnings. CLI output and narrowly scoped local diagnostics
  may use them; application diagnostics that need a suppression must include a
  reason on the exact line.
- Do not add broad lint disables. Existing exceptions are package-specific
  (`noBitwiseOperators` for the binary/graphics packages) or line-specific.

## Tests And Verification

Use the narrowest relevant command while iterating, then run the package gate.

~~~sh
pnpm --filter <package> test
pnpm --filter <package> check-types
pnpm --filter <package> build
~~~

Before a repository-wide change is handed off, the standard CI sequence is:

~~~sh
pnpm lint
pnpm check-types
pnpm build
pnpm test
~~~

Converter geometry or rendering changes also require `pnpm oracle:parity`.
Browser and live-Figma test gates are documented in the relevant package
specs; do not silently treat skipped gated tests as executed.

Reference files:

- `CONTRIBUTING.md`
- `.github/workflows/ci.yml`
- `packages/dom-to-figma/vitest.config.ts`
- `internal/oracle-harness/vitest.config.ts`

## Generated And Deliberate Artifacts

- Do not edit `apps/playground/src/routeTree.gen.ts` by hand.
- Do not edit `packages/fig-kiwi/src/schema.json` by hand; regenerate it with
  the package script and review the resulting diff.
- Do not edit `internal/oracle-harness/baseline/scoreboard.json` merely to make
  parity pass. Baseline updates are explicit, reviewable outcomes of
  `cli check --update`.
- Run data belongs under the gitignored `oracle/runs/` tree. Committed oracle
  knowledge belongs under `internal/oracle-harness/baseline/`,
  `internal/oracle-harness/known-findings/`, or the scene corpus.

## Releases And Commits

- User-facing changes to `@aakkino/dom-to-figma`, `@aakkino/composed-dom`, or
  `@aakkino/fig-kiwi` require a
  changeset. Private `apps/*` and `internal/*` packages do not.
- Use Conventional Commits and keep one logical change per pull request.
- Do not mix generated baselines, schema updates, or broad formatting churn
  into an unrelated change.

Reference files:

- `CONTRIBUTING.md`
- `commitlint.config.mjs`
- `.changeset/config.json`

