# Implementation Plan: Private Release Metadata Recovery

## Entry And Dependency Gates

- [ ] Receive explicit approval of this child's final `prd.md`, `design.md`,
  and implementation plan in a later user message.
- [ ] Start this child only after approval; the parent release task remains
  blocked and must not dispatch or clean up live release state.
- [ ] Refresh `origin/main` and require the implementation branch to start from
  the current remote SHA containing merge `adc52aea...` and no unexpected
  release-state change.
- [ ] Reconfirm private `dom-to-figma@0.4.0` integrity and missing Tag/Release
  as read-only evidence before implementation.

## Phase A: Persist Publish Results

- [ ] Define and validate a source-bound non-binary publish-result schema with
  fixed allowlist ordering, unique coordinate identities, integrity, and closed
  `absent|matching` states.
- [ ] Preserve `publishSerially()` initial states and write the result only
  after every verification, smoke test, and dist-tag promotion succeeds.
- [ ] Update the Release workflow to upload/download the result with the
  manifest while continuing to exclude tarballs.
- [ ] Extend release-policy assertions so workflow wiring, artifact paths, and
  credential boundaries cannot regress.

Rollback point: no Registry or metadata write is performed by local tests.

## Phase B: Select And Reconcile Metadata

- [ ] Validate result source SHA and every result identity against the manifest
  and allowlist before metadata inspection.
- [ ] In normal mode select only initially `absent` artifacts; make empty
  selection a validated no-op.
- [ ] Restrict all Tag/Release reads and writes to the selected set.
- [ ] Extend Release inspection to resolve and verify the exact target commit,
  not only `tag_name`.
- [ ] Preserve all-selected preflight before the first metadata write.

## Phase C: Explicit Recovery Selector

- [ ] Add a default-off boolean workflow input and pass it only to the metadata
  selection path.
- [ ] Implement a bounded owned-tag/semver/history resolver for Registry
  `matching` candidates with missing exact Tag and Release.
- [ ] Require a unique same-package predecessor Tag, ancestor relationship,
  strictly increasing semver, exact manifest/result identity, and verified
  matching Registry state.
- [ ] Fail closed on every ambiguity or conflict and ensure the known partial
  state selects only `@aakkino/dom-to-figma@0.4.0`.

## Phase D: Tests And Contract

- [ ] Add unit/integration coverage for the full PRD regression matrix,
  including the original historical-tag failure, interrupted `0.4.0` recovery,
  wrong Release target, all-candidate preflight, and empty selection.
- [ ] Update the private-package release spec with result provenance, explicit
  recovery predicates, and parent recovery ordering.
- [ ] Keep diagnostics bounded and credential-free.

## Validation

Run from the implementation branch/worktree:

```sh
pnpm test:release
pnpm release:policy
pnpm check-types
pnpm build
pnpm test
pnpm oracle:parity
pnpm upstream-adapter:stable
pnpm upstream-adapter:main
pnpm upstream-core-delta:check
git diff --check
```

- [ ] Run a no-write preflight and inspect only non-binary result/manifest data.
- [ ] Report gated skips or external limitations explicitly.
- [ ] Dispatch `trellis-check` with hard-checking after implementation.
- [ ] Obtain independent correctness review because release metadata is a
  high-impact cross-job contract.

## Merge And Parent Handoff

- [ ] Create a focused PR containing only the approved script/test/workflow/spec
  changes and required generated formatting.
- [ ] Require protected checks and review before main-session merge.
- [ ] After merge, record the exact new `origin/main` SHA in both child and
  parent evidence.
- [ ] Do not dispatch live recovery from this child. The parent must conduct a
  fresh release-readiness review and obtain new operational authorization.

