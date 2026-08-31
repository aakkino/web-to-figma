# Extended Sync Closure Ledger

## Re-pinned Snapshot

Captured on 2026-08-30 using read-only Git commands with process-local
`safe.directory` and `--no-optional-locks`.

| Observation | Exact value |
| --- | --- |
| Source | `sync/upstream-20260726@c54ee85f4c6e63e9abdbb8043e42e2f0f5172820` |
| Target | `origin/main@1c98bb0e0d04682f619a5aadccdd5027959ac2e0` |
| Merge base | `606ee8aa9ca4915ec28dd7853fd5b42283ff54ea` |
| Target-only / source-only | `56 / 88` |
| Ordered ledger extent | `S01-S88` (88 unique commits) |

The source advanced from the planning-time S85 boundary through the authorized
S79 child, execution-container, and reconciliation-child archive commits
S86-S88. This is still a freeze candidate only: the closure-child and top-level
parent archives are covered by the final handoff before a terminal SHA is
nominated.

## Terminal-State Contract

Every row has exactly one terminal state: represented, superseded, ported,
port candidate, historical only, or excluded. S01-S73 preserve the authoritative
2026-08-28 audit decisions; S74-S88 are independently re-read below. The
ordered identities and parents were recomputed from
`git rev-list --reverse 606ee8aa..c54ee85f`.

