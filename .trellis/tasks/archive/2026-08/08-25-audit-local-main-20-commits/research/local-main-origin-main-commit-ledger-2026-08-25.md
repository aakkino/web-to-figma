# `origin/main..main` 20-Commit Promotion Ledger

## Scope And Decision Boundary

This is a read-only, local-ref audit of the exact range
`origin/main..main`. It maps the range into reviewable promotion cohorts. It
does not approve a merge, rebase, cherry-pick, push, pull request, registry
refresh, working-tree cleanup, or a curated rewrite.

The audit was recorded on 2026-08-25 in `Asia/Shanghai`. The dispatch
explicitly prohibited fetches, so the result verifies the locally available
refs against the approved 2026-08-25 snapshot; it does not make a claim about
remote freshness after that snapshot.

## Snapshot And Topology Check

| Item | Approved snapshot | Observed in this audit | Result |
| --- | --- | --- | --- |
| Current branch / `HEAD` | `sync/upstream-20260726` / `07bbcd751c34a378caeb91b10681842f37c64b7d` | same | match |
| Local `main` | `bac116ad8a7ac18812cfa6af72b140c45c6dbf83` | same | match |
| `origin/main` | `606ee8aa9ca4915ec28dd7853fd5b42283ff54ea` | same | match |
| Cached `upstream/main` | `859efea8d7f8330783c6c4e3e520fd673e877336` | same | match |
| `merge-base(origin/main, main)` | `606ee8aa9ca4915ec28dd7853fd5b42283ff54ea` | same | match |
| `origin/main...main` | `0 20` | `0 20` | match |
| `merge-base(main, sync/upstream-20260726)` | `bac116ad8a7ac18812cfa6af72b140c45c6dbf83` | same | match |
| `main...sync/upstream-20260726` | `0 47` | `0 47` | match |
| `merge-base(origin/main, sync/upstream-20260726)` | `606ee8aa9ca4915ec28dd7853fd5b42283ff54ea` | same | match |
| `origin/main...sync/upstream-20260726` | `0 67` | `0 67` | match |

No topology drift was found, so the audit continues. If any of the first six
rows change before a promotion decision, this ledger must be regenerated from
the new range instead of being applied by SHA.

### Reproduction

Every Git command below is read-only and uses a process-local safe-directory
setting. It neither changes the checkout nor persistent Git configuration.

```powershell
git -c safe.directory=D:/desktop_directory/web-to-figma rev-parse HEAD main origin/main upstream/main
git -c safe.directory=D:/desktop_directory/web-to-figma merge-base origin/main main
git -c safe.directory=D:/desktop_directory/web-to-figma rev-list --left-right --count origin/main...main
git -c safe.directory=D:/desktop_directory/web-to-figma log --format=%H --reverse origin/main..main
git -c safe.directory=D:/desktop_directory/web-to-figma log --reverse --name-status origin/main..main
git -c safe.directory=D:/desktop_directory/web-to-figma rev-list --left-right --count main...sync/upstream-20260726
git -c safe.directory=D:/desktop_directory/web-to-figma rev-list --left-right --count origin/main...sync/upstream-20260726
```

`origin/main..main` is a reachability range, so its twenty commits are not
reachable from the locally cached `origin/main`. This establishes that no
ledger row is L5. The prior sync-branch audit found no associated public PR or
remote CI evidence, so no row is L4; local task and integration evidence is
assessed separately below.

## Evidence Scale

| Level | Meaning in this ledger |
| --- | --- |
| L0 | The Git commit exists. |
| L1 | Task planning, archive, or journal provenance only. |
| L2 | Historical task-local command, test, fixture, or reproducible verification record covers the bounded cohort. |
| L3 | A final integration/intake audit that explicitly covers this exact local-main cohort. |
| L4 | Remote PR review plus required CI evidence. |
| L5 | Reachable from `origin/main`. |

