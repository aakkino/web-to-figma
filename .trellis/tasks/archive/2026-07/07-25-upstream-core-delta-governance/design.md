# 上游核心差异治理设计

## Proposed Artifacts

- `docs/upstream-core-delta.json`: machine-readable authorized delta registry.
- `scripts/check-upstream-core-delta.mjs`: deterministic inventory and enforcement command.
- `docs/fork-maintenance.md`: human workflow, review policy, and budget interpretation.
- `.github/workflows/ci.yml`: blocking and advisory matrix wiring.
- root `package.json`: stable local command used by developers and CI.

Exact filenames may be adjusted during implementation if existing repository conventions require it, but the registry, local command, documentation, and CI integration are all required deliverables.

## Registry Model

The registry has a resolved baseline commit and an array of capability entries. Each entry includes:

```json
{
  "id": "staged-image-preparation",
  "paths": ["packages/dom-to-figma/src/converter/image-preparation.ts"],
  "originCommits": ["4da4c51"],
  "classification": "generic-temporary-patch",
  "tests": ["packages/dom-to-figma/src/figma.image.browser.test.ts"],
  "owner": "abskino",
  "reviewBy": "YYYY-MM-DD",
  "upstreamState": "pr-draft-pending",
  "removeWhen": "selected upstream baseline exposes equivalent behavior",
  "patchFingerprint": "..."
}
```

The fingerprint is derived deterministically from the registered path diff against the resolved baseline. This makes edits inside an already allowed file visible; path-only allowlists are insufficient. Registry updates are ordinary reviewed changes and must explain why the fingerprint changed.

## Inventory Algorithm

1. Resolve the configured base to a commit and print it.
2. List changed files under `packages/dom-to-figma/src`.
3. Classify runtime files separately from tests, fixtures, and snapshots.
4. Match every runtime path to exactly one or more explicit capability entries.
5. Recompute entry fingerprints using stable, normalized Git diff output.
6. Fail on unmatched runtime paths, stale fingerprints, expired entries, or malformed ownership/removal metadata.
7. Emit a human summary and a machine-readable CI artifact.

Overlapping capability entries are allowed only when the same file genuinely contains separate patches, and must be explicit. Broad globs such as the entire converter directory are rejected.

## Matrix Policy

The compatibility workflow has three logical targets:

| Target | Regular PR | `sync/upstream-*` PR |
| --- | --- | --- |
| Fork workspace | blocking | blocking |
| Latest stable upstream package | blocking | blocking |
| Resolved `upstream/main` | advisory | blocking |

The main-branch target may fail without blocking ordinary feature work, but the CI summary must remain visible and create actionable output. Branch detection must not turn untrusted branch names into executable commands.

## Budget Semantics

The headline metric is changed runtime source files, supplemented by insertions/deletions and capability count. Milestones are reporting targets, not permission to remove behavior. A missed milestone with registered, tested blockers is acceptable; an unregistered delta is not.

## Security And Reproducibility

- Never execute values from registry fields.
- Resolve Git refs before comparison and include the SHA in output.
- Keep registry ordering stable for reviewable diffs.
- Do not require write access to upstream or mutate the working branch.
- Network-dependent version resolution must be pinned before the test job runs.