| Row | Full SHA | Parent | Date | Exact subject | Terminal disposition |
| --- | --- | --- | --- | --- | --- |
| S01 | `221137273ac0ac565c540af857ab6a0745d981ac` | `606ee8aa9ca4915ec28dd7853fd5b42283ff54ea` | 2026-07-25 | chore(trellis): add upstream compatibility task tree | historical only |
| S02 | `41ff3991d65bf54e915b52df52dafa074cff6b7b` | `221137273ac0ac565c540af857ab6a0745d981ac` | 2026-07-25 | feat(ci): govern upstream core deltas | superseded |
| S03 | `05a11c2283c1659498aba2371d58921f1b5de526` | `41ff3991d65bf54e915b52df52dafa074cff6b7b` | 2026-07-25 | chore(task): archive upstream-core-delta-governance | excluded |
| S04 | `6a9675f6a86f6d3bf12038fc3abf3b5f640c376a` | `05a11c2283c1659498aba2371d58921f1b5de526` | 2026-07-25 | chore: record journal | excluded |
| S05 | `86a83e9f33c202b506be6728bb4bcc4fef1a9d11` | `6a9675f6a86f6d3bf12038fc3abf3b5f640c376a` | 2026-07-26 | feat(adapter): support vanilla upstream image staging | represented |
| S06 | `f874f03fa656fc22d47cbbd47c07d8b335d261d9` | `86a83e9f33c202b506be6728bb4bcc4fef1a9d11` | 2026-07-26 | docs(adapter): document vanilla upstream fallback | superseded |
| S07 | `e36cc144986f9336f8a04f37a2374b8ce1a78b18` | `f874f03fa656fc22d47cbbd47c07d8b335d261d9` | 2026-07-26 | chore(task): archive vanilla-upstream-adapter-fallback | excluded |
| S08 | `342559a0cea78a2b55327f3b23ed17561749089d` | `e36cc144986f9336f8a04f37a2374b8ce1a78b18` | 2026-07-26 | chore: record journal | excluded |
| S09 | `afd3a84d91f52315f20ca3b828ff54293140b8fc` | `342559a0cea78a2b55327f3b23ed17561749089d` | 2026-07-26 | feat(converter): harden composed DOM traversal | represented |
| S10 | `3db12cb9266c01bc7adddfb4492cb1b9d79d6866` | `afd3a84d91f52315f20ca3b828ff54293140b8fc` | 2026-07-26 | chore(task): archive upstream-dom-traversal-port | excluded |
| S11 | `057bf235f7e3fb48c92cba770ee433985bf56bf3` | `3db12cb9266c01bc7adddfb4492cb1b9d79d6866` | 2026-07-26 | chore: record journal | excluded |
| S12 | `d8456cd5a435edb8c1a96d2d4a35fb0e878d931d` | `057bf235f7e3fb48c92cba770ee433985bf56bf3` | 2026-07-26 | test(converter): harden glyph-aware font coverage | represented |
| S13 | `0c1616e35048b38b296f29426dfd2989e70234e0` | `d8456cd5a435edb8c1a96d2d4a35fb0e878d931d` | 2026-07-26 | docs(converter): prepare text and font upstream handoff | superseded |
| S14 | `4de033b1391c7ba034821f2bff1c4da25ac4b97e` | `0c1616e35048b38b296f29426dfd2989e70234e0` | 2026-07-26 | chore(task): archive upstream-text-font-correctness | excluded |
| S15 | `ed8b382659ab3e1738af1c1f465561671318c55d` | `4de033b1391c7ba034821f2bff1c4da25ac4b97e` | 2026-07-26 | chore: record journal | excluded |
| S16 | `aa6bbdca31f412753e57452d4bca1f57feeb12e4` | `ed8b382659ab3e1738af1c1f465561671318c55d` | 2026-07-26 | refactor(dom-to-figma): retire core image preparation | represented |
| S17 | `e8d928a9c1dff86afb871b43378710ec02116784` | `aa6bbdca31f412753e57452d4bca1f57feeb12e4` | 2026-07-26 | fix(dom-to-figma): harden image presentation and cancellation | represented |
| S18 | `cd3f0ded9f5505597d861949970cdd1c896db646` | `e8d928a9c1dff86afb871b43378710ec02116784` | 2026-07-26 | docs(converter): record adapter-owned image pipeline | superseded |
| S19 | `9be7c216b00f63c29dac1999745411a4848e9980` | `cd3f0ded9f5505597d861949970cdd1c896db646` | 2026-07-26 | chore(task): archive upstream-image-pipeline | historical only |
| S20 | `bac116ad8a7ac18812cfa6af72b140c45c6dbf83` | `9be7c216b00f63c29dac1999745411a4848e9980` | 2026-07-26 | chore: record journal | excluded |
| S21 | `f125c2d391fcb287a4a01cbd61591806f843bd5a` | `bac116ad8a7ac18812cfa6af72b140c45c6dbf83` | 2026-07-26 | docs(upstream): record retirement baseline review | historical only |
| S22 | `c0bbcb5daf511ae9d803d5155c8b3482930d4ab2` | `f125c2d391fcb287a4a01cbd61591806f843bd5a` | 2026-07-26 | chore(task): archive upstream-patch-retirement | excluded |
| S23 | `0873aaf1e0530f4b30fa251a1471d0e6bc76dfa0` | `c0bbcb5daf511ae9d803d5155c8b3482930d4ab2` | 2026-07-26 | chore: record journal | excluded |
| S24 | `ce7cb0e80a3491efed8056a1e27160a6dd45813f` | `0873aaf1e0530f4b30fa251a1471d0e6bc76dfa0` | 2026-07-26 | docs(upstream): consolidate compatibility architecture review | historical only |
| S25 | `c7bb78e805d5d49485316b55452026528c010bae` | `ce7cb0e80a3491efed8056a1e27160a6dd45813f` | 2026-07-26 | docs(upstream): record architecture review approval | historical only |
| S26 | `c620c12749bf19fee52d388acc597324dc77b3e8` | `c7bb78e805d5d49485316b55452026528c010bae` | 2026-07-26 | chore(task): archive upstream-compat-architecture | excluded |
| S27 | `c9b013f1b8d3e747912d8c832f4b77ea995cacbf` | `c620c12749bf19fee52d388acc597324dc77b3e8` | 2026-07-26 | chore: record journal | excluded |
| S28 | `aafd9664fff7a857508e80c06145e31fbe3e8d74` | `c9b013f1b8d3e747912d8c832f4b77ea995cacbf` | 2026-07-27 | feat(dom-to-figma): parse css double borders | superseded |
| S29 | `b32e833a0e9e58971a99c89ced5a766751923b83` | `aafd9664fff7a857508e80c06145e31fbe3e8d74` | 2026-07-27 | feat(dom-to-figma): parse text and filter shadows | superseded |
| S30 | `d25c0d2434b3053173bde215815890d41dd635bd` | `b32e833a0e9e58971a99c89ced5a766751923b83` | 2026-07-27 | feat(dom-to-figma): bake css color filters | superseded |
| S31 | `553f591d5291ed01e905279726f6b7dadac48620` | `d25c0d2434b3053173bde215815890d41dd635bd` | 2026-07-27 | feat(dom-to-figma): support radial and angled gradients | superseded |
| S32 | `e6f4c43ed90074ffa67b3c0d08276358615d6487` | `553f591d5291ed01e905279726f6b7dadac48620` | 2026-07-27 | feat(dom-to-figma): integrate upstream style effects | superseded |
| S33 | `f79f990ece72dfb7c66aa94c4d2ac7388518b7fd` | `e6f4c43ed90074ffa67b3c0d08276358615d6487` | 2026-07-27 | ci: execute adapter against upstream main | superseded |
| S34 | `84f527a19d51af0b1ace4baaf238138de13c3a28` | `f79f990ece72dfb7c66aa94c4d2ac7388518b7fd` | 2026-07-27 | docs(upstream): record style effects intake audit | historical only |
| S35 | `ce894959cedeaea38227f89ebe3c531c40baa978` | `84f527a19d51af0b1ace4baaf238138de13c3a28` | 2026-07-27 | chore(task): archive upstream-style-effects-intake | excluded |
| S36 | `4c27bc263aea054203442e1f13a87b95ab1f4c69` | `ce894959cedeaea38227f89ebe3c531c40baa978` | 2026-07-27 | chore: record journal | excluded |
| S37 | `67ccefd245bbe8f5d0dd4d66349795dedae922f9` | `4c27bc263aea054203442e1f13a87b95ab1f4c69` | 2026-07-31 | docs: document eyeondesign web_to_dom image diagnosis | historical only |
| S38 | `95ef1f28a44fea84e8b33cac63a2947995858b64` | `67ccefd245bbe8f5d0dd4d66349795dedae922f9` | 2026-07-31 | docs(dom-to-figma): record image staging background boundary | historical only |
| S39 | `f02f861514809add68be00c93b6ac88e3ff4a7c1` | `95ef1f28a44fea84e8b33cac63a2947995858b64` | 2026-07-31 | chore(task): archive eyeondesign-web-to-dom-image-diagnosis | excluded |
| S40 | `7690af69c917fcbbeb95787116863c28438cdafe` | `f02f861514809add68be00c93b6ac88e3ff4a7c1` | 2026-07-31 | chore: record journal | excluded |
| S41 | `6f7ff8c8ee48b276ac5dab97ccbaf59d2c0be430` | `7690af69c917fcbbeb95787116863c28438cdafe` | 2026-07-31 | chore(task): repair archived image diagnosis manifest | excluded |
| S42 | `d663c6bee734382c75062ec4067e809b92345f12` | `6f7ff8c8ee48b276ac5dab97ccbaf59d2c0be430` | 2026-07-31 | feat: extract css background images | port candidate |
| S43 | `75f9bc0b122e0a55318b8b26ab6b883e11c02597` | `d663c6bee734382c75062ec4067e809b92345f12` | 2026-07-31 | chore: register css background capability | port candidate |
| S44 | `9fb02ea5532b66fbe815cecc5cd03116197121c0` | `75f9bc0b122e0a55318b8b26ab6b883e11c02597` | 2026-07-31 | docs: codify css background staging contract | port candidate |
| S45 | `3bc2cd06be5e45dacb6025720ff8b6be72da6998` | `9fb02ea5532b66fbe815cecc5cd03116197121c0` | 2026-07-31 | chore: archive background extraction task | historical only |
| S46 | `be47e62774179f582cffedbbfc6dd5198e293546` | `3bc2cd06be5e45dacb6025720ff8b6be72da6998` | 2026-07-31 | test(extension): sync capture plan fixture | port candidate |
| S47 | `9df8d0b8c387471c83fadb72c7f195e5b7d5ac17` | `be47e62774179f582cffedbbfc6dd5198e293546` | 2026-07-31 | fix(extension): capture lazy background sources | port candidate |
| S48 | `c285e068d83633452c5bc8269e550c1c41161b18` | `9df8d0b8c387471c83fadb72c7f195e5b7d5ac17` | 2026-07-31 | chore(task): archive lazy background capture | excluded |
| S49 | `dfd432b85ad83510efe4a892bc99fbaa03cdd051` | `c285e068d83633452c5bc8269e550c1c41161b18` | 2026-08-01 | feat(capture): add bounded lazy activation preflight | port candidate |
| S50 | `3bb1705a7e0f7f7d5f273ece178014e61df97c50` | `dfd432b85ad83510efe4a892bc99fbaa03cdd051` | 2026-08-01 | chore(task): archive browser-capture-lazy-activation-preflight | historical only |
| S51 | `627b895128ba6378087c3d1c7661e56a5138e099` | `3bb1705a7e0f7f7d5f273ece178014e61df97c50` | 2026-08-01 | chore: record journal | excluded |
| S52 | `e1f134b0d022e13a530ad15e139e24373789c1cb` | `627b895128ba6378087c3d1c7661e56a5138e099` | 2026-08-01 | feat(extension): add replayable figit capture artifacts | port candidate |
| S53 | `468a72d1cbee8fc13fe77f0d439b25070e44823a` | `e1f134b0d022e13a530ad15e139e24373789c1cb` | 2026-08-01 | chore(task): archive figit-capture-artifact | excluded |
| S54 | `f51b3dbcface90a8ace38c26abd094b26b94705a` | `468a72d1cbee8fc13fe77f0d439b25070e44823a` | 2026-08-01 | chore: record journal | excluded |
| S55 | `2361077a2ab5c7aa004007d597e20ba5a9ea2314` | `f51b3dbcface90a8ace38c26abd094b26b94705a` | 2026-08-01 | fix(extension): align capture persistence integration | port candidate |
| S56 | `e281719bb1aba2e9f626fbdfd492748f6618bf8c` | `2361077a2ab5c7aa004007d597e20ba5a9ea2314` | 2026-08-01 | docs(extension): record capture integration contracts | port candidate |
| S57 | `d373ab8f96ea008e9b1fe3fe50f5565b4b29d9c7` | `e281719bb1aba2e9f626fbdfd492748f6618bf8c` | 2026-08-01 | chore(task): archive extension-capture-persistence | historical only |
| S58 | `f82c4a5be1f8f80798c409d2450d4aaa0567e740` | `d373ab8f96ea008e9b1fe3fe50f5565b4b29d9c7` | 2026-08-01 | chore: record journal | excluded |
| S59 | `db6085e8b0d7946d1c7ad48881e782124d8a2fe0` | `f82c4a5be1f8f80798c409d2450d4aaa0567e740` | 2026-08-01 | fix(capture): wait for delayed infinite-scroll resources | port candidate |
| S60 | `fec358978a2c6676fb2e2c89cfcf39e68845263d` | `db6085e8b0d7946d1c7ad48881e782124d8a2fe0` | 2026-08-01 | chore(task): archive stabilize-lazy-activation-edge | excluded |
| S61 | `ee62ac0acc5413a2554eaf2b09b3a02f8945d75b` | `fec358978a2c6676fb2e2c89cfcf39e68845263d` | 2026-08-01 | chore: record journal | excluded |
| S62 | `f547f8ed915350030ec243d930e63d244b4898da` | `ee62ac0acc5413a2554eaf2b09b3a02f8945d75b` | 2026-08-03 | docs(upstream): audit PR 33 and 34 compatibility | historical only |
| S63 | `d38c4534fdf995b778b8605e32d97aa647b66863` | `f547f8ed915350030ec243d930e63d244b4898da` | 2026-08-03 | chore(task): archive research-upstream-pr-33-34 | excluded |
| S64 | `a3c8cfbb4c00ad9390098956cf62980df40ff711` | `d38c4534fdf995b778b8605e32d97aa647b66863` | 2026-08-03 | chore: record journal | excluded |
| S65 | `49966ef87924d3b0b2f4c3de92fc431d300bb9e9` | `a3c8cfbb4c00ad9390098956cf62980df40ff711` | 2026-08-12 | feat(extension): explain font capture mismatches | port candidate |
| S66 | `990345a121d2946b201a219516caa89ccb575123` | `49966ef87924d3b0b2f4c3de92fc431d300bb9e9` | 2026-08-12 | chore(task): archive font-capture-diagnostics | excluded |
| S67 | `07bbcd751c34a378caeb91b10681842f37c64b7d` | `990345a121d2946b201a219516caa89ccb575123` | 2026-08-12 | chore: record journal | excluded |
| S68 | `e8cbc3471bc46c14a707c865a15684cebca442f3` | `07bbcd751c34a378caeb91b10681842f37c64b7d` | 2026-08-27 | chore(task): archive migrate-fork-private-package-registry | excluded |
| S69 | `6f27ba47ca9fa14ae5e770f1efc9fa66fe8bcd2c` | `e8cbc3471bc46c14a707c865a15684cebca442f3` | 2026-08-27 | chore: record journal | excluded |
| S70 | `549394841269347cbe7ecd027a5306a9f987355f` | `6f27ba47ca9fa14ae5e770f1efc9fa66fe8bcd2c` | 2026-08-28 | chore(task): archive 08-27-fix-governance-ci-upstream-fetch | excluded |
| S71 | `3009347a6eae034cced1b67e17423248de119801` | `549394841269347cbe7ecd027a5306a9f987355f` | 2026-08-28 | chore(task): archive 08-27-fix-pkg-pr-new-preview | excluded |
| S72 | `3b4efa8b119b798e5c41ad75c26d74fa2210c1b1` | `3009347a6eae034cced1b67e17423248de119801` | 2026-08-28 | chore(task): archive 08-27-prepare-reassess-upstream-pr | excluded |
| S73 | `2172b181853e111dab5c9e261cc19426420f649f` | `3b4efa8b119b798e5c41ad75c26d74fa2210c1b1` | 2026-08-28 | chore: record journal | excluded |
| S74 | `21e5d3288b3bf5270f89c7c681771b49fbc50a64` | `2172b181853e111dab5c9e261cc19426420f649f` | 2026-08-28 | docs: assess sync integration | superseded |
| S75 | `3fb9ff1fadc0eabd3e875dbfecab6f7954944678` | `21e5d3288b3bf5270f89c7c681771b49fbc50a64` | 2026-08-28 | chore(task): archive 08-28-assess-sync-integration | historical only |
| S76 | `906b205ef05917749b3d0982ca6dd11ff1b35866` | `3fb9ff1fadc0eabd3e875dbfecab6f7954944678` | 2026-08-28 | chore: record journal | excluded |
| S77 | `e9598b8ecd8db9eabde12c0d3b2958746cd19471` | `906b205ef05917749b3d0982ca6dd11ff1b35866` | 2026-08-28 | chore(task): archive rebuild-bg1-css-raster-backgrounds | historical only |
| S78 | `0ad29a9464775f3e4bc3cb4b8007cff3ff48ce7b` | `e9598b8ecd8db9eabde12c0d3b2958746cd19471` | 2026-08-28 | chore: record journal | excluded |
| S79 | `37f53615d0dbd57c60edb09f278e16ff6a098e1c` | `0ad29a9464775f3e4bc3cb4b8007cff3ff48ce7b` | 2026-08-28 | docs(oracle): document scene registration gates | ported |
| S80 | `de41ab154a2281655449c150d07aa942eca588fb` | `37f53615d0dbd57c60edb09f278e16ff6a098e1c` | 2026-08-28 | docs: record BG1 main promotion | historical only |
| S81 | `2ff81be6ffde09dc88aa72ec245a97eaaca7101d` | `de41ab154a2281655449c150d07aa942eca588fb` | 2026-08-28 | chore(task): archive promote-bg1-to-main | historical only |
| S82 | `f25896c6cb34c35aae10192778f8aa0c8872911d` | `2ff81be6ffde09dc88aa72ec245a97eaaca7101d` | 2026-08-28 | chore: record journal | excluded |
| S83 | `03296e04f868b1860d4bf3fdf5d9c2320c1e74c2` | `f25896c6cb34c35aae10192778f8aa0c8872911d` | 2026-08-29 | chore(task): archive rebuild-bg2-lazy-background-sources | historical only |
| S84 | `9c949a4a7a7560b460562014232d982c1f21533c` | `03296e04f868b1860d4bf3fdf5d9c2320c1e74c2` | 2026-08-29 | chore: record journal | excluded |
| S85 | `b7bd7d6c68557e91e184da65b9e560de950f3bed` | `9c949a4a7a7560b460562014232d982c1f21533c` | 2026-08-30 | chore(task): archive promote-fd1-to-main | historical only |
| S86 | `3bbbb31fcdaeb7dce00fea6f276447440b2df4f1` | `b7bd7d6c68557e91e184da65b9e560de950f3bed` | 2026-08-30 | chore(task): archive port-s79-oracle-scene-registration-spec | historical only |
| S87 | `3c2ebb8c8b54f82bd06b428019f12fd0e628e3c0` | `3bbbb31fcdaeb7dce00fea6f276447440b2df4f1` | 2026-08-30 | chore(task): archive execute-approved-sync-cherry-picks | historical only |
| S88 | `c54ee85f4c6e63e9abdbb8043e42e2f0f5172820` | `3c2ebb8c8b54f82bd06b428019f12fd0e628e3c0` | 2026-08-30 | chore(task): archive reconcile-post-audit-sync-tail | historical only |