No row has L4 or L5 evidence. A completed archived task and checked planning
checkbox do not by themselves establish L2. The later local
[parent final integration review](../../archive/2026-07/07-25-upstream-compat-architecture/research/final-integration-review-2026-07-26.md)
explicitly covers all five named cohorts, records the full integration gate,
and records user acceptance; it therefore supplies L3 evidence for the
behavioral and contract commits it covers. That review is descendant evidence
on `sync/upstream-20260726`, not a commit in this ledger and not authority to
include any of the 47 descendant commits. Task planning, archive, and journal
rows remain L1. The prior sync-branch audit also establishes that all relevant
historical tasks have null `commit` and `pr_url` fields. Its current-target
finding makes all historical L2/L3 results provenance, not current promotion
approval.

## Cohorts And Dependencies

The five cohorts are based on the actual task dependencies, not merely on the
linear order in the local branch. `C1` is the shared gate, `C2` is the only
additional blocker for the staged-image API retirement in `C5`, and `C3` / `C4`
are independent after `C1`.

```text
C1 governance and compatibility CI
 |- C2 vanilla-upstream adapter fallback
 |   `- C5 image pipeline and presentation semantics
 |- C3 composed-DOM traversal port
 `- C4 text and font correctness
```

| Cohort | Commits in range | Actual dependency | Historical evidence | Recommended review / promotion order |
| --- | --- | --- | --- | --- |
| C1: core-delta governance | `2211372`, `41ff399`, `05a11c2`, `6a9675f` | None; the implementation plan names it the first task. | L3 parent integration review for the CI/registry behavior; L1 for task/journal records. | First. Reconcile the now-stale targets before relying on this gate. |
| C2: vanilla-upstream adapter fallback | `86a83e9`, `f874f03`, `e36cc14`, `342559a` | Blocking C1 dependency declared in its PRD and implementation plan. | L3 parent integration review, backed by task-local fork, stable-package, and parity checks. | Second; retain the adapter fallback before any core staging removal. |
| C3: composed-DOM traversal | `afd3a84`, `3db12cb`, `057bf23` | Blocking C1 only; explicitly independent of C4. | L3 parent integration review, backed by scoped task verification and a local PR draft. | After C1; may be reviewed in parallel with C4. |
| C4: text/font correctness | `d8456cd`, `0c1616e`, `4de033b`, `ed8b382` | Blocking C1 only; explicitly independent of C3. | L3 parent integration review, backed by a detailed local verification record. | After C1; may be reviewed in parallel with C3. |
| C5: image pipeline and presentation | `aa6bbdc`, `e8d928a`, `cd3f0de`, `9be7c21`, `bac116a` | C1 for all edits; C2 is blocking specifically for removal of `createImagePreparation`. | L3 parent integration review for the bounded image behavior and ownership outcome. | Last, after C1 target review and C2 revalidation. Do not split the API retirement from the fallback proof. |

The recommended sequence is therefore `C1 -> C2 -> (C3 || C4) -> C5`.
It is a review and current-base revalidation order, not authority to
cherry-pick the historical commits. Each product cohort still needs the later
target-review and validation tasks before a PR decision.

## Commit Ledger

Classification labels distinguish `product`, `governance/spec/registry`,
`task archive`, and `journal`. `P01` through `P20` point to the exact changed
path inventory, including renames and deletions, below.

