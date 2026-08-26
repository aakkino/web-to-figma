# Upstream Compatibility Governance

## Scenario: Register And Review Core Production Deltas

### 1. Scope / Trigger

- Trigger: any edit to runtime code under `packages/dom-to-figma/src`, any
  upstream target refresh, or any retirement of a temporary core patch.
- Scope: the registry, local checker, CI reports, and fork-maintenance policy.
  Browser product policy remains outside the published converter.

### 2. Signatures

```sh
pnpm upstream-core-delta:check [-- --report <path>]
pnpm upstream-core-delta:update
pnpm upstream-core-delta:stable [-- --verify-latest --report <path>]
pnpm upstream-core-delta:main [-- --report <path>]
pnpm test:upstream-core-delta
```

`docs/upstream-core-delta.json` is the sole registry input. Each capability
entry supplies `id`, `capability`, `classification`, `originCommits`, exact
`paths`, `tests`, `owner`, `reviewBy`, `upstreamState`, `removeWhen`, and
`patchFingerprint`.

### 3. Contracts

- `targets.governance` resolves the immutable common baseline used to decide
  whether a fork runtime delta is authorized.
- `targets.stable` pins the npm package name, exact version, tag, and resolved
  commit. `--verify-latest` fails when npm `latest` moves beyond the reviewed
  version.
- `targets.upstreamMain` pins both the moving ref and its last reviewed commit.
  A new remote commit requires an explicit registry review.
- Runtime files count against `budget.runtimeFileLimit`. Tests, fixtures, and
  snapshots are reported separately and do not consume the production budget.
- A registered path may be shared only through an exact `sharedPaths`
  declaration. Globs and directory-wide allowances are invalid.
- Reports contain exact refs and commits, insertion/deletion totals, runtime
  and test counts, per-capability path groups, and every unmapped path.
- The checker reads Git and npm metadata but never merges, rebases, commits,
  pushes, or executes registry values through a command shell.

### 4. Validation & Error Matrix

| Condition | Required result |
| --- | --- |
| New runtime path has no capability | Blocking `Unregistered runtime delta` error |
| Registered patch content changes | Blocking stale-fingerprint error |
| Test-only path has no mapping | Report it; do not classify it as a production authorization failure |
| Review date is before the check date | Blocking expired-review error |
| Ref resolves to a different commit | Fail and require explicit target review |
| Runtime count exceeds the budget | Fail without suggesting behavior or parity removal |
| Ordinary PR cannot match reviewed `upstream/main` | Advisory CI failure |
| `sync/upstream-*` PR cannot match it | Blocking CI failure |

### 5. Good/Base/Bad Cases

- Good: add a generic patch and focused tests, register exact paths and a
  time-bounded removal condition, review the diff, then update fingerprints.
- Base: add only a test fixture; it appears in the report and does not consume
  runtime budget.
- Bad: allow `packages/dom-to-figma/src/converter/**`, refresh fingerprints
  without reviewing the diff, or delete user-visible behavior to hit a budget.

### 6. Tests Required

- Integration fixture: a new runtime file fails with its exact path.
- Integration fixture: editing an allowed runtime file fails on its stale
  fingerprint.
- Integration fixture: a test-only file is reported without an unauthorized
  production error.
- Schema test: broad paths and ambiguous overlaps fail validation.
- Ref test: a moving ref whose commit differs from the registry fails.
- Repository gate: the governance report maps every current runtime path and
  the stable/main reports record their exact resolved commits.

### 7. Wrong vs Correct

#### Wrong

```json
{
  "paths": ["packages/dom-to-figma/src/converter/**"],
  "reviewBy": "never"
}
```

#### Correct

```json
{
  "paths": ["packages/dom-to-figma/src/converter/image-preparation.ts"],
  "reviewBy": "2026-10-31",
  "removeWhen": "the selected upstream baseline exposes equivalent behavior"
}
```