Disposition totals are: represented 5, superseded 11, ported 1, port candidate
11, historical only 21, excluded 39, total 88. There are no duplicate identities
or rows. S01's parent is the merge base, and every later parent is the
immediately preceding row.

## Tail Verification

| Row | Touched path scope | Independent rationale |
| --- | --- | --- |
| S74 | 7 active task files under `.trellis/tasks/08-28-assess-sync-integration/` | Superseded by the byte-preserving/finalized archive relocation in S75. |
| S75 | 7 paths relocated to `.trellis/tasks/archive/2026-08/08-28-assess-sync-integration/` | Historical-only authoritative audit provenance. |
| S76 | `.trellis/workspace/kino/index.md`, `journal-1.md` | Excluded session chronology. |
| S77 | 9 files under archived BG1 rebuild task | Historical-only completed-child evidence; target capability is separately promoted. |
| S78 | `.trellis/workspace/kino/index.md`, `journal-1.md` | Excluded session chronology. |
| S79 | `.trellis/spec/oracle-harness/frontend/architecture.md`, `testing-guidelines.md` | Ported: the durable dual-projection scene-registration rule is contained through reviewed commit `107667e0` and merge `1c98bb0e`. |
| S80 | 16 governance/task evidence paths for BG1 promotion | Historical-only promotion evidence; no additional product delta. |
| S81 | 9 BG1 promotion task paths relocated to archive | Historical-only final archive placement. |
| S82 | `.trellis/workspace/kino/index.md`, `journal-1.md` | Excluded session chronology. |
| S83 | 9 files under archived BG2 rebuild task | Historical-only completed-child evidence; target capability is separately promoted. |
| S84 | `.trellis/workspace/kino/index.md`, `journal-1.md` | Excluded session chronology. |
| S85 | 18 files under archived FD1 promotion task | Historical-only promotion evidence; target capability is separately promoted. |
| S86 | 8 files under the archived S79 spec-port task | Historical-only child completion evidence; target containment is the separately reviewed PR #21 merge. |
| S87 | 13 active/archive paths for the completed execution container | Historical-only container closure; all seven cohort outcomes were independently reconciled. |
| S88 | 9 files under the archived tail-reconciliation task | Historical-only final placement of the S74-S87 ledger and its reconciliation evidence; no target product or durable-contract delta. |

