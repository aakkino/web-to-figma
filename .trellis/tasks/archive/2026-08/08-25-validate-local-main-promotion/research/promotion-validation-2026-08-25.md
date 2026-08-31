# Local Main Promotion Validation

## Decision

The approved keep/split/exclude set was reconstructed as five detached curated
commits from local `origin/main` and passed cumulative focused and full
promotion gates. C1 is an intermediate construction checkpoint rather than a
standalone promotion unit because the required stable-adapter command arrives
in C2. The first accepted unit is therefore C1+C2, followed by C3, C4, and C5.

No commit from `main..sync/upstream-20260726`, task/archive metadata, journal,
named ref, or dirty-checkout content entered the candidate. No branch, tag,
push, PR, merge, or remote mutation occurred.

## Topology And Mapping

| Unit | Original SHA(s) | Curated SHA | Parent |
| --- | --- | --- | --- |
| C1 checkpoint | `41ff3991d65bf54e915b52df52dafa074cff6b7b` | `81abcdfc47d0c6a61dff9d4f8b593fa61e47a10f` | `606ee8aa9ca4915ec28dd7853fd5b42283ff54ea` |
| C2 / first accepted C1+C2 unit | `86a83e9f33c202b506be6728bb4bcc4fef1a9d11`, split `f874f03fa656fc22d47cbbd47c07d8b335d261d9` | `82787e6240ed4d4410e41c6c948ec4da6c511f22` | `81abcdfc47d0c6a61dff9d4f8b593fa61e47a10f` |
| C3 | split `afd3a84d91f52315f20ca3b828ff54293140b8fc` | `530ba98cf2e9e29b792f436ec075d508edde1dfb` | `82787e6240ed4d4410e41c6c948ec4da6c511f22` |
| C4 | `d8456cd5a435edb8c1a96d2d4a35fb0e878d931d`, split `0c1616e35048b38b296f29426dfd2989e70234e0` | `ac538479b40daed491b8739f7056beb46355e434` | `530ba98cf2e9e29b792f436ec075d508edde1dfb` |
| C5 | `aa6bbdca31f412753e57452d4bca1f57feeb12e4`, `e8d928a9c1dff86afb871b43378710ec02116784`, `cd3f0ded9f5505597d861949970cdd1c896db646` | `61888631fb9059f1c8cbb7d2d97e2ab03a105a6d` | `ac538479b40daed491b8739f7056beb46355e434` |

The final candidate is five commits above `origin/main`. Its merge base with
`sync/upstream-20260726` is exactly `606ee8aa...`, proving zero intake from the
47 sync-only commits.

## Registry Evolution

- C1 starts with `41ff399` governance and changes exactly six reviewed leaves:
  stable version/ref/commit, upstream-main commit/resolvedAt, and
  `image-presentation.upstreamState`.
- C2 carries that registry byte-equivalently.
- C3 and C4 retain their historical cohort-specific path/fingerprint evolution
  while carrying the same six reviewed leaves. Structured assertions passed.
- C5 final registry is structurally equal to the independently reviewed
  `upstream-core-delta-candidate.json`.
- Governance stayed pinned to `ac830db5...`; runtime budget stayed `15`.

## Exact Curated Paths

### C1

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

### C2

```text
.github/workflows/ci.yml
.trellis/spec/dom-to-figma/frontend/staged-resource-pipeline.md
docs/fork-maintenance.md
internal/browser-capture-adapter/README.md
internal/browser-capture-adapter/package.json
internal/browser-capture-adapter/src/bridges/dom-to-figma.test.ts
internal/browser-capture-adapter/src/bridges/dom-to-figma.ts
package.json
scripts/check-vanilla-upstream-adapter.mjs
```

### C3

```text
.trellis/spec/dom-to-figma/frontend/architecture.md
docs/upstream-core-delta.json
internal/browser-capture-adapter/src/bridges/dom-to-figma.test.ts
packages/composed-dom/src/composed-dom.browser.test.ts
packages/dom-to-figma/src/converter/convert.ts
packages/dom-to-figma/src/converter/layout/infer.ts
packages/dom-to-figma/src/converter/nodes/form/converter.ts
packages/dom-to-figma/src/converter/nodes/frame/converter.ts
packages/dom-to-figma/src/converter/nodes/text/converter.ts
packages/dom-to-figma/src/converter/walk.ts
packages/dom-to-figma/src/figma.dom-traversal.browser.test.ts
packages/dom-to-figma/src/figma.shadow-dom.browser.test.ts
```

### C4

```text
.trellis/spec/dom-to-figma/frontend/rendering-contracts.md
docs/upstream-core-delta.json
packages/dom-to-figma/src/converter/font-cache.test.ts
packages/dom-to-figma/src/converter/nodes/text/primitives/font/loader.test.ts
packages/dom-to-figma/src/figma.text.browser.test.ts
```

### C5

