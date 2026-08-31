# 上游补丁退役与版本治理

## Goal

在上游补丁被接受或替代后，安全删除本地补丁、更新版本基线并验证行为不回退。

## Requirements

- 仅当选定的上游稳定版或经审查的同步基线实际包含等价能力时，才允许退役对应本地补丁。
- 上游 PR 已合并但尚未进入 fork 使用的基线，不等同于可删除条件满足。
- 每个能力单独退役：先适配 API，再做 shadow comparison，再删除重复代码和 registry 条目。
- 退役必须在 `sync/upstream-YYYYMMDD` 或专用短期分支上完成，不在 fork `main` 直接解决冲突。
- 更新 package version/peer range、lockfile、changeset、文档和兼容矩阵必须与所选基线一致。
- 保留完整行为：Shadow DOM/slot、字体/CJK、图片 staging/placeholder、图片表现、单行文本和 parity。
- 删除失败时回滚该能力的退役提交，不回滚其他已经独立验证的能力。
- 未经明确批准不得 push 或创建上游/外部 PR。

## Acceptance Criteria

- [x] 每个删除项都有包含该能力的精确上游 commit/version 和通过的替代行为证据。
- [x] 每项退役是独立、可回滚的提交，不混入无关同步改动。
- [x] adapter 在新旧能力形状之间的迁移经过契约测试，不依赖猜测导出。
- [x] registry 删除项、差异预算和文档与实际 Git diff 一致。
- [x] 最新稳定上游矩阵通过；同步 PR 中解析后的 `upstream/main` 矩阵也通过。
- [x] 全量质量门和 49-scene 或当时完整 oracle parity 场景集通过。
- [x] 剩余核心差异全部有明确阻塞原因、所有者、复核日期和删除条件。

## Notes

- 依赖治理、adapter fallback、DOM traversal、图片、文本/字体任务的已验证输出。
- 能力可逐项退役，不需要等待所有上游贡献同时发布；父任务只在总体门禁满足后完成。
- 2026-07-26 审查没有发现满足删除条件的能力，因此前两项验收标准按“零个 eligible retirement”成立；完整证据见 `research/candidate-audit-2026-07-26.md`。
