# BG1 Pre-Push Evidence

Captured on 2026-08-28 at 15:31:26 +08:00. This run was authorized only
through implementation-plan step 5. No remote mutation was performed.

## Result

**Stopped before push authorization.** Identity and remote preflight passed,
but the first committed-shape validation command found a CI-relevant Biome
error in the reviewed payload. Per the task stop conditions, no later local
validation or independent review command was run.

## Identity And Remote Preflight

- `git fetch --no-tags origin main`: exit 0.
- `origin/main`: `dd91f18346d7326ab71c1a77769bfe7aed310af3`.
- Local source branch: `task/rebuild-bg1-css-raster-backgrounds`.
- Reviewed head: `5b906e214241300edd4beff08dfb67313005bbf2`.
- Topology (`origin/main...HEAD`): zero behind, two ahead.
- Source commits: `30d33b9131e1775bc54c53a6afe4548a3fd2dc71`
  and `5b906e214241300edd4beff08dfb67313005bbf2`.
- Source worktree status: clean.
- Payload: 22 files, 2,626 insertions, 78 deletions.
- Remote source ref: absent (`GET git/ref/...` returned HTTP 404).
- Existing PR for the source branch: none (`[]`).
- Repository merge methods: merge commit, squash, and rebase are enabled;
  automatic branch deletion is disabled.
- `main` protection: strict required checks `Lint, typecheck, build, test` and
  `Tier-0 parity ratchet`; conversation resolution and administrator
  enforcement enabled; force-push and deletion disabled.

## Preservation Snapshot

- Root branch: `sync/upstream-20260726`.
- Root HEAD: `0ad29a9464775f3e4bc3cb4b8007cff3ff48ce7b`.
- Root staged paths: none.
- Existing worktrees: root plus `fix-governance-ci-upstream-fetch`,
  `fix-pkg-pr-new-preview`, `migrate-fork-private-package-registry`,
  `reassess-upstream-cherry-pick`, `rebuild-bg1-css-raster-backgrounds`,
  `rebuild-fd1-font-diagnostics`, and `upstream-image-loader-cancellation`.
- The root checkout was already dirty and was not used for validation.

Tracked paths reported modified at the root snapshot and their content hashes:

| Path | SHA-256 |
| --- | --- |
| `.gitignore` | `14F8A98C576B35A880F761EC304386CCF061D3DA2D6DF49B429B8640CF3A85D7` |
| `.trellis/spec/dom-to-figma/frontend/index.md` | `7D224A5B3AF2EDB1A5540AE88B4432B8DA945667FE0CD0B3006ABC8B1B7BF8CB` |
| `.trellis/tasks/archive/2026-08/08-28-rebuild-bg1-css-raster-backgrounds/approval-manifest.md` | `CEF6288C0E28A246E650F754479ADFE58D743A8C6247206F7FEEF2F2D13433F1` |
| `.trellis/tasks/archive/2026-08/08-28-rebuild-bg1-css-raster-backgrounds/check.jsonl` | `F3809B23E6F33E2816F978C0A1DC64BEC6B32F9CAD0E5C460106D6462C3BB898` |
| `.trellis/tasks/archive/2026-08/08-28-rebuild-bg1-css-raster-backgrounds/design.md` | `99F3DEA8F5B691C78D5D5163E1459CA7B90B4A867EC514F643E9411AE302AA0F` |
| `.trellis/tasks/archive/2026-08/08-28-rebuild-bg1-css-raster-backgrounds/implement.jsonl` | `A195613D983C66B749D220CE6221E9A3097D261E8182752D29060EFA7DD9308E` |
| `.trellis/tasks/archive/2026-08/08-28-rebuild-bg1-css-raster-backgrounds/implement.md` | `A40A084FD8413A258C6DB59B0E81D3AAF7370D3F4A10FE5D19FAC4EFBF4A6886` |
| `.trellis/tasks/archive/2026-08/08-28-rebuild-bg1-css-raster-backgrounds/prd.md` | `AEB16734BF9E17A4AFA54F6576082FF9607BF6D109B37EDDF8B393DACCF185F6` |
| `.trellis/tasks/archive/2026-08/08-28-rebuild-bg1-css-raster-backgrounds/task.json` | `3CB4258398F7454CDF294DBDFDCE0D306CEC7642B652AAE6C754727F0AD35D57` |
| `packages/dom-to-figma/src/converter/classify.test.ts` | `C3D1531A810EC1441F17EEE786241759219C015FE72DA23BEE171FB5B14B4866` |
| `packages/dom-to-figma/src/converter/classify.ts` | `2620ADA8B639A310818449621515C8135AD06AE8B3415F65175D6D10C3962A11` |
| `packages/fig-kiwi/src/clipboard.test.ts` | `25D373332EA5954C03D3DEE4A2F00335E77B2A54A641AEA5E0C7F7B5A702FBAC` |

