# Post-Audit Tail Preflight

Captured during planning on 2026-08-30.

## Pinned Observations

- Original audited source: `2172b181853e111dab5c9e261cc19426420f649f`.
- Observed planning source: `b7bd7d6c68557e91e184da65b9e560de950f3bed`.
- Observed target: `origin/main@687a8509969b24aba13ee414cc19b3d6aef1d20f`.
- Merge base: `606ee8aa9ca4915ec28dd7853fd5b42283ff54ea`.
- The source has 12 commits after the original audit and 85 sync-only commits
  at the observed planning tip. These counts must be re-pinned because planning
  and archival bookkeeping may advance the source before final freeze.

## Preliminary Tail Ledger

| Row | Commit | Subject | Preliminary disposition | Reason |
| --- | --- | --- | --- | --- |
| S74 | `21e5d32` | `docs: assess sync integration` | superseded | Active-path audit material is relocated intact by S75. |
| S75 | `3fb9ff1` | archive sync assessment | historical only | Preserves the authoritative 73-row assessment in its final archive path. |
| S76 | `906b205` | journal | excluded | Session chronology only. |
| S77 | `e9598b8` | archive BG1 rebuild | historical only | Completed-child evidence; no target product delta. |
| S78 | `0ad29a9` | journal | excluded | Session chronology only. |
| S79 | `37f5361` | oracle scene registration gates | port candidate | Durable dual-projection rule is valid and absent from `origin/main`. |
| S80 | `de41ab1` | record BG1 promotion | historical only | Governance and promotion evidence; no target product delta. |
| S81 | `2ff81be` | archive BG1 promotion | historical only | Final archive placement of promotion evidence. |
| S82 | `f25896c` | journal | excluded | Session chronology only. |
| S83 | `03296e0` | archive BG2 rebuild | historical only | Completed-child evidence; no target product delta. |
| S84 | `9c949a4` | journal | excluded | Session chronology only. |
| S85 | `b7bd7d6` | archive FD1 promotion | historical only | Completed-child evidence; no target product delta. |

## S79 Evidence

Commit `37f5361` changes only:

- `.trellis/spec/oracle-harness/frontend/architecture.md`
- `.trellis/spec/oracle-harness/frontend/testing-guidelines.md`

The rule reflects current implementation: scene discovery produces a stable
sorted id/size manifest snapshot, while `baseline/scoreboard.json` is a
separate parity projection. `pnpm oracle:parity` cannot validate the manifest
snapshot, so the harness unit suite remains independently required.

`origin/main` contains both spec files but lacks this contract. The port must be
rebuilt against the target versions so it preserves their exact naming: the
harness package and command selector use `@figit/oracle-harness`, while the
architecture still names `@aakkino/dom-to-figma` and `@aakkino/fig-kiwi` as
dependencies. Preserve those target-line references and any later edits; the
historical commit must not be cherry-picked literally.

## Freeze Constraint

The terminal source SHA cannot be committed into a file on the same source
branch without changing that SHA. The closure sequence therefore finishes all
source-side task and archive commits first, archives the top-level parent as the
last branch commit, then creates an annotated local tag at that exact commit.
The tag and an out-of-branch final report attest the identity. Pushing or
deleting refs requires separate approval.
