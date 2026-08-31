## Scope

Promote the reviewed C3 traversal cohort onto the current `main` base. This
change hardens injectable composed-DOM traversal, composed-parent semantics,
open Shadow DOM conversion, converter integration, and their focused browser
coverage.

## Curated Mapping

```text
split original afd3a84d91f52315f20ca3b828ff54293140b8fc
  -> prior curated 530ba98cf2e9e29b792f436ec075d508edde1dfb
  -> current-base curated 49d8055ee95b3f9e529f782876e042f6055de71a
```

- Base: `c9e4e3914dab262adcc4b37556543843e13708ab`
- Head: `49d8055ee95b3f9e529f782876e042f6055de71a`
- Review unit: 1 commit, 12 files, 380 insertions, 42 deletions
- The 12 head blobs are byte-identical to the approved prior curated C3
  content, replayed onto the current base without conflicts.

## Exclusions

- No C4 font cohort or C5 image-pipeline cohort content.
- No `.trellis/tasks` or `.trellis/workspace` content.
- No task handoff paths from the split original commit.
- No commits from the 47-commit `sync/upstream-20260726`-only range.

## Local Validation

All commands completed successfully on the current-base curated head:

- Focused tests: composed DOM 5/5, adapter bridge 9/9, traversal and Shadow DOM
  6/6.
- Repository lint: 355 files.
- Type-check and build: 8 projects each.
- Workspace tests: 402 passed, 5 skipped, 0 failed.
- Tier-0 oracle parity: 46 scenes passed.
- Governance: 15 runtime paths, 6 test paths, 0 unmapped runtime paths.
- Stable target: `@figit/dom-to-figma@0.2.4` at `859efea8...`; stable adapter
  passed.
- Upstream-main target: `859efea8...`.
- Diff whitespace check passed; focused and full governance reports are
  byte-identical.

GitHub's repository, Tier-0, governance, stable, and upstream-main project
gates completed successfully, including both required checks. The optional
`Publish to pkg.pr.new` Preview failed because the pkg-pr-new App is not
installed; it is not a required or project compatibility gate. Review remains
pending, and merge still requires separate explicit authorization.

## Rollback

C3 is one review and rollback unit. Revert the single curated commit
`49d8055ee95b3f9e529f782876e042f6055de71a` to roll back traversal changes.
The already merged C1+C2 governance and adapter unit is outside this rollback.
