# 复审 upstream 兼容目标

## Goal

复审已漂移的 npm stable 与 `upstream/main` 目标，恢复可阻断主线推进的精确兼容证据。

## Dependencies

- 父任务：`08-25-reconcile-local-main-with-origin-main`。
- 必须等待 `audit-local-main-20-commits` 完成，并读取其批准的能力、路径和治理 cohort 清单。
- 未完成本任务时，`validate-local-main-promotion` 和 `prepare-origin-main-pr` 不得启动。

## Requirements

- 固定当前 stable package version/tag/commit 和 `upstream/main` resolved commit。
- 审查 registry、fingerprint、预算和 adapter compatibility 的必要变化，不扩大豁免或降低行为门禁。
- 在隔离环境运行 core-delta stable/main 和 vanilla stable adapter 检查，记录报告。
- 产出治理 cohort 所需的精确变更清单或明确阻断原因。

## Acceptance Criteria

- [x] stable 和 upstream-main 的完整 immutable targets 已记录。
- [x] target 漂移的每项 registry/fingerprint 处置都有证据。
- [x] stable core、stable adapter 和 upstream-main 检查通过，或任务以明确阻断结论停止。
- [x] 后续验证使用的目标和命令无歧义。

复审报告：[`research/target-review-2026-08-25.md`](research/target-review-2026-08-25.md)。
可应用候选：[`research/upstream-core-delta-candidate.json`](research/upstream-core-delta-candidate.json)。

## Out Of Scope

- 吸收旧 sync 分支提交、向 upstream 提交 PR 或弱化 CI 策略。
