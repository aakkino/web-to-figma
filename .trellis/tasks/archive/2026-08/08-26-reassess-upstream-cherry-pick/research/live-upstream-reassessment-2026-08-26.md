# Research: Live Upstream Reassessment

- Query: Compare current `upstream/main@859efea8` with `sync/upstream-20260726@07bbcd75` from their common base, classify every upstream-only commit, and decide the disposition of overlapping style-effects work and the six fork overrides.
- Scope: mixed (live read-only Git/npm metadata plus repository history and target-tree inspection)
- Date: 2026-08-26
- Conclusion: the primary comparison contains **24 upstream-only / 109 sync-only / 0 patch-equivalent** commits from common base `ac830db5`. Eleven upstream-only commits contain runtime behavior. The early style commits overlap the sync branch's selective adaptations without patch equivalence; later upstream work adds several real capabilities not fully present in sync. None is safe as a direct cherry-pick; behavior must be selectively re-ported/adapted around fork contracts. Live upstream/npm/fork values remain a secondary snapshot and have not drifted.

## Findings

### Confirmed scope and exclusions

This review round covers:

1. all 24 commits unique to current upstream main relative to the sync branch, classified by their actual patch boundary rather than their titles;
2. overlap with the historical upstream-intake/style-effects adaptations and the later upstream border/background/effects parity commits; and
3. the six capabilities already present on the new fork `main`: responsive Shadow DOM, composed traversal, glyph-aware font fallback, image presentation, image-loader cancellation, and nowrap text sizing.

The 11 product candidates from the old sync audit are deferred to a separate review. `css-background-images` is also excluded. Research/task metadata and the mixed `sync/upstream-20260726` branch are never intake units.

### Primary comparison: upstream main versus sync tip

| Item | Exact value |
| --- | --- |
| Common baseline | `ac830db5b89d2e8e7eede86f9419303988ae1938` |
| Upstream tip | `859efea8d7f8330783c6c4e3e520fd673e877336` |
| Sync tip | `07bbcd751c34a378caeb91b10681842f37c64b7d` |
| Topology | `24` upstream-only / `109` sync-only |
| Patch equivalence | `0`; all 24 rows from `git cherry sync/upstream-20260726 upstream/main` are `+` |

The 109 sync-only side is not a product-review queue. It includes the six local style adaptations, the explicitly deferred 11 product commits, research, task/archive/journal material, and other fork history. This review uses the sync tree only to determine overlap and missing upstream behavior.

The full-tree comparison reports `434 files changed, 69538 insertions, 4865 deletions`. That is not a meaningful runtime patch size: `.trellis` alone accounts for 229 files and 46,507 insertions, while task/research artifacts and other repo metadata also dominate `internal` and repository-level counts. The core-focused comparison is `packages/dom-to-figma/src`: **46 files, 3907 insertions, 2449 deletions**. Capability decisions below use commit boundaries and this core tree, not the noisy full-tree total.

### Complete 24-commit ledger

Every upstream-only commit is listed once. “Adapt” means reconstruct the behavior on the intended fork target with focused tests; it is not permission to cherry-pick.

#### Runtime behavior commits (11)