## Blocking Validation

Command, run from `.tmp/rebuild-bg1-css-raster-backgrounds`:

```powershell
$files = git diff --name-only origin/main...HEAD
pnpm exec biome check --diagnostic-level=error --max-diagnostics=none @files
```

- Exit code: 1.
- Files considered by the exact manifest: 22; Biome processed 20 supported
  files.
- Blocking path:
  `packages/dom-to-figma/scripts/oracle-scenes/img/img-03-css-background.html`.
- Diagnostic: `assist/source/useSortedProperties`; `background-repeat` must
  precede `background-position` in `.background-card`.
- This is not the known Windows CRLF whole-repository limitation. The
  repository CI command is `pnpm lint --diagnostic-level=error
  --max-diagnostics=none`, so the diagnostic is material to promotion.

## Not Run After Stop

Core, adapter, and extension tests/types/builds; core-delta tests and reports;
stable and upstream-main compatibility; Oracle parity; whitespace validation;
and independent diff/governance review were not run after the stop condition.

No push, PR creation or update, merge, branch deletion, force-push, direct
`main` push, or other remote mutation occurred.

## Approved Correction Run

The user subsequently approved the revised lint-only correction plan.

- Original reviewed head was reconfirmed clean at
  `5b906e214241300edd4beff08dfb67313005bbf2`.
- The working diff affected only
  `packages/dom-to-figma/scripts/oracle-scenes/img/img-03-css-background.html`.
- The diff was exactly one insertion and one deletion: the unchanged
  `background-repeat: no-repeat, no-repeat;` declaration moved before the
  unchanged `background-position` declaration.
- Single-file Biome passed: one file checked, exit 0.
- A separate third commit was created without amend, rebase, or history
  rewriting: `312c8389ee25eca74e653178fba5b9bb85ae8f7e`
  (`style(oracle): sort CSS background declarations`).
- Corrected reviewed head: `312c8389ee25eca74e653178fba5b9bb85ae8f7e`.
- Corrected topology immediately after commit: zero behind, three ahead; source
  worktree clean.

## Corrected Remote Preflight

- A final `git -c http.sslBackend=openssl fetch --no-tags origin main` passed
  after transient Windows Schannel TLS failures during earlier read-only
  retries.
- Refreshed `origin/main` and the GitHub REST ref both resolve to
  `dd91f18346d7326ab71c1a77769bfe7aed310af3`.
- Corrected local head is
  `312c8389ee25eca74e653178fba5b9bb85ae8f7e`, zero commits behind and three
  commits ahead.
- The exact base-to-head payload remains 22 files, 2,626 insertions, and 78
  deletions.
- Remote source ref remains absent; the existing-PR query remains empty.
- Branch protection and merge-method evidence remains unchanged from the
  initial preflight.

## Corrected Local Validation

All commands ran from `.tmp/rebuild-bg1-css-raster-backgrounds` against the
corrected reviewed head. Every listed command exited 0.

| Command | Result |
| --- | --- |
| Exact 22-file `pnpm exec biome check --diagnostic-level=error --max-diagnostics=none` | 20 supported files checked; no fixes |
| `pnpm --filter @aakkino/dom-to-figma test` | 34 files, 280 tests passed |
| Core `check-types` / `build` | passed / passed |
| `pnpm --filter @figit/browser-capture-adapter test` | 12 files, 58 tests passed |
| Adapter `check-types` / `build` | passed / passed |
| `pnpm --filter extension test` | 7 files, 33 tests passed |
| Extension `check-types` / Chrome build / Firefox build | passed / passed / passed; Firefox emitted only the known data-collection warning |
| `pnpm test:upstream-core-delta` | 7 tests passed |
| Governance core-delta report | `fork-base/ac830db` -> `ac830db5b89d2e8e7eede86f9419303988ae1938`; 51 source files, 15 governed runtime paths, 0 unmapped runtime paths |
| Stable core-delta | `@figit/dom-to-figma@0.2.4` -> `859efea8d7f8330783c6c4e3e520fd673e877336`; passed |
| Stable adapter | `stable@0.2.4 adapter compatibility passed` |
| Upstream-main core-delta | `upstream/main` -> `859efea8d7f8330783c6c4e3e520fd673e877336`; passed |
| Upstream-main adapter | `upstream-main@859efea8d7f8330783c6c4e3e520fd673e877336 adapter compatibility passed` |
| `pnpm oracle:parity` | passed: 47 scenes, 15 existing Tier-0 findings across one class; `img/img-03-css-background` has 0 findings |
| `git diff --check origin/main...HEAD` | passed |