```text
deleted: .changeset/staged-resource-pipeline.md
.trellis/spec/dom-to-figma/frontend/staged-resource-pipeline.md
docs/upstream-core-delta.json
packages/dom-to-figma/README.md
packages/dom-to-figma/src/converter/image-cache.ts
deleted: packages/dom-to-figma/src/converter/image-preparation.ts
packages/dom-to-figma/src/converter/nodes/image/converter.ts
packages/dom-to-figma/src/converter/nodes/image/loader.test.ts
packages/dom-to-figma/src/converter/nodes/image/loader.ts
packages/dom-to-figma/src/converter/nodes/image/presentation.test.ts
packages/dom-to-figma/src/converter/nodes/image/presentation.ts
packages/dom-to-figma/src/figma.image.browser.test.ts
packages/dom-to-figma/src/figma.ts
```

## Split And Conflict Record

- C2 excluded three task metadata paths from `f874f03`; their expected
  modify/delete conflicts were resolved as exclusions.
- C3 excluded five task handoff paths from `afd3a84`; three expected
  modify/delete conflicts were resolved as exclusions.
- C4 excluded all task planning, draft, and verification paths from `0c1616e`;
  three expected modify/delete conflicts were resolved as exclusions.
- C5 applied without conflict. Archive `9be7c21` was not imported.

## Focused Gates

| Unit | Focused result | Governance result |
| --- | --- | --- |
| C1+C2 | checker 5/5; adapter bridge 8/8; composed and adapter builds; stable adapter passed | 15 runtime, 5 tests, 0 unmapped |
| C3 | composed 5/5; adapter bridge 9/9; traversal/shadow 6/6 | 15 runtime, 6 tests, 0 unmapped |
| C4 | font/text 18/18 | 15 runtime, 8 tests, 0 unmapped |
| C5 | image 19/19; adapter bridge 9/9 | 14 runtime, 8 tests, 0 unmapped |

The focused invocations below all returned exit `0`. Report arguments resolve
through the exact artifact mapping in the following full-gate section.

| Unit | Exact focused invocation(s) |
| --- | --- |
| C1+C2 | `node --test scripts/check-upstream-core-delta.test.mjs`; `pnpm --filter @figit/browser-capture-adapter exec vitest run src/bridges/dom-to-figma.test.ts`; `pnpm --filter @figit/composed-dom build`; `pnpm --filter @figit/browser-capture-adapter build`; `pnpm upstream-adapter:stable`; `pnpm upstream-core-delta:check -- --report <focused-governance-report>` |
| C3 | `pnpm --filter @figit/composed-dom exec vitest run src/composed-dom.browser.test.ts`; `pnpm --filter @figit/browser-capture-adapter exec vitest run src/bridges/dom-to-figma.test.ts`; `pnpm --filter @figit/dom-to-figma exec vitest run src/figma.dom-traversal.browser.test.ts src/figma.shadow-dom.browser.test.ts`; `pnpm upstream-core-delta:check -- --report <focused-governance-report>` |
| C4 | `pnpm --filter @figit/dom-to-figma exec vitest run src/converter/font-cache.test.ts src/converter/nodes/text/primitives/font/loader.test.ts src/figma.text.browser.test.ts`; `pnpm upstream-core-delta:check -- --report <focused-governance-report>` |
| C5 | `pnpm --filter @figit/dom-to-figma exec vitest run src/converter/nodes/image/loader.test.ts src/converter/nodes/image/presentation.test.ts src/figma.image.browser.test.ts`; `pnpm --filter @figit/browser-capture-adapter exec vitest run src/bridges/dom-to-figma.test.ts`; `pnpm upstream-core-delta:check -- --report <focused-governance-report>` |

## Full Promotion Gates

Every accepted cumulative unit passed:

| Gate | C1+C2 | C3 | C4 | C5 |
| --- | --- | --- | --- | --- |
| lint | 354 files | 355 files | 357 files | 356 files |
| type-check | 8 projects | 8 projects | 8 projects | 8 projects |
| build | 8 projects | 8 projects | 8 projects | 8 projects |
| workspace tests | 395 pass, 5 skip | 402 pass, 5 skip | 405 pass, 5 skip | 406 pass, 5 skip |
| oracle parity | 46 scenes | 46 scenes | 46 scenes | 46 scenes |
| governance | 15 runtime / 5 test / 0 unmapped | 15 / 6 / 0 | 15 / 8 / 0 | 14 / 8 / 0 |
| stable target | `0.2.4` at `859efea8...` | same | same | same |
| stable adapter | pass | pass | pass | pass |
| upstream main | `859efea8...` | same | same | same |

Stable/upstream comparison unmapped paths remained report-only comparison
output: C1+C2 had 26 runtime / 20 test / 11 unmapped; C3 had 26 / 21 / 11;
C4 had 26 / 23 / 11; C5 had 25 / 23 / 11. Governance authorization had
zero unmapped runtime paths at every accepted unit.