| Upstream commit | Patch boundary and dependency | Overlap with sync target | Disposition |
| --- | --- | --- | --- |
| `0208934` double border | 8 paths, 4 core, `+265/-10`; changes parser, frame/convert integration and browser/oracle material. Root of the upstream-only chain. | Same capability was selectively adapted as local `aafd966` parser plus `e6f4c43` fork integration, but both cherry comparisons show no patch equivalence. | **本地重新移植/适配** against current fork composition; never take upstream or local slice alone. |
| `774a670` text-shadow | 9 paths, 5 core, `+210/-13`; depends on `0208934 -> 6337243`; combines text converter, shadow parser/types and tests. | Overlaps local `b32e833` plus `e6f4c43`, without patch equivalence; sync also carries glyph fallback/nowrap text semantics. | **本地重新移植/适配**; preserve fork text contracts. |
| `51b5821` filter drop-shadow | 8 paths, 4 core, `+218/-19`; depends on `774a670`; combines blur/shadow parsers and browser/oracle tests. | Overlaps local `b32e833` plus `e6f4c43`, without patch equivalence. | **本地重新移植/适配**; preserve local drop-shadow parsing/integration where stronger. |
| `810c2aa` color matrix | 8 paths, 4 core, `+382/-4`; comes after release `0bf06ec`; adds `filter-color`, frame integration and tests. | Overlaps local `d25c0d2` parser plus `e6f4c43` composed-leaf-safe integration, without patch equivalence. | **本地重新移植/适配**; retain composed/Shadow DOM leaf-safety. |
| `cc8d486` gradient + object-fit | 26 paths, 6 core, `+957/-78`; mixed frame/text/image, gradient parser/types, 17 oracle scenes/docs and changeset; depends on all earlier style commits. | Gradient portion overlaps local `553f591` + `e6f4c43`; object-fit only partially overlaps fork image presentation, which additionally has object-position, exact `none`/`scale-down`, intrinsic sizing and staging behavior. No patch equivalence. | Gradient slice is **本地重新移植/适配**; image-presentation slice is **保留 fork 实现**. Whole commit is not an intake unit. |
| `83202a3` dotted border | 4 paths, 2 core, `+158/-2`; parser/test patch based after release `6cc06c5`. | Sync has double-border parsing but no uniform dotted-border dash parser. True missing upstream behavior. | **本地重新移植/适配** with the later border cohort; later `ec38305` supersedes parts of its simple pattern model. |
| `0d3c9ea` 3D borders | Despite `test(...)` title, 11 paths include 3 core runtime paths, `+454/-48`: adds `border-3d.ts`, tests, and connects shading/bands to border decomposition. Depends on preceding oracle fixtures. | Sync has per-side border decomposition but no `border-3d.ts` and no groove/ridge/inset/outset shading. True missing behavior. | **本地重新移植/适配**. Title alone would misclassify this as test-only. |
| `ec38305` border parity | 16 paths, 9 core, `+1316/-131`; adds mixed-style/fitted dash decomposition, rounded dashed geometry, outline parsing/ring integration, tests and oracle state. Depends on `0d3c9ea` and earlier dotted-border work. | Sync has a smaller per-side-color decomposition but lacks `outline.ts` and `rounded-dash-border.ts`; it does not fully implement mixed styles, fitted dashed/dotted sides, rounded dashed borders or outline-offset. | **本地重新移植/适配** as a bounded border-parity cohort, preserving fork child reservation/composed traversal. |
| `7dd5da2` fractional sizing parity | 12 paths, 6 core, `+75/-94`; after three border fixtures, changes DOM/frame/text/walk geometry and tests. It removes emitted text width buffer and stops rounding measured element/text boxes. | Sync still rounds ordinary geometry and deliberately retains alignment-aware emitted text width buffering. This overlaps responsive geometry and directly conflicts with the fork rendering contract. | Fractional frame/element slice is **本地重新移植/适配**; alignment-aware text-buffer/nowrap slice is **保留 fork 实现**. Never cherry-pick whole commit. |
| `922e12e` advanced gradients | 11 paths, 3 core, `+553/-37`; depends on the full border/geometry chain; adds explicit px/angle stop resolution, conic/`GRADIENT_ANGULAR`, repeating gradient tiling and tests. | Sync gradient parser has linear/radial support but no conic, repeating, angular paint, or equivalent stop-tiling helpers. True missing upstream behavior. | **本地重新移植/适配** as a current-gradient follow-up; do not replay old `553f591` alone. |
| `20a438c` blur parity | 11 paths, 2 core, `+142/-80`; after release `1506a76`; runtime change is `blur.ts` plus tests, with oracle/docs/baseline artifacts. It maps CSS sigma to Figma radius at `2x` for foreground/background blur. | Sync already supports filter drop-shadow and foreground/background blur, but uses the CSS number directly and lacks the `2x` conversion. True partial overlap. | **本地重新移植/适配** only the validated radius semantics/tests; preserve sync drop-shadow and color-filter behavior. |