For S74-S88, full identities, exact subjects, single parents, path lists, and
order were read directly from each commit. The chain starts with
S74 parent `2172b181853e111dab5c9e261cc19426420f649f` and ends at S88.
All fifteen commits have one parent and one disposition.

## Durable-Delta Conclusion

S79 was the only post-S74 durable delta not represented on the previous target
pin. Its source commit changes exactly the two oracle-harness spec files. The
semantic port was reviewed as
`107667e0b2eda7ed6a268cdaad575edfc31dc89c`, then merged by PR #21 as
`1c98bb0e0d04682f619a5aadccdd5027959ac2e0`. The refreshed target contains the
reviewed commit as an ancestor, and the merge changes exactly the two owned
spec paths relative to the prior target pin. The source identity was not
cherry-picked.

S74-S78 and S80-S88 are audit, archive, promotion, or journal provenance.
Their durable product outcomes are either already promoted to the target line
or they intentionally remain historical source evidence. No post-S74 durable
delta remains stranded on the source line.

## Freeze-Ready Containment Proof

The source is at S88; `git rev-list --reverse origin/main..sync/upstream-20260726`
yields exactly 88 identities and no S89+ row exists. The merge
base remains `606ee8aa9ca4915ec28dd7853fd5b42283ff54ea`.

