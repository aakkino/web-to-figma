# Failed Release Run 33355456677 Debug

## Determination

**Classification: BLOCKED.** Run
[`33355456677`](https://github.com/aakkino/web-to-figma/actions/runs/33355456677)
published and verified the package bytes, then failed deterministically while
reconciling Git metadata. A same-SHA retry without a reviewed code/config
correction would encounter the same pre-existing historical tag conflict. No
retry, workflow dispatch, deployment approval, package mutation, ref mutation,
or other remote write was performed during this investigation.

The immutable private `@aakkino/dom-to-figma@0.4.0` publication must be
preserved. It must not be deleted as routine recovery.

## Reproduction And Run Identity

The smallest reliable reproduction was a read of the run jobs and failed-step
log:

```powershell
gh api repos/aakkino/web-to-figma/actions/runs/33355456677/jobs?per_page=100
gh run view 33355456677 --repo aakkino/web-to-figma --log-failed
```

- Event: `workflow_dispatch`; attempt `1`; completed `failure`.
- Run source/head SHA:
  `adc52aea87e1f6f25f53d43028527e5dd8489892`, matching the requested exact
  source value shown in the source-validation/preflight log and current
  `origin/main`.
- Publish job
  [`99376612791`](https://github.com/aakkino/web-to-figma/actions/runs/33355456677/job/99376612791)
  completed `success`. All steps succeeded, including step 11, `Publish and
  verify the staged tarballs`, and step 12, `Upload non-binary release
  manifest`.
- Metadata job
  [`99376834517`](https://github.com/aakkino/web-to-figma/actions/runs/33355456677/job/99376834517)
  completed `failure`. Step 5, `Reconcile metadata at the reviewed SHA`, is the
  sole failed step.
- `Update version pull request` job `99376613296` was expectedly skipped for
  the manual dispatch.
- The review-history endpoint records an `approved` review by `aakkino` for
  environment `package-publish`, with comment `Approved for exact reviewed
  source adc52aea87e1f6f25f53d43028527e5dd8489892.` The run therefore passed
  the protected environment gate. Its completed-state pending-deployments
  response is empty.
- Artifact metadata reports exactly one non-binary manifest artifact, ID
  `9744995492`, name
  `private-release-manifest-adc52aea87e1f6f25f53d43028527e5dd8489892`,
  928 bytes, digest
  `sha256:d84274c310c8ae9b94ac1bed566f0955d7f7f2752ecabd8a7e6f20c579e83e4e`.
  It was not downloaded.

Minimal redacted failure excerpt:

```text
Error: @aakkino/fig-kiwi@0.2.0 already points to
dd91f18346d7326ab71c1a77769bfe7aed310af3
    at reconcileMetadata (scripts/private-release.mjs:244:13)
Process completed with exit code 1.
```

## Root Cause And Causal Chain

1. The fixed release allowlist staged all three package coordinates, including
   unchanged `fig-kiwi@0.2.0` and `composed-dom@0.1.1` plus new
   `dom-to-figma@0.4.0`.
2. The publish job verified the two existing packages, published and verified
   `dom-to-figma@0.4.0`, promoted dist-tags, and uploaded the manifest.
3. `reconcileMetadata()` iterates every artifact. Before making any metadata
   write, it requires every existing package-version tag either to be absent or
   already point to the current `sourceSha`.
4. Historical tag `@aakkino/fig-kiwi@0.2.0` correctly exists at its original
   release commit `dd91f18346d7326ab71c1a77769bfe7aed310af3`, not the new
   dom-to-figma release SHA. The function therefore throws on the first
   artifact during its inspection loop.
5. Because inspection completes before the create loop begins, this failure
   created no Git tags or GitHub Releases. In particular, the new
   `@aakkino/dom-to-figma@0.4.0` tag and Release remain absent.

This is a release-logic/design defect: unchanged allowlisted package artifacts
are treated as though their historical version metadata must be rebound to
every later release SHA. It is not a transient GitHub or registry failure.

## Durable State Matrix

| Surface | Durable state after failed run | Changed by run |
| --- | --- | --- |
| `@aakkino/fig-kiwi@0.2.0` | Private; version ID `1178396168`; repository `aakkino/web-to-figma`; integrity `sha512-5oEQUbje4kv1eSKPVkeFHXs11wEK/ujPeKFWLS00wb/YzZR1Ow8SruI7nma5xpUXQkCFa4EZp1yuzcG+qUMEhQ==` | No new bytes; `latest` and `migration` remain `0.2.0` |
| `@aakkino/composed-dom@0.1.1` | Private; version ID `1178519831`; repository `aakkino/web-to-figma`; integrity `sha512-Gcp3+44fT6OPcg3PqZGc7Zjesw8tZkSylv1wfRBvRg9M/imweNCsTeRrD2sIyp6jz3vMYXJ+pVUOWOHNCzWjlA==` | No new bytes; `latest` and `migration` remain `0.1.1` |
| `@aakkino/dom-to-figma@0.3.0` | Still present; integrity `sha512-M6Na9d3HR1w5IGOTQg8lkdaaL14sV0P5tQNfoL75Q61Nv+TJoWndmEjJkNX38UlsAVCetI6o29LHDTN5zX5OjA==` | No |
| `@aakkino/dom-to-figma@0.4.0` | **Present and private**; version ID `1189572169`, created `2026-08-31T03:58:28Z`; repository `aakkino/web-to-figma`; integrity `sha512-LNXSShqjYWV3et9c11DEDXOZQOat3W8e5UIE2oGPA14Gm5+/O2SmL+d0jNmaw+2BySJ1UqmhFre0T4Irhdq/Yg==` | **Yes, immutable bytes published**; `latest` and `migration` promoted to `0.4.0` |
| Historical owned tags/Releases | `fig-kiwi@0.2.0`, `composed-dom@0.1.1`, and `dom-to-figma@0.3.0` tags and Releases remain at `dd91f18346d7326ab71c1a77769bfe7aed310af3` | No |
| New tag/Release | `@aakkino/dom-to-figma@0.4.0` tag: 404; Release: 404 | No metadata created |
| `main` | `adc52aea87e1f6f25f53d43028527e5dd8489892` | Did not move during/after run |
| `changeset-release/main` | Still exists at `1aa2e5b9433adc0297ab6c56567c3e8f31d3db10` | Not deleted |

Authenticated registry reads established the exact versions, integrity,
dist-tags, and manifest repository links. GitHub package API reads established
private visibility and owning repository links. The successful publish step is
the run evidence for staged-byte matching and access/privacy verification.

## Retry Safety And Next Action

This failure is **not RETRY-SAFE** under the required definition. Although the
published `0.4.0` is an idempotently recoverable partial publication, the
current exact-SHA metadata code will always reject the valid historical
`fig-kiwi@0.2.0` tag before reaching the new coordinate. Recovery needs a
separately reviewed code/config change that preserves historical tag targets
while reconciling metadata only for newly released coordinates (or otherwise
encodes the intended per-version source SHA), with a regression test covering
an unchanged existing package tag plus a new later package version.

After that correction is merged and a new exact source is reviewed, obtain new
authorization for the protected workflow. Its package phase must accept the
existing `dom-to-figma@0.4.0` only after proving immutable byte/metadata
identity, then create only the missing `0.4.0` tag and Release. Do not retry run
`33355456677`, delete `0.4.0`, retarget historical tags, delete the release
branch, or clean up release state before full success is independently proven.

## Local State

At the final read, local `HEAD` remained
`f4d3e9e2b89682b636ff297766c18b4bc8296307`; remote `main` remained the
approved SHA. `git status --short` showed only the already-untracked task
directory. This investigation writes only this file and the assigned append to
`execution-evidence.md`.
