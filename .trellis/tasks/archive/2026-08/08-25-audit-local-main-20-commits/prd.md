# 审计本地 main 的 20 个提交

## Goal

固定 `origin/main..main` 执行快照，产出完整、唯一且可复核的逐提交推进账本。

## Dependencies

- 父任务：`08-25-reconcile-local-main-with-origin-main`。
- 无前置子任务；其输出是后续所有子任务的输入。

## Requirements

- 只读刷新 refs，并在独立 worktree 或不切换当前 checkout 的方式下审计。
- 20 个原始提交每个恰好映射一次，记录完整 SHA、task、cohort、changed paths、分类、L0-L5 证据、依赖、风险和 keep/exclude 建议。
- 明确区分产品代码、spec/registry、task archive 和 journal；元数据仅在能安全解耦且不损失契约或证据时建议排除。
- 记录五个候选 cohort 的实际依赖和建议顺序；发现拓扑漂移时停止。

## Acceptance Criteria

- [x] refs、merge-base、ahead/behind 和完整提交列表可复现。
- [x] 账本恰好覆盖 20 个原始提交，无重复或遗漏。
- [x] 每行都有证据等级、风险、依赖和明确处置建议。
- [x] 输出可直接作为 target review、验证和 PR 子任务的输入。

审计产物：[`research/local-main-origin-main-commit-ledger-2026-08-25.md`](research/local-main-origin-main-commit-ledger-2026-08-25.md)。

## Approval

- 用户于 2026-08-25 批准账本中的 keep/split/exclude 方案，允许后续兼容目标复审和隔离验证以该推进集合为输入。
- 本批准不包含 push、PR 创建或修改、merge、ref 写入或本地 `main` 重锚定。

## Out Of Scope

- 构造 curated history、运行完整产品门禁或执行任何 ref/远端写操作。
