# Sync Integration Assessment, 2026-08-28

## Decision And Snapshot

Do not merge, rebase, squash, or replay `sync/upstream-20260726`. The pinned
baseline independently contains the compatibility foundation and a stronger
style/effects implementation, while sync also contains obsolete release and
governance state, bookkeeping history, and unrelated product cohorts. A
whole-branch operation would regress reviewed target pins, private-package
release policy, converter contracts, and clean PR lineage.

Snapshot started at `2026-08-28T09:25:13.9986376+08:00` in `Asia/Shanghai`.
All Git reads used `--no-optional-locks` and process-local
`-c safe.directory=D:/desktop_directory/web-to-figma`. No fetch, checkout,
switch, add, restore, stash, clean, merge, rebase, cherry-pick, commit,
update-ref, push, PR, or remote command was run.

| Observation | Exact value | Result |
| --- | --- | --- |
| Pinned target | `baseline/origin-main-20260828@dd91f18346d7326ab71c1a77769bfe7aed310af3` | matched |
| Source / root HEAD | `sync/upstream-20260726@2172b181853e111dab5c9e261cc19426420f649f` | matched |
| Merge base | `606ee8aa9ca4915ec28dd7853fd5b42283ff54ea` | matched |
| Local `main`; cached `origin/main` | both `dd91f18346d7326ab71c1a77769bfe7aed310af3` | observations only; matched target |
| Ordinary left/right | `37 / 73` | matched plan |
| `--cherry-pick` left/right | `37 / 73` | matched plan |
| `git cherry` sync side | 73 `+`, 0 `-` | patch signal only |
| Full tip-tree delta | 343 files, +48,782/-7,051 | not a value signal |
| Core runtime delta | 35 files, +2,060/-2,437 | capability review required |
| Extension/adapter delta | 38 files, +5,549/-262 | selective candidates remain |
| Pre-assessment index SHA-256 | `D9F47A104C7F8D7E0372C9517D5428467D1D88B21280DBD33BCC16414243357D` | protected |
| Staged paths | none | protected |

Evidence levels retain the historical scale: L0 commit identity, L1 Trellis
provenance, L2 bounded recorded checks, L3 integration/intake audit, L4 remote
PR/CI, and L5 reachability from the pinned stabilized line. Baseline commits
and merged PR lineage are L5. Historical task closure alone remains L1.

## Baseline-Only Map (37 Of 37)

Every row in `sync/upstream-20260726..baseline/origin-main-20260828` is mapped.
Merge rows cite the reviewed child delta they make reachable. Release and
private-registry rows are included because they make old sync metadata unsafe.

