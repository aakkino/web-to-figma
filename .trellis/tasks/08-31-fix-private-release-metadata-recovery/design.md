# Design: Source-Bound Release Metadata Selection

## Boundaries

The change repairs the data contract between the protected `publish` and
`metadata` jobs. Package bytes remain owned by the publish job; Git Tag and
GitHub Release writes remain owned by the metadata job. Only non-binary,
source-bound evidence crosses the job boundary.

The parent release task depends on this child being merged. This child does not
own live release recovery.

## Result Contract

After `publishSerially()` verifies every artifact, completes the clean-consumer
smoke test, and promotes dist-tags, `runPublish()` writes a result document
beside the manifest:

```json
{
  "sourceSha": "<40 hex>",
  "artifacts": [
    {
      "name": "@aakkino/dom-to-figma",
      "version": "0.4.0",
      "integrity": "sha512-...",
      "state": "absent"
    }
  ]
}
```

The exact schema may reuse full artifact identities, but it must contain enough
fields to establish a one-to-one match with the manifest and fixed allowlist.
Write it only after the complete publish transaction passes. Upload it with
`manifest.json`; never upload tarballs.

## Selection Modes

### Normal

Select only result entries whose initial state is `absent`. `matching`
coordinates are verified package dependencies or historical versions, not
metadata candidates. An empty selection succeeds without historical metadata
API calls.

### Explicit Recovery

The workflow exposes a boolean input such as `recover_missing_metadata`,
default `false`. When true, the selector may additionally choose a `matching`
coordinate only when all of these are proven:

1. Result and manifest identity/source SHA match.
2. Registry bytes and manifest metadata matched in the protected publish job.
3. The candidate's exact Tag and Release are both absent.
4. A unique owned predecessor Tag for the same package is reachable from the
   reviewed source.
5. The candidate version is valid semver and strictly greater than the
   predecessor version.

The selector returns candidates to the same reconciler used by normal mode.
No separate manual metadata path is introduced.

## Metadata Preflight

For all selected candidates, complete inspection before the first write:

- existing Tag absent or exactly at `sourceSha`;
- existing Release absent or bound to the selected Tag and exact target SHA;
- no duplicate candidate coordinate;
- selection identity matches the manifest and result document.

Only after every candidate passes may missing Tags and Releases be created.
Unselected artifacts are outside the metadata transaction and receive no
Tag/Release API calls.

## Workflow Data Flow

```text
preflight manifest + staged tarballs
  -> protected publish/verify/promote
  -> non-binary publish result
  -> upload manifest + result
  -> metadata downloads both
  -> validate source/allowlist/identity
  -> normal absent selection OR explicit recovery selection
  -> preflight all selected Tag/Release state
  -> create only missing selected metadata
```

The metadata job continues to use its repository-scoped `GITHUB_TOKEN`. The
publish job's PAT and candidate tarballs never cross the boundary.

## Compatibility And Migration

New runs always produce the result document. The explicit recovery selector is
the compatibility mechanism for the already-published `0.4.0`; it does not
reinterpret the failed run's old manifest as permission to process every
allowlisted artifact.

Historical package Tags remain at their original release commits. Existing
selected metadata at the correct SHA is idempotent; conflicting selected
metadata remains a hard failure.

## Failure And Rollback

- Before merge, rollback is the ordinary code-branch revert.
- A malformed result, ambiguous history, version regression, Registry mismatch,
  or metadata conflict stops before writes.
- No test may delete packages, versions, Tags, Releases, or branches.
- The live partial publication remains untouched throughout this child.

