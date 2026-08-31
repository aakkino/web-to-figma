# 本地 main 与 origin/main 对齐设计

## Architecture

```text
refresh immutable snapshot
  -> complete 20-row commit ledger
  -> review stable/upstream targets
  -> curate ordered cohorts in isolated worktrees
  -> validate cohort on latest accepted base
  -> sequential review branch and PR
  -> refresh origin/main and repeat
  -> back up old local main
  -> re-anchor local main and verify refs
```

父任务只协调跨子任务契约和最终验收。五个子任务分别产出提交账本、兼容目标证据、验证报告、顺序 PR 记录和最终 ref 对齐报告。

## Snapshot And Ledger Contract

执行快照记录采集时间和 `origin/main`、`main`、merge-base、ahead/behind、`sync/upstream-20260726` 的完整 SHA。提交账本每行至少包含：

- original SHA、subject、changed paths 和 owning task；
- cohort、产品/治理/元数据分类和依赖；
- L0-L5 证据等级及证据文件；
- keep/exclude 结论、理由、curated SHA 和目标 PR；
- focused gate 与最终 CI 状态。

账本是推进集合的唯一来源。原始 20 个提交必须一对一覆盖，任何新增 target-refresh 提交单独标识，不伪装成原历史提交。

## Isolation Model

- 当前 checkout 只用于只读状态观察，不切换分支。
- 审计 worktree 固定原始 `main` 快照；每个 cohort 使用从最新已接受 `origin/main` 创建的独立临时 worktree 和 review branch。
- 临时 worktree 路径必须在创建前解析并记录；移除前确认不是当前工作树且不含未提交工作。
- `sync/upstream-20260726` 仅作历史证据来源，不参与 rebase、merge 或 PR base/head。

## Cohort And PR Model

默认顺序：

1. compatibility governance + current target refresh；
2. vanilla upstream adapter fallback；
3. composed DOM traversal；
4. glyph-aware font tests and handoff；
5. adapter-owned image pipeline and image presentation。

审计可以合并存在硬依赖的 cohort，或取消全部提交都被排除的 cohort。每个非空 cohort 以此前已合并后的 `origin/main` 为 base 重新构造和验证，避免长期 stacked PR。建议分支名为 `review/local-main-<cohort>-YYYYMMDD`。

## Compatibility And Validation Contract

target review 固定 npm stable 的 package/version/commit 和 `upstream/main` resolved commit。registry、fingerprint 或测试期望的变化必须有独立审查依据。即使 `upstream/main` 在普通 review 分支的 CI 中配置为 advisory，本任务的本地 promotion gate 仍要求显式成功或明确阻断，不将失败视为可忽略。

每个 cohort 保存命令、exit code、目标 SHA、测试计数和 artifact 路径。完整 promotion gate 包括 workspace lint/type/build/test、oracle parity、core-delta registry、stable core/adapter 和 upstream-main 检查；focused tests 由账本 changed paths 决定。

## Remote And Authorization Boundaries

- fetch 和只读 PR/CI 查询允许用于刷新证据。
- review 分支 push、PR 创建/修改、merge 和保护规则变更均需单独授权。
- 本地备份 ref 创建和 `main` 重锚定也需单独授权。
- 禁止直接 push `main`、force-push、绕过 required CI 或修改旧 sync 分支。

## Rollback And Recovery

- cohort 在 push 前失败：删除经过验证为空闲且干净的临时 worktree/branch，保留报告后重新构造。
- PR 已创建但未合并：停止后续 cohort，不关闭或改写远端状态，直到获得授权。
- PR 合并后回归：停止下一 cohort，通过正常 revert PR 或后续修复 PR 处理，不改写 `origin/main`。
- 本地 main 重锚定前创建 `backup/local-main-before-reconcile-YYYYMMDD` 指向原完整 SHA；最终验证失败时保持 backup，并停止任何进一步 ref 操作。

## Key Trade-Off

顺序 PR 增加了重复构造和验证成本，但把 review、CI、回滚和责任边界限制在单一 cohort。curation 会改变提交 SHA，因此最终使用备份加受控重锚定，而不是假设现有本地 `main` 可以 fast-forward。
