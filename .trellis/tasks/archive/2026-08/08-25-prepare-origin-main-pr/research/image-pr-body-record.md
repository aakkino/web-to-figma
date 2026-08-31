## Scope

Promote the reviewed C5 image cohort onto the current `main` base. This change
moves image resource preparation to the adapter-owned lifecycle, retains the
reviewed object-fit/object-position and cancellation behavior, and updates the
associated public documentation, tests, and upstream-governance record.

## Curated Mapping

```text
original aa6bbdca31f412753e57452d4bca1f57feeb12e4
+ original e8d928a9c1dff86afb871b43378710ec02116784
+ original cd3f0ded9f5505597d861949970cdd1c896db646
  -> prior curated 61888631fb9059f1c8cbb7d2d97e2ab03a105a6d
  -> current-base curated 5f85e2b1c29a3c69e37836bbf58f7f1c4d0342b1
```

- Base: `9839c7e89ab9b7b146a0ccacaf34516887fb6e0a`
- Head: `5f85e2b1c29a3c69e37836bbf58f7f1c4d0342b1`
- Review unit: 1 commit, 13 files, 190 insertions, 530 deletions
- All retained head blobs, both deletion states, and the stable patch ID
  exactly match the approved prior curated C5 content.

The approved unit deliberately keeps API retirement, adapter fallback,
presentation/cancellation behavior, and ownership governance together. It must
remain one review and rollback unit.

## Deletions And Exclusions

The approved deletions are:

- `.changeset/staged-resource-pipeline.md`
- `packages/dom-to-figma/src/converter/image-preparation.ts`

The branch contains no `.trellis/tasks` or `.trellis/workspace` content, no C5
archive or journal commits, and no commits from the 47-commit
`sync/upstream-20260726`-only range.

## Local Validation

All candidate gates completed successfully on the current-base curated head:

- Focused image/object-fit/resource tests: 19/19.
- Adapter bridge tests: 9/9.
- Repository lint: 356 files.
- Type-check and build: 8 projects each.
- Workspace tests: 406 passed, 5 skipped, 0 failed.
- Tier-0 oracle parity: 46 scenes passed.
- Governance: 14 runtime paths, 8 test paths, 0 unmapped runtime paths.
- Stable target: `@figit/dom-to-figma@0.2.4` at `859efea8...`; stable adapter
  passed.
- Upstream-main target: `859efea8...`.
- Diff whitespace check passed; focused and full governance reports are
  byte-identical.

The first stable `--verify-latest` attempt encountered an npm registry connect
timeout and returned exit 1. The exact command was rerun without any candidate
or environment change and passed; every subsequent compatibility gate passed.

GitHub's repository, Tier-0, governance, stable, and upstream-main project
gates completed successfully, including both required checks. The optional
`Publish to pkg.pr.new` Preview failed with HTTP 404 because the pkg-pr-new App
is not installed; it is not a required or project compatibility gate.
Independent review is complete, and merge still requires separate explicit
authorization.

## Rollback

Revert the single curated commit
`5f85e2b1c29a3c69e37836bbf58f7f1c4d0342b1` to roll back C5 as one unit. Do
not split API restoration from the adapter fallback, image presentation and
cancellation behavior, or governance record. The already merged C1+C2, C3,
and C4 units are outside this rollback.
