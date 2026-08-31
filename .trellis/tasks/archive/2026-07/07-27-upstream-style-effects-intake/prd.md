# 吸收上游样式、效果与类型变化

## Goal

选择性吸收 reviewed `upstream/main@cc8d4864e6be53d0d5047fbf97283b112b3117f4`
中的通用样式、效果与类型能力，保留 fork 已有的完整捕获行为，并将
`upstream/main` 兼容门从静态差异报告补强为可执行验证。

## Confirmed Facts

- `upstream/main` 当前仍解析为已审查的 `cc8d4864e6be53d0d5047fbf97283b112b3117f4`。
- 该上游范围包含 double border、text shadow、filter drop-shadow、CSS
  color-matrix、径向/斜向渐变、基础 object-fit、oracle montage 和发布元数据。
- 上游改动 55 个文件，其中 45 个与 fork 不重叠；19 个核心文件中只有
  5 个与 fork 重叠。
- 三方合并模拟产生 5 个文本冲突；生产代码冲突集中在 frame converter 和
  image converter，其余为 changelog、scene 和 snapshot。
- 7 个新增样式/类型实现文件可以对当前 fork 干净应用，类型检查通过，
  上游 4 个聚焦测试文件共 37 项测试通过。
- fork 的 image presentation 语义严格强于上游：必须保留 object-position、
  精确 none/scale-down、intrinsic dimensions 和现有 parity，不得用上游基础
  object-fit 替换。
- fork 的 color-matrix 接入必须使用 composed/Shadow DOM 感知的视觉叶节点
  判断，不能直接采用上游 light-DOM `childElementCount/textContent` gating。
- fork 的 double-border 接入必须与既有 per-side border decomposition、
  child ordering、Auto Layout 和 composed traversal 协作，不能把
  `doubleBorder` metadata 序列化为 Figma node 字段。
- 最新稳定上游 adapter 的真实安装、类型和基础运行时验证通过；当前
  `upstream/main` CI 只固定 SHA 并报告差异，尚未构建和运行上游 main 源码。
- 当前治理基线为 14 个已登记 runtime 路径、6 项能力和 0 个未登记路径。

## Requirements

- 从 fork `main` 创建新的 `sync/upstream-YYYYMMDD` 集成分支；不得在
  `main` 直接解决冲突，不得 merge/rebase/push 未经批准的远端历史。
- 固定并记录精确上游 commit；若实施前 `upstream/main` 已移动，必须停止
  intake、重新审查新增范围并更新计划，而不是自动扩大任务。
- 按独立能力吸收上游实现，不整颗 cherry-pick 混合提交：
  - `FigmaTextNodeChange.effects` 和 `GRADIENT_RADIAL` 类型扩展；
  - text-shadow 与 filter drop-shadow；
  - CSS color-matrix solid-leaf baking；
  - radial gradient 与按真实 box 计算的 angled linear gradient；
  - uniform double-border synthetic inner line。
- 保留 fork 的 Shadow DOM/composed traversal、glyph-aware font、nowrap text、
  image presentation、image cancellation 和 adapter-owned staging 行为。
- 对 frame/text/walk 等冲突热点采用按意图移植；不得以接受上游实现为由
  覆盖 fork 的 traversal、layout、font 或 image 语义。
- 为每项能力引入上游单元测试，并补充 fork 特有的 browser/oracle 边界用例。
- 新增可执行的 `upstream/main` adapter 检查：从固定 commit 构建或打包
  vanilla core，在临时 consumer 中完成类型检查、能力协商、图片 fallback
  和基础转换；临时文件必须始终清理。
- `upstream/main` 可执行检查在普通 PR 仍为 advisory，在
  `sync/upstream-*` PR 中必须 blocking。
- 每项能力使用独立、可回滚的提交；registry、fingerprint、reviewed target
  和文档更新在实际 diff 审查后单独完成。
- 未经单独批准不得 push、创建远端分支或提交上游 PR。

## Acceptance Criteria

- [x] 精确上游 target 与任务批准时一致，或移动后已经重新审查并获得批准。
- [x] 五组样式/类型能力均有独立实现提交和聚焦测试证据。
- [x] 7 个底层样式/类型文件不再作为未吸收 upstream-only runtime paths；
      新增 fork runtime 差异均已登记且 fingerprint 有审查依据。
- [x] double border 在普通 frame、圆角、Auto Layout、composed traversal 和
      per-side border 场景下不会污染节点字段或改变真实子节点顺序。
- [x] color-matrix 只在 composed-aware 的纯色视觉叶节点上 baking；带文本、
      light-DOM 子节点、Shadow DOM 子节点、图片或边框时不做错误的局部过滤。
- [x] text-shadow、filter drop-shadow、radial gradient 和 angled linear
      gradient 通过上游单测、fork browser tests 与 oracle parity。
- [x] fork 的完整 object-fit/object-position/none/scale-down/intrinsic-size
      测试保持通过，`image-presentation` registry 项不得错误退役。
- [x] `upstream-main` 可执行 adapter fixture 在固定源码 commit 上通过，并在
      ref 漂移、API 缺失或基础转换失败时给出可操作的失败信息。
- [x] `pnpm upstream-core-delta:check`、`pnpm test:upstream-core-delta`、
      stable/main compatibility、`pnpm lint`、`pnpm check-types`、
      `pnpm build`、`pnpm test` 和 `pnpm oracle:parity` 全部满足既定门禁。
- [x] 最终审计列出已吸收能力、保留补丁、冲突解决、精确 commit、测试证据和
      独立回滚点；没有未经授权的 push 或 PR。

## Out Of Scope

- 自动同步或完整 merge `upstream/main`。
- 用上游基础 object-fit 替换 fork image presentation。
- `6337243` 的 oracle montage command 与 PR publisher；它属于独立工具链，
  不为本轮 converter 样式吸收所必需。
- 发布 npm 版本、消费上游 release changeset，或调整 fork 发布节奏。
- 推送本地 upstream-ready 草稿或创建远端 PR。

## Notes

- 本轮作为一个 Trellis 任务顺序完成，不创建子任务或 JSONL 清单。
- 因为涉及 converter、adapter fixture 和 CI，保留简洁的 `design.md` 与
  `implement.md`；经过用户复核后才能 `task.py start`。
