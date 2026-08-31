# FD1 Local Reconciliation Evidence

Captured on 2026-08-30. This execution was authorized only through local
reconciliation, validation, review preparation, and smoke. No push, pull
request creation or update, merge, branch deletion, or worktree cleanup was
performed.

## Identity And Preflight

- Refreshed target: `origin/main@decde39a60a220d6ea853f04c3893a0446fa76bf`.
- Remote `main` resolved to the same SHA after
  `git fetch origin main --no-tags` (exit 0); no target drift occurred.
- Preserved source was clean at
  `task/rebuild-fd1-font-diagnostics@62eef8de9ff01b4d58c905a8f8e2949da00703b8`.
- Common base was `dd91f18346d7326ab71c1a77769bfe7aed310af3`;
  topology was 14 behind and one ahead before reconciliation.
- The remote source ref was absent and the open source-PR query returned `[]`.
- The repeated `git merge-tree` preview reported zero conflict markers. Only
  `app.tsx` and `vitest.config.ts` were changed on both sides.

## Local Reconciliation

The exact refreshed target was merged into the preserved source with
`git merge --no-ff --no-edit decde39a...` (exit 0).

- Reconciled head:
  `d3459aa954ef1b6035c1f370d628ac50b8263329`.
- Parents, in order:
  `62eef8de9ff01b4d58c905a8f8e2949da00703b8` and
  `decde39a60a220d6ea853f04c3893a0446fa76bf`.
- Both exact parents are ancestors of the reconciled head.
- Base-to-head payload is exactly the approved four files, 461 insertions and
  five deletions:
  - `apps/extension/entrypoints/content/app.tsx`
  - `apps/extension/entrypoints/content/font-recovery-diagnostics.tsx`
  - `apps/extension/entrypoints/content/font-recovery-diagnostics.test.tsx`
  - `apps/extension/vitest.config.ts`
- Both diagnostics module blobs are byte-identical to `62eef8d`.
- Relative to refreshed `main`, `app.tsx` adds the diagnostics import and
  replaces only the old request-count paragraph with the reviewed component.
  Vitest retains every current project/include and adds only the FD1 test.

## Validation

All commands below ran on committed head `d3459aa` with Node `v24.6.0` and
pnpm `10.33.2`.

| Command | Exit | Result |
| --- | ---: | --- |
| Directed four-file Biome rerun | 0 | 4 files checked, no fixes |
| Focused diagnostics test | 0 | 1 file, 6/6 tests |
| `pnpm --filter extension test` | 0 | 10 files, 61/61 tests |
| `pnpm --filter extension check-types` | 0 | passed |
| `pnpm --filter extension build` | 0 | Chrome MV3, 20.58 MB |
| `pnpm --filter extension build:firefox` | 0 | Firefox MV2, 20.58 MB; known data-collection advisory only |
| `pnpm check-types` | 0 | all 8 workspace projects |
| `pnpm build` | 0 | all 8 workspace projects |
| `pnpm test` | 0 | complete repository gate; counts below |
| `git diff --check decde39a...HEAD` | 0 | passed |

The complete repository test included: upstream-core-delta 7/7; fig-kiwi
41/41; composed-dom 5/5; dom-to-figma 281/281; browser capture adapter 87/87;
extension 61/61; Oracle 102 passed with five explicitly gated skips.

The first extension test/type-check attempt used the preserved worktree's old
dependency links and could not resolve the merged-main `@noble/hashes`
dependency. `pnpm install --frozen-lockfile` exited 0 without a tracked diff;
both gates then passed in full.

The first directed Biome command saw CRLF working-tree presentation in the two
auto-merged files. Biome restored LF for those two approved files; Git proved
their normalized content identical to the committed blobs, the index refresh
created no staged diff, and the exact directed rerun passed.

## Repository Lint Baseline

`pnpm lint` on the reconciled Windows checkout exited 1: 400 files were
checked and 396 unrelated CRLF formatting errors were reported. No unrelated
file was normalized to make this gate pass.

The same command was reproduced against an exact detached local clone of
`decde39a` with the machine's `core.autocrlf=true`: it exited 1 with 398 files
checked and 398 CRLF formatting errors. This proves the whole-repository lint
failure is pre-existing on the exact refreshed base. The approved four-file
directed Biome gate passed.

## Real-Extension Smoke

The Chrome MV3 bundle was loaded in a real headed/offscreen Playwright
Chromium `147.0.7727.15` persistent context. The background service worker
opened the content workspace successfully and strict capture reached the font
recovery view at a 360 by 800 viewport.

The first bounded fixture used a missing CJK page font and produced
`1 exact / 0 fallback / 2 unavailable`; that fixture did not satisfy the
combined-state acceptance criterion. The evidence-closure fixture then used
the resolver's documented page-candidate contract: the exact request used a
page `@font-face` at weight 400, while a second request for the same family at
weight 500 resolved through that page candidate at weight 400. The third
request used a sensitive URL-shaped family with a missing resource and an
unsupported glyph.

The single evidence-closure run exited 0 and observed:

- the exact combined summary
  `3 font requests: 1 exact, 1 fallback, 1 unavailable.`;
- the fallback row showed requested `Noto Sans TC Thin / 500 / normal` and
  resolved `Noto Sans TC Thin / 400 / normal`;
- the unavailable row rendered `family unavailable`;
- `Retry fonts`, `Use compatible fonts`, and `Cancel capture` appeared in the
  required order;