| # | Full SHA and subject | Stat / principal paths | Role | Sync relationship |
| --- | --- | --- | --- | --- |
| B01 | `81abcdfc47d0c6a61dff9d4f8b593fa61e47a10f` govern reviewed upstream deltas | 9 files, +1188/-3; CI/registry/checker/spec | governance rebuild | supersedes S02; strengthened by B17/B21 |
| B02 | `82787e6240ed4d4410e41c6c948ec4da6c511f22` reviewed vanilla fallback | 9 files, +846/-145; adapter/CI/spec | adapter fallback | represents S05; supersedes S06 |
| B03 | `38450080b059b514baa49cf834797f23cbb84dc6` forward compatibility args | 1 file, +3/-3; CI | CI correction | invalidates old workflow replay |
| B04 | `5a953fdc0ddeb644957f0d1f2286a8d1e5db5bea` fetch reviewed stable tag | 1 file, +5; CI | CI correction | invalidates old workflow replay |
| B05 | `c9e4e3914dab262adcc4b37556543843e13708ab` merge PR #2 | 15 files, +2038/-147 | reviewed C1+C2 lineage | makes B01-B04 L5 |
| B06 | `49d8055ee95b3f9e529f782876e042f6055de71a` reviewed composed traversal | 12 files, +380/-42; converter/layout/tests/spec | traversal rebuild | represents S09 with fork contracts |
| B07 | `8291c6b1a8ab2d8e9e29e4cc567f4286a20415f2` merge PR #3 | 12 files, +380/-42 | reviewed traversal lineage | makes B06 L5 |
| B08 | `16ea58b5681f2c599044c9fc257b04543b717103` glyph-aware font coverage | 5 files, +172/-4; tests/registry/spec | font correctness | represents S12; supersedes S13 |
| B09 | `9839c7e89ab9b7b146a0ccacaf34516887fb6e0a` merge PR #4 | 5 files, +172/-4 | reviewed font lineage | makes B08 L5 |
| B10 | `5f85e2b1c29a3c69e37836bbf58f7f1c4d0342b1` adapter-owned image pipeline | 13 files, +190/-530; image API/loader/presentation/tests | image rebuild | represents S16-S17; supersedes S18 |
| B11 | `13948d88e3ec6a0939f39d8f69ce3ef637976a68` merge PR #5 | 13 files, +190/-530 | reviewed image lineage | makes B10 L5 |
| B12 | `9986a891f87755379c7bfb5f93ab4fc2ae8e3268` advanced borders | 10 files, +1669/-110; border/outline/decomposition | border evolution | supersedes parser-only S28 |
| B13 | `a92dc5ca189343a8975a027ac1c1a559fc25700a` advanced gradients | 3 files, +699/-67; gradient/types/tests | gradient evolution | supersedes S31 |
| B14 | `0e07a71105eb9e4400de063cd805d5e3600dc9ec` filter and shadow parity | 6 files, +549/-53; blur/filter/shadow/tests | effects evolution | supersedes S29-S30 |
| B15 | `9826786c6dbb79c59f425e942e475a1ee88928e9` fractional geometry | 1 file, +1/-4; converter DOM | geometry resolution | preserves stronger baseline contract |
| B16 | `bf0bf8edd5a84db2072cb2843698d7b8ee6f959e` rendering parity integration | 12 files, +787/-27; converter/frame/text/browser | integration | supersedes S32 |
| B17 | `993b34a13fcb3bf3729017c65a266bab8bb9b023` upstream-main gate | 9 files, +529/-180; CI/registry/adapters | governance gate | supersedes S33 |
| B18 | `f6a16feb07a835fd44bd4e77e4c46467606315b0` safe color-matrix spec | 1 file, +99; rendering contract | leaf-safety contract | strengthens B14 beyond S30 |
| B19 | `a2a553935c8b437460e24146f447d1a911cc295f` archive reassessment | 37 files, +958; Trellis archives | provenance | no source intake |
| B20 | `c7c0be2f75a9473408663f2d140a1a9418d6c4ec` journal | 2 files, +42/-1 | provenance | no source intake |
| B21 | `2cac473be19afeaf5375b2013df90138334a064a` fetch upstream for governance | 1 file, +5; CI | governance fix | further invalidates S33 replay |
| B22 | `b40fcfc786f53043a4d5ac71c6b1c4af099ec4ff` merge PR #7 | 1 file, +5 | reviewed CI lineage | makes B21 L5 |
| B23 | `ea3982da379e7fa722f10384770e498eb4392003` merge PR #6 | 81 files, +5333/-442 | rendering intake lineage | makes B12-B20 L5 |
| B24 | `834550c5ecb9256ea752a3c866d5c3497f84a1ec` package previews | 1 file, +3/-3; preview workflow | release governance | old sync release state unsafe |
| B25 | `f95e914c07dad8a38cae313b10dba74e62219975` merge PR #8 | 1 file, +3/-3 | reviewed preview lineage | makes B24 L5 |
| B26 | `33e50b8a94a4b6b223a2b5de60549a636ed57c76` release packages | 14 files, +65/-78; changesets/versions/changelogs | release boundary | sync changesets obsolete |
| B27 | `8ef6b90909a0f0112fae6d6220bcb124c64f8d4d` merge PR #9 | 14 files, +65/-78 | reviewed release lineage | makes B26 L5 |
| B28 | `fc5fcdf3f6cb739607bea439485eea662426a14f` private package migration | 61 files, +1633/-460; manifests/lock/apps/release | package ownership | conflicts with sync package assumptions |
| B29 | `899efb114980dbb2b138b4aea7d8fff2a311cda3` private release spec | 18 files, +163/-33; repository/package specs | release contract | supersedes sync-era guidance |
| B30 | `7b5bc37d8b79d6afa26e17f7f10fb19be3d02b45` merge PR #10 | 79 files, +1796/-493 | migration lineage | makes B28-B29 L5 |
| B31 | `162ae493d7d6ca54622d10fab768eb311ffd5645` restricted recovery | 12 files, +607/-23; workflows/scripts/spec | release recovery | absent from sync; preserve |
| B32 | `ff5410e61de4e9243d8f46967fb5de6199e5ee12` merge PR #11 | 12 files, +607/-23 | recovery lineage | makes B31 L5 |
| B33 | `0cc540c4eb8f5b9ee811bf291dffe62c9912ec8f` publisher identity | 9 files, +460/-64; workflow/scripts/spec | release identity | absent from sync; preserve |
| B34 | `5924719a23c2d76e8b7d39598e3383683e50081b` merge PR #12 | 9 files, +460/-64 | publisher lineage | makes B33 L5 |
| B35 | `4bc0068562101b3e5b26ff237fac6481ea610185` registry tarball verification | 2 files, +248/-25; release script/test | artifact integrity | absent from sync; preserve |
| B36 | `f96b6fa9f139f6bec5d170b7ac558ca50b1ede70` registry verification spec | 1 file, +12/-1 | durable contract | absent from sync; preserve |
| B37 | `dd91f18346d7326ab71c1a77769bfe7aed310af3` merge PR #13 | 3 files, +260/-26 | pinned target | makes B35-B36 L5 |

This map proves both negative results: compatibility/style work is already
represented or superseded, while B24-B37 make sync's package and release tree
actively regression-prone.

## Sync-Only Ledger (73 Of 73)

The ledger is oldest-to-newest. All 73 objects are linear, single-parent
commits: S01's parent is
`606ee8aa9ca4915ec28dd7853fd5b42283ff54ea`; every later row's parent is the
full SHA in the immediately preceding row. All have `git cherry` signal `+`.
Thus the table records full SHA, parent, date, subject, path scope/stat,
evidence, relationship, and one terminal disposition without repeating a
40-character parent in every row. `R` is represented, `S` superseded, `C`
selective candidate, `H` historical only, and `X` exclude.