#### Tool and documentation commits (4)

| Upstream commit | Patch boundary / dependency / overlap | Disposition |
| --- | --- | --- |
| `6337243` oracle montage/publisher | 6 non-core paths, `+337/-1`; tool layer between double border and text-shadow. No runtime capability. | **无需动作** in this capability intake; consider only in a separate oracle-tooling review. |
| `af98829` anonymous-viewer guard | 2 non-core oracle-harness paths, `+68/-4`; depends on `83202a3` only by linear ancestry. | **无需动作** here; independent harness hardening, not product behavior. |
| `a1286a2` `/test-hypothesis` command | 1 non-core path, `+94/-0`. | **无需动作** here; separate developer-tool decision. |
| `33e7c5f` command docs batching | 2 non-core paths, `+135/-61`; workflow/docs only. | **无需动作** here. |

#### Test-only commits (5)

| Upstream commit | Patch boundary / dependency / overlap | Disposition |
| --- | --- | --- |
| `d5fc192` BG-01 solid-background fixture | 7 non-core fixture/baseline/docs paths, `+71/-2`; no runtime change. | **无需动作** as code intake; reuse evidence/fixture only if a later parity plan needs it. |
| `3a43870` COL-01 rgba fixture | 7 non-core paths, `+37/-4`; no runtime change. | **无需动作** as code intake. |
| `b506df1` transparent-border fixture | 4 non-core paths, `+38/-0`; validation predecessor for `7dd5da2`, no runtime change. | **无需动作** as commit intake; re-author its focused validation under B4 only if the geometry slice is approved. |
| `a3b29f7` inline-border fixture | 4 non-core paths, `+37/-0`; validation predecessor for `7dd5da2`, no runtime change. | **无需动作** as commit intake; re-author its focused validation under B4 rather than cherry-picking it. |
| `a5b4d54` sub-pixel-border fixture | 4 non-core paths, `+32/-1`; no runtime change and not named in the later `7dd5da2` fix scope. | **无需动作** as behavior; fixture may be re-authored for regression coverage. |

#### Release commits (4)

| Upstream commit | Patch boundary / overlap | Disposition |
| --- | --- | --- |
| `0bf06ec` release packages | 8 non-core paths, `+40/-54`; publishes the preceding style work as 0.2.1 and consumes changesets. | **无需动作**; never cherry-pick release composition into the fork. |
| `6cc06c5` release packages | 4 non-core paths, `+18/-20`; releases `cc8d486` composition as 0.2.2. | **无需动作**. |
| `1506a76` release packages | 7 non-core paths, `+70/-81`; releases later border/background work as 0.2.3. | **无需动作**. |
| `859efea` release packages | 3 non-core paths, `+13/-12`; releases `20a438c` as 0.2.4 and is the live tip/tag target. | **无需动作**; target identity is already pinned on fork `main`. |

### Net capability result from the 24 commits

- **Already represented by a non-equivalent local adaptation:** double border, text-shadow, filter drop-shadow, color-matrix fill baking, initial radial/angled gradients. Reassess against current upstream and port locally; do not infer equivalence from feature names.
- **Genuinely not fully present in sync:** dotted/fitted/mixed/rounded border patterns; 3D border shading; outline/outline-offset; conic and repeating gradients plus explicit stop units; Figma blur radius `2x` CSS sigma. These are new local adaptation candidates for the plan.
- **Partially overlapping and semantically conflicting:** `7dd5da2` fractional geometry removes text buffering that the fork intentionally preserves. Any useful fractional frame/element slice must be separated from text sizing.
- **Fork behavior stronger than upstream:** composed traversal/Shadow DOM, glyph-aware fallback, full image presentation including object-position, cancellation, and nowrap/alignment-aware text sizing remain fork-owned.
- **No retirement and no direct cherry-pick:** no fork capability satisfies its full removal condition; no upstream commit has both an independent boundary and a target-tree compatibility proof.

### Secondary live immutable snapshot

