# Release Run 33364693324 Absent-Tag Debug

## Determination

Run `33364693324` published and verified the unchanged private package bytes,
then failed before any metadata write while selecting the explicitly authorized
recovery candidate. The failure is deterministic in the merged tag-inspection
adapter and the failed run must not be retried.

The exact `@aakkino/dom-to-figma@0.4.0` Git ref and GitHub Release were both
reconfirmed absent with explicit HTTP 404 responses after the run. No partial
Tag or Release was created.

## Reproduction

The merged adapter queried the commits endpoint directly with the missing tag:

```text
gh api repos/aakkino/web-to-figma/commits/%40aakkino%2Fdom-to-figma%400.4.0
gh: No commit found for SHA: @aakkino/dom-to-figma@0.4.0 (HTTP 422)
```

The exact-ref endpoint correctly distinguishes absence:

```text
gh api repos/aakkino/web-to-figma/git/ref/tags/%40aakkino%2Fdom-to-figma%400.4.0
gh: Not Found (HTTP 404)
```

Run job `99403165142` failed at `inspectTag()` with the same HTTP 422 before
history inspection or metadata creation. Its publish job `99402821058`
completed successfully at reviewed main SHA
`45873d96eeb38a3925de118ed1cffcd19f32a135`.

## Root Cause And Fix

The commits API dereferences an existing tag, but reports a missing tag as 422,
not 404. `inspectTag()` treated only HTTP 404 as absence, so the recovery
selector rejected the expected missing-tag state before evaluating provenance.

`inspectGitHubTag()` now queries the exact Git ref first. Only its HTTP 404 is
accepted as absence. For an existing ref, the adapter validates the exact ref
name, the closed `commit|tag` object type, and the object SHA, then retains the
commits-endpoint lookup to dereference lightweight or annotated tags to a
commit. A lightweight ref must resolve to its own object SHA; annotated refs
may resolve from their tag-object SHA to a different commit SHA. Non-404 ref
failures, malformed or mismatched refs, commit lookup failures, and malformed
or inconsistent commit SHAs fail closed.

A real read-only lookup of historical
`@aakkino/dom-to-figma@0.3.0` returned exact ref and commit SHA
`dd91f18346d7326ab71c1a77769bfe7aed310af3` through the two-step path.

## Regression Proof

- Missing exact ref returns `null` after one ref request and never calls the
  commits endpoint.
- Valid lightweight and annotated refs proceed to commit dereferencing and
  return the resolved commit SHA.
- Non-404 ref failures, commit HTTP 422, mismatched names, invalid object
  types/SHAs, malformed commit SHAs, and lightweight resolution mismatch all
  reject.
- `pnpm test:release`: PASS, 59 tests.
- `pnpm release:policy`: PASS.
- `pnpm check-types`: PASS across all participating workspaces.
- Focused Biome and `git diff --check`: PASS after the fix.

All reproduction and verification commands were read-only. No Registry,
Tag, Release, workflow, deployment approval, or branch mutation was performed.