| # | Full SHA / subject | Task / cohort | Changed paths | Classification | Evidence | Dependencies | Risk | Keep / exclude recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `221137273ac0ac565c540af857ab6a0745d981ac`<br>`chore(trellis): add upstream compatibility task tree` | architecture task tree / C1 provenance | P01 (43) | task planning metadata | L1: task plans only | none | Creates source paths later renamed by archive commits; no runtime contract. | Exclude from a curated product promotion together with its related task/archive records. Retain in audit provenance; do not cherry-pick later renames without it. |
| 2 | `41ff3991d65bf54e915b52df52dafa074cff6b7b`<br>`feat(ci): govern upstream core deltas` | `07-25-upstream-core-delta-governance` / C1 | P02 (9) | governance/spec/registry + CI | L3: parent integration review covers the gate, backed by targeted negative-gate and workspace verification. | none | The registered stable/upstream targets are now stale; CI/registry policy is shared by every later core cohort. | Keep as the C1 behavioral/governance commit, but only after the target-review task refreshes its evidence. |
| 3 | `05a11c2283c1659498aba2371d58921f1b5de526`<br>`chore(task): archive upstream-core-delta-governance` | C1 archive | P03 (6 renames) | task archive | L1: archive provenance | P01 source files | Archive state does not prove CI ran or preserve a product contract. | Exclude with C1 task metadata in a curated product promotion; retain in the audit trail. |
| 4 | `6a9675f6a86f6d3bf12038fc3abf3b5f640c376a`<br>`chore: record journal` | C1 journal | P04 (2) | journal | L1: journal provenance | none | Personal session chronology only. | Exclude from any product/governance PR; retain only in history/audit. |
| 5 | `86a83e9f33c202b506be6728bb4bcc4fef1a9d11`<br>`feat(adapter): support vanilla upstream image staging` | `07-25-vanilla-upstream-adapter-fallback` / C2 | P05 (6) | product adapter + CI/package command | L3: parent integration review covers the fallback, backed by tests, types, build, stable consumer, governance, and 46-scene parity records. | C1 blocking dependency | Changes the shared bridge, CI workflow, and scripts; historic stable target is stale. | Keep atomically with the C2 contract documentation after C1/current-target revalidation. |
| 6 | `f874f03fa656fc22d47cbbd47c07d8b335d261d9`<br>`docs(adapter): document vanilla upstream fallback` | C2 | P06 (6) | spec/operational docs + task metadata | L3 for the contract docs: the parent integration review accepts the compatibility policy and fallback limits; task metadata remains L1. | C1; paired with row 5 | A whole-commit promotion brings task state along with user-facing contract documentation. | Split for a curated PR: keep staged-resource spec, fork-maintenance docs, and adapter README; exclude task plan/status paths. |
| 7 | `e36cc144986f9336f8a04f37a2374b8ce1a78b18`<br>`chore(task): archive vanilla-upstream-adapter-fallback` | C2 archive | P07 (6 renames) | task archive | L1: archive provenance | P06 source task files | Archive move is mechanically coupled to the task metadata, not the adapter runtime. | Exclude with C2 task metadata; retain only as provenance. |
| 8 | `342559a0cea78a2b55327f3b23ed17561749089d`<br>`chore: record journal` | C2 journal | P08 (2) | journal | L1: journal provenance | none | Personal session chronology only. | Exclude from product/governance PR. |
| 9 | `afd3a84d91f52315f20ca3b828ff54293140b8fc`<br>`feat(converter): harden composed DOM traversal` | `07-25-upstream-dom-traversal-port` / C3 | P09 (17) | product converter/tests + governance/spec + task handoff | L3 for runtime/tests/spec: parent integration review covers the traversal unit; task handoff paths remain L1. | C1; explicitly independent of C4 | Hunk selection shares files with other capabilities; target must be current and no remote PR/CI exists. | Split/rebuild for a focused C3 candidate: keep traversal runtime/tests, adapter test, registry/spec; exclude task working artifacts. |
| 10 | `3db12cb9266c01bc7adddfb4492cb1b9d79d6866`<br>`chore(task): archive upstream-dom-traversal-port` | C3 archive | P10 (8 renames) | task archive | L1: archive provenance | P09 task paths | Archive is not an integration acceptance. | Exclude with C3 task metadata; retain audit provenance. |
| 11 | `057bf235f7e3fb48c92cba770ee433985bf56bf3`<br>`chore: record journal` | C3 journal | P11 (2) | journal | L1: journal provenance | none | Personal session chronology only. | Exclude from product/governance PR. |
| 12 | `d8456cd5a435edb8c1a96d2d4a35fb0e878d931d`<br>`test(converter): harden glyph-aware font coverage` | `07-25-upstream-text-font-correctness` / C4 | P12 (3) | product test | L3: parent integration review covers the text/font unit; `verification.md` records focused, core, adapter, governance, target, workspace, and parity results. | C1; C3 independent | Test-only commit assumes the pre-existing glyph behavior it protects; its target evidence is stale. | Keep as focused C4 regression evidence after current-base verification. |
| 13 | `0c1616e35048b38b296f29426dfd2989e70234e0`<br>`docs(converter): prepare text and font upstream handoff` | C4 | P13 (8) | governance/spec/registry + task handoff | L3 for spec/registry/verification: the parent review accepts the text/font unit; task planning and draft paths remain L1. | C1; paired with row 12 | Registry and handoff were reviewed against `0bf06ec...`, now stale; no remote PR. | Split/rebuild: keep rendering contract and registry update; keep verification as audit input; omit task-planning paths from a product PR. |
| 14 | `4de033b1391c7ba034821f2bff1c4da25ac4b97e`<br>`chore(task): archive upstream-text-font-correctness` | C4 archive | P14 (9 renames) | task archive | L1: archive provenance | P13 task paths | Archive does not lift the cohort to L3/L4. | Exclude with C4 task metadata; retain audit provenance. |
| 15 | `ed8b382659ab3e1738af1c1f465561671318c55d`<br>`chore: record journal` | C4 journal | P15 (2) | journal | L1: journal provenance | none | Personal session chronology only. | Exclude from product/governance PR. |
| 16 | `aa6bbdca31f412753e57452d4bca1f57feeb12e4`<br>`refactor(dom-to-figma): retire core image preparation` | `07-25-upstream-image-pipeline` / C5 | P16 (7) | product converter/public API/tests | L3: parent integration review covers staged-API retirement and the full integration gate. | C1 and C2 blocking for staged API removal | Deletes public core preparation API and changes image-node behavior; unsafe without the C2 fallback on the selected base. | Keep only as part of C5 after C2 revalidation; do not promote or split out the API retirement alone. |
| 17 | `e8d928a9c1dff86afb871b43378710ec02116784`<br>`fix(dom-to-figma): harden image presentation and cancellation` | C5 | P17 (4) | product converter/tests | L3: parent integration review covers the bounded image result; local drafts separate presentation and cancellation units. | C1; review together with C5 and C2 for current behavior | Historic target may already cover a partial or changed image semantic; no fresh parity proof. | Keep with C5 only after target review and focused current-base tests. |
| 18 | `cd3f0ded9f5505597d861949970cdd1c896db646`<br>`docs(converter): record adapter-owned image pipeline` | C5 | P18 (2) | governance/spec/registry | L3: parent integration review accepts adapter ownership and the retained capability registry outcome. | C1; paired with rows 16-17 | Registry assertions are pinned to old targets and must not be refreshed without a review diff. | Keep with the C5 behavior if still accurate after target review; otherwise update in the dedicated target-review task. |
| 19 | `9be7c216b00f63c29dac1999745411a4848e9980`<br>`chore(task): archive upstream-image-pipeline` | C5 archive | P19 (9 changes) | task archive + research provenance | L1: archive/local PR-draft provenance | P18 and task source paths | Contains useful research but no remote approval; its rename/add shape cannot be cherry-picked without source metadata. | Exclude from curated product promotion, but retain the two research files as target-review input. |
| 20 | `bac116ad8a7ac18812cfa6af72b140c45c6dbf83`<br>`chore: record journal` | C5 journal / local `main` tip | P20 (2) | journal | L1: journal provenance | none | It is the local `main` tip, not a behavioral boundary. | Exclude from product/governance PR; retain in source history. |

