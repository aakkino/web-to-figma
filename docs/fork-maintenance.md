# Fork Maintenance

This repository is an independent product fork of
[`figitdesign/web-to-figma`](https://github.com/figitdesign/web-to-figma).
Its `main` branch advances on its own schedule. Upstream changes are reviewed
and selected explicitly; they are never synchronized into `main`
automatically.

## Remote And Branch Roles

| Name | Role |
| --- | --- |
| `origin` | `aakkino/web-to-figma`, the writable product fork |
| `upstream` | `figitdesign/web-to-figma`, the read-only source repository |
| `main` | Stable fork history; tracks only `origin/main` |
| `feat/*`, `fix/*`, `chore/*` | Short-lived fork product branches |
| `sync/upstream-YYYYMMDD` | Temporary branches for reviewed upstream intake |

Do not use GitHub's **Sync fork** action, pull `upstream/main` into local
`main`, or resolve upstream conflicts directly on `main`. Published fork
history must not be rebased.

The immutable initialization references are:

- `fork-base/ac830db`: the last reviewed common upstream baseline.
- `fork-v0.1.0`: the initial 35-commit fork snapshot.

## Review Upstream Changes

Fetch and inspect upstream without changing the working tree:

```sh
git fetch upstream --prune
git log --left-right --cherry-pick --oneline main...upstream/main
git diff --stat main...upstream/main
```

Create the review branch from the current fork branch, not from upstream:

```sh
git switch main
git pull --ff-only origin main
git switch -c sync/upstream-YYYYMMDD
```

Cherry-pick required upstream fixes by default. A complete upstream merge is
an exception for a coherent release or broad compatibility update and still
belongs only on the sync branch. Record reviewed commits and conflict
resolutions in the sync pull request.

Pay particular attention to `apps/extension`, `packages/dom-to-figma`, the
workspace manifests, `pnpm-lock.yaml`, and CI configuration. Extension policy
is fork-owned and should be ported by intent. Core converter changes should
remain optional generic hooks or independently upstreamable fixes.

## Required Gates

Before merging an upstream intake pull request, run the repository checks and
any tests for affected packages:

```sh
pnpm lint
pnpm check-types
pnpm build
pnpm test
pnpm oracle:parity
```

The pull request must also pass the protected `main` checks. Do not weaken the
checks to land an upstream sync.

Package version and peer-range alignment is separate release work. Curation of
untracked fixtures and generated browser artifacts is also separate; upstream
intake must not silently add, remove, or regenerate those files.