| Valuable outcome | Source rows | Refreshed target containment |
| --- | --- | --- |
| Pre-audit represented behavior | S05, S09, S12, S16, S17 | Preserved by the original audit's semantic-containment proof and still reachable at `origin/main@1c98bb0e`. |
| BG1 CSS raster backgrounds | S42-S44 | Reviewed `92c8452f`; PR #14 merge `98c10d5f`; ancestor of refreshed target. |
| BG2 lazy background sources | S46-S47 | Reviewed `a1c06bdd`; PR #16 merge `1c26bc2a`; ancestor of refreshed target. |
| LA1 lazy activation | S49 | Reviewed `394e1f8c`; PR #17 merge `df9fbdf8`; ancestor of refreshed target. |
| LA2 infinite-scroll stabilization | S59 | Represented/superseded by LA1 after zero-product-diff verification; no separate target commit required. |
| CP1 replayable capture artifacts | S52 | Reviewed `d52369b0`; PR #18 merge `0a311e10`; ancestor of refreshed target. |
| CP2 capture persistence integration | S55-S56 | Reviewed `41425ef`; PR #19 merge `decde39a`; ancestor of refreshed target. |
| FD1 font diagnostics | S65 | Reviewed/reconciled `d3459aa9`; PR #20 merge `687a8509`; ancestor of refreshed target. |
| S79 scene-registration contract | S79 | Reviewed `107667e0`; PR #21 merge `1c98bb0e`; reviewed head is the merge's second parent and an ancestor of refreshed target. |