Generated reports:

- `.artifacts/bg1-promotion-core-delta.json`
- `.artifacts/bg1-promotion-stable.json`
- `.artifacts/bg1-promotion-upstream-main.json`

The exact touched-file Biome gate passed after the approved correction. The
known Windows CRLF whole-repository limitation is separate and was not used to
waive any touched-file diagnostic.

## Independent Review

No blocking issue was found.

- `git range-diff` proves the implementation and governance commits are
  unchanged and the correction is only the third commit.
- The correction commit changes one file by one insertion and one deletion;
  declaration values and rendered behavior are unchanged. Oracle independently
  reports zero findings for that scene.
- The public core has an appropriate minor changeset.
- Core-delta registry checks report no unmapped runtime path or error, and the
  corrected head is recorded in each generated report.
- The staged-resource specification explicitly excludes BG2 lazy attributes,
  activation, and scrolling.
- The scoreboard only adds the new zero-finding scene; no tolerance, threshold,
  epsilon, or existing baseline was relaxed.
- The 22-file payload contains no application/extension source, lockfile,
  release workflow, lazy-source activation, or unrelated root content.
- Tests cover inventory/deduplication, capability negotiation, staging and
  cleanup, cancellation, geometry/native paint and raster fallback, and the
  Oracle scene.

Reviewer revalidation independently reconfirmed the corrected committed shape:

- Single-file Biome, core `check-types`, and `git diff --check
  origin/main...HEAD` each exited 0.
- A fresh `pnpm oracle:parity` exited 0 and passed the 47-scene ratchet;
  `img/img-03-css-background` again had 0 findings and 0 maximum delta.
- The fresh Oracle run reported 14 findings across two pre-existing text
  scenes, rather than the earlier validation run's 15 findings across one
  class. The changed text-scene measurement remained within the committed
  ratchet and did not affect the corrected BG1 scene, tolerance policy, or
  baseline. Both runs passed without a scoreboard or tolerance edit.
- A refreshed read-only fetch left `origin/main` at
  `dd91f18346d7326ab71c1a77769bfe7aed310af3`; GitHub still returned 404 for
  the source ref and an empty list for source-branch PRs.

## Final Pre-Push Preservation Check

- Root remains `sync/upstream-20260726` at
  `0ad29a9464775f3e4bc3cb4b8007cff3ff48ce7b`, with no staged paths.
- Every tracked dirty-path SHA-256 recorded in the preservation snapshot still
  matches.
- Unrelated worktree occupancy and heads remain unchanged; only the approved
  BG1 worktree advanced to the corrected reviewed head.
- BG1 source worktree is clean at
  `312c8389ee25eca74e653178fba5b9bb85ae8f7e`.
- At this pre-push checkpoint, no push, PR creation/update, merge, branch
  deletion, force-push, direct `main` push, or other remote mutation had
  occurred.

## Authorized Ordinary Push

The user separately authorized only the ordinary non-force source-branch push.
Immediately before that mutation:

- the source worktree was clean at
  `312c8389ee25eca74e653178fba5b9bb85ae8f7e`;
- refreshed `origin/main` and GitHub REST `main` both resolved to
  `dd91f18346d7326ab71c1a77769bfe7aed310af3`;
- topology was zero behind and three ahead;
- the remote source ref was absent and the PR query was empty.

The only remote mutation command was:

```powershell
git -c http.sslBackend=openssl push --porcelain origin refs/heads/task/rebuild-bg1-css-raster-backgrounds:refs/heads/task/rebuild-bg1-css-raster-backgrounds
```

- Exit code: 0.
- Git result: `[new branch]`; no force option or force refspec was used.
- Remote repository: `https://github.com/aakkino/web-to-figma.git`.
- Remote branch:
  `https://github.com/aakkino/web-to-figma/tree/task/rebuild-bg1-css-raster-backgrounds`.
