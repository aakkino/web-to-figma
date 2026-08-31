# C1 Trace Timeout Independent Check

## Decision

The four preserved Chromium trace timeouts are not reproducible on either a
fresh detached `origin/main` baseline or a fresh detached C1 candidate. The
same seven-test trace command passed on both, and the complete C1 workspace
test gate subsequently passed. The evidence does not support either a
pre-existing baseline failure or a C1 product regression.

The most specific supported classification is a transient execution-state
failure in the original validation worktree/browser session. Its exact cause
is not established. The original `pnpm test` failure, focused retry failure,
and screenshots remain preserved; no timeout, concurrency, or test-selection
setting was changed.

The trace timeout is no longer a current C1 blocker. C1 promotion remains
blocked overall because the required post-test parity and compatibility gates
have not yet run.

## Candidate Integrity

Review timestamp: `2026-08-25T15:36:54+08:00`.

| Field | Independently verified value |
| --- | --- |
| Accepted base / `origin/main` | `606ee8aa9ca4915ec28dd7853fd5b42283ff54ea` |
| C1 head | `81abcdfc47d0c6a61dff9d4f8b593fa61e47a10f` |
| C1 parent | `606ee8aa9ca4915ec28dd7853fd5b42283ff54ea` |
| Commits above base | `1` |
| Merge base with `sync/upstream-20260726` | `606ee8aa9ca4915ec28dd7853fd5b42283ff54ea` |
| Sync-only commits imported | `0` |
| Node / pnpm | `v24.6.0` / `10.33.2` |
| Checkout line endings | `pnpm-lock.yaml` and trace test both `i/lf w/lf` |

The C1 commit contains exactly the nine approved paths recorded in the
original report. A structured comparison between
`41ff3991d65bf54e915b52df52dafa074cff6b7b:docs/upstream-core-delta.json` and
the C1 registry returned exactly six changed leaves:

```text
capabilities[image-presentation].upstreamState
targets.stable.commit
targets.stable.ref
targets.stable.version
targets.upstreamMain.commit
targets.upstreamMain.resolvedAt
```

The array entry at the observed numeric index was independently resolved to
`image-presentation`. No other JSON leaf changed.

The corrected governance artifact also parsed and matched the candidate:

```text
head=81abcdfc47d0c6a61dff9d4f8b593fa61e47a10f
runtimeFiles=15
testFiles=5
capabilityCount=6
unmappedRuntimeFiles=0
unmappedTestFiles=0
errors=0
```

The discarded first attempt remains distinct at head `b474f569...`, with one
unmapped runtime path and seven errors.

## Exact Reproduction Matrix

Both fresh worktrees were created detached with process-local
`core.autocrlf=false`, then installed with the unchanged lockfile.

| Tree | Exact command | Exit | Result |
| --- | --- | ---: | --- |
| Baseline `606ee8a` | `pnpm install --frozen-lockfile` | 0 | 961 locked packages linked; lifecycle completed |
| Baseline `606ee8a` | `pnpm --filter @figit/dom-to-figma exec vitest run src/figma.trace.browser.test.ts` | 0 | 1 file, 7 passed, 0 failed; tests 4.93s, total 8.39s |
| C1 `81abcdf` | `pnpm install --frozen-lockfile` | 0 | 961 locked packages linked; lifecycle completed |
| C1 `81abcdf` | `pnpm --filter @figit/dom-to-figma exec vitest run src/figma.trace.browser.test.ts` | 0 | 1 file, 7 passed, 0 failed; tests 8.16s, total 11.31s |
| C1 `81abcdf` | `pnpm test` | 0 | Complete workspace test gate passed |
| C1 `81abcdf` | `pnpm lint --diagnostic-level=error --max-diagnostics=none` | 0 | 353 files checked, no fixes |
| C1 `81abcdf` | `pnpm check-types` | 0 | 8 workspace projects passed |

The complete C1 test counts were:

```text
upstream checker: 5 passed
@figit/fig-kiwi: 41 passed
@figit/composed-dom: 3 passed
@figit/dom-to-figma: 159 passed
@figit/oracle-harness: 102 passed, 5 skipped
@figit/browser-capture-adapter: 46 passed
extension: 33 passed
total: 389 passed, 5 skipped, 0 failed
```

## Causal Diff Review

C1 has no diff against the base in `pnpm-lock.yaml`,
`packages/dom-to-figma`, `packages/fig-kiwi`, `packages/composed-dom`, or the
browser capture adapter. The root `package.json` only prepends the five-test
governance suite to `pnpm test` and adds governance command aliases. The direct
trace command does not execute that root script, and the fresh full workspace
run passed after executing the governance prelude.

Therefore no C1 changed path reaches the trace runtime or its locked
dependencies, and the fresh candidate run supplies direct contrary evidence
to a C1 causal regression.

## Preserved Failure Evidence

The first run remains recorded as `pnpm test` exit 1 with 155/159
dom-to-figma tests passing and four trace timeouts. Its same-head focused retry
remains recorded as exit 1 with 3/7 passing and the same four 15-second
timeouts. The four screenshot hashes were recomputed and match the original
report exactly.

No original report, failed governance artifact, corrected governance artifact,
or screenshot was removed or replaced.

## Isolation And Residuals

The fresh baseline and C1 worktrees were clean before cleanup. Their heads and
LF checkout state were verified before any command ran. The current dirty
checkout was not used for installation or testing, and no branch, tag,
remote-tracking ref, push, PR, merge, or remote state was changed.

These earlier unregistered residual directories remain and were not deleted:

```text
D:\w2f-reconcile-validation-2
D:\w2f-reconcile-validation-3
C:\Users\abskino\AppData\Local\Temp\web-to-figma-target-review-20260825
```

Each existed at review time without a `.git` marker. This check does not claim
ownership sufficient to delete them.

Git worktree removal cleared the registration metadata for both fresh review
trees, but Windows then reported `Directory not empty` while deleting their
locked-dependency contents. These new unregistered residual directories also
remain without a `.git` marker:

```text
D:\w2f-c1-baseline-check-20260825
D:\w2f-c1-head-recheck-20260825
```

Neither path appears in `git worktree list`. They contain no unique evidence;
no recursive fallback deletion was attempted.

## Remaining C1 Gates

The reviewer did not run past the scope of the trace-blocker recheck. C1 still
requires the previously deferred commands before acceptance:

```text
pnpm oracle:parity
pnpm upstream-core-delta:check -- --report <artifact>
pnpm upstream-core-delta:stable -- --verify-latest --report <artifact>
pnpm upstream-adapter:stable
pnpm upstream-core-delta:main -- --report <artifact>
```
