# Implementation Plan: BG2 lazy background source rebuild

## Preflight And Preservation

1. Fetch/refresh only when separately authorized by the execution step, then
   pin exact `origin/main` SHA and prove `92c8452f` remains its ancestor.
2. Record root branch/HEAD, staged paths, dirty tracked-file hashes, index hash,
   and worktree occupancy. Do not clean, stash, normalize, or edit the root.
3. Create one isolated `task/rebuild-bg2-lazy-background-sources` worktree from
   the refreshed target. Stop if target drift changes the planned contracts.
4. Reinspect S46/S47 as evidence and produce a current-baseline file/symbol
   delta. Do not cherry-pick or copy the historical patch wholesale.

## Implementation

5. Add the pure adapter-owned `data-bgset` resolver with plain, `-xs-`, width,
   density, base-URL, malformed-input, and scheme tests.
6. Extend the current BG1 inventory with capture-local background owner/source
   mappings only when computed CSS has no image layer. Reuse canonical URL
   deduplication and the existing background usage kind.
7. Thread the read-only map through capture engine and conversion bridge;
   guarantee success/failure/abort/reset cleanup and stale-context isolation.
8. Add the smallest generic optional core resolver needed to feed a frozen CSS
   expression into the existing BG1 snapshot/paint pipeline. Preserve computed
   CSS precedence and direct-consumer behavior.
9. Add adapter/core browser coverage for IMAGE output, ordering, deduplication,
   placeholders, stable-core unsupported behavior, cancellation, and no late
   fetch or DOM mutation.
10. Add or update only the direct extension regression fixture required to
    prove an offscreen eyeondesign-shaped owner is captured without activation.
11. If core runtime/public API changed, add the correct changeset, update the
    staged-resource contract, and refresh the governed delta entry/fingerprint.
    Reject unrelated manifests, lockfiles, release workflow, or package moves.

## Validation And Review Gates

12. Run directed Biome checks on every touched file, followed by:

```powershell
pnpm --filter @aakkino/dom-to-figma test
pnpm --filter @aakkino/dom-to-figma check-types
pnpm --filter @aakkino/dom-to-figma build
pnpm --filter @figit/browser-capture-adapter test
pnpm --filter @figit/browser-capture-adapter check-types
pnpm --filter @figit/browser-capture-adapter build
pnpm --filter extension test
pnpm --filter extension check-types
pnpm --filter extension build
pnpm --filter extension build:firefox
pnpm upstream-core-delta:check
pnpm test:upstream-core-delta
git diff --check
```

13. Run stable and pinned-main adapter compatibility gates required by the
    staged-resource spec. Run `pnpm oracle:parity` if rendering behavior, oracle
    scenes, or the existing BG1 path changes; do not relax findings or update a
    baseline merely to pass.
14. Audit the final diff against the BG2 boundary and verify the root/worktree
    preservation snapshot is unchanged.
15. Complete independent Trellis quality review and commit the reviewed local
    delivery. Record the exact reviewed head and prove the worktree is clean.

## Remote Promotion And Containment

16. Refresh the remote base without mutating the dirty root. Verify the reviewed
    BG2 head is still an exact, conflict-free, scope-correct delta over current
    `origin/main`; target drift returns to review/planning.
17. Prepare pre-push evidence: reviewed head, exact file/payload list, validation
    results, root/worktree preservation, rollback command, intended remote
    branch, and intended `main` base.
18. Obtain explicit push authorization, then push only the immutable reviewed
    BG2 source-branch head. Verify the remote head equals the reviewed local
    head; do not force-push or push directly to `main`.
19. Prepare the PR title/body with scope, evidence-only source commits,
    validation, exclusions, rollback, and target identity. Obtain explicit PR
    authorization, then create or update one PR targeting `main`.
20. Monitor required CI and review to terminal success. Reconcile actionable
    findings through the normal implementation/check loop; never weaken tests,
    compatibility, oracle, or protection rules to make the PR mergeable.
21. Revalidate PR head/base, exact payload, approvals, required checks, merge
    method, and root/worktree preservation. Obtain explicit merge authorization,
    then merge with a merge commit; no auto-merge or protection bypass.
22. Refresh `origin/main` and prove it contains both the reviewed BG2 head and
    the merge commit. Record PR URL, reviewed head, merge commit, final main SHA,
    exact payload, rollback evidence, and remote source-branch state.
23. Reconcile this task, `08-28-execute-approved-sync-cherry-picks`, and
    `08-28-govern-sync-branch-cherry-picks` to the same merged-and-contained
    state. Only then may BG2 be archived and reported complete.

## Stop Conditions

- Refreshed `origin/main` no longer contains the reviewed BG1 head or materially
  changes its inventory, capability, prepared-only, or rendering contracts.
- Correct BG2 behavior requires lazy activation/scrolling, arbitrary metadata,
  extension permission/messaging/storage/UI changes, or package/release churn.
- Validation would require weakening BG1, compatibility, oracle, cancellation,
  privacy, or prepared-only guarantees.
- The isolated worktree cannot be created without disturbing the dirty root or
  another linked worktree.
- The remote branch differs from the reviewed head; the PR contains an
  unexpected file/commit; required CI/review is not successful; branch
  protection blocks the approved merge method; or refreshed `origin/main`
  cannot prove containment.

Any stop condition returns to planning with exact evidence; it does not grant
scope expansion.