| # | Date; full SHA and exact Git subject | Stat / concrete path scope | Cohort; evidence | Baseline relation; disposition |
| --- | --- | --- | --- | --- |
| S01 | 2026-07-25; `221137273ac0ac565c540af857ab6a0745d981ac` chore(trellis): add upstream compatibility task tree | 43 files, +1265; `.trellis/tasks/07-25-*` | C1 planning; L1 | provenance only; **H** |
| S02 | 2026-07-25; `41ff3991d65bf54e915b52df52dafa074cff6b7b` feat(ci): govern upstream core deltas | 9 files, +1188/-3; CI/spec/registry/checker | C1; old L3 | B01/B03/B04/B17/B21 rebuild; **S** |
| S03 | 2026-07-25; `05a11c2283c1659498aba2371d58921f1b5de526` chore(task): archive upstream-core-delta-governance | 6 files, +2/-2; Trellis archive | metadata; L1 | no source value; **X** |
| S04 | 2026-07-25; `6a9675f6a86f6d3bf12038fc3abf3b5f640c376a` chore: record journal | 2 files, +37/-2; workspace | journal; L1 | chronology only; **X** |
| S05 | 2026-07-26; `86a83e9f33c202b506be6728bb4bcc4fef1a9d11` feat(adapter): support vanilla upstream image staging | 6 files, +754/-114; adapter/CI/scripts | C2; old L3 | rebuilt by B02/B05; **R** |
| S06 | 2026-07-26; `f874f03fa656fc22d47cbbd47c07d8b335d261d9` docs(adapter): document vanilla upstream fallback | 6 files, +125/-54; specs/docs/task | C2; old L3/L1 | current B02/B29 contract; **S** |
| S07 | 2026-07-26; `e36cc144986f9336f8a04f37a2374b8ce1a78b18` chore(task): archive vanilla-upstream-adapter-fallback | 6 files, +2/-2; Trellis archive | metadata; L1 | no source value; **X** |
| S08 | 2026-07-26; `342559a0cea78a2b55327f3b23ed17561749089d` chore: record journal | 2 files, +49/-5; workspace | journal; L1 | chronology only; **X** |
| S09 | 2026-07-26; `afd3a84d91f52315f20ca3b828ff54293140b8fc` feat(converter): harden composed DOM traversal | 17 files, +543/-66; converter/adapter/tests/spec | C3; old L3 | rebuilt by B06/B07; **R** |
| S10 | 2026-07-26; `3db12cb9266c01bc7adddfb4492cb1b9d79d6866` chore(task): archive upstream-dom-traversal-port | 8 files, +2/-2; Trellis archive | metadata; L1 | no source value; **X** |
| S11 | 2026-07-26; `057bf235f7e3fb48c92cba770ee433985bf56bf3` chore: record journal | 2 files, +36/-2; workspace | journal; L1 | chronology only; **X** |
| S12 | 2026-07-26; `d8456cd5a435edb8c1a96d2d4a35fb0e878d931d` test(converter): harden glyph-aware font coverage | 3 files, +70/-1; font/browser tests | C4; old L3 | rebuilt by B08/B09; **R** |
| S13 | 2026-07-26; `0c1616e35048b38b296f29426dfd2989e70234e0` docs(converter): prepare text and font upstream handoff | 8 files, +353/-29; spec/registry/task | C4; old L3/L1 | current registry/spec differs; **S** |
| S14 | 2026-07-26; `4de033b1391c7ba034821f2bff1c4da25ac4b97e` chore(task): archive upstream-text-font-correctness | 9 files, +2/-2; Trellis archive | metadata; L1 | no source value; **X** |
| S15 | 2026-07-26; `ed8b382659ab3e1738af1c1f465561671318c55d` chore: record journal | 2 files, +37/-2; workspace | journal; L1 | chronology only; **X** |
| S16 | 2026-07-26; `aa6bbdca31f412753e57452d4bca1f57feeb12e4` refactor(dom-to-figma): retire core image preparation | 7 files, +39/-355; core image API/cache/tests | C5; old L3 | rebuilt by B10/B11; **R** |
| S17 | 2026-07-26; `e8d928a9c1dff86afb871b43378710ec02116784` fix(dom-to-figma): harden image presentation and cancellation | 4 files, +60/-18; loader/presentation/tests | C5; old L3 | rebuilt by B10/B11; **R** |
| S18 | 2026-07-26; `cd3f0ded9f5505597d861949970cdd1c896db646` docs(converter): record adapter-owned image pipeline | 2 files, +91/-157; spec/registry | C5; old L3 | current B10/B28/B29 differs; **S** |
| S19 | 2026-07-26; `9be7c216b00f63c29dac1999745411a4848e9980` chore(task): archive upstream-image-pipeline | 9 files, +192/-52; archive/research | C5 provenance; L1/L2 | research only; **H** |
| S20 | 2026-07-26; `bac116ad8a7ac18812cfa6af72b140c45c6dbf83` chore: record journal | 2 files, +38/-2; workspace | journal; L1 | old-main chronology; **X** |
| S21 | 2026-07-26; `f125c2d391fcb287a4a01cbd61591806f843bd5a` docs(upstream): record retirement baseline review | 6 files, +115/-12; task/spec/registry/research | retirement; L3 | old decision provenance; **H** |
| S22 | 2026-07-26; `c0bbcb5daf511ae9d803d5155c8b3482930d4ab2` chore(task): archive upstream-patch-retirement | 7 files, +2/-2; Trellis archive | metadata; L1 | no source value; **X** |
| S23 | 2026-07-26; `0873aaf1e0530f4b30fa251a1471d0e6bc76dfa0` chore: record journal | 2 files, +36/-2; workspace | journal; L1 | chronology only; **X** |
| S24 | 2026-07-26; `ce7cb0e80a3491efed8056a1e27160a6dd45813f` docs(upstream): consolidate compatibility architecture review | 4 files, +95/-26; task/research | architecture; L3 | decision provenance; **H** |
| S25 | 2026-07-26; `c7bb78e805d5d49485316b55452026528c010bae` docs(upstream): record architecture review approval | 3 files, +5/-2; task/research | architecture; L3 | decision provenance; **H** |
| S26 | 2026-07-26; `c620c12749bf19fee52d388acc597324dc77b3e8` chore(task): archive upstream-compat-architecture | 8 files, +2/-2; Trellis archive | metadata; L1 | no source value; **X** |
| S27 | 2026-07-26; `c9b013f1b8d3e747912d8c832f4b77ea995cacbf` chore: record journal | 2 files, +38/-2; workspace | journal; L1 | chronology only; **X** |
| S28 | 2026-07-27; `aafd9664fff7a857508e80c06145e31fbe3e8d74` feat(dom-to-figma): parse css double borders | 1 file, +62/-1; `styles/border.ts` | style intake; L3 | advanced B12 replaces; **S** |
| S29 | 2026-07-27; `b32e833a0e9e58971a99c89ced5a766751923b83` feat(dom-to-figma): parse text and filter shadows | 5 files, +252/-6; blur/shadow/types/tests | style intake; L3 | B14/B16 replace; **S** |
| S30 | 2026-07-27; `d25c0d2434b3053173bde215815890d41dd635bd` feat(dom-to-figma): bake css color filters | 2 files, +245; filter parser/test | style intake; L3 | B14/B18 safer; **S** |
| S31 | 2026-07-27; `553f591d5291ed01e905279726f6b7dadac48620` feat(dom-to-figma): support radial and angled gradients | 3 files, +306/-51; gradient/types/tests | style intake; L3 | advanced B13 replaces; **S** |
| S32 | 2026-07-27; `e6f4c43ed90074ffa67b3c0d08276358615d6487` feat(dom-to-figma): integrate upstream style effects | 16 files, +635/-16; converter/frame/text/browser/oracle | style intake; L3 | B16 replaces; **S** |
| S33 | 2026-07-27; `f79f990ece72dfb7c66aa94c4d2ac7388518b7fd` ci: execute adapter against upstream main | 10 files, +472/-176; CI/spec/registry/scripts | governance; L3 | B17/B21 current; **S** |
| S34 | 2026-07-27; `84f527a19d51af0b1ace4baaf238138de13c3a28` docs(upstream): record style effects intake audit | 8 files, +370; Trellis audit | style provenance; L3 | exact old-tree evidence; **H** |
| S35 | 2026-07-27; `ce894959cedeaea38227f89ebe3c531c40baa978` chore(task): archive upstream-style-effects-intake | 8 files, +2/-2; Trellis archive | metadata; L1 | no source value; **X** |
| S36 | 2026-07-27; `4c27bc263aea054203442e1f13a87b95ab1f4c69` chore: record journal | 2 files, +44/-3; workspace | journal; L1 | chronology only; **X** |
| S37 | 2026-07-31; `67ccefd245bbe8f5d0dd4d66349795dedae922f9` docs: document eyeondesign web_to_dom image diagnosis | 11 files, +31123; reports/JSON/PNG/task | diagnosis; L2 | research, not source; **H** |
| S38 | 2026-07-31; `95ef1f28a44fea84e8b33cac63a2947995858b64` docs(dom-to-figma): record image staging background boundary | 1 file, +88; staged-resource spec | diagnosis; L2 | candidate rationale; **H** |
| S39 | 2026-07-31; `f02f861514809add68be00c93b6ac88e3ff4a7c1` chore(task): archive eyeondesign-web-to-dom-image-diagnosis | 11 files, +2/-2; Trellis archive | metadata; L1 | no source value; **X** |
| S40 | 2026-07-31; `7690af69c917fcbbeb95787116863c28438cdafe` chore: record journal | 2 files, +39/-3; workspace | journal; L1 | chronology only; **X** |
| S41 | 2026-07-31; `6f7ff8c8ee48b276ac5dab97ccbaf59d2c0be430` chore(task): repair archived image diagnosis manifest | 1 file, +1/-1; archived JSONL | metadata; L1 | no source value; **X** |
| S42 | 2026-07-31; `d663c6bee734382c75062ec4067e809b92345f12` feat: extract css background images | 21 files, +2330/-66; core/adapter/background/tests | BG1; old L2 | rasterizer absent on baseline; **C** |
| S43 | 2026-07-31; `75f9bc0b122e0a55318b8b26ab6b883e11c02597` chore: register css background capability | 1 file, +57/-7; registry | BG1 governance; old L2 | only with rebuilt BG1; **C** |
| S44 | 2026-07-31; `9fb02ea5532b66fbe815cecc5cd03116197121c0` docs: codify css background staging contract | 1 file, +85/-27; staged-resource spec | BG1 contract; old L2 | reconcile current spec; **C** |
| S45 | 2026-07-31; `3bc2cd06be5e45dacb6025720ff8b6be72da6998` chore: archive background extraction task | 7 files, +1089; archive/research | BG1 provenance; L2 | evidence only; **H** |
| S46 | 2026-07-31; `be47e62774179f582cffedbbfc6dd5198e293546` test(extension): sync capture plan fixture | 1 file, +3; extension test | BG2; old L2 | fixture with BG2; **C** |
| S47 | 2026-07-31; `9df8d0b8c387471c83fadb72c7f195e5b7d5ac17` fix(extension): capture lazy background sources | 27 files, +891/-28; extension/adapter/core/spec/tests | BG2; old L2 | module absent on baseline; **C** |
| S48 | 2026-07-31; `c285e068d83633452c5bc8269e550c1c41161b18` chore(task): archive lazy background capture | 6 files, +3/-3; Trellis archive | metadata; L1 | no source value; **X** |
| S49 | 2026-08-01; `dfd432b85ad83510efe4a892bc99fbaa03cdd051` feat(capture): add bounded lazy activation preflight | 15 files, +2093/-8; extension/adapter/activation/tests | LA1; old L2/smoke | module absent on baseline; **C** |
| S50 | 2026-08-01; `3bb1705a7e0f7f7d5f273ece178014e61df97c50` chore(task): archive browser-capture-lazy-activation-preflight | 7 files, +692; archive/live smoke | LA1 provenance; L2 | evidence only; **H** |
| S51 | 2026-08-01; `627b895128ba6378087c3d1c7661e56a5138e099` chore: record journal | 2 files, +110/-3; workspace | journal; L1 | chronology only; **X** |
| S52 | 2026-08-01; `e1f134b0d022e13a530ad15e139e24373789c1cb` feat(extension): add replayable figit capture artifacts | 23 files, +2755/-165; extension artifact/output/tests | CP1; old L3 | modules absent on baseline; **C** |
| S53 | 2026-08-01; `468a72d1cbee8fc13fe77f0d439b25070e44823a` chore(task): archive figit-capture-artifact | 7 files, +2/-2; Trellis archive | metadata; L1 | no source value; **X** |
| S54 | 2026-08-01; `f51b3dbcface90a8ace38c26abd094b26b94705a` chore: record journal | 2 files, +43/-4; workspace | journal; L1 | chronology only; **X** |
| S55 | 2026-08-01; `2361077a2ab5c7aa004007d597e20ba5a9ea2314` fix(extension): align capture persistence integration | 1 file, +1/-1; extension `app.tsx` | CP2; old L3 | rebuild after CP1; **C** |
| S56 | 2026-08-01; `e281719bb1aba2e9f626fbdfd492748f6618bf8c` docs(extension): record capture integration contracts | 8 files, +88/-53; specs/README/screenshots | CP2; old L3 | reconcile current shape; **C** |
| S57 | 2026-08-01; `d373ab8f96ea008e9b1fe3fe50f5565b4b29d9c7` chore(task): archive extension-capture-persistence | 9 files, +153/-134; archive/research | CP provenance; L3 | evidence only; **H** |
| S58 | 2026-08-01; `f82c4a5be1f8f80798c409d2450d4aaa0567e740` chore: record journal | 2 files, +37/-2; workspace | journal; L1 | chronology only; **X** |
| S59 | 2026-08-01; `db6085e8b0d7946d1c7ad48881e782124d8a2fe0` fix(capture): wait for delayed infinite-scroll resources | 7 files, +175/-11; activation/test/task/spec | LA2; old L2 | only after LA1; **C** |
| S60 | 2026-08-01; `fec358978a2c6676fb2e2c89cfcf39e68845263d` chore(task): archive stabilize-lazy-activation-edge | 4 files, +2/-2; Trellis archive | metadata; L1 | no source value; **X** |
| S61 | 2026-08-01; `ee62ac0acc5413a2554eaf2b09b3a02f8945d75b` chore: record journal | 2 files, +36/-2; workspace | journal; L1 | chronology only; **X** |
| S62 | 2026-08-03; `f547f8ed915350030ec243d930e63d244b4898da` docs(upstream): audit PR 33 and 34 compatibility | 10 files, +740; spec/task/research | upstream decision; L2 | frozen decision only; **H** |
| S63 | 2026-08-03; `d38c4534fdf995b778b8605e32d97aa647b66863` chore(task): archive research-upstream-pr-33-34 | 9 files, +2/-2; Trellis archive | metadata; L1 | no source value; **X** |
| S64 | 2026-08-03; `a3c8cfbb4c00ad9390098956cf62980df40ff711` chore: record journal | 2 files, +25/-3; workspace | journal; L1 | chronology only; **X** |
| S65 | 2026-08-12; `49966ef87924d3b0b2f4c3de92fc431d300bb9e9` feat(extension): explain font capture mismatches | 4 files, +365/-5; extension UI/test/config | FD1; old L2 | module absent on baseline; **C** |
| S66 | 2026-08-12; `990345a121d2946b201a219516caa89ccb575123` chore(task): archive font-capture-diagnostics | 4 files, +109; Trellis archive | metadata; L1 | no source value; **X** |
| S67 | 2026-08-12; `07bbcd751c34a378caeb91b10681842f37c64b7d` chore: record journal | 2 files, +145; workspace | journal; L1 | chronology only; **X** |
| S68 | 2026-08-27; `e8cbc3471bc46c14a707c865a15684cebca442f3` chore(task): archive migrate-fork-private-package-registry | 9 files, +1471; archive/research | later metadata; L1 | baseline owns B28-B37; **X** |
| S69 | 2026-08-27; `6f27ba47ca9fa14ae5e770f1efc9fa66fe8bcd2c` chore: record journal | 2 files, +73/-3; workspace | journal; L1 | chronology only; **X** |
| S70 | 2026-08-28; `549394841269347cbe7ecd027a5306a9f987355f` chore(task): archive 08-27-fix-governance-ci-upstream-fetch | 4 files, +114; Trellis archive | later metadata; L1 | baseline owns B21-B22; **X** |
| S71 | 2026-08-28; `3009347a6eae034cced1b67e17423248de119801` chore(task): archive 08-27-fix-pkg-pr-new-preview | 4 files, +101; Trellis archive | later metadata; L1 | baseline owns B24-B25; **X** |
| S72 | 2026-08-28; `3b4efa8b119b798e5c41ad75c26d74fa2210c1b1` chore(task): archive 08-27-prepare-reassess-upstream-pr | 4 files, +258; Trellis archive | later metadata; L1 | baseline already reassessed; **X** |
| S73 | 2026-08-28; `2172b181853e111dab5c9e261cc19426420f649f` chore: record journal | 2 files, +34/-3; workspace | journal; L1 | root-tip chronology; **X** |