- Immediate GitHub REST verification returned
  `refs/heads/task/rebuild-bg1-css-raster-backgrounds` at
  `312c8389ee25eca74e653178fba5b9bb85ae8f7e`.
- `main` remained `dd91f18346d7326ab71c1a77769bfe7aed310af3`.
- The PR query remained empty; no PR was created or updated.
- A parallel post-push `ls-remote` retry had a transient TLS connection error;
  the authenticated REST ref verification succeeded with the exact object SHA.

No merge, branch deletion, force-push, direct `main` push, PR creation/update,
or other remote mutation occurred.

## Local PR Draft

- Draft artifact:
  `.trellis/tasks/08-28-promote-bg1-to-main/pr-draft.md`.
- Draft title: `feat(dom-to-figma): support CSS raster backgrounds`.
- Immediately before finalizing the draft, GitHub REST reconfirmed
  `main@dd91f18346d7326ab71c1a77769bfe7aed310af3`, source
  `task/rebuild-bg1-css-raster-backgrounds@312c8389ee25eca74e653178fba5b9bb85ae8f7e`,
  and zero existing PRs for the source branch.
- Local base-to-head inspection reconfirmed the exact 22-file payload, 2,626
  insertions, 78 deletions, and the same three commits.
- The draft records scope and exclusions, all identities, validation and
  compatibility evidence, the changeset, material CI/review requirements, the
  narrow advisory-preview rule, merge-commit rollback, and the deferred BG2
  dependency.
- PR creation remains unauthorized. No PR or other remote mutation was created
  or updated while drafting.

## Authorized PR Creation

The user separately authorized creation of one PR using the independently
reviewed local draft. The immediate preflight reconfirmed:

- `main@dd91f18346d7326ab71c1a77769bfe7aed310af3`;
- remote source
  `task/rebuild-bg1-css-raster-backgrounds@312c8389ee25eca74e653178fba5b9bb85ae8f7e`;
- zero existing source-branch PRs;
- local clean head, zero-behind/three-ahead topology, and exact 22-file payload.

Two initial GitHub CLI creation transports returned EOF. After each ambiguous
request, an independent unauthenticated REST query confirmed that no PR had
been created. The same exact reviewed title/body was then submitted once via
authenticated GitHub REST over HTTP/1.1, producing:

- PR: `https://github.com/aakkino/web-to-figma/pull/14`;
- number/state: `#14`, OPEN and non-draft;
- title: `feat(dom-to-figma): support CSS raster backgrounds`;
- base: `main@dd91f18346d7326ab71c1a77769bfe7aed310af3`;
- head:
  `task/rebuild-bg1-css-raster-backgrounds@312c8389ee25eca74e653178fba5b9bb85ae8f7e`.

Immediate independent REST readback verified:

- the remote title matches the reviewed draft exactly;
- the remote body matches byte-for-byte, with local and remote SHA-256
  `ae2e354df3caa008a19d37cb9f406f47d206b7b9f47be92be27d8f80df8eb806`;
- three commits, exactly `30d33b9131e1775bc54c53a6afe4548a3fd2dc71`,
  `5b906e214241300edd4beff08dfb67313005bbf2`, and
  `312c8389ee25eca74e653178fba5b9bb85ae8f7e`;
- 22 files with zero set difference from the approved payload;
- `auto_merge` is null; no auto-merge was enabled.

The initial mergeability state was `blocked` while checks started. No PR/body/
head update, merge, auto-merge, conversation resolution, branch deletion,
push, or other remote mutation followed creation.

## Terminal CI And Stop

All PR #14 checks reached terminal state. Pending checks: zero. Skipped check
runs: zero (post-job cleanup steps and gated live tests are not material check
runs).

| Check | Conclusion |
| --- | --- |
| `Lint, typecheck, build, test` | failure |
| `Inspect local package tarballs` | success (advisory preview) |
| `Latest stable upstream compatibility` | success |
| `Tier-0 parity ratchet` | success |
| `Upstream core delta governance` | success |
| `Upstream main compatibility` | success |

Required repository job:
`https://github.com/aakkino/web-to-figma/actions/runs/33155565818/job/98797393576`.

Read-only job metadata and failed logs establish:

- Lint, typecheck, build, Playwright setup, core-delta tests, the 280 core
  tests, and BG1 browser tests passed within the repository job.