<!-- ledger-shas:start -->
```text
221137273ac0ac565c540af857ab6a0745d981ac
41ff3991d65bf54e915b52df52dafa074cff6b7b
05a11c2283c1659498aba2371d58921f1b5de526
6a9675f6a86f6d3bf12038fc3abf3b5f640c376a
86a83e9f33c202b506be6728bb4bcc4fef1a9d11
f874f03fa656fc22d47cbbd47c07d8b335d261d9
e36cc144986f9336f8a04f37a2374b8ce1a78b18
342559a0cea78a2b55327f3b23ed17561749089d
afd3a84d91f52315f20ca3b828ff54293140b8fc
3db12cb9266c01bc7adddfb4492cb1b9d79d6866
057bf235f7e3fb48c92cba770ee433985bf56bf3
d8456cd5a435edb8c1a96d2d4a35fb0e878d931d
0c1616e35048b38b296f29426dfd2989e70234e0
4de033b1391c7ba034821f2bff1c4da25ac4b97e
ed8b382659ab3e1738af1c1f465561671318c55d
aa6bbdca31f412753e57452d4bca1f57feeb12e4
e8d928a9c1dff86afb871b43378710ec02116784
cd3f0ded9f5505597d861949970cdd1c896db646
9be7c216b00f63c29dac1999745411a4848e9980
bac116ad8a7ac18812cfa6af72b140c45c6dbf83
```
<!-- ledger-shas:end -->