Read-only queries were repeated on 2026-08-26. `git ls-remote` was used instead of `fetch`, so no remote-tracking ref or local tag was written.

| Source | Live value | Compared with 2026-08-25 | Disposition |
| --- | --- | --- | --- |
| upstream `refs/heads/main` | `859efea8d7f8330783c6c4e3e520fd673e877336` | unchanged | No target refresh and no new upstream interval. |
| upstream tag `@figit/dom-to-figma@0.2.4` | tag object `a312898056343d6bceda0263cfe7a6fdb981d004`; peeled commit `859efea8d7f8330783c6c4e3e520fd673e877336` | unchanged | Git release identity still agrees with upstream main. |
| npm dist-tag `latest` / stable package | `0.2.4` | unchanged | No package-version action. Integrity remains `sha512-GAc82UfGueG1xY8m7S7cCrptQWo9m1kx543TpmYbRKD/0VwqCzHFpfvYW1UqLwYfVNidR7793aaCOJgjZi0+sA==`. |
| fork live `refs/heads/main` | `13948d88e3ec6a0939f39d8f69ce3ef637976a68` | unchanged from final alignment | Local `main` and cached `origin/main` resolve to the same SHA. |
| fork `main:docs/upstream-core-delta.json` | governance `ac830db5...`; stable/upstream `859efea8...` | already contains the reviewed refresh | No registry edit. |

The live `@figit/dom-to-figma@*` tag set is `0.0.1`, `0.0.2`, `0.1.0`,
`0.2.0`, `0.2.1`, `0.2.2`, `0.2.3`, and `0.2.4`; there is no package tag
newer than `0.2.4`. The latest tag remains the annotated object and peeled
commit recorded above.

`git rev-list --count 859efea8..upstream/main` returned `0`; therefore the “new upstream interval” after the reviewed target is empty. The local cached `upstream/main` also resolves to `859efea8...`, but the live result above comes from `ls-remote`, not from trusting that cache.

The registry on fork `main` pins stable `0.2.4` and upstream main to `859efea8...` at `docs/upstream-core-delta.json:9-18`, retains the `15`-runtime-file limit at `docs/upstream-core-delta.json:21-25`, and records only the six in-scope fork capabilities at `docs/upstream-core-delta.json:65-183`. These are commit-qualified citations to `main:docs/upstream-core-delta.json`; the checked-out sync branch contains an older registry and is not the target tree.

### Capability disposition

