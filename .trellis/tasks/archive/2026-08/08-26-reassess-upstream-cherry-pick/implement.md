# Sync To Upstream Gap Execution Plan

## Activation Gate

- [ ] 用户在本次修订后的最终规划摘要之后另行批准；此前不得运行 `task.py start`。
- [ ] activation 前重新固定 upstream、tags/npm、sync 和 fork main；任一 SHA 漂移则返回 planning。
- [ ] activation 不授权子任务、branch/worktree、代码、registry、commit、push、PR 或 merge。

## Phase A: Reproduce The Ledger

- [ ] 断言共同基线为 `ac830db5...`，拓扑与 `--cherry-pick` 计数均为 `24/109`。
- [ ] 逐行复核 24 个 upstream-only commits，分类总数必须为 `11 functional + 5 test-only + 4 tool/docs + 4 release`。
- [ ] 记录 core-focused tree diff；全仓 434-file diff 仅作噪声披露。
- [ ] 重新运行 sync/main temporary-index dry checks；不得把 clean apply 当成最终安全证据。

## Phase B: Task And Isolation Setup

- [ ] 单独授权后创建 B1、B2、B3、B4、I1、G1 子任务；在每个 `prd.md`/`implement.md` 写明 `(B1 || B2 || B3 || B4) -> I1 -> G1`。
- [ ] 单独授权 isolated branch/worktree，以当时 fork `main` 为基线。
- [ ] sync、backup 和当前 dirty checkout保持不变，只通过 commit-qualified reads 提取历史意图。

## Phase C: Independent Functional Cohorts

### B1 Border

- [ ] 从 final upstream tree 与 sync local double-border intent重建 border parser/decomposition/integration。
- [ ] 覆盖 dotted、3D styles、per-side/rounded dash、outline-offset 和 subpixel border cases；`7dd5da2` geometry runtime 仅由 B4 处理。
- [ ] 运行 focused unit/browser/geometry/Auto Layout/composed-order tests；保留 B1 rollback point。

### B2 Gradient And Background

- [ ] 移植 radial/angled、explicit-stop、conic/repeating gradient semantics，并用 BG-08/09/15 equivalents 验证。
- [ ] 明确排除 `cc8d486` object-fit slice和本地 CSS raster background product。
- [ ] 运行 gradient/paint/text/browser tests、BG-equivalent scenes和 image-presentation regression；保留 B2 rollback point。

### B3 Effects

- [ ] 移植 text/drop shadow、color matrix，以及 CSS blur sigma 到 Figma `2x` radius 的 blur/backdrop-filter current upstream semantics。
- [ ] 保持 composed-tree visual-leaf gating和现有 frame/text contracts。
- [ ] 运行 effect unit/browser、Shadow DOM/composed traversal和 FX-equivalent scenes；保留 B3 rollback point。

### B4 Fractional Geometry Conflict

- [ ] 从 `7dd5da2` 拆分 fractional element/frame sizing 与 text-buffer removal。
- [ ] 只适配通过 current-main geometry evidence 的 frame/element 切片；保留 alignment-aware text width buffer、nowrap 和 composed traversal。
- [ ] 重建 inline/transparent border validation，并运行 text/layout/Auto Layout negative regressions；保留 B4 rollback point。

## Phase D: I1 Integration

- [ ] 仅在 B1-B4 全部通过后合并 shared path changes。
- [ ] 回归 responsive Shadow DOM、composed traversal、font fallback、image presentation、image cancellation、nowrap sizing。
- [ ] 将 upstream test-only scenarios重建为最小当前 fixtures，不复制旧 snapshot/baseline。
- [ ] 添加 core patch changeset；运行 package test/type/build、workspace gates和 `pnpm oracle:parity`。
- [ ] 保留 I1 rollback point。

## Phase E: G1 Governance

- [ ] 最终 runtime paths登记为 exact capability/shared paths；locally adapted files生成 reviewed fingerprints。
- [ ] 仅对与 pinned upstream normalized content完全等价的文件使用 `absorbedUpstreamPaths`。
- [ ] 在 current checker/CI 上实现 upstream-main executable adapter，不重放 `f79f990`。
- [ ] 运行 core-delta tests/check、stable `--verify-latest`、upstream-main report、stable/main adapters和 CI policy checks。
- [ ] 保留 G1 rollback point。

## Full Validation

```powershell
git -c safe.directory=D:/desktop_directory/web-to-figma merge-base upstream/main sync/upstream-20260726
git -c safe.directory=D:/desktop_directory/web-to-figma rev-list --left-right --count upstream/main...sync/upstream-20260726
git -c safe.directory=D:/desktop_directory/web-to-figma rev-list --left-right --cherry-pick --count upstream/main...sync/upstream-20260726
git -c safe.directory=D:/desktop_directory/web-to-figma ls-remote upstream refs/heads/main 'refs/tags/@figit/dom-to-figma@*'
pnpm view @figit/dom-to-figma version dist-tags versions time dist.integrity --json
pnpm --filter @figit/dom-to-figma test
pnpm --filter @figit/dom-to-figma check-types
pnpm --filter @figit/dom-to-figma build
pnpm test:upstream-core-delta
pnpm upstream-core-delta:check
pnpm upstream-core-delta:stable -- --verify-latest
pnpm upstream-core-delta:main
pnpm upstream-adapter:stable
pnpm upstream-adapter:main
pnpm oracle:parity
pnpm lint
pnpm check-types
pnpm build
pnpm test
```

## Review And Write Gates

- [ ] `trellis-check` 独立复核 24-row ledger、B1-B4 cohort boundaries、六项 override invariants、registry mapping和 ref/dirty invariants。
- [ ] 每个 cohort 单独决定 commit；不得 squash 成 whole-sync intake。
- [ ] push、PR 创建、auto-merge/merge分别授权。
- [ ] 失败时停止，不通过 baseline edit、tolerance widening、budget increase或 blind fingerprint refresh 绕过。

## Explicitly Prohibited

- 直接 cherry-pick 当前 24 个 upstream-only commits中的任何一个。
- merge/rebase 整个 sync，或在 dirty sync checkout 上实施。
- 混入 11 个 deferred sync product candidates或本地 `css-background-images` promotion。
- 未经授权写 task status、branch/ref、代码、registry、commit、remote 或 PR。
