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

## Core Delta Registry

`docs/upstream-core-delta.json` is the reviewed inventory of production-code
differences under `packages/dom-to-figma/src`. The governance baseline is the
immutable common commit `fork-base/ac830db`; compatibility targets are tracked
separately so a new upstream release cannot silently redefine which fork
patches are authorized.

The initial inventory contains 20 changed source files: 15 runtime files and 5
test files. Only runtime files count against the strict production budget.
Tests, fixtures, and snapshots remain visible in the report and must be linked
to a capability when they are evidence for a registered patch.

Run the local gate before changing converter production code:

```sh
pnpm upstream-core-delta:check -- --report .artifacts/upstream-core-delta.json
pnpm test:upstream-core-delta
```

The gate rejects an unregistered runtime path, a silently changed registered
patch, an expired review date, an ambiguous path overlap, or a runtime file
count above the current budget. Broad globs and directory-wide allowances are
invalid. Test-only changes are reported but do not fail as unauthorized
production differences.

When an intentional core patch changes, update the relevant capability entry
first: record the generic behavior, exact paths, originating commits, focused
tests, owner, time-bounded review date, upstream state, and objective removal
condition. After reviewing the new diff, regenerate deterministic fingerprints:

```sh
pnpm upstream-core-delta:update
pnpm upstream-core-delta:check
```

The registry and fingerprint change belong in the same review as the code.
Fingerprint regeneration is evidence of review, not an automatic exemption.
An exception must name an approver, owner, and expiry date in the capability
entry; permanent wildcards and behavior-removal budget fixes are prohibited.

## Compatibility Targets

The registry pins exact refs and resolved commits for three targets:

| Target | Policy |
| --- | --- |
| Fork governance baseline | Blocking on every change |
| Latest stable `@figit/dom-to-figma` release | Blocking; npm `latest` must equal the reviewed pinned version |
| Resolved `upstream/main` | Advisory on ordinary changes; blocking on `sync/upstream-*` pull requests |

Use `pnpm upstream-core-delta:stable` and
`pnpm upstream-core-delta:main` to reproduce the inventory reports. Build the
adapter and composed-DOM packages, then run `pnpm upstream-adapter:stable` to
compile and execute a temporary consumer against the registry-pinned npm
release rather than the workspace core. Run `pnpm upstream-adapter:main` to
export the reviewed upstream commit, install its locked dependencies, build and
pack its vanilla core, then execute the same type, capability, image fallback,
and basic conversion checks. Both temporary consumers and the exported source
tree are always removed after the check. A moving
ref is never accepted by name alone: resolve it to a full commit, review the
delta, then update the registry. These jobs inspect and report compatibility;
they do not merge, rebase, push, or otherwise mutate the fork branch.
