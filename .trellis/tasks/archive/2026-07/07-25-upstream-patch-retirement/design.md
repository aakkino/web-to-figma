# 上游补丁退役与版本治理设计

## Retirement State Machine

```text
registered local patch
  -> upstream-ready
  -> upstream accepted
  -> present in selected consumable baseline
  -> adapter/API migration proven
  -> local duplicate removed
  -> registry entry retired
```

Skipping a state is not allowed. In particular, "upstream accepted" is not enough when the fork has not consumed a baseline containing the implementation.

## Unit Of Retirement

Retire by capability, not by historical commit or directory. A capability retirement includes:

- exact upstream version/commit evidence;
- API-shape comparison;
- focused behavior tests;
- adapter or package migration;
- deletion of duplicate runtime code;
- fixture/snapshot review;
- registry and documentation update.

One commit should normally adapt to the upstream API and a following commit should remove the compatibility shim. If the upstream API is already identical, a single deletion commit is acceptable when still independently reversible.

## Branch And Intake Model

Create the sync branch from current fork `main`, then review or cherry-pick upstream changes according to `docs/fork-maintenance.md`. Never pull upstream directly into `main`, never rebase published fork history, and never use GitHub's automatic Sync Fork action.

The sync PR records:

- resolved upstream refs and selected commits;
- conflict resolutions and semantic decisions;
- capabilities newly provided upstream;
- patches retained and why;
- compatibility matrix and parity evidence.

## Shadow Comparison

Before deletion, run the local and upstream-backed implementations against the same fixtures and compare normalized converter documents, resource decisions, and oracle scores. Differences require semantic review; byte identity is not always required when normalized behavior is equivalent.

## Version Governance

Update these surfaces together where applicable:

- converter package version and changelog/changeset;
- adapter peer dependency range;
- workspace and published-consumer lockfiles;
- compatibility registry baseline;
- fork maintenance documentation.

A wider peer range is allowed only after actual matrix evidence at both ends. Do not claim compatibility based only on structural TypeScript compilation.

## Rollback

Each capability retirement has its own rollback point. If full or focused tests fail, restore only that patch or compatibility shim, keep its registry entry active, and record the missing upstream behavior. Other independently passing retirements may continue.
