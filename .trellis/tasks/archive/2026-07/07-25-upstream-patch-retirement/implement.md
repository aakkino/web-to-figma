# 上游补丁退役与版本治理实施计划

## Dependencies

- `07-25-upstream-core-delta-governance` complete.
- `07-25-vanilla-upstream-adapter-fallback` complete.
- Verified outputs from DOM traversal, image, and text/font tasks.
- For any deletion, the equivalent change must exist in the exact upstream baseline being consumed.

## Step 1: Select A Retirement Candidate

- [ ] Choose one capability whose removal condition is satisfied.
- [ ] Record exact upstream version/commit and compare public/internal API shape.
- [ ] Confirm focused tests exercise every behavior the local patch currently supplies.

## Step 2: Prepare Safe Intake

- [ ] Refresh `origin/main` with fast-forward-only semantics and create `sync/upstream-YYYYMMDD` from fork `main`.
- [ ] Review upstream commits and choose targeted cherry-pick by default; use a broad merge only for a coherent reviewed intake.
- [ ] Record textual and semantic conflicts before resolving them.

## Step 3: Adapt Then Remove

- [ ] Adapt the bridge or internal callers to the upstream API in an isolated commit.
- [ ] Run local-versus-upstream shadow comparison.
- [ ] Remove the duplicate patch or obsolete shim in a separate reversible commit.
- [ ] Update tests only for intentional, reviewed semantic differences.

## Step 4: Update Governance Surfaces

- [ ] Retire or revise the registry entry and recompute the delta report.
- [ ] Update version ranges, lockfiles, changesets, and maintenance documentation.
- [ ] Record movement toward `20 -> <=10 -> <=5 -> near 0` without weakening tests.

## Step 5: Run Gates

- [ ] Run focused package and adapter/extension integration tests.
- [ ] Run `pnpm lint`, `pnpm check-types`, `pnpm build`, `pnpm test`, and `pnpm oracle:parity`.
- [ ] Require the stable matrix and sync-PR `upstream/main` matrix to pass.
- [ ] Roll back only the failing capability retirement if equivalence is not proven.

## Step 6: Repeat And Close

- [ ] Repeat for each independently eligible capability.
- [ ] List retained patches with owner, blocker, review date, and next upstream action.
- [ ] Submit the sync PR to the fork only under the repository's normal approval workflow.
- [ ] Do not publish any upstream PR or branch without separate explicit user approval.

## Exit Condition

All eligible duplicate patches are removed, all retained patches are justified and time-bounded, package compatibility claims match tested versions, and full product behavior remains at or above the baseline.

## Execution Log

### 2026-07-26 Candidate Audit

- [x] Refreshed `origin` and `upstream` without merging or rebasing.
- [x] Verified npm `latest` remains `@figit/dom-to-figma@0.2.1` at `0bf06ecce52aabc2bc696980b83040860630e35f`.
- [x] Reviewed the new `upstream/main` head `cc8d4864e6be53d0d5047fbf97283b112b3117f4`.
- [x] Compared upstream PR #32's `object-fit` mapping with the registered `image-presentation` capability.
- [x] Rejected retirement because the reviewed upstream baseline lacks equivalent `object-position`, `none`, `scale-down`, and intrinsic-dimension behavior.
- [x] Recorded the exact evidence and retained-patch blockers in `research/candidate-audit-2026-07-26.md`.
- [x] Re-run the refreshed upstream-main report and governance gates.
- [x] Run the full workspace and oracle gates before closing this child; root lint passed in an isolated LF checkout with the task diff applied, while the primary Windows checkout remains affected by its nested `.tmp` config and CRLF baseline.
- [x] Updated the upstream compatibility code-spec with partial-overlap retirement rules.
