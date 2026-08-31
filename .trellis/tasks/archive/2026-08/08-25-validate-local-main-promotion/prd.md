# 验证本地主线推进集合

## Goal

在隔离 worktree 中证明每个获批 cohort 能在其实际 PR base 上通过 focused 与完整 promotion gates。

## Dependencies

- 父任务：`08-25-reconcile-local-main-with-origin-main`。
- 必须等待 `audit-local-main-20-commits` 的推进集合获批。
- 必须等待 `review-upstream-compat-targets` 通过；其固定 targets 和治理变更是验证输入。
- 本任务通过前，`prepare-origin-main-pr` 不得执行远端写操作。

## Requirements

- 每个非空 cohort 从最新接受的 `origin/main` base 独立构造，不使用当前脏 checkout。
- 记录 original-to-curated SHA 映射和 changed paths，由此选择 focused tests。
- 运行 workspace lint/type/build/test、oracle parity、core-delta、stable adapter 和 upstream-main checks。
- 保存命令、exit code、base/head SHA、测试计数和 artifacts；任一失败即阻断。

## Acceptance Criteria

- [x] 每个 cohort 的隔离 worktree、base/head 和提交映射可复现。
- [x] focused tests 与完整 promotion gate 全部通过。
- [x] 验证集合不含 sync 的 47 个提交或当前工作树内容。
- [x] 形成可附加到对应 PR 的验证报告。

验证报告：[`research/promotion-validation-2026-08-25.md`](research/promotion-validation-2026-08-25.md)。

验证确认 C1 的 stable-adapter 门禁由 C2 首次引入，因此按父设计允许的硬依赖合并规则，将 C1+C2 作为首个 promotion unit；keep/split/exclude 内容未改变。

## Out Of Scope

- push、PR 创建、merge 或修改远端保护规则。
