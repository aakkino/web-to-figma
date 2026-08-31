# sync/upstream-20260726 分支审计设计

## Boundary

本任务只产生 task-local research 报告和必要的 Trellis 任务元数据。Git 仓库、产品代码、远端分支和 PR 均为只读审计对象。允许刷新远端跟踪引用和使用临时导出目录；任何临时目录必须位于明确的 `.tmp` 子目录并在无需破坏用户内容的前提下清理。

## Evidence Model

审计使用四类独立证据，结论不得跨层提升：

1. **Git identity**：完整 SHA、拓扑、patch/cherry 信号、文件集合和提交消息。
2. **Trellis provenance**：task 状态、PRD、design、implement、research、verification 和 archive 记录。
3. **Validation evidence**：历史命令及结果、当前可复现的只读检查、CI/PR 状态。
4. **Working-tree state**：当前未提交内容，只用于风险和归属提示，不作为提交历史的一部分。

`git cherry`、patch-id 和 `--cherry-pick` 只作为信号。遇到 squash 或按意图移植时，必须结合托管平台 merge metadata、树差异和任务记录判断实际等价关系。

## Commit Classification

以 `main..sync/upstream-20260726` 为全集，构造逐提交清单并为每项记录：

- SHA、日期、主题、父提交；
- 主类别和能力/产品组；
- Trellis task 路径及完成状态；
- 已有验证或最终审计文件；
- 是否已进入 `origin/main`；
- 建议处置与重新验证需求。

分类总数必须与 Git 计数相等。任务/日志提交与产品提交可属于同一任务组，但每个 SHA 只能有一个主类别。

## Review Levels

| Level | Evidence | Meaning |
| --- | --- | --- |
| L0 | 仅提交存在 | 未审查 |
| L1 | task planning/archived | 有任务归属，不证明质量 |
| L2 | task-local tests/checks | 对任务范围有技术验证 |
| L3 | final integration/intake audit | 对明确提交边界有综合审查 |
| L4 | remote PR review + required CI | 具备合入 fork main 的远端审查证据 |
| L5 | 可达 `origin/main` | 已进入 fork 稳定主线 |

处置建议必须引用实际达到的最高等级，不能由 L1 推断 L3/L4。

## Historical Boundaries

- `f79f990` 是 2026-07-27 upstream style intake 的最后一个行为/治理提交；其 task 审计和 journal/archive 元数据随后结束于 `4c27bc2`。
- `f547f8e`/相关 archive 提交记录 PR #33/#34 的 no-action 研究，不代表产品 intake。
- `4c27bc2..HEAD` 是原 intake 最终审计后新增历史，必须按各自任务重新分级。
- 执行时若 SHA 或计数变化，报告使用新快照并解释与规划假设的差异。

## Output

主要交付物为 `research/sync-upstream-20260726-branch-audit-2026-08-25.md`，包含：

1. 快照与拓扑；
2. 逐提交/提交组清单；
3. Trellis 审查证据矩阵；
4. historical upstream decision 边界；
5. 工作树隔离清单；
6. 分支整体处置建议；
7. 未决风险和后续需单独授权的动作。

## Safety And Rollback

审计不改变 Git 历史和产品代码，因此回滚单位仅为本 task 目录内的文档提交。若任何命令可能修改工作树、index、分支、远端 PR 或 registry，则停止并以只读替代方案获取证据。