Disposition totals are **R 5 + S 10 + C 11 + H 12 + X 35 = 73**. The
first 20 rows reconcile the old-local-main ledger; S21-S67 reproduce every row
of the 2026-08-25 47-row sync audit; S68-S73 are the six later commits. No row
is missing, duplicated, or assigned more than one terminal state.

## Dirty Root Worktree Inventory

The root checkout remains `sync/upstream-20260726@2172b181...`. Staged state
is empty. Five tracked paths appear in porcelain-v2; only three have content
diffs. Dirty content is not included in either commit ledger.

| Tracked path | Index/sync blob | Worktree blob | Baseline blob | Classification |
| --- | --- | --- | --- | --- |
| `.gitignore` | `475bca5f...` | `4bfd4f4f...` | `475bca5f...` | real dirty content, +1/-0 vs both tips; tooling/ignore candidate |
| `.trellis/spec/dom-to-figma/frontend/index.md` | `520f75ab...` | `50acf922...` | `3ca2efac...` | real dirty content, +1/-0 vs sync and +2/-1 vs baseline; spec candidate |
| `packages/dom-to-figma/src/converter/classify.test.ts` | `ec5228d6...` | `ec5228d6...` | `ec5228d6...` | status-only line-ending/stat noise; no content diff |
| `packages/dom-to-figma/src/converter/classify.ts` | `113619ba...` | `113619ba...` | `113619ba...` | status-only line-ending/stat noise; no content diff |
| `packages/fig-kiwi/src/clipboard.test.ts` | `0844b11d...` | `67630b12...` | `0844b11d...` | real dirty product test, +11/-1 vs both tips; separate fig-kiwi candidate |