| Capability | Current evidence | Classification | Required next action if implementation is later authorized |
| --- | --- | --- | --- |
| Live target refresh | Live upstream, tag, npm, fork main, and fork-main registry all match the reviewed values. | **无需动作** | Preserve pins; rerun live checks at implementation start because refs/dist-tags move. |
| Double border | Fork `main` lacks the later upstream/style tree. Historical local `aafd966` is only the parser slice (`border.ts`); consumer integration and browser/oracle coverage are in dependent `e6f4c43`. Upstream `border.ts` continued changing after the original intake. | **本地重新移植/适配** | Port the current upstream behavior into the fork target while preserving composed children, child-slot reservation, and fork frame semantics; do not replay the old parser commit alone. |
| Text-shadow and filter drop-shadow | Historical `b32e833` changes five parser/type/test paths, while integration is in `e6f4c43`. Current upstream later changes `blur.ts`; target `main` has distinct text/frame behavior. | **本地重新移植/适配** | Adapt current upstream parser behavior and re-integrate against fork text/frame contracts and tests. |
| Color-matrix solid-fill baking | `filter-color.ts` is absent from fork `main`, exists at upstream `859efea8`, and is integrated into frame conversion by the upstream sequence/local `e6f4c43`. | **本地重新移植/适配** | Add the current parser plus leaf-safety integration; preserve the fork's composed traversal rule that projected/Shadow DOM children prevent unsafe partial baking. |
| Radial and box-aware angled gradients | Historical `553f591` is a parser/type slice, but upstream commit `cc8d486` is a 26-path mixed commit including object-fit, oracle material, frame/text changes, and gradients; upstream later added more gradient cases. | **本地重新移植/适配** | Port only the current gradient behavior and its focused tests, then integrate with fork converters. Do not take `cc8d486` wholesale. |
| Fork style integration (`e6f4c43`) | Sixteen paths include shared fork files `convert.ts`, frame/text converters, browser tests, oracle snapshots/scenes, and a changeset. Those target files now carry composed traversal, font, nowrap, and other fork semantics. | **本地重新移植/适配** | Rebuild integration after the parser cohort against current `main`; explicitly test composed traversal and existing fork capability contracts. |
| Upstream-main gate/governance (`f79f990`) | Ten paths and `+472/-176`; it assumes the older style-intake registry/absorbed-path model. Current `main` already has the refreshed six-capability registry and checker, but lacks the old sync-only upstream-main adapter files. | **本地重新移植/适配** | Design a current-main gate separately after behavior intake. Preserve current registry targets/fingerprints and add only the gate pieces still required by the reviewed design. |
| Responsive Shadow DOM | Upstream has fractional geometry overlap but no open-Shadow-DOM conversion contract. Fork paths/tests remain registered (`docs/upstream-core-delta.json:67-84`). | **保留 fork 实现** | No retirement. |
| Composed traversal | Upstream grep has no `getComposed*`/`composedParent` equivalent; fork `main` uses `composedParent` throughout conversion/layout/walk and registers focused tests (`docs/upstream-core-delta.json:87-109`). | **保留 fork 实现** | No retirement. |
| Glyph-aware font fallback | Upstream only exposes fixture-level `document.fonts`; the 2026-08-25 review found no multi-font/CJK candidate selection. Registry removal condition remains unmet (`docs/upstream-core-delta.json:112-130`). | **保留 fork 实现** | No retirement. |
| Image presentation | Upstream covers `object-fit` only; fork `main` passes `computedStyle.objectPosition` into its presentation layer and records `partial-upstream-main-object-fit` (`docs/upstream-core-delta.json:133-151`). | **保留 fork 实现** | Retain the complete object-fit/object-position implementation. |
| Image-loader cancellation | Upstream has no `AbortSignal` propagation; fork `main` has an abortable loader and registered tests (`docs/upstream-core-delta.json:154-166`). | **保留 fork 实现** | No retirement. |
| Nowrap text sizing | Upstream has no `whiteSpace: nowrap` sizing branch; fork `main` handles `pre`/`nowrap` and has browser coverage (`docs/upstream-core-delta.json:169-182`). | **保留 fork 实现** | No retirement. |

No capability qualifies as **退役 fork 实现**. No reviewed item qualifies as **可直接 cherry-pick**.

### Patch boundary, dependency, and target-tree evidence

A temporary-index dry-apply matrix against exact `sync@07bbcd75` accounts for
all 24 upstream-only commits: all 11 functional, all 5 test-only, all 4
release, and tool/docs commit `33e7c5f` conflict; only tool commits `6337243`,
`af98829`, and `a1286a2` apply cleanly. Those three have no runtime capability
value in this intake, so textual applicability does not make them direct
cherry-pick candidates.

The historical local intake is a strict linear stack:

```text
c9b013f -> aafd966 -> b32e833 -> d25c0d2 -> 553f591 -> e6f4c43 -> f79f990
```

Its boundaries are not interchangeable:

| Commit | Patch boundary | Dependency finding |
| --- | --- | --- |
| `aafd966` | 1 path, `+62/-1` | Parser only; depends on later integration for emitted double-border structure and coverage. |
| `b32e833` | 5 paths, `+252/-6` | Parser/types/tests; depends on prior stack parent and later converter integration. |
| `d25c0d2` | 2 paths, `+245/-0` | Adds parser/test; actual frame application and composed-leaf safety are later. |
| `553f591` | 3 paths, `+306/-51` | Gradient parser/type slice; depends on earlier stack parent and later integration. |
| `e6f4c43` | 16 paths, `+635/-16` | Cross-cutting integration, fork browser tests, oracle artifacts, changeset; assumes all four parser slices. |
| `f79f990` | 10 paths, `+472/-176` | Governance/CI/scripts/docs; assumes the completed style stack and an older registry/gate architecture. |

