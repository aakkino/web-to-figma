## Scope

Promote the reviewed C4 font/text regression cohort onto the current `main`
base. This change adds focused coverage for glyph-aware font fallback and
records its rendering and upstream-governance contracts; it does not add a new
font runtime implementation.

## Curated Mapping

```text
original d8456cd5a435edb8c1a96d2d4a35fb0e878d931d
+ split original 0c1616e35048b38b296f29426dfd2989e70234e0
  -> prior curated ac538479b40daed491b8739f7056beb46355e434
  -> current-base curated 16ea58b5681f2c599044c9fc257b04543b717103
```

- Base: `8291c6b1a8ab2d8e9e29e4cc567f4286a20415f2`
- Head: `16ea58b5681f2c599044c9fc257b04543b717103`
- Review unit: 1 commit, 5 files, 172 insertions, 4 deletions
- All five head blobs and the stable patch ID exactly match the approved prior
  curated C4 content, replayed onto the current base without conflicts.

## Exclusions

- No C5 image-pipeline cohort content.
- No `.trellis/tasks` or `.trellis/workspace` content.
- No task planning or handoff paths from the split original commit.
- No commits from the 47-commit `sync/upstream-20260726`-only range.

## Local Validation

All commands completed successfully on the current-base curated head:

- Focused font/text tests: 18/18.
- Adapter bridge tests: 9/9.
- Repository lint: 357 files.
- Type-check and build: 8 projects each.
- Workspace tests: 405 passed, 5 skipped, 0 failed.
- Tier-0 oracle parity: 46 scenes passed.
- Governance: 15 runtime paths, 8 test paths, 0 unmapped runtime paths.
- Stable target: `@figit/dom-to-figma@0.2.4` at `859efea8...`; stable adapter
  passed.
- Upstream-main target: `859efea8...`.
- Diff whitespace check passed; focused and full governance reports are
  byte-identical.

GitHub's repository, Tier-0, governance, stable, and upstream-main project
gates completed successfully, including both required checks. The optional
`Publish to pkg.pr.new` Preview failed with HTTP 404 because the pkg-pr-new App
is not installed; it is not a required or project compatibility gate.
Independent review is complete, and merge still requires separate explicit
authorization.

## Rollback

C4 is one review and rollback unit. Revert the single curated commit
`16ea58b5681f2c599044c9fc257b04543b717103` to remove the font/text regression
coverage and its reviewed governance record. The already merged C1+C2 and C3
units are outside this rollback.