The canonical SHA block is intentionally the sole machine-checkable coverage
list. It contains all 20 original commits once, in `--reverse` history order.

## Exact Changed-Path Inventory

### P01 - `221137273ac0ac565c540af857ab6a0745d981ac` (43 added task-plan paths)

```text
.trellis/tasks/07-25-upstream-compat-architecture/check.jsonl
.trellis/tasks/07-25-upstream-compat-architecture/design.md
.trellis/tasks/07-25-upstream-compat-architecture/implement.jsonl
.trellis/tasks/07-25-upstream-compat-architecture/implement.md
.trellis/tasks/07-25-upstream-compat-architecture/prd.md
.trellis/tasks/07-25-upstream-compat-architecture/research/current-compatibility-baseline.md
.trellis/tasks/07-25-upstream-compat-architecture/task.json
.trellis/tasks/07-25-upstream-core-delta-governance/check.jsonl
.trellis/tasks/07-25-upstream-core-delta-governance/design.md
.trellis/tasks/07-25-upstream-core-delta-governance/implement.jsonl
.trellis/tasks/07-25-upstream-core-delta-governance/implement.md
.trellis/tasks/07-25-upstream-core-delta-governance/prd.md
.trellis/tasks/07-25-upstream-core-delta-governance/task.json
.trellis/tasks/07-25-upstream-dom-traversal-port/check.jsonl
.trellis/tasks/07-25-upstream-dom-traversal-port/design.md
.trellis/tasks/07-25-upstream-dom-traversal-port/implement.jsonl
.trellis/tasks/07-25-upstream-dom-traversal-port/implement.md
.trellis/tasks/07-25-upstream-dom-traversal-port/prd.md
.trellis/tasks/07-25-upstream-dom-traversal-port/task.json
.trellis/tasks/07-25-upstream-image-pipeline/check.jsonl
.trellis/tasks/07-25-upstream-image-pipeline/design.md
.trellis/tasks/07-25-upstream-image-pipeline/implement.jsonl
.trellis/tasks/07-25-upstream-image-pipeline/implement.md
.trellis/tasks/07-25-upstream-image-pipeline/prd.md
.trellis/tasks/07-25-upstream-image-pipeline/task.json
.trellis/tasks/07-25-upstream-patch-retirement/check.jsonl
.trellis/tasks/07-25-upstream-patch-retirement/design.md
.trellis/tasks/07-25-upstream-patch-retirement/implement.jsonl
.trellis/tasks/07-25-upstream-patch-retirement/implement.md
.trellis/tasks/07-25-upstream-patch-retirement/prd.md
.trellis/tasks/07-25-upstream-patch-retirement/task.json
.trellis/tasks/07-25-upstream-text-font-correctness/check.jsonl
.trellis/tasks/07-25-upstream-text-font-correctness/design.md
.trellis/tasks/07-25-upstream-text-font-correctness/implement.jsonl
.trellis/tasks/07-25-upstream-text-font-correctness/implement.md
.trellis/tasks/07-25-upstream-text-font-correctness/prd.md
.trellis/tasks/07-25-upstream-text-font-correctness/task.json
.trellis/tasks/07-25-vanilla-upstream-adapter-fallback/check.jsonl
.trellis/tasks/07-25-vanilla-upstream-adapter-fallback/design.md
.trellis/tasks/07-25-vanilla-upstream-adapter-fallback/implement.jsonl
.trellis/tasks/07-25-vanilla-upstream-adapter-fallback/implement.md
.trellis/tasks/07-25-vanilla-upstream-adapter-fallback/prd.md
.trellis/tasks/07-25-vanilla-upstream-adapter-fallback/task.json
```

### P02 - `41ff3991d65bf54e915b52df52dafa074cff6b7b`

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

### P03 - `05a11c2283c1659498aba2371d58921f1b5de526` (renames)