`git cherry main sync/upstream-20260726` and `git cherry upstream/main sync/upstream-20260726` both report all six commits with `+`. This establishes that neither target contains patch-ID-equivalent commits; per the governance spec, it is only a comparison signal, not sufficient merge evidence.

The parent planning session supplied a temporary-index `git apply --check` run against the exact `main@13948d88` tree. It found:

- historical local `aafd966`, `b32e833`, `d25c0d2`, `553f591`, and `e6f4c43`: textually applicable;
- historical local `f79f990`: conflicts;
- upstream `cc8d486`, `83202a3`, `ec38305`, `7dd5da2`, and `20a438c`: conflicts.

That temporary-index check was not rerun by this research-only agent because its role prohibits creating an index or temporary tree. The result is corroborated by read-only target evidence:

- `main...upstream/main` diverges `53/24` commits from common governance base `ac830db5...`;
- the core target trees differ across 48 paths (`1966` insertions / `3570` deletions in `upstream/main..main`);
- upstream `cc8d486` mixes 26 paths and object-fit with gradients; later border/effects candidates range from 4 to 16 paths and include oracle state, frame/layout/text changes, and changesets;
- fork `main`'s shared paths explicitly combine traversal, nowrap, responsive DOM, image presentation, and cancellation responsibilities at `docs/upstream-core-delta.json:27-63`;
- `filter-color.ts` is absent on fork `main`; other style blobs differ between `main`, `upstream/main`, and the historical sync tree; and integration targets `convert.ts`, frame converter, and text converter all have three distinct blob identities.

Therefore a clean textual apply for the first five local commits proves only that their old hunks find matching lines. It does not prove current upstream completeness, stack independence, semantic compatibility with the six fork overrides, registry correctness, or test parity. The direct-cherry-pick gate fails on dependency and target-tree evidence even where it passes line-level application.

### Suggested later implementation cohorts

This is a planning result, not implementation authorization.

1. **B1 Border Evolution:** reconstruct double border plus dotted/fitted/mixed/rounded borders, 3D shading and outline behavior; use test-only border fixtures as validation input, while leaving `7dd5da2` runtime geometry to B4.
2. **B2 Gradient And Background Parity:** adapt initial radial/angled gradients and `922e12e` explicit-stop/conic/repeating semantics; exclude the `cc8d486` object-fit slice and local CSS raster background promotion.
3. **B3 Effects Evolution:** adapt shadows, color matrix and the validated `20a438c` CSS-sigma-to-Figma-`2x` blur radius semantics without replacing stronger fork behavior.
4. **B4 Fractional Geometry Conflict:** review only the useful fractional element/frame portion of `7dd5da2`; retain alignment-aware text buffering, nowrap sizing and composed traversal.
5. **I1 Fork Integration And Regression:** after B1-B4 all pass, integrate approved behavior into current frame/text/conversion flows and regress all six registered fork overrides.
6. **G1 Governance And Main Adapter:** after I1 fixes the runtime/test path set, update exact capability/path accounting and add the required upstream-main executable gate.

The explicit dependency DAG is `(B1 || B2 || B3 || B4) -> I1 -> G1`; every node remains independently reviewable and reversible. Focused parser/unit and browser tests, capability regressions, governance checker, stable/main adapters, type/build and oracle parity are gates of the owning cohort rather than a separate implementation node.

Each cohort is independently reviewable and reversible. No commit, registry change, ref operation, push, or PR action is authorized by this report.

### Reproducible read-only commands

Commands below require the repository's process-local safe-directory option on this machine:

```powershell
git -c safe.directory=D:/desktop_directory/web-to-figma ls-remote upstream refs/heads/main 'refs/tags/@figit/dom-to-figma@*'
git -c safe.directory=D:/desktop_directory/web-to-figma ls-remote origin refs/heads/main
pnpm view @figit/dom-to-figma dist-tags version --json
pnpm view @figit/dom-to-figma@0.2.4 version dist.integrity dist.tarball --json
git -c safe.directory=D:/desktop_directory/web-to-figma rev-parse main origin/main upstream/main
git -c safe.directory=D:/desktop_directory/web-to-figma merge-base upstream/main sync/upstream-20260726
git -c safe.directory=D:/desktop_directory/web-to-figma rev-list --left-right --count upstream/main...sync/upstream-20260726
git -c safe.directory=D:/desktop_directory/web-to-figma log --left-only --cherry-pick --no-merges --reverse --oneline upstream/main...sync/upstream-20260726
git -c safe.directory=D:/desktop_directory/web-to-figma cherry sync/upstream-20260726 upstream/main
git -c safe.directory=D:/desktop_directory/web-to-figma rev-list --count 859efea8..upstream/main
git -c safe.directory=D:/desktop_directory/web-to-figma show main:docs/upstream-core-delta.json
git -c safe.directory=D:/desktop_directory/web-to-figma cherry main sync/upstream-20260726
git -c safe.directory=D:/desktop_directory/web-to-figma cherry upstream/main sync/upstream-20260726
git -c safe.directory=D:/desktop_directory/web-to-figma show --name-status --stat <commit>
git -c safe.directory=D:/desktop_directory/web-to-figma diff --shortstat upstream/main..sync/upstream-20260726
git -c safe.directory=D:/desktop_directory/web-to-figma diff --shortstat upstream/main..sync/upstream-20260726 -- packages/dom-to-figma/src
git -c safe.directory=D:/desktop_directory/web-to-figma diff --stat upstream/main..main -- packages/dom-to-figma/src
git -c safe.directory=D:/desktop_directory/web-to-figma grep -n -E 'shadowRoot|getComposed|composedParent|objectPosition|AbortSignal|whiteSpace.*nowrap|document\.fonts' <ref> -- packages/dom-to-figma/src
git -c safe.directory=D:/desktop_directory/web-to-figma status --porcelain=v2 --branch
```

No `fetch`, `pull`, `checkout`, `switch`, `worktree`, `read-tree`, `update-ref`, `merge`, `rebase`, `cherry-pick`, `commit`, `push`, or PR command was run by this research agent. In particular, this research wrote no branch, tag, remote-tracking ref, index, or registry value.

## Files Found

- `.trellis/tasks/archive/2026-08/08-25-audit-sync-upstream-20260726/research/sync-upstream-20260726-branch-audit-2026-08-25.md` - classifies the 47 sync-only commits and separates six reviewed style commits from 11 product commits and metadata.
- `.trellis/tasks/archive/2026-08/08-25-review-upstream-compat-targets/research/target-review-2026-08-25.md` - pins `859efea8`, evaluates every fork removal condition, and finds no capability eligible for retirement.
- `.trellis/tasks/archive/2026-08/08-25-verify-origin-main-alignment/research/final-alignment-baseline-2026-08-26.md` - establishes final fork main `13948d88`, local/origin alignment, and the protected old-main backup.
- `.trellis/tasks/archive/2026-07/07-27-upstream-style-effects-intake/research/final-intake-audit-2026-07-27.md` - defines the six historical style intake rollback points and fork semantics that the old integration preserved.
- `main:docs/upstream-core-delta.json` - current target registry, shared-path declarations, exact six capabilities, fingerprints, tests, and removal conditions.
- `packages/dom-to-figma/src/converter/convert.ts` and `packages/dom-to-figma/src/converter/walk.ts` - fork integration paths carrying composed-parent traversal.
- `packages/dom-to-figma/src/converter/nodes/frame/converter.ts` - target integration surface shared by frame styling and composed-parent behavior.
- `packages/dom-to-figma/src/converter/nodes/text/converter.ts` - target integration surface shared by composed traversal, glyph fallback, nowrap sizing, and text effects.
- `packages/dom-to-figma/src/converter/nodes/image/converter.ts` and `loader.ts` - fork object-position and cancellation evidence.

## Code Patterns