All superseded rows have a newer contract recorded by the original audit or
the cohort mappings above. Historical-only and excluded rows intentionally
remain source-line provenance and are not claimed as literal target
reachability. This is semantic closure, not whole-branch replay.

## Preservation Evidence

Before task-local report creation:

| Observation | Value |
| --- | --- |
| Root branch / HEAD | `sync/upstream-20260726` / `b7bd7d6c68557e91e184da65b9e560de950f3bed` |
| Index SHA-256 | `D47D19F3724C4488B84356DFA816FF5D332E8200BDD8FE3887AF2399A8B51BB0` |
| Staged paths | none |
| Dirty tracked paths | 19 |
| Dirty tracked path/content digest | `74497D1D674F43AAE073A6ED95B208B717FCDF1268386143A7A7863BDADEBAC8` |
| Untracked files | 829 |
| Compact porcelain digest | `9E7168C307D3BA539E401ACD04DAE703358B485315BF63D7F284483D5D9B32D1` |
| Worktrees | 11 |
| Worktree occupancy digest | `327D619CDBA87B5135D9B9FCB0D99BB216325BF18756A201E1C8B11BB84F7794` |

The report lives inside an already-untracked task directory, so its creation
does not change the compact porcelain path set. The after-check section is
filled by validation and compares all protected values. No checkout, switch,
add, restore, stash, clean, reset, merge, rebase, cherry-pick, commit,
update-ref, fetch, push, PR, tag, branch deletion, or worktree mutation is
performed.

