# Fix Private Release Metadata Recovery

## Goal

Make private-release metadata reconciliation operate only on package versions
owned by the current release, while providing a narrowly authorized,
fail-closed recovery path for the already-published but untagged private
`@aakkino/dom-to-figma@0.4.0` version.

The user value is a repeatable release workflow that preserves historical
package provenance, safely resumes partial publications, and cannot retarget
unchanged package tags to unrelated later releases.

## Confirmed Facts

- Parent task `08-31-release-dom-to-figma-0-4-0` is blocked on this child.
  The parent must not resume workflow dispatch or release-branch cleanup until
  this child is reviewed, merged, and independently verified.
- Protected run `33355456677` published and verified private
  `@aakkino/dom-to-figma@0.4.0` at source
  `adc52aea87e1f6f25f53d43028527e5dd8489892`, integrity
  `sha512-LNXSShqjYWV3et9c11DEDXOZQOat3W8e5UIE2oGPA14Gm5+/O2SmL+d0jNmaw+2BySJ1UqmhFre0T4Irhdq/Yg==`.
- The run failed only in metadata reconciliation because the full manifest
  also contained unchanged `fig-kiwi@0.2.0` and `composed-dom@0.1.1`.
  `reconcileMetadata()` requires every manifest tag to equal the current
  `sourceSha`, so it rejected the correct historical fig-kiwi tag at
  `dd91f18346d7326ab71c1a77769bfe7aed310af3`.
- The publish phase already returns each coordinate's initial state as
  `absent` or `matching`, but the result is not persisted across jobs. The
  metadata job receives only the full preflight manifest.
- The failed run's uploaded artifact is manifest-only. A later corrected run
  will see `dom-to-figma@0.4.0` as `matching`, so normal publish-result
  selection alone cannot recover its missing tag and GitHub Release.
- The existing Release API adapter verifies only `tag_name`; it does not prove
  an existing Release targets the expected commit.

## Requirements

- R1. Persist a source-SHA-bound, non-binary publish-result document after all
  package verification and dist-tag promotion succeeds. It must record every
  approved artifact identity and its initial Registry state without exposing
  candidate tarballs or credentials.
- R2. Validate the result document against the source-SHA-bound manifest and
  fixed package allowlist before any metadata read or write. Reject missing,
  duplicate, reordered, unknown, or mismatched identities/states.
- R3. In normal mode, reconcile metadata only for coordinates whose persisted
  initial state was `absent`. An empty selection is a validated no-op and must
  not inspect or mutate historical package metadata.
- R4. Add an explicit workflow recovery input, defaulting to disabled. Only in
  that mode may a Registry-`matching` coordinate be selected when its exact
  Tag and Release are both absent and a unique owned predecessor tag is an
  ancestor of the reviewed source with a strictly lower semantic version.
- R5. The recovery selector must fail closed on malformed or non-increasing
  versions, no unique predecessor, non-ancestor history, existing candidate
  Tag or Release, Registry mismatch, ambiguous source, or artifact/result
  identity mismatch. It must not use package order, tag absence alone, or
  optional Registry `gitHead` as provenance.
- R6. Metadata reconciliation must preflight every selected Tag and Release
  before its first write. A selected existing Tag must equal `sourceSha`; an
  existing Release must name that Tag and resolve to the same target SHA.
- R7. Unselected historical coordinates must not be inspected, recreated,
  retargeted, or treated as conflicts merely because their correct source SHA
  differs from the current release SHA.
- R8. Preserve the existing exact-SHA, protected-environment, staged-byte,
  package privacy, access, credential-isolation, and no-binary-artifact
  contracts.
- R9. Add regression coverage for normal publication, interrupted recovery,
  idempotent success, conflict preflight, result validation, release-target
  validation, selector rejection, and empty selection.
- R10. Update the private-package release contract and workflow policy checks
  to describe and enforce the new result handoff and explicit recovery mode.
- R11. This child ends after its code/spec changes pass checks, review, and a
  protected PR merge. It must not dispatch a live Release recovery, mutate
  package versions, create metadata manually, or delete the release branch.

## Acceptance Criteria

- [ ] AC1 (R1-R3): an ordinary run persists validated per-coordinate states,
  and metadata touches only coordinates initially `absent` in that run.
- [ ] AC2 (R3,R7): with historical fig-kiwi/composed versions and a new dom
  version, tests prove only dom metadata is inspected/created and historical
  Tag targets remain unchanged.
- [ ] AC3 (R4-R5): explicit recovery selects only the existing matching,
  untagged `dom-to-figma@0.4.0` case when all source/history predicates hold;
  every ambiguous or conflicting case fails before writes.
- [ ] AC4 (R6): selected Tag and Release conflicts, including a wrong Release
  target SHA, fail before any metadata creation.
- [ ] AC5 (R2,R8): result/manifest/source identity mismatches and any attempt
  to broaden the allowlist or expose binary artifacts fail closed.
- [ ] AC6 (R9-R10): `pnpm test:release`, release policy, typecheck, build,
  repository tests, relevant compatibility gates, and `git diff --check` pass
  with documented gated limitations.
- [ ] AC7 (R11): the child PR is merged through branch protection without any
  live release retry or manual Registry/Tag/Release mutation.
- [ ] AC8: the parent task records this child as a completed prerequisite and
  requires a fresh current-`main` SHA plus new operational authorization before
  attempting recovery.

## In Scope

- `scripts/private-release.mjs` publish-result persistence, selection,
  recovery provenance, and Release-target verification.
- `scripts/private-release.test.mjs` regression coverage.
- `.github/workflows/release.yml` non-binary result handoff and explicit
  recovery input wiring.
- `.trellis/spec/repository/backend/private-package-release.md` executable
  contract updates.
- Static release-policy assertions needed to protect the new workflow surface.

## Out Of Scope

- Retrying run `33355456677` or dispatching any Release workflow.
- Deleting or republishing `dom-to-figma@0.4.0`.
- Manually creating or retargeting Tags or GitHub Releases.
- Altering historical package Tags/Releases or package visibility/access.
- Deleting `changeset-release/main` or unrelated branches.
- General-purpose package/version recovery or destructive deletion tooling.
- Fixing the separate Changesets bot-token PR check-trigger gap.

## Risks And Deferred Items

- The recovery selector is intentionally narrow and may reject unusual but
  legitimate histories; fail-closed rejection is preferable to inferred
  provenance. Any broader recovery policy is deferred.
- The corrected recovery run will target a newer reviewed `main` SHA containing
  the fix, so the eventual `0.4.0` Tag/Release will identify that approved
  recovery source rather than the original failed-run SHA. The parent task
  must surface this in its renewed release review.

