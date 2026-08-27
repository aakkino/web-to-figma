# Sync To Upstream Gap Reassessment Design

## Comparison Model

本设计使用两个不同角色的 fork refs：

- `sync@07bbcd75`：解释历史本地适配与 current upstream 的差距，只读。
- `main@13948d88`：任何未来实现的唯一基线；不得在 dirty sync checkout 上开发。

分析从共同基线 `ac830db5` 建立完整 commit ledger，再把 commit history 结论投影到 current-main tree。moving target snapshot 仍需固定，但不是主比较本身。

## Upstream-Only Ledger Structure

24 个提交按可验证职责分组：

1. **11 functional**：`0208934`、`774a670`、`51b5821`、`810c2aa`、`cc8d486`、`83202a3`、`0d3c9ea`、`ec38305`、`7dd5da2`、`922e12e`、`20a438c`。
2. **5 test-only**：`d5fc192`、`3a43870`、`b506df1`、`a3b29f7`、`a5b4d54`。
3. **4 tool/docs**：`6337243`、`af98829`、`a1286a2`、`33e7c5f`。
4. **4 release**：`0bf06ec`、`6cc06c5`、`1506a76`、`859efea`。

每行记录 SHA、subject、path/stat boundary、依赖、sync overlap 和 disposition；cross-row evidence 另行记录 sync/current-main applicability 与 dry-apply 结果。test/tool/release 行也必须入账，但不进入产品代码 cohort。

## Implementation Cohorts

后续若获准实施，当前任务作为策略父任务；创建六个可独立检查的子任务，并把依赖写入各自 artifact。

### B1: Border Evolution

- 输入：early double border，以及 dotted、3D styles、per-side style、rounded dash、outline-offset 和 subpixel border evidence。
- upstream runtime sources：`0208934`、`83202a3`、`0d3c9ea`、`ec38305`；相关 test-only border scenes 提供验收输入，`7dd5da2` runtime slice 只归 B4。
- 输出：current-main-compatible border parser/decomposition/frame integration。
- 必须保持：现有 per-side fallback、reserved child indices、Auto Layout、composed child ordering 和 ring-shadow precedence。

### B2: Gradient And Background Parity

- 输入：`cc8d486` 的 radial/angled gradient slice 与 `922e12e` 的 explicit-stop、conic/repeating gradient semantics；BG-08/09/15 作为验证场景。
- 输出：current-main-compatible gradient/paint/text integration。
- object-fit slice 不进入本 cohort；完整 image presentation fork capability继续保留。
- 本 cohort不包含本地 CSS raster background extraction/lazy capture 产品。

### B3: Effects Evolution

- 输入：text-shadow、filter drop-shadow、color matrix，以及后续将 CSS blur sigma 映射为 Figma `2x` radius 的 blur/backdrop-filter parity。
- upstream sources：`774a670`、`51b5821`、`810c2aa`、`20a438c`。
- 输出：current-main-compatible effect parsers 与 frame/text leaf-safe integration。
- 必须保持 composed-tree visual-leaf gating，防止对 Shadow DOM/projected children 进行不完整 color baking。

### B4: Fractional Geometry Conflict

- 输入：`7dd5da2` 中不再 rounding 的 element/frame geometry，以及 inline/transparent border validation。
- 输出：只选择能在 current fork geometry contracts 中证明有益的 fractional frame/element 切片。
- 明确保留 fork 的 alignment-aware text width buffer、nowrap sizing、composed traversal 和相关 browser contracts；不得移植 upstream 的 text-buffer removal。

### I1: Fork Integration And Regression

- 依赖：B1、B2、B3、B4 全部完成。
- 汇总 shared path edits，回归六项 fork overrides、browser payload、oracle scenes 和 changeset。
- test-only upstream commits转译成最小当前场景，不复制旧 baseline/snapshots。

### G1: Governance And Main Adapter

- 依赖：I1 的最终 runtime/test path set 已固定。
- 重新建立 current-main-compatible capability mapping、fingerprints、budget、upstream-main executable adapter 与 CI policy。
- 旧 `f79f990` 只提供治理意图，不作为可重放 patch。

依赖图为 `(B1 || B2 || B3 || B4) -> I1 -> G1`。B1-B4 可独立研究/实现/回滚，I1 不得在任一前置 cohort 未通过时开始。

## Direct Cherry-Pick Gate

直接候选必须同时满足单一职责、依赖闭合、target path ownership 一致、patch/tree 来源清楚、sync 与 main dry evidence、以及完整测试门禁。

本轮结果为零：

- 11 个 functional、5 个 test-only、4 个 release，以及 tool/docs 中的 `33e7c5f`，共 21 个提交对 sync 的临时 index 试投冲突。
- 仅 `6337243`、`af98829`、`a1286a2` 三个工具提交文本 clean apply，但不属于本轮产品 compatibility 目标。
- early style commits 与 sync 功能重叠却没有 patch-ID 等价；later parity commits依赖已演化的 upstream frame/oracle tree。
- future target 是 current `main`，不是 sync；不能因为某 patch 对旧 sync clean 就推导其对 main 安全。

## Verification Model

- B1：border unit/browser suites，Auto Layout/geometry/composed-order regression，border oracle scenes。
- B2：gradient parser tests，paint/text browser payload，BG-08/09/15 equivalents，image-presentation regression。
- B3：blur/shadow/filter unit tests，frame/text browser payload，Shadow DOM leaf-safety，FX equivalents。
- B4：fractional frame/element geometry、inline/transparent border cases，以及 text width buffer/nowrap/composed traversal negative regression。
- I1：六项 fork capability focused tests、package test/type/build、workspace gates、oracle parity。
- G1：core-delta registry/checker、stable/main reports、stable/main executable adapters、CI policy。

## Stop And Authorization Conditions

- upstream/sync/main 任一 SHA 漂移则停止并回到 planning。
- 需要扩大到 11 个 sync product candidates、提高 budget、blind fingerprint refresh 或放宽 oracle tolerance 时停止。
- task activation、子任务创建、branch/worktree、代码/registry、commit、push、PR 和 merge 分别获得授权。
- B1/B2/B3/B4/I1/G1 分别形成 rollback point，不合并为不可拆分的 whole-sync intake。