- The failure occurred in `pnpm test`, specifically
  `internal/oracle-harness/src/scenes.test.ts > discoverScenes() > produces a
  stable id/size manifest`.
- The snapshot expected `img/img-02-object-fit` to be followed by
  `pos/pos-03-z-index`; discovery correctly received the new
  `img/img-03-css-background` scene at 320x180 between them.
- The owning committed snapshot is
  `internal/oracle-harness/src/__snapshots__/scenes.test.ts.snap`, which is not
  in the approved 22-file payload.

This is a material committed-shape omission, not preview infrastructure,
permissions, App installation, network transport, or an advisory failure. It
cannot be waived under the pkg.pr.new rule. Correcting it requires a new
approved product/test-artifact commit, a new reviewed head/payload, PR head and
body updates, and fresh validation/CI authorization.

Per the task stop condition, no code/snapshot/baseline edit, push, PR/body/head
update, workflow rerun, merge, auto-merge, conversation resolution, close,
branch deletion, or other remote mutation was performed after investigation.

## Independent Post-Push, Pre-PR Verification

- The local BG1 worktree remains clean at
  `312c8389ee25eca74e653178fba5b9bb85ae8f7e`, zero commits behind and three
  commits ahead of the refreshed target.
- Refreshed local `origin/main` and GitHub REST `main` both remain
  `dd91f18346d7326ab71c1a77769bfe7aed310af3`.
- GitHub REST reports the remote source ref at exactly
  `312c8389ee25eca74e653178fba5b9bb85ae8f7e`.
- At this pre-PR checkpoint, the all-states source-branch PR query returned
  zero; no PR existed yet. The later authorized creation is recorded above.
- Root branch, root HEAD, empty staged state, all 12 tracked dirty-path hashes,
  and unrelated worktree occupancy and heads still match the recorded
  preservation snapshot.
- No post-push remote mutation was performed during independent verification.

## Approved Stable-Manifest Correction

The user approved a revised snapshot-only plan after the required repository
check exposed the missing stable scene-manifest entry.

Pre-correction identity was reconfirmed before editing:

- clean local, remote source, and PR #14 head:
  `312c8389ee25eca74e653178fba5b9bb85ae8f7e`;
- local and GitHub `main`:
  `dd91f18346d7326ab71c1a77769bfe7aed310af3`;
- PR #14 OPEN with auto-merge disabled.

The correction added exactly this sorted five-line object to
`internal/oracle-harness/src/__snapshots__/scenes.test.ts.snap`, between the
existing `img/img-02-object-fit` and `pos/pos-03-z-index` objects:

```text
  {
    "height": 180,
    "id": "img/img-03-css-background",
    "width": 320,
  },
```

- Exact working diff: one file, five insertions, zero deletions.
- Owning stable-manifest test: one file / four tests passed.
- Separate fourth commit:
  `92c8452f02da3fa5c304e81d89c3c9905ba453d5`
  (`test(oracle): update stable scene manifest`).
- No amend, rebase, cherry-pick, merge, or history rewriting occurred.
- `git range-diff` proves the first three commits are unchanged and only the
  fourth commit was appended.
- Final local topology: zero behind, four ahead; clean worktree.
- Final exact payload: 23 files, 2,631 insertions, 78 deletions.

## Final Corrected Local Validation

Every approved command exited 0 against final local head
`92c8452f02da3fa5c304e81d89c3c9905ba453d5`:

| Command | Result |
| --- | --- |
| Exact 23-file Biome | 20 supported files checked; no errors or fixes |
| Core tests / types / build | 34 files, 280 tests / passed / passed |
| Adapter tests / types / build | 12 files, 58 tests / passed / passed |
| Extension tests / types / Chrome / Firefox builds | 7 files, 33 tests / passed / passed / passed; known Firefox permission warning only |
| Core-delta tests | 7 tests passed |
| Governance core-delta | `ac830db5b89d2e8e7eede86f9419303988ae1938`; 15 governed runtime paths, zero unmapped runtime paths |
| Stable core and adapter | `@figit/dom-to-figma@0.2.4` / `859efea8d7f8330783c6c4e3e520fd673e877336`; passed |
| Upstream-main core and adapter | `859efea8d7f8330783c6c4e3e520fd673e877336`; passed |
| Oracle parity | 47 scenes; 15 existing Tier-0 findings in one class; BG1 scene zero findings; ratchet passed |
| `git diff --check origin/main...HEAD` | passed |

