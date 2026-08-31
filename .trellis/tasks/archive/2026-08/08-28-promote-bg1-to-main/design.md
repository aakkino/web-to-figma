# Design: Promote BG1 to main

## Promotion Topology

```text
origin/main@dd91f183
  -> 30d33b9 BG1 implementation
  -> 5b906e2 governance fingerprint
  -> 312c838 lint-only Oracle CSS declaration reorder
  -> <new-sha> stable scene-manifest snapshot correction
  -> ordinary update push of task/rebuild-bg1-css-raster-backgrounds
  -> existing PR #14 targeting main, then authorized body synchronization
  -> material CI + independent review
  -> explicitly authorized merge commit
  -> refreshed origin/main containment proof
  -> BG2 remains deferred until separate approval
```

The first three source commits remain immutable. The isolated source worktree
may receive exactly one fourth commit containing the approved stable manifest
object. The dirty sync root is evidence only and is never an execution context.

## Identity Contract

Five identities must remain distinct and recorded:

- base: the exact `origin/main` SHA used by the final PR head;
- original reviewed head: `5b906e214241300edd4beff08dfb67313005bbf2`;
- interim corrected head: `312c8389ee25eca74e653178fba5b9bb85ae8f7e`;
- final corrected reviewed head: the SHA of the independently reviewed fourth
  commit;
- merge result: the GitHub merge-commit SHA and the refreshed `origin/main` SHA.

Before the first push, the base must still be
`dd91f18346d7326ab71c1a77769bfe7aed310af3`. Any drift invalidates the current
promotion plan. After PR creation, any base or head drift pauses the task until
the resulting topology and validation obligations are replanned.

The fourth-commit contract is a one-file, snapshot-object-only diff. It adds the
new scene's stable `320x180` manifest identity in sorted position and may not
change any other snapshot, scene, expectation, baseline, tolerance, or product
behavior. The final corrected head becomes promotable only after exact-diff
review and the complete local validation gate pass.

## Approval Gates

Task activation permits only read-only preflight and local validation. Remote
state transitions remain separately gated:

1. ordinary branch push;
2. PR creation and later material PR-body/head updates;
3. merge after final CI and review evidence.

No earlier approval implies a later gate. Polling CI and reading GitHub metadata
are read-only and may continue without additional authorization.

## Validation And Review

Local validation binds the committed tree to the actual base. CI then provides
Linux and protected-branch evidence for the repository gate, core-delta
governance, stable compatibility, upstream-main compatibility, and Tier-0
parity. The upstream-main job is advisory at workflow level for ordinary PRs,
but remains a task-level promotion requirement because BG1 changes the governed
published core and private adapter together.

The pkg.pr.new job is not a branch-protection requirement. A permissions or App
installation failure is recorded as advisory only after the repository build
has passed and the failure is unrelated to package correctness.

## Merge And Rollback

Use GitHub's merge-commit method. This preserves the two original source commits
and both correction commits as ancestors and produces a single target-line
rollback identity. Before merge,
rollback is remote branch/PR closure without touching `main`. After merge,
rollback is a reviewed revert of the merge commit; never rewrite `main`.

Containment requires both:

```powershell
git merge-base --is-ancestor <final-corrected-reviewed-head> origin/main
git merge-base --is-ancestor <merge-commit-sha> origin/main
```

The promotion record also compares the final tree and PR file list to the
approved 23-file corrected BG1 payload and records any GitHub-generated merge
metadata.

## Governance Reconciliation

On successful containment, record `branch`, reviewed `commit`, `pr_url`, merge
commit, final main SHA, check conclusions, and rollback in this task. Update the
archived BG1 task's promotion metadata and both active governance parents. Do
not mark BG2 approved; promotion completion only satisfies its dependency gate.
