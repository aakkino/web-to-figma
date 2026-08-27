# Contributing

Thanks for your interest in contributing.

## Setup

```sh
git clone git@github.com:aakkino/web-to-figma.git
cd figma
pnpm install
```

`pnpm install` registers the lefthook git hooks (lint on commit, commitlint on the message).

Use the Node version pinned in [`.nvmrc`](./.nvmrc) (current LTS).

## Development

```sh
# Run all package builds in watch mode
pnpm dev

# Lint + format
pnpm lint
pnpm format

# Typecheck across the workspace
pnpm check-types

# Run tests
pnpm test
```

## Commits

This repo uses [Conventional Commits](https://www.conventionalcommits.org/). The `commit-msg` lefthook runs commitlint to enforce the format.

Examples:

```
feat(dom-to-figma): support svg inline gradients
fix(dom-to-figma): align font cache path with resolver api
chore: bump biome to 2.5
docs: clarify image-loader contract
```

## Changesets

Every user-facing change ships with a changeset. Run:

```sh
pnpm changeset
```

…and pick the package(s) and bump type. Commit the generated `.changeset/*.md` along with your code.

When a change merges to `main`, the `Release` workflow only opens or updates a
version PR. It never publishes from a push. Private publication is a separate,
protected manual dispatch pinned to a reviewed 40-character `main` SHA. The
`package-publish` environment must require the repository owner as reviewer.
It must define `PACKAGE_PUBLISH_TOKEN` as a classic PAT with only
`read:packages` and `write:packages`. GitHub workflow tokens inherit the public
repository's visibility when they create a package, so the publish and package
visibility checks must never fall back to `GITHUB_TOKEN`. The workflow uses its
run-scoped `GITHUB_TOKEN` separately to prove the owning repository has been
granted package access under **Manage Actions access**.

Local package consumers map only `@aakkino` to GitHub Packages and authenticate
with a classic PAT carrying `read:packages`. Keep that token in user-level npm
configuration or an environment variable, never in this repository.

## Pull requests

- One logical change per PR.
- Include a changeset.
- Make sure CI is green: lint, typecheck, build, test.

## Reporting bugs

Open an issue with a minimal reproduction and the relevant browser. The package targets modern browsers (Chrome / Edge / Firefox / Safari current).
