# 准备 origin main 顺序 PR

## Goal

按获批 cohort 创建可独立 review、验证和回滚的顺序 PR，将 curated 历史推进到 `origin/main`。

## Dependencies

- 父任务：`08-25-reconcile-local-main-with-origin-main`。
- 必须等待提交账本和兼容目标复审完成。
- 每个 cohort 必须有 `validate-local-main-promotion` 针对当前实际 base 的通过报告。
- 后一 cohort 依赖前一 PR 已合并并刷新 `origin/main`，不得仅依赖目录树或旧预验证。

## Requirements

- 顺序为合并的 governance/targets + adapter（C1+C2）、traversal（C3）、font（C4）、image（C5）。C1 单独缺少由 C2 引入的 stable-adapter 门禁，因此不得作为独立 PR。
- 每个分支从最新 `origin/main` 创建，内容精确匹配批准账本和 curated SHA 映射。
- 不直接 push `main`、不 force-push；每次 push、PR 创建/修改和 merge 前取得明确授权。
- 用户于 2026-08-25 已授权启动本任务并创建第一个本地 C1+C2 review branch；该授权不包含 push 或 PR 创建。
- PR 附带范围、排除项、base/head SHA、验证报告和回滚单位，并等待 required CI/review。

## Acceptance Criteria

- [x] 每个非空 cohort 有唯一 review branch/PR 和准确内容清单。
- [x] 每个 PR 在实际 base 上通过本地门禁、required CI 和 review。
- [x] 后续 PR 仅在前序合并和重新验证后推进。
- [x] 没有直接 main push、force-push、保护规则绕过或旧 sync 内容。

## Out Of Scope

- 未经授权的远端写操作、自动 merge 或 upstream PR。