The earlier six-path snapshot also included
`.trellis/workspace/kino/index.md`; it is no longer a tracked status entry at
this pinned snapshot. This is observed drift between audits, not attributed to
this assessment, and was not restored.

Normal untracked groups:

- active Trellis/platform infrastructure: `.agents/`, `.claude/`, `.codex/`,
  `.trellis/scripts/`, `.trellis/agents/`, `.trellis/workflow.md`, config, and
  template metadata;
- active/archive evidence: this task and the listed 2026-07/2026-08 archived
  task directories;
- external experiments: `heho/`, `published-package-test/`, and seven
  top-level `08-26-*` directories;
- temporary/generated: `.tmp/` and two untracked screenshot PNGs;
- repository instruction: `AGENTS.md`.

Ignored groups include package/app `node_modules/`, `dist/`, `.wxt/`,
`.output/`, Vitest attachments/screenshots, oracle output, `.artifacts/`,
`.ace-codemap/`, Trellis backups/runtime/cache, staged-consumer tarballs, and
generated package-test output. Recursive ignored enumeration is not claimed
exhaustive: Windows emitted existing missing-directory and filename-too-long
warnings under `.tmp/upstream-image-presentation/node_modules`.

Preservation rule: do not stage, normalize, move, delete, clean, stash, or
transplant any dirty path. The three real changes need explicit ownership and
separate tasks. The two status-only paths need no product action unless a
later authorized task establishes an intended line-ending normalization.