```text
.trellis/tasks/07-25-upstream-core-delta-governance/check.jsonl -> .trellis/tasks/archive/2026-07/07-25-upstream-core-delta-governance/check.jsonl
.trellis/tasks/07-25-upstream-core-delta-governance/design.md -> .trellis/tasks/archive/2026-07/07-25-upstream-core-delta-governance/design.md
.trellis/tasks/07-25-upstream-core-delta-governance/implement.jsonl -> .trellis/tasks/archive/2026-07/07-25-upstream-core-delta-governance/implement.jsonl
.trellis/tasks/07-25-upstream-core-delta-governance/implement.md -> .trellis/tasks/archive/2026-07/07-25-upstream-core-delta-governance/implement.md
.trellis/tasks/07-25-upstream-core-delta-governance/prd.md -> .trellis/tasks/archive/2026-07/07-25-upstream-core-delta-governance/prd.md
.trellis/tasks/07-25-upstream-core-delta-governance/task.json -> .trellis/tasks/archive/2026-07/07-25-upstream-core-delta-governance/task.json
```

### P04 - `6a9675f6a86f6d3bf12038fc3abf3b5f640c376a`

```text
.trellis/workspace/kino/index.md
.trellis/workspace/kino/journal-1.md
```

### P05 - `86a83e9f33c202b506be6728bb4bcc4fef1a9d11`

```text
.github/workflows/ci.yml
internal/browser-capture-adapter/package.json
internal/browser-capture-adapter/src/bridges/dom-to-figma.test.ts
internal/browser-capture-adapter/src/bridges/dom-to-figma.ts
package.json
scripts/check-vanilla-upstream-adapter.mjs
```

### P06 - `f874f03fa656fc22d47cbbd47c07d8b335d261d9`

```text
.trellis/spec/dom-to-figma/frontend/staged-resource-pipeline.md
.trellis/tasks/07-25-vanilla-upstream-adapter-fallback/implement.md
.trellis/tasks/07-25-vanilla-upstream-adapter-fallback/prd.md
.trellis/tasks/07-25-vanilla-upstream-adapter-fallback/task.json
docs/fork-maintenance.md
internal/browser-capture-adapter/README.md
```

### P07 - `e36cc144986f9336f8a04f37a2374b8ce1a78b18` (renames)

```text
.trellis/tasks/07-25-vanilla-upstream-adapter-fallback/check.jsonl -> .trellis/tasks/archive/2026-07/07-25-vanilla-upstream-adapter-fallback/check.jsonl
.trellis/tasks/07-25-vanilla-upstream-adapter-fallback/design.md -> .trellis/tasks/archive/2026-07/07-25-vanilla-upstream-adapter-fallback/design.md
.trellis/tasks/07-25-vanilla-upstream-adapter-fallback/implement.jsonl -> .trellis/tasks/archive/2026-07/07-25-vanilla-upstream-adapter-fallback/implement.jsonl
.trellis/tasks/07-25-vanilla-upstream-adapter-fallback/implement.md -> .trellis/tasks/archive/2026-07/07-25-vanilla-upstream-adapter-fallback/implement.md
.trellis/tasks/07-25-vanilla-upstream-adapter-fallback/prd.md -> .trellis/tasks/archive/2026-07/07-25-vanilla-upstream-adapter-fallback/prd.md
.trellis/tasks/07-25-vanilla-upstream-adapter-fallback/task.json -> .trellis/tasks/archive/2026-07/07-25-vanilla-upstream-adapter-fallback/task.json
```

### P08 - `342559a0cea78a2b55327f3b23ed17561749089d`

```text
.trellis/workspace/kino/index.md
.trellis/workspace/kino/journal-1.md
```

### P09 - `afd3a84d91f52315f20ca3b828ff54293140b8fc`