Every cell in the table above represents exit `0`. Each accepted unit used the
same exact full-gate command sequence:

```text
pnpm lint --diagnostic-level=error --max-diagnostics=none
pnpm check-types
pnpm build
pnpm test
pnpm oracle:parity
pnpm upstream-core-delta:check -- --report <governance-report>
pnpm upstream-core-delta:stable -- --verify-latest --report <stable-report>
pnpm upstream-adapter:stable
pnpm upstream-core-delta:main -- --report <upstream-main-report>
```

The exact report arguments were:

| Unit | Focused governance | Full governance | Stable | Upstream main |
| --- | --- | --- | --- | --- |
| C1+C2 | `research/c1-c2-focused-governance-report.json` | `research/c1-c2-governance-report.json` | `research/c1-c2-stable-report.json` | `research/c1-c2-upstream-main-report.json` |
| C3 | `research/c3-focused-governance-report.json` | `research/c3-governance-report.json` | `research/c3-stable-report.json` | `research/c3-upstream-main-report.json` |
| C4 | `research/c4-focused-governance-report.json` | `research/c4-governance-report.json` | `research/c4-stable-report.json` | `research/c4-upstream-main-report.json` |
| C5 | `research/c5-focused-governance-report.json` | `research/c5-governance-report.json` | `research/c5-stable-report.json` | `research/c5-upstream-main-report.json` |

Paths in this mapping are relative to the task directory. The focused and full
governance artifacts are byte-identical within every accepted unit.

## Independent Final Check

The final Trellis review independently reproduced these read-only assertions:

- The candidate is the exact five-commit parent chain shown above; every
  commit's changed-path set matches its approved cohort list with no task or
  workspace metadata.
- Comparing each curated tree to its historical cohort tip leaves only the
  approved Trellis metadata exclusions and
  `docs/upstream-core-delta.json`; no other product/spec path differs.
- C1, C3, C4, and C5 each differ from their historical registry at exactly the
  same six reviewed target leaves. C2 carries the C1 registry byte-for-byte,
  and C5 is structurally equal to the reviewed registry candidate.
- All 20 JSON artifacts parse. For each accepted unit, target/head/count/error
  assertions pass, stable and upstream-main summaries agree, and focused/full
  governance hashes agree.
- The five curated commit IDs have zero intersection with the 47 sync-only
  commit IDs; the final merge base with the sync branch remains `606ee8aa...`.
- The final candidate and `origin/main` have no diff under `.trellis/tasks` or
  `.trellis/workspace`. Shared checkout refs, six tracked dirty paths, empty
  staged set, and registered worktrees match the prevalidation snapshot.

C1 lacks both the `upstream-adapter:stable` script and its executable; C2 adds
both. This confirms that C1 alone cannot satisfy the required stable-adapter
promotion gate and that C1+C2 is the first valid accepted unit.

## Transient C1 Evidence

The original C1 worktree recorded four trace-test timeouts and a same-worktree
focused retry. That evidence and screenshots remain preserved. An independent
fresh baseline/C1 review then passed both trace suites and the complete C1
workspace test (389 pass, 5 skip), classifying the original failure as
transient execution state rather than a candidate regression. C1 remained only
an intermediate checkpoint until C2 supplied the required stable adapter gate.

## Artifacts

JSON reports under this directory are grouped by prefix:

```text
c1-c2-{focused-governance,governance,stable,upstream-main}-report.json
c3-{focused-governance,governance,stable,upstream-main}-report.json
c4-{focused-governance,governance,stable,upstream-main}-report.json
c5-{focused-governance,governance,stable,upstream-main}-report.json
```

The earlier C1 reports, timeout screenshots, and independent-check report are
also retained unchanged.

## Handoff

These are prevalidation heads, not refs. Before each sequential PR, reconstruct
the corresponding unit on the then-current accepted `origin/main` and rerun its
focused and full gates. C1 and C2 must remain one review/promotion unit. No
remote action is authorized by this report.

## Cleanup And Checkout Integrity

- The final detached worktree was clean at
  `61888631fb9059f1c8cbb7d2d97e2ab03a105a6d` before cleanup.
- `git worktree remove D:\w2f-v4` removed the worktree registration and its
  `.git` file. The directory remains with dependency/build content because the
  command did not remove it completely; it was not force-deleted or recursively
  deleted under the uncertain-residual policy.
- The shared checkout remains on `sync/upstream-20260726` at
  `07bbcd751c34a378caeb91b10681842f37c64b7d`. Its tracked dirty set remains the
  same six pre-existing paths: `.gitignore`, the frontend spec index, the kino
  workspace index, classify source/test, and the fig-kiwi clipboard test.
- During an earlier combined setup command, `pnpm install` ran from the shared
  checkout rather than the detached worktree. It executed lifecycle builds but
  did not change the tracked dirty-path set. No user changes were reverted or
  staged.