## Validation Result

Phase 2.1 ledger validation completed on 2026-08-30 at the then-current S85
tip; the later authorized archive-tail validation below supersedes its extent
and counts:

- Trellis validation passed for both four-entry JSONL manifests.
- The report has 85 full ledger rows and Git has 85 source-only commits;
  identities, exact order, and every parent match, with zero duplicates.
- At Phase 2.1, exactly-one-disposition counts were represented 5,
  superseded 11, port candidate 12, historical only 18, and excluded 39.
  The later S79 refresh reclassifies S79 from port candidate to ported,
  yielding the final totals recorded above: ported 1 and port candidate 11.
- S74-S85 path counts were independently recomputed as
  `7, 14, 2, 9, 2, 2, 16, 18, 2, 9, 2, 18`; rename commits count both old and
  new path names in `diff-tree`, consistent with the relocation descriptions.
- Markdown table structure passed. Task-scoped `git diff --check` passed;
  no-index whitespace validation passed after removal of the detected final
  blank line.
- Source, target, merge base, branch/HEAD, index SHA-256, empty staged set,
  19 tracked dirty paths and their content digest, compact porcelain digest,
  and 11-worktree occupancy digest all match the before values.
- The untracked file count increased from 829 to 830 solely because this
  task-local report was created inside the already-untracked task directory;
  no pre-existing untracked path was changed or removed.