## Disposition Matrix

| Cohort | Sync rows | State | Evidence-backed reason | Follow-up gate / rollback unit |
| --- | --- | --- | --- | --- |
| Compatibility foundation | S02, S05-S06, S09, S12-S13, S16-S18 | represented/superseded | B01-B11 independently reviewed and L5 | no port; preserve baseline registry, adapter, tests, and package contracts |
| Historical decisions/audits | S01, S19, S21, S24-S25, S34, S37-S38, S45, S50, S57, S62 | historical only | useful provenance, never source intake | cite in owning task; rollback is task-local planning deletion |
| Old style/effects | S28-S33 | superseded | B12-B18 are broader and integrated against stabilized contracts | no port; baseline rendering regression suite owns validation |
| BG1 CSS raster backgrounds | S42-S44 | selective candidate | rasterizer absent on baseline; old commit crosses core/adapter | isolated worktree; registry review, core/adapter unit+browser, oracle parity; one BG1 PR rollback |
| BG2 lazy background sources | S46-S47 | selective candidate | lazy-background module absent; depends on BG1 staging | after BG1; extension+adapter browser/resource round-trip; one BG2 PR rollback |
| LA1 lazy activation | S49 | selective candidate | activation module absent; old smoke is stale | isolated task; dwell/mutation/resource browser tests and extension build; one LA1 PR rollback |
| LA2 infinite-scroll edge | S59 | selective candidate | refines LA1 quiet window; cannot stand alone | after LA1; focused edge tests/live smoke; one LA2 PR rollback |
| CP1 capture artifact | S52 | selective candidate | artifact/output modules absent | extension schema/round-trip, Chrome+Firefox builds/smoke; one CP1 PR rollback |
| CP2 capture persistence | S55-S56 | selective candidate | depends on CP1 and current UI/package contracts | after CP1; extension UI/unit/type/build and persistence smoke; one CP2 PR rollback |
| FD1 font diagnostics | S65 | selective candidate | presentation module absent; core behavior unaffected | independent extension UI test/type/build/browser check; one FD1 PR rollback |
| Bookkeeping | remaining 35 X rows | exclude | task/archive/journal only, including duplicated later archives | never port; retain source branch as historical reference |
| Dirty-only content | 3 real + 2 status-only tracked paths, untracked/ignored groups | outside commit disposition | ownership/intent not established by history | separate preservation, cleanup, or product authorization |