- Governance treats patch ID/cherry output as a signal and requires final merge/tree/capability corroboration: `.trellis/spec/dom-to-figma/frontend/upstream-compatibility.md` under “Contracts” and “Tests Required”.
- A partial upstream overlap cannot satisfy a complete `removeWhen` condition: `.trellis/spec/dom-to-figma/frontend/upstream-compatibility.md` under “Contracts”.
- Fork composed traversal is threaded via `composedParent`: `main:packages/dom-to-figma/src/converter/convert.ts:31`, `main:packages/dom-to-figma/src/converter/dom.ts:16`, and `main:packages/dom-to-figma/src/converter/walk.ts:148`.
- Fork image position is passed from computed style: `main:packages/dom-to-figma/src/converter/nodes/image/converter.ts:56`.
- Fork loader accepts and checks `AbortSignal`: `main:packages/dom-to-figma/src/converter/nodes/image/loader.ts:10` and `:226`.
- Fork nowrap sizing recognizes `whiteSpace === "nowrap"`: `main:packages/dom-to-figma/src/converter/nodes/text/converter.ts:123`.
- Upstream `859efea8` matches the searched font/DOM/image/cancellation/nowrap removal-condition terms only in the font fixture (`packages/dom-to-figma/src/__fixtures__/loaders.ts:49-50`), not in an equivalent runtime capability.
- Upstream-only border behavior is concrete runtime code, not only oracle evidence: 3D style recognition/shading at `upstream/main:packages/dom-to-figma/src/converter/styles/border-3d.ts:56,137`, outline parsing at `upstream/main:packages/dom-to-figma/src/converter/styles/outline.ts:40`, and rounded dash geometry at `upstream/main:packages/dom-to-figma/src/converter/nodes/frame/rounded-dash-border.ts:254`. All three files are absent from the sync tip.
- Advanced upstream gradient behavior has dedicated tiling and conic parsers at `upstream/main:packages/dom-to-figma/src/converter/styles/gradient.ts:270,561`; equivalent signatures are absent from sync.
- Upstream blur parity fixes encode `Figma radius = 2 * CSS sigma` at `upstream/main:packages/dom-to-figma/src/converter/styles/blur.ts:11,27`; sync currently emits the unscaled CSS value at `sync/upstream-20260726:packages/dom-to-figma/src/converter/styles/blur.ts:60-64,106-110`.

## External References

- Live upstream Git remote: `https://github.com/figitdesign/web-to-figma.git`; main and the peeled 0.2.4 tag resolve to `859efea8d7f8330783c6c4e3e520fd673e877336`.
- Live fork Git remote: `https://github.com/aakkino/web-to-figma.git`; main resolves to `13948d88e3ec6a0939f39d8f69ce3ef637976a68`.
- npm registry package: `@figit/dom-to-figma`; `latest` is `0.2.4` and its integrity is recorded above.

## Related Specs

- `.trellis/spec/dom-to-figma/frontend/index.md` - pre-development routing for rendering, upstream compatibility, and testing contracts.
- `.trellis/spec/dom-to-figma/frontend/upstream-compatibility.md` - target pins, removal conditions, exact-path registry, patch/squash evidence rules, and required checks.
- `.trellis/spec/dom-to-figma/frontend/rendering-contracts.md` - fork rendering constraints around borders, shadows, text sizing, and release provenance.
- `.trellis/workflow.md` - planning remains Phase 1; complex work requires reviewed `prd.md`, `design.md`, and `implement.md` before `task.py start`.

## Caveats / Not Found

- The npm projection had no `gitHead`; live tag peeling and prior npm provenance independently identify the commit.
- The checkout is a dirty old sync branch; target claims use commit-qualified reads and nothing was staged or normalized.
- The live upstream interval after `859efea8` is empty, but that is only the secondary drift result. The primary comparison still contains 24 commits relative to the sync/common-base topology, including the later border, gradient and blur behavior identified above.
- Textual apply success for five historical local commits is explicitly not semantic safety evidence. A later implementation phase must reproduce patch application in an isolated target tree and run the complete cohort validation matrix.
- No code, registry, ref/remote/PR, or task status changed; `task.py start` was not run.