## Post-S79 Refresh Validation (Historical S85 Checkpoint)

Refreshed after authorized PR #21 merge on 2026-08-30:

- Source `b7bd7d6c68557e91e184da65b9e560de950f3bed`, target
  `1c98bb0e0d04682f619a5aadccdd5027959ac2e0`, and merge base
  `606ee8aa9ca4915ec28dd7853fd5b42283ff54ea` produce divergence `56 / 85`.
- At that checkpoint, the ordered source-only set was S01-S85 and no S86+
  commit existed. This statement is historical; the authorized archive tail
  subsequently advanced the source through S88.
- Reviewed S79 commit `107667e0b2eda7ed6a268cdaad575edfc31dc89c`
  is an ancestor of refreshed `origin/main`; merge `1c98bb0e` has prior target
  `687a8509` and reviewed S79 as its two parents and changes only the two owned
  oracle specification paths.
- Root branch/HEAD remains `sync/upstream-20260726@b7bd7d6c`; index tree remains
  `81be79ab4c93bc112595a752c88e6708b03b0d95`; index-file SHA-256 remains
  `D47D19F3724C4488B84356DFA816FF5D332E8200BDD8FE3887AF2399A8B51BB0`;
  the staged set remains empty.
- Git status still reports the same 19 tracked names while content diff reports
  17; the two stat-cache/racy-clean paths remain content-identical to index.
- Worktree occupancy is 12. The retained S79 worktree is the sole authorized
  addition to the original 11; its local branch and remote branch are retained.
  No worktree, branch, tag, or remote object was removed or created by this
  refresh.

## Authorized Archive-Tail Validation

Refreshed after the separately authorized archive commit batch began:

- S86 `3bbbb31fcdaeb7dce00fea6f276447440b2df4f1` archives the completed S79
  child and has S85 as its sole parent.
- S87 `3c2ebb8c8b54f82bd06b428019f12fd0e628e3c0` archives the completed
  execution container and has S86 as its sole parent.
- S88 `c54ee85f4c6e63e9abdbb8043e42e2f0f5172820` archives the completed tail
  reconciliation child and has S87 as its sole parent.
- All three rows are historical-only governance provenance. They introduce no
  target product or durable-contract delta.
- The complete ordered source ledger is S01-S88 with 88 unique identities,
  exact parent continuity, and one disposition per row.
- The ordered identities and parents were recomputed through the actual S88
  source tip `c54ee85f4c6e63e9abdbb8043e42e2f0f5172820`, not the preceding S87
  checkpoint.
- The protected content-bearing dirty set, empty staged baseline between
  commits, and 12-worktree occupancy remain unchanged. The S79 local/remote
  branches and worktree remain retained.