An additional full `pnpm test` passed, directly covering the prior CI failure:

- oracle harness: 20 files / 102 tests passed; three files / five explicitly
  gated tests skipped;
- core: 280 tests; adapter: 58; extension: 33; fig-kiwi: 41;
  composed-dom: 5; all passed;
- stable scene-manifest test passed within the full repository run.

Generated governance reports all bind their `resolved.head` to
`92c8452f02da3fa5c304e81d89c3c9905ba453d5` and contain no runtime mapping
error.

## Final Corrected Independent Review

No blocking issue was found.

- The fourth commit is exactly the approved snapshot object and matches the
  Oracle scene's `width=320 height=180` declaration.
- The scoreboard still only adds the BG1 zero-finding entry; no existing
  baseline, tolerance, threshold, epsilon, or fingerprint was relaxed.
- The changeset, compatibility contract, registry, staged-resource spec, and
  BG2 exclusions remain unchanged and valid.
- The 23-file payload adds only the required stable manifest snapshot to the
  prior reviewed 22-file shape. It contains no application source, lockfile,
  release workflow, lazy activation, dirty-root content, or unrelated change.
- Root remains `sync/upstream-20260726` at
  `0ad29a9464775f3e4bc3cb4b8007cff3ff48ce7b`, with no staged paths; all 12
  preservation hashes and unrelated worktree heads remain unchanged.
- Final local BG1 worktree is clean at
  `92c8452f02da3fa5c304e81d89c3c9905ba453d5`.
- GitHub `main` remains `dd91f18346d7326ab71c1a77769bfe7aed310af3`;
  remote source and PR #14 remain at
  `312c8389ee25eca74e653178fba5b9bb85ae8f7e`, as required before a separately
  authorized update push.

No push, PR/body/head update, workflow rerun, merge, auto-merge, conversation
resolution, close, branch deletion, or other remote mutation occurred during
the snapshot correction, validation, or review.

## Authorized Corrected Update Push

Immediately before the user-authorized update push, read-only checks proved:

- clean local head
  `92c8452f02da3fa5c304e81d89c3c9905ba453d5`;
- remote source and PR #14 interim head
  `312c8389ee25eca74e653178fba5b9bb85ae8f7e`;
- local and remote `main`
  `dd91f18346d7326ab71c1a77769bfe7aed310af3`;
- the interim remote source was an ancestor of the final local head, so the
  update was a fast-forward.

The only authorized mutation command was:

```powershell
git -c http.sslBackend=openssl push --porcelain origin refs/heads/task/rebuild-bg1-css-raster-backgrounds:refs/heads/task/rebuild-bg1-css-raster-backgrounds
```

- Exit code: 0.
- Git result: `312c838..92c8452`; no force option or force refspec was used.
- Immediate remote-ref readback returned
  `92c8452f02da3fa5c304e81d89c3c9905ba453d5`.
- PR #14 remained OPEN and non-draft with unchanged base
  `dd91f18346d7326ab71c1a77769bfe7aed310af3`, final head `92c8452f`, all four
  exact source commits, 23 exact files with zero set difference, 2,631
  insertions, 78 deletions, and `auto_merge` null.
- The GitHub PR body remained byte-for-byte unchanged at SHA-256
  `ae2e354df3caa008a19d37cb9f406f47d206b7b9f47be92be27d8f80df8eb806`.

No PR title/body update, merge, auto-merge, branch deletion, direct `main`
push, or other remote mutation was performed.

## Replacement CI On Final Head

Replacement CI for
`92c8452f02da3fa5c304e81d89c3c9905ba453d5` reached terminal state with zero
pending, failed, or skipped check runs:

| Check | Conclusion |
| --- | --- |
| `Lint, typecheck, build, test` | success |
| `Inspect local package tarballs` | success (advisory preview) |
| `Latest stable upstream compatibility` | success |
| `Tier-0 parity ratchet` | success |
| `Upstream core delta governance` | success |
| `Upstream main compatibility` | success |

- Repository gate run/job:
  `https://github.com/aakkino/web-to-figma/actions/runs/33166634178/job/98833502183`.
- Advisory preview run/job:
  `https://github.com/aakkino/web-to-figma/actions/runs/33166634159/job/98833502127`.
- The successful repository gate includes the stable scene-manifest test that
  failed in initial run `33155565818`, closing that exact omission on Linux.

No check rerun or workflow mutation was requested or performed.

## Regenerated Final PR Draft

