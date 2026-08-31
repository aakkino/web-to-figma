# 上游核心差异治理实施计划

## Dependencies

None. This is the first implementation task under the parent architecture.

## Step 1: Confirm The Baselines

- [x] Identify the latest stable upstream release from an authoritative source and pin its exact version.
- [x] Fetch read-only refs when explicitly executing the task and resolve `upstream/main` to a SHA.
- [x] Recompute the current production/test diff inventory from the common baseline.

## Step 2: Build The Registry

- [x] Map the six known capability groups and originating commits to exact runtime paths.
- [x] Add owner, tests, upstream state, review date, and removal condition for every entry.
- [x] Generate and review deterministic fingerprints.
- [x] Reject broad or ambiguous entries.

## Step 3: Add The Local Gate

- [x] Implement inventory, classification, fingerprint verification, expiry checks, and readable diagnostics.
- [x] Add unit tests for new files, changed allowed files, test-only files, malformed entries, and stale refs.
- [x] Expose one root package command that performs the same check as CI.

## Step 4: Add Compatibility Jobs

- [x] Add fork workspace and pinned stable-upstream blocking jobs.
- [x] Add the resolved `upstream/main` advisory job for ordinary PRs.
- [x] Make the same main snapshot blocking for `sync/upstream-*` PRs.
- [x] Upload the delta report and resolved versions as CI artifacts.

## Step 5: Document And Verify

- [x] Update `docs/fork-maintenance.md` with the registry update and exception workflow.
- [x] Deliberately introduce a temporary unauthorized delta in an isolated test repository and prove the gate fails; remove it afterward.
- [x] Run `pnpm lint`, `pnpm check-types`, `pnpm build`, `pnpm test`, and `pnpm oracle:parity`.

Verification note: the main Windows checkout has pre-existing CRLF formatting
across tracked files, so the unchanged root lint command was also run against
an LF local clone containing this task's changes; it passed 353 files. The
current task files pass targeted Biome checks in the working tree.

## Exit Condition

All current runtime differences are registered and any future unregistered or silently expanded core patch is blocked before merge. No downstream child starts implementation until this condition is reviewed.
