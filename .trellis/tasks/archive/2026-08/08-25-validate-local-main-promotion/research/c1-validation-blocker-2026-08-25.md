# C1 Isolated Promotion Validation

> Historical failure evidence, preserved unchanged below. An independent fresh
> baseline/C1 review on 2026-08-25 could not reproduce the four timeouts and
> passed the complete workspace test gate. See
> `c1-trace-timeout-independent-check-2026-08-25.md`. The trace timeout is no
> longer the current blocker; the unrun post-test promotion gates still block
> C1 acceptance.

## Result

The corrected C1 candidate was reconstructed reproducibly from the approved
local `origin/main`. Its focused checker and governance gates passed, as did
workspace lint, type-check, and build. The blocking workspace test gate failed
in four pre-existing Chromium trace tests, so validation stopped before the
remaining compatibility gates and before C2-C5.

## Reproducible Candidate

| Field | Value |
| --- | --- |
| Validation worktree | `D:\\w2f-reconcile-validation-3` (detached, task-created) |
| Base | `606ee8aa9ca4915ec28dd7853fd5b42283ff54ea` (`origin/main`) |
| Original commit | `41ff3991d65bf54e915b52df52dafa074cff6b7b` |
| Corrected curated head | `81abcdfc47d0c6a61dff9d4f8b593fa61e47a10f` |
| Mapping | `41ff3991d65bf54e915b52df52dafa074cff6b7b -> 81abcdfc47d0c6a61dff9d4f8b593fa61e47a10f` |
| Commit count above base | `1` |
| Merge base with `sync/upstream-20260726` | `606ee8aa9ca4915ec28dd7853fd5b42283ff54ea` |
| Sync-only commits imported | `0` of `47` |
| Cherry-pick conflicts | none |

The corrected C1 registry starts from the registry introduced by `41ff399`
and applies exactly these six reviewed leaf changes:

```text
targets.stable.version
targets.stable.ref
targets.stable.commit
targets.upstreamMain.commit
targets.upstreamMain.resolvedAt
capabilities[image-presentation].upstreamState
```

A PowerShell structural assertion built the expected JSON from
`41ff399:docs/upstream-core-delta.json`, changed only those six leaves, and
compared its compressed JSON to the curated file. It returned
`C1_REGISTRY_SIX_LEAF_ASSERTIONS=PASS`. No baseline, budget, path, fingerprint,
review date, removal condition, or other capability state changed.

An initial attempt incorrectly applied the final post-C5 registry in C1 and
failed governance with one unmapped runtime path and six stale fingerprints.
That attempt is retained only as audit evidence in
`c1-attempt1-governance-report.json`; it was discarded and is not the candidate
reported above.

## Changed Paths And Focused Selection

The corrected curated C1 commit contains exactly the approved nine paths:

```text
.github/workflows/ci.yml
.gitignore
.trellis/spec/dom-to-figma/frontend/index.md
.trellis/spec/dom-to-figma/frontend/upstream-compatibility.md
docs/fork-maintenance.md
docs/upstream-core-delta.json
package.json
scripts/check-upstream-core-delta.mjs
scripts/check-upstream-core-delta.test.mjs
```

The changed checker, registry, package scripts, and CI workflow select the
checker unit suite and governance report as focused C1 tests.

## Commands And Results

| Command | Exit | Tests / result | Artifact |
| --- | ---: | --- | --- |
| `pnpm install --frozen-lockfile` | 0 | 961 packages linked; install lifecycle completed | console record |
| six-leaf registry structural assertion | 0 | exact expected C1 registry | console record |
| detached commit hooks (`biome`, `commitlint`) | 0 | both passed | curated head |
| `node --test scripts/check-upstream-core-delta.test.mjs` | 0 | 5 passed, 0 failed | console record |
| `node scripts/check-upstream-core-delta.mjs --report <artifact>` | 0 | 15 runtime, 5 tests, 0 unmapped runtime | `c1-attempt2-governance-report.json` |
| `pnpm lint --diagnostic-level=error --max-diagnostics=none` | 0 | 353 files checked | console record |
| `pnpm check-types` | 0 | 8 workspace projects passed | console record |
| `pnpm build` | 0 | 8 workspace projects passed | console record |
| `pnpm test` | 1 | stopped in dom-to-figma: 155 passed, 4 failed of 159 | `c1-test-failure-screenshots/` |
| `pnpm --filter @figit/dom-to-figma exec vitest run src/figma.trace.browser.test.ts` | 1 | exact retry: 3 passed, same 4 timed out of 7 | `c1-test-failure-screenshots/` |

Before the failing dom-to-figma suite, the same workspace test command passed:

```text
upstream checker: 5/5
@figit/fig-kiwi: 41/41
@figit/composed-dom: 3/3
@figit/dom-to-figma: 155/159; 4 failed
```

All four failures are 15-second timeouts in
`src/figma.trace.browser.test.ts`:

```text
maps every traced guid to a payload node and resolves its element
builds nth-child dom paths from real DOM position
shares one dom path across a wrapped text node's line segments
traces a form element even though it emits a synthesized child
```

Vitest also logged fontsource lookup and empty-color warnings while those tests
were running. Four failure screenshots are preserved under
`research/c1-test-failure-screenshots/`.

The required one-time focused retry used the same C1 head, LF checkout,
Chromium environment, and default 15-second timeout. It reproduced all four
timeouts in 63.94 seconds (60.75 seconds in tests). Because an original timeout
reproduced, the full workspace test was not rerun a second time. No timeout,
concurrency, or test selection setting was relaxed.

Screenshot SHA-256 values from the confirming run:

```text
builds-nth-child...png: 85C4007BB95D64F0426EEFD3776CBD52E1062BF48F850312D1ABB14A0AB51617
maps-every-traced-guid...png: 85C4007BB95D64F0426EEFD3776CBD52E1062BF48F850312D1ABB14A0AB51617
shares-one-dom-path...png: 54652D2D29EF882ECF587B4E04FF03A41265185B3783EC39A22F64B3B5719F49
traces-a-form-element...png: C9DFB32A75BD7A66408A1BE0A2C208C08915BA3FF0666ADACD66FF1DCAC98379
```

The remaining full gates were not run because `pnpm test` is the first
uncorrected blocking failure:

```text
pnpm oracle:parity
pnpm upstream-core-delta:check -- --report <artifact>
pnpm upstream-core-delta:stable -- --verify-latest --report <artifact>
pnpm upstream-adapter:stable
pnpm upstream-core-delta:main -- --report <artifact>
```

## Environment And Cleanup

The successful lint run used a fresh detached checkout created with
process-local `core.autocrlf=false`, because the machine-wide Git setting is
`core.autocrlf=true` while Biome requires the repository's LF content. The
candidate commit did not change between checkouts.

Git worktree metadata for all three attempts was removed after verifying each
exact path and clean status. Windows left non-Git dependency/build residual
directories because `git worktree remove` encountered non-empty or overlong
paths; recursive cleanup commands were rejected by the execution policy. None
of the residual directories contains a `.git` file or remains registered as a
worktree. No named branch, tag, remote-tracking ref, or remote state changed.

## Blocker

C1 cannot be accepted until the four reproducible trace timeouts are fixed or
demonstrated to be an environmental failure under the same required gate.
C2-C5 were intentionally not constructed.