The local `.trellis/tasks/08-28-promote-bg1-to-main/pr-draft.md` was
regenerated for the exact final shape and independently checked:

- four exact commits through final head `92c8452f`;
- 23 listed files, matching the base-to-head file set with zero difference;
- 2,631 insertions and 78 deletions;
- the fourth snapshot-only commit and stable manifest file;
- the initial CI snapshot failure, its exact closure evidence, and the
  terminal replacement CI matrix;
- all scope exclusions, compatibility/governance contracts, review
  expectations, rollback unit, and deferred BG2 dependency.

The regenerated body is 8,285 characters with SHA-256
`f7708610ef777b5488d42c4d2bf50597143242f71da9e2d66eaca65d1fd84721`.
GitHub still has the old reviewed body at SHA-256
`ae2e354df3caa008a19d37cb9f406f47d206b7b9f47be92be27d8f80df8eb806`.
Material PR-body update authorization has not been given, so no GitHub title
or body change was made.

## Authorized Material PR Body Synchronization

The user separately authorized only synchronizing PR #14's body from the
independently reviewed local draft. Immediate read-only REST preflight proved:

- PR #14 OPEN and non-draft;
- exact title `feat(dom-to-figma): support CSS raster backgrounds`;
- base `dd91f18346d7326ab71c1a77769bfe7aed310af3` and head
  `92c8452f02da3fa5c304e81d89c3c9905ba453d5`;
- four exact commits, 23 files, 2,631 insertions, and 78 deletions;
- auto-merge null;
- old remote body SHA-256
  `ae2e354df3caa008a19d37cb9f406f47d206b7b9f47be92be27d8f80df8eb806`;
- local final body 8,285 characters at SHA-256
  `f7708610ef777b5488d42c4d2bf50597143242f71da9e2d66eaca65d1fd84721`;
- all six final-head check runs completed/success.

The first `gh api --method PATCH` transport returned EOF. Mandatory readback
proved the remote body was still the old exact hash, so the ambiguous request
had not changed PR state. A subsequent explicit HTTP/1.1 curl attempt failed
during TLS handshake; another mandatory readback again proved the old body was
unchanged. Only after both negative readbacks was one bounded PATCH retried.
That request exited 0 and returned PR #14 with the exact unchanged title,
base, head, OPEN state, and non-draft state.

Immediate independent REST readback then proved:

- remote body exactly 8,285 characters at SHA-256
  `f7708610ef777b5488d42c4d2bf50597143242f71da9e2d66eaca65d1fd84721`;
- title, base, head, state, draft state, all four commit SHAs, exact 23-file
  count, +2,631/-78 stats, and null auto-merge unchanged;
- mergeable state `clean`;
- all six final-head checks still completed/success, with zero non-success
  runs.

The update changed only the PR body. No title/base/head update, push, check
rerun, merge, auto-merge, close/delete, conversation resolution, or other
remote mutation occurred.

## Final Read-Only PR Review Inspection

GitHub GraphQL readback reports:

- merge state `CLEAN`;
- zero review threads and therefore zero unresolved conversations;
- zero submitted reviews and `reviewDecision` null;
- auto-merge null;
- base/head still exactly `dd91f183` / `92c8452f`.

There is no current review-conversation blocker. At that checkpoint, merge
remained a separate, unauthorized remote mutation; the later authorization and
transport stop are recorded below.

## Authorized Merge Attempt And Transport Stop

The user separately authorized merging PR #14 only with GitHub's merge-commit
method. Immediate preflight reconfirmed every gate:

- PR OPEN, non-draft, and merge state `CLEAN`;
- exact base `dd91f18346d7326ab71c1a77769bfe7aed310af3` and head
  `92c8452f02da3fa5c304e81d89c3c9905ba453d5`;
- exact title and final body SHA-256
  `f7708610ef777b5488d42c4d2bf50597143242f71da9e2d66eaca65d1fd84721`;
- four exact commits, 23 files, +2,631/-78;
- all six current-head checks completed/success;
- zero review threads and unresolved conversations;
- auto-merge null;
- repository setting `allow_merge_commit=true`.

Each guarded GitHub merge request bound the expected head and requested only
the merge-commit method:

```text
PUT repos/aakkino/web-to-figma/pulls/14/merge
sha=92c8452f02da3fa5c304e81d89c3c9905ba453d5
merge_method=merge
```

