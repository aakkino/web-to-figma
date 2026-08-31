# 最大化上游兼容架构

## Goal

在完整保留现有捕获行为的前提下，将 fork 核心差异逐步上游化、隔离或退役，最大化持续兼容上游的能力。

## Problem Statement

当前 fork 已经通过 `apps/extension -> internal/browser-capture-adapter -> @figit/dom-to-figma` 建立了正确的外层依赖边界，但核心转换包仍包含较大的 fork 专属差异，且适配器硬依赖 `createImagePreparation` 这一 fork-only 能力。因此，外层架构是 soft-fork 友好的，核心替换能力尚未达到最大化兼容。

## Requirements

- 上游通用修复必须采用 upstream-first 策略；fork 核心只保留尚未被上游接受或替代的临时补丁。
- 临时核心补丁必须原子化、通用化、具备测试、登记责任人和退出条件，并关联上游 PR 准备计划。
- 产品策略、浏览器资源准备和扩展工作流必须留在 `internal/browser-capture-adapter` 或 `apps/extension`，不得下沉到通用转换核心。
- 迁移期间必须保留当前行为：Shadow DOM/slot、字体回退与 CJK 字形覆盖、分阶段图片与占位、`object-fit`/`object-position`、单行文本尺寸以及 oracle parity。
- 最新稳定上游版本是阻断兼容目标；`upstream/main` 在日常开发中提供预警，在上游同步 PR 中升级为阻断目标。
- 对 `packages/dom-to-figma` 生产代码差异建立登记表和 CI 门禁；新增未登记差异必须失败。
- 以当前 20 个核心 `src` 变更文件为基线，依次收敛到不高于 10、不高于 5，并在上游接受相关补丁后趋近于 0。
- 差异数量不得凌驾于正确性；任何退役导致行为或 parity 回退时，必须保留或恢复临时补丁。
- 本地工作只产出可审阅的原子提交、测试证据和上游 PR 文案；实际向上游仓库提交 PR 需要用户另行明确批准。
- 所有实施工作由六个子任务承担；父任务只协调顺序、跨任务门禁和最终验收。

## Non-Goals

- 不自动同步、合并或变基 `upstream/main` 到 fork 的 `main`。
- 不为了减少 diff 而删除现有用户可见能力。
- 不把扩展专属资源策略包装成通用核心 API 后直接推给上游。
- 不在本任务批准范围内创建远程分支、推送提交或提交上游 PR。

## Acceptance Criteria

- [x] 六个子任务均按依赖顺序完成，并保留各自的测试与决策记录。
- [x] 最新稳定上游版本通过阻断兼容矩阵；同步 PR 同时通过 `upstream/main` 矩阵。
- [x] `packages/dom-to-figma/src` 的现存差异全部登记，新增未登记生产差异被 CI 阻断。
- [x] 适配器能够在没有 fork-only `createImagePreparation` 的原版上游包上工作，并有明确的能力检测和降级测试。
- [x] Shadow DOM、图片、字体和文本能力被拆成可独立审阅的通用补丁，产品策略不进入核心。
- [x] 核心差异达到阶段预算；未达预算时有逐项登记的上游阻塞原因，而不是静默豁免。
- [x] 每次差异退役均通过 `pnpm lint`、`pnpm check-types`、`pnpm build`、`pnpm test` 和 `pnpm oracle:parity`。
- [x] 未经用户单独批准，没有向上游或其他远程仓库创建 PR 或推送分支。

## Notes

- 当前兼容性证据见 `research/current-compatibility-baseline.md`。
- 该任务及全部子任务当前只完成规划，必须在用户复核后才可执行 `task.py start`。
- 最终集成证据见 `research/final-integration-review-2026-07-26.md`；父任务保持 `in_progress`，等待用户复核后归档。