Selective work must preserve composed traversal, glyph fallback, object-fit and
object-position, image-loader cancellation, nowrap sizing, rendering parity,
current target fingerprints, private package names/registry/recovery policy,
and current release workflow.

### Evidence Anchors And Candidate Contracts

The ledger's evidence levels resolve to these existing local artifacts. The
highest level is scoped to the recorded tree; none of the old L2/L3 checks is
treated as current-baseline execution evidence.

| Rows / cohort | Existing local evidence anchor | Highest evidence and remaining gap |
| --- | --- | --- |
| S01-S36 compatibility/style | `.trellis/tasks/archive/2026-08/08-26-reassess-upstream-cherry-pick/research/live-upstream-reassessment-2026-08-26.md`; `.trellis/tasks/archive/2026-07/07-27-upstream-style-effects-intake/research/final-intake-audit-2026-07-27.md` | L5 for B01-B23 reachability and replacement; July L3 applies only to the old sync tree |
| S37-S45 diagnosis/BG1 | `.trellis/tasks/archive/2026-07/07-31-eyeondesign-web-to-dom-image-diagnosis/research/diagnosis.md`; `.trellis/tasks/archive/2026-07/07-31-eyeondesign-image-background-extraction-fix/check.jsonl` | L2 diagnosis/task check; no current-baseline implementation or tests |
| S46-S48 BG2 | `.trellis/tasks/archive/2026-07/07-31-extension-lazy-background-capture/check.jsonl` | old L2 task check; no current-baseline browser/resource round trip |
| S49-S51 LA1 | `.trellis/tasks/archive/2026-08/07-31-browser-capture-lazy-activation-preflight/research/live-eyeondesign-smoke.md` | old L2 live smoke; stale against current extension and adapter |
| S52-S54 CP1 | `.trellis/tasks/archive/2026-08/07-24-figit-capture-artifact/check.jsonl`; `.trellis/tasks/archive/2026-08/07-24-figit-capture-artifact/research/upstream-compatibility-audit-2026-07-29.md` | old L3 bounded integration evidence; no private-package/current-browser validation |
| S55-S58 CP2 | `.trellis/tasks/archive/2026-08/07-24-extension-capture-persistence/check.jsonl`; `.trellis/tasks/archive/2026-08/07-24-extension-capture-persistence/research/current-capture-capability-map.md` | old L3 bounded integration evidence; current UI and persistence contracts untested |
| S59-S61 LA2 | `.trellis/tasks/archive/2026-08/08-01-stabilize-lazy-activation-edge/check.jsonl` | old L2 focused check; depends on an unported LA1 |
| S62-S64 upstream research | `.trellis/tasks/archive/2026-08/08-03-research-upstream-pr-33-34/research/pr-33-34-cherry-pick-decision-2026-08-03.md` | L2 frozen decision; current target movement invalidates operational conclusions |
| S65-S67 FD1 | `.trellis/tasks/archive/2026-08/08-12-font-capture-diagnostics/check.jsonl` | old L2 task check; no current extension UI/browser validation |
| S68-S73 later metadata | baseline B21-B37 plus the 2026-08-26 reassessment above | L5 baseline ownership; sync rows add archive/journal copies only |

Every selective candidate is a rebuild/port investigation, not approval to
apply its old commit. Target and rollback boundaries are:

| Candidate | Exact target boundary | Dependency / conflicting baseline contracts | Minimum validation | Rollback unit |
| --- | --- | --- | --- | --- |
| BG1 | `packages/dom-to-figma/src/converter/styles/` and `internal/browser-capture-adapter/src/`; registry/spec only if the rebuilt capability requires them | current adapter-owned image pipeline, target fingerprints, private package/release policy | both package unit suites, adapter browser resource round trip, extension build, oracle parity | one BG1 PR |
| BG2 | `apps/extension/entrypoints/content/`, `internal/browser-capture-adapter/src/`, and only required background hooks in `packages/dom-to-figma/src/` | BG1 first; preserve current staging, cancellation, and object-fit/object-position contracts | extension and adapter unit/browser tests, resource round trip, extension build | one BG2 PR |
| LA1 | `apps/extension/entrypoints/content/`, `apps/extension/shared/`, and `internal/browser-capture-adapter/src/lazy-activation*` | current capture settings and staged-resource contracts; independent of BG1/CP1 | dwell, mutation, resource and browser tests plus extension type/build and live smoke | one LA1 PR |
| LA2 | `internal/browser-capture-adapter/src/lazy-activation*` and the owning staged-resource spec | LA1 first; preserve bounded quiet-window and cancellation behavior | focused infinite-scroll edge tests and live smoke | one LA2 PR |
| CP1 | `apps/extension/entrypoints/content/capture-artifact*`, `capture-output*`, and direct content-entry consumers | current private-package manifests and extension messaging/security; do not replay old lockfile/package metadata | schema and artifact round trip, extension unit/type/build, Chrome and Firefox smoke | one CP1 PR |
| CP2 | `apps/extension/entrypoints/content/app.tsx` plus current extension capture specs/README | CP1 first; reconcile current UI/state and persistence contracts | extension UI/unit/type/build and persistence smoke | one CP2 PR |
| FD1 | `apps/extension/entrypoints/content/font-recovery-diagnostics*` and its direct UI consumer | current glyph-aware fallback remains authoritative; diagnostic UI must not alter core conversion | focused UI test, extension type/build, browser check | one FD1 PR |

## Follow-Up Candidate DAG

```text
BG1 CSS raster backgrounds -> BG2 lazy background sources
LA1 lazy activation -> LA2 infinite-scroll stabilization
CP1 capture artifact -> CP2 capture persistence
FD1 font diagnostics

dirty ownership/preservation decision (independent)
```