```text
.trellis/spec/dom-to-figma/frontend/architecture.md
.trellis/tasks/07-25-upstream-dom-traversal-port/delta-map.md
.trellis/tasks/07-25-upstream-dom-traversal-port/implement.md
.trellis/tasks/07-25-upstream-dom-traversal-port/prd.md
.trellis/tasks/07-25-upstream-dom-traversal-port/task.json
.trellis/tasks/07-25-upstream-dom-traversal-port/upstream-pr.md
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

### P10 - `3db12cb9266c01bc7adddfb4492cb1b9d79d6866` (renames)

```text
.trellis/tasks/07-25-upstream-dom-traversal-port/check.jsonl -> .trellis/tasks/archive/2026-07/07-25-upstream-dom-traversal-port/check.jsonl
.trellis/tasks/07-25-upstream-dom-traversal-port/delta-map.md -> .trellis/tasks/archive/2026-07/07-25-upstream-dom-traversal-port/delta-map.md
.trellis/tasks/07-25-upstream-dom-traversal-port/design.md -> .trellis/tasks/archive/2026-07/07-25-upstream-dom-traversal-port/design.md
.trellis/tasks/07-25-upstream-dom-traversal-port/implement.jsonl -> .trellis/tasks/archive/2026-07/07-25-upstream-dom-traversal-port/implement.jsonl
.trellis/tasks/07-25-upstream-dom-traversal-port/implement.md -> .trellis/tasks/archive/2026-07/07-25-upstream-dom-traversal-port/implement.md
.trellis/tasks/07-25-upstream-dom-traversal-port/prd.md -> .trellis/tasks/archive/2026-07/07-25-upstream-dom-traversal-port/prd.md
.trellis/tasks/07-25-upstream-dom-traversal-port/task.json -> .trellis/tasks/archive/2026-07/07-25-upstream-dom-traversal-port/task.json
.trellis/tasks/07-25-upstream-dom-traversal-port/upstream-pr.md -> .trellis/tasks/archive/2026-07/07-25-upstream-dom-traversal-port/upstream-pr.md
```

### P11 - `057bf235f7e3fb48c92cba770ee433985bf56bf3`

```text
.trellis/workspace/kino/index.md
.trellis/workspace/kino/journal-1.md
```

### P12 - `d8456cd5a435edb8c1a96d2d4a35fb0e878d931d`

```text
packages/dom-to-figma/src/converter/font-cache.test.ts
packages/dom-to-figma/src/converter/nodes/text/primitives/font/loader.test.ts
packages/dom-to-figma/src/figma.text.browser.test.ts
```

### P13 - `0c1616e35048b38b296f29426dfd2989e70234e0`

```text
.trellis/spec/dom-to-figma/frontend/rendering-contracts.md
.trellis/tasks/07-25-upstream-text-font-correctness/delta-map.md
.trellis/tasks/07-25-upstream-text-font-correctness/implement.md
.trellis/tasks/07-25-upstream-text-font-correctness/prd.md
.trellis/tasks/07-25-upstream-text-font-correctness/task.json
.trellis/tasks/07-25-upstream-text-font-correctness/upstream-pr.md
.trellis/tasks/07-25-upstream-text-font-correctness/verification.md
docs/upstream-core-delta.json
```

### P14 - `4de033b1391c7ba034821f2bff1c4da25ac4b97e` (renames)

```text
.trellis/tasks/07-25-upstream-text-font-correctness/check.jsonl -> .trellis/tasks/archive/2026-07/07-25-upstream-text-font-correctness/check.jsonl
.trellis/tasks/07-25-upstream-text-font-correctness/delta-map.md -> .trellis/tasks/archive/2026-07/07-25-upstream-text-font-correctness/delta-map.md
.trellis/tasks/07-25-upstream-text-font-correctness/design.md -> .trellis/tasks/archive/2026-07/07-25-upstream-text-font-correctness/design.md
.trellis/tasks/07-25-upstream-text-font-correctness/implement.jsonl -> .trellis/tasks/archive/2026-07/07-25-upstream-text-font-correctness/implement.jsonl
.trellis/tasks/07-25-upstream-text-font-correctness/implement.md -> .trellis/tasks/archive/2026-07/07-25-upstream-text-font-correctness/implement.md
.trellis/tasks/07-25-upstream-text-font-correctness/prd.md -> .trellis/tasks/archive/2026-07/07-25-upstream-text-font-correctness/prd.md
.trellis/tasks/07-25-upstream-text-font-correctness/task.json -> .trellis/tasks/archive/2026-07/07-25-upstream-text-font-correctness/task.json
.trellis/tasks/07-25-upstream-text-font-correctness/upstream-pr.md -> .trellis/tasks/archive/2026-07/07-25-upstream-text-font-correctness/upstream-pr.md
.trellis/tasks/07-25-upstream-text-font-correctness/verification.md -> .trellis/tasks/archive/2026-07/07-25-upstream-text-font-correctness/verification.md
```

### P15 - `ed8b382659ab3e1738af1c1f465561671318c55d`

```text
.trellis/workspace/kino/index.md
.trellis/workspace/kino/journal-1.md
```

### P16 - `aa6bbdca31f412753e57452d4bca1f57feeb12e4`

```text
deleted: .changeset/staged-resource-pipeline.md
packages/dom-to-figma/README.md
packages/dom-to-figma/src/converter/image-cache.ts
deleted: packages/dom-to-figma/src/converter/image-preparation.ts
packages/dom-to-figma/src/converter/nodes/image/converter.ts
packages/dom-to-figma/src/figma.image.browser.test.ts
packages/dom-to-figma/src/figma.ts
```

### P17 - `e8d928a9c1dff86afb871b43378710ec02116784`

```text
packages/dom-to-figma/src/converter/nodes/image/loader.test.ts
packages/dom-to-figma/src/converter/nodes/image/loader.ts
packages/dom-to-figma/src/converter/nodes/image/presentation.test.ts
packages/dom-to-figma/src/converter/nodes/image/presentation.ts
```

### P18 - `cd3f0ded9f5505597d861949970cdd1c896db646`

```text
.trellis/spec/dom-to-figma/frontend/staged-resource-pipeline.md
docs/upstream-core-delta.json
```

### P19 - `9be7c216b00f63c29dac1999745411a4848e9980`

```text
deleted: .trellis/tasks/07-25-upstream-image-pipeline/implement.md
.trellis/tasks/07-25-upstream-image-pipeline/check.jsonl -> .trellis/tasks/archive/2026-07/07-25-upstream-image-pipeline/check.jsonl
.trellis/tasks/07-25-upstream-image-pipeline/design.md -> .trellis/tasks/archive/2026-07/07-25-upstream-image-pipeline/design.md
.trellis/tasks/07-25-upstream-image-pipeline/implement.jsonl -> .trellis/tasks/archive/2026-07/07-25-upstream-image-pipeline/implement.jsonl
added: .trellis/tasks/archive/2026-07/07-25-upstream-image-pipeline/implement.md
.trellis/tasks/07-25-upstream-image-pipeline/prd.md -> .trellis/tasks/archive/2026-07/07-25-upstream-image-pipeline/prd.md
added: .trellis/tasks/archive/2026-07/07-25-upstream-image-pipeline/research/image-delta-inventory.md
added: .trellis/tasks/archive/2026-07/07-25-upstream-image-pipeline/research/upstream-pr-drafts.md
.trellis/tasks/07-25-upstream-image-pipeline/task.json -> .trellis/tasks/archive/2026-07/07-25-upstream-image-pipeline/task.json
```

### P20 - `bac116ad8a7ac18812cfa6af72b140c45c6dbf83`

```text
.trellis/workspace/kino/index.md
.trellis/workspace/kino/journal-1.md
```

## Handoff To Follow-Up Tasks

- **Target review:** C1, C3, C4, and C5 each change
  `docs/upstream-core-delta.json`; compare every affected capability against a
  freshly resolved stable and upstream-main target before refreshing a
  fingerprint or deciding that any local patch can retire.
- **Validation:** rerun the C2 fallback consumer contract before C5, then run
  focused C3/C4/C5 tests on the approved fork base. Historical counts and
  local drafts must not be treated as current CI.
- **PR preparation:** build candidate diffs from the keep/split guidance,
  never as a whole `origin/main..main` PR. Exclude journal and task-archive
  paths unless the PR explicitly exists to preserve Trellis provenance.

## Audit Validation Record

- `git rev-list --count origin/main..main` returned `20`.
- The canonical SHA block contains the same 20 full SHA values in Git's
  oldest-to-newest order, with no duplicate or omitted value.
- The cohort totals are `4 + 4 + 3 + 4 + 5 = 20`.
- The path inventories P01-P20 were transcribed from
  `git log --reverse --name-status origin/main..main`; rename and deletion
  statuses are retained where Git reported them.
- The approved ref/topology snapshot matched exactly, so no stop condition was
  triggered.