Three `gh api` attempts returned EOF. After every ambiguous response,
authoritative PR readback proved `state=open`, `merged=false`, and
`merged_at=null` before another attempt was considered. One alternate
PowerShell HTTPS request failed while establishing TLS; its mandatory readback
also proved no merge occurred.

Final independent REST and GraphQL readbacks agree:

- PR #14 remains OPEN and `merged=false`;
- `mergedAt` is null and GraphQL reports no merge commit;
- merge state remains `CLEAN`;
- base/head remain exact and auto-merge remains disabled.

The REST `merge_commit_sha` value visible on an open PR is GitHub's prospective
test-merge identity and is not evidence of a completed merge; GraphQL
`mergeCommit` is null. The merge transport is therefore blocked, and no
post-merge fetch, containment proof, source-branch change, parent-governance
reconciliation, archive, or artifact commit was performed.

## Single GraphQL Merge Attempt

After REST transport was exhausted, the user authorized exactly one distinct
GraphQL merge mechanism. A fresh preflight reconfirmed all prior gates and also
returned:

- PR node ID `PR_kwDOTi3JR88AAAABBUDU8w`;
- repository `mergeCommitAllowed=true`;
- four exact GraphQL commit OIDs and the exact 23-file count;
- all six current-head checks completed/success.

Exactly one `mergePullRequest` mutation was sent with `mergeMethod: MERGE` and
`expectedHeadOid` set to
`92c8452f02da3fa5c304e81d89c3c9905ba453d5`.

The mutation returned EOF and was not retried. Immediate bounded authoritative
readback through both REST and GraphQL proved:

- REST: OPEN, `merged=false`, `merged_at=null`;
- GraphQL: OPEN, `merged=false`, `mergedAt=null`, `mergeCommit=null`;
- merge state `CLEAN`, exact base/head unchanged, and auto-merge null.

No merge occurred. The transport blocker remains, and no post-merge fetch,
containment proof, source-branch mutation, governance reconciliation, archive,
or task-artifact commit was performed.

## Successful Fresh Merge Retry

The user explicitly requested one fresh merge retry. A new authoritative
preflight again proved PR #14 OPEN/non-draft/CLEAN with the exact base, head,
title, body hash, four commits, 23 files, +2,631/-78, six current-head checks,
zero unresolved conversations, null auto-merge, and merge-commit support.

One guarded REST request specified the exact expected head and
`merge_method=merge`. It exited 0 and returned:

```text
merged=true
sha=98c10d5fd0ad8b7c97f8b5bb397fa19d24852313
message=Pull Request successfully merged
```

Immediate REST and GraphQL readbacks independently confirmed:

- PR state MERGED at `2026-08-28T12:18:17Z`;
- merge commit `98c10d5fd0ad8b7c97f8b5bb397fa19d24852313`;
- merge parents exactly `dd91f18346d7326ab71c1a77769bfe7aed310af3`
  and `92c8452f02da3fa5c304e81d89c3c9905ba453d5`;
- auto-merge remained null and review thread count remained zero.

No squash, rebase merge, protection bypass, direct `main` push, auto-merge,
source-branch deletion, or other remote mutation occurred.

## Post-Merge Containment And Preservation

An explicit fetch refreshed `origin/main` and the source remote-tracking ref:

- `origin/main` and GitHub `main`:
  `98c10d5fd0ad8b7c97f8b5bb397fa19d24852313`;
- remote source branch preserved at
  `92c8452f02da3fa5c304e81d89c3c9905ba453d5`;
- final reviewed head ancestry in `origin/main`: exit 0;
- merge commit ancestry in `origin/main`: exit 0;
- reviewed-head tree versus final-main tree: no difference;
- base-to-main payload: exact 23 files, 2,631 insertions, 78 deletions, zero
  file-set difference from base-to-reviewed-head;
- source worktree: clean at `92c8452f`.

GitHub post-merge readback retained the exact 23-file PR list and all six
current-head checks at completed/success.

Before the authorized governance reconciliation edits, root preservation was
rechecked: branch `sync/upstream-20260726`, HEAD `0ad29a9464`, zero staged
paths, all 12 recorded dirty-path SHA-256 values exact, and all unrelated
worktree paths/branches/heads unchanged. Subsequent root changes are limited to
the explicitly authorized active/archived/parent task records.

Rollback is one reviewed PR reverting merge commit `98c10d5f`; `main` must
never be rewritten. BG2 remains deferred pending separate user planning
authorization.