- both mismatch technical-detail disclosures were collapsed;
- the panel fit the narrow viewport (`x=16`, `right=344`, `width=328`);
- the malicious requested family URL was replaced by `family unavailable`;
  neither the host nor `private.woff2` appeared in the recovery UI.

Computed styles were independently read from the real page before capture and
confirmed weights 400, 500, and 400 for the exact, fallback, and unavailable
fixtures. The passing screenshot is retained at
`C:/Users/abskino/AppData/Local/Temp/fd1-extension-smoke-closure-ErlUNA/fd1-font-recovery-closure.png`.
All browser contexts and local HTTP servers were closed in `finally`, and a
process-table recheck found no owned Chrome, Chromium, or Node process.

## Preservation And Remote State

- Dirty root remained
  `sync/upstream-20260726@9c949a4a7a7560b460562014232d982c1f21533c`
  with zero staged paths.
- Every tracked dirty-path SHA-256 captured before reconciliation matched at
  final recheck.
- Unrelated registered worktree paths, branches, and heads were unchanged.
- FD1 worktree is clean at `d3459aa` with zero staged diff.
- `origin/main` remains `decde39a`; remote source branch and source PR remain
  absent.

The exact pre-execution table was recovered from the original command output
and compared mechanically with a fresh `Get-FileHash -Algorithm SHA256` run.
All 17 comparisons returned `True`:

| Tracked dirty path | Pre-execution SHA-256 | Fresh result |
| --- | --- | --- |
| `.gitignore` | `14F8A98C576B35A880F761EC304386CCF061D3DA2D6DF49B429B8640CF3A85D7` | match |
| `.trellis/spec/dom-to-figma/frontend/index.md` | `7D224A5B3AF2EDB1A5540AE88B4432B8DA945667FE0CD0B3006ABC8B1B7BF8CB` | match |
| `.trellis/tasks/08-28-execute-approved-sync-cherry-picks/candidate-registry.md` | `C49381984EA60DB1D926FFC1669A58556ECB81E720D14BE5C6191E04DF777DDE` | match |
| `.trellis/tasks/08-28-execute-approved-sync-cherry-picks/design.md` | `81217CA691A6A8A449179193EDC91DC33EE64D11EF8E665D3E7219AF243D3026` | match |
| `.trellis/tasks/08-28-execute-approved-sync-cherry-picks/prd.md` | `23278AE83C1AE001F259240618DAF89B8AF64AEDB09183A1A1AFA12051AD766D` | match |
| `.trellis/tasks/08-28-execute-approved-sync-cherry-picks/task.json` | `E40A804E77C535EB85EC3658ECD18F8C050F63EF4018458D986384539EC765DE` | match |
| `.trellis/tasks/08-28-govern-sync-branch-cherry-picks/prd.md` | `8FB7C89DD1F4C7B034F7995708DD501AB8DEAA479BECD5A46124DA1F88588373` | match |
| `.trellis/tasks/08-28-govern-sync-branch-cherry-picks/task.json` | `F61151DEE2A7D4775914C740A6AA3D73653B54D131C0E9AB0AF7E236FF68D9F7` | match |
| `.trellis/tasks/archive/2026-08/08-28-rebuild-bg1-css-raster-backgrounds/approval-manifest.md` | `CEF6288C0E28A246E650F754479ADFE58D743A8C6247206F7FEEF2F2D13433F1` | match |
| `.trellis/tasks/archive/2026-08/08-28-rebuild-bg1-css-raster-backgrounds/check.jsonl` | `F3809B23E6F33E2816F978C0A1DC64BEC6B32F9CAD0E5C460106D6462C3BB898` | match |
| `.trellis/tasks/archive/2026-08/08-28-rebuild-bg1-css-raster-backgrounds/design.md` | `99F3DEA8F5B691C78D5D5163E1459CA7B90B4A867EC514F643E9411AE302AA0F` | match |
| `.trellis/tasks/archive/2026-08/08-28-rebuild-bg1-css-raster-backgrounds/implement.jsonl` | `A195613D983C66B749D220CE6221E9A3097D261E8182752D29060EFA7DD9308E` | match |
| `.trellis/tasks/archive/2026-08/08-28-rebuild-bg1-css-raster-backgrounds/implement.md` | `A40A084FD8413A258C6DB59B0E81D3AAF7370D3F4A10FE5D19FAC4EFBF4A6886` | match |
| `.trellis/tasks/archive/2026-08/08-28-rebuild-bg1-css-raster-backgrounds/prd.md` | `AEB16734BF9E17A4AFA54F6576082FF9607BF6D109B37EDDF8B393DACCF185F6` | match |
| `.trellis/workspace/kino/index.md` | `AA3BD4CF21D3A460B908CDF884E14A55FB3A601DF67D9759173F08E90EE8FBAE` | match |
| `.trellis/workspace/kino/journal-1.md` | `2901B55A81D78DE8D0D96BDA38891D6D6E1851DB44D61358C35ACF31BDB6020D` | match |
| `packages/fig-kiwi/src/clipboard.test.ts` | `25D373332EA5954C03D3DEE4A2F00335E77B2A54A641AEA5E0C7F7B5A702FBAC` | match |

The local merge commit is retained as the rollback point. Ordinary push is
still a separate, unauthorized remote mutation. The reconciled head must be
independently checked before push authorization is requested.