BG1, LA1, CP1, and FD1 may be evaluated independently in isolated worktrees.
No child task, branch, or worktree is created here. The user must decide which
roots retain enough value to authorize planning; BG2, LA2, and CP2 must wait
for their parent capability. Dirty preservation and cleanup are separate from
all committed candidates.

## Whole-Branch Rejection

A whole merge/rebase/squash/replay would combine 73 patch-unique commits and
343 changed paths while erasing the evidence boundaries above. Concretely it
would reintroduce old target registries and CI over B01-B21, replace advanced
border/gradient/effects work with incomplete July slices, risk the fork's
composed traversal/font/image/nowrap contracts, collide with B24-B37 private
release governance, and mix five unrelated product candidates with 35
excluded bookkeeping commits. Conflict resolution or a squash would make
those regressions less auditable, not safer.

## Validation Contract

Read-only reproduction uses:

```powershell
git --no-optional-locks -c safe.directory=D:/desktop_directory/web-to-figma rev-parse baseline/origin-main-20260828 sync/upstream-20260726 main origin/main
git --no-optional-locks -c safe.directory=D:/desktop_directory/web-to-figma merge-base baseline/origin-main-20260828 sync/upstream-20260726
git --no-optional-locks -c safe.directory=D:/desktop_directory/web-to-figma rev-list --left-right --count baseline/origin-main-20260828...sync/upstream-20260726
git --no-optional-locks -c safe.directory=D:/desktop_directory/web-to-figma rev-list --left-right --cherry-pick --count baseline/origin-main-20260828...sync/upstream-20260726
git --no-optional-locks -c safe.directory=D:/desktop_directory/web-to-figma cherry baseline/origin-main-20260828 sync/upstream-20260726
git --no-optional-locks -c safe.directory=D:/desktop_directory/web-to-figma rev-list --reverse baseline/origin-main-20260828..sync/upstream-20260726
git --no-optional-locks -c safe.directory=D:/desktop_directory/web-to-figma rev-list --reverse sync/upstream-20260726..baseline/origin-main-20260828
git --no-optional-locks -c safe.directory=D:/desktop_directory/web-to-figma log --reverse --format='%H%x09%P%x09%cs%x09%s' baseline/origin-main-20260828..sync/upstream-20260726
git --no-optional-locks -c safe.directory=D:/desktop_directory/web-to-figma status --porcelain=v2 --branch
git --no-optional-locks -c safe.directory=D:/desktop_directory/web-to-figma diff --cached --name-only
git --no-optional-locks -c safe.directory=D:/desktop_directory/web-to-figma worktree list --porcelain
git --no-optional-locks -c safe.directory=D:/desktop_directory/web-to-figma diff --check -- .trellis/tasks/08-28-assess-sync-integration
python ./.trellis/scripts/task.py validate .trellis/tasks/08-28-assess-sync-integration
```

Baseline absence checks confirmed these candidate modules do not exist at
`dd91f183...`: `background-rasterizer.ts`, `lazy-background.ts`,
`lazy-activation.ts`, `capture-artifact.ts`, `capture-output.ts`, and
`font-recovery-diagnostics.tsx`. No product suite is claimed; current runtime
checks belong to the selective follow-up that owns the affected package.

Post-assessment SHA, index, staged state, tracked hashes, worktree occupancy,
row/set equality, Markdown/link consistency, task validation, and
`git diff --check` are recorded by the Phase 2 quality gate.

Phase 2 local verification completed at
`2026-08-28T09:41:14.7688155+08:00`:

- report sync rows `73`, Git sync rows `73`, duplicates `0`, exact order
  equality `true`;
- report baseline rows `37`, Git baseline rows `37`, duplicates `0`, exact
  order equality `true`;
- terminal states `C=11`, `H=12`, `R=5`, `S=10`, `X=35`;
- Markdown table pipe errors `0`;
- `task.py validate` passed with five real entries in each context manifest;
- `git diff --check -- .trellis/tasks/08-28-assess-sync-integration` passed;
- the five post-assessment worktree blobs exactly match the pre-assessment
  values in the dirty inventory;
- protected refs still resolve to baseline/main/origin-main `dd91f183...`,
  sync/HEAD `2172b181...`, and merge base `606ee8aa...`;
- staged paths remain empty, the root plus five linked worktree occupancies are
  unchanged, and the root index SHA-256 remains
  `D9F47A104C7F8D7E0372C9517D5428467D1D88B21280DBD33BCC16414243357D`.

Independent Phase 2.2 review completed at
`2026-08-28T09:58:01.9237212+08:00`:

- independently recomputed both exact ordered sets, all 110 commit stats, the
  73-row linear parent chain, exact dates/subjects, the old 47-row continuity,
  six later rows, cherry signals, and terminal totals;
- corrected the 73 sync rows to record exact Git subjects, then revalidated
  every row and added the task-local evidence/candidate contract index above;
- confirmed all 13 cited evidence files exist, all candidate modules exist at
  the sync tip and are absent at the pinned baseline, Markdown tables have no
  pipe errors, and the report has no trailing whitespace or broken links;
- reran Trellis validation successfully with five real entries in each
  context manifest; task-directory `git diff --check` exited cleanly, and a
  no-index whitespace check of this untracked report emitted no whitespace
  diagnostics;
- confirmed refs, merge base, root branch/HEAD, staged state, the five tracked
  SHA-256 values, index SHA-256, and the root plus five linked worktree
  occupancies are identical to the pre-check values;
- did not run product lint, type-check, or tests because no product file changed
  and this assessment's approved validation scope is report/Git/Trellis only.
