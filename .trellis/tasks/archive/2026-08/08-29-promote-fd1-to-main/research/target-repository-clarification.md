# Target Repository Clarification

Captured on 2026-08-30 after the first guarded PR-creation attempt stopped
before mutation.

## Finding

GitHub CLI repository inference selected the fork parent
`figitdesign/web-to-figma` and observed its `main` at
`859efea8d7f8330783c6c4e3e520fd673e877336`. That repository is not the PR
target for this promotion. A read-only merge preview also showed that the
parent has removed or redesigned large fork-specific extension surfaces, so
treating it as the base would violate the approved four-file boundary.

The intended and historically consistent promotion repository is
`aakkino/web-to-figma`:

- `origin` fetch/push URL is `https://github.com/aakkino/web-to-figma.git`;
- local `main` tracks `origin/main`;
- the parent Trellis tasks record prior promotions as PRs #14 through #19 in
  `aakkino/web-to-figma`;
- PR #19 targeted `aakkino/web-to-figma:main`, used the recorded six material
  checks, and merged into the fork main line;
- the approved FD1 plan consistently identifies `origin/main@decde39a...` as
  the target.

## Operational Rule

All promotion PR reads and writes must explicitly name
`--repo aakkino/web-to-figma`. The parent repository remains an upstream
compatibility input covered by CI; its independent `main` movement is not PR
base drift. The aborted guarded attempt invoked no `gh pr create` and caused
no remote mutation.
