# 对齐本地 main 与 origin/main

## Goal

审计本地 `main` 相对 `origin/main` 的独有历史，只把当前仍应保留且通过复核的能力推进到 fork 的远端稳定主线，并最终让本地 `main` 与 `origin/main` 指向同一已验证提交。

## Confirmed Facts

- 2026-08-25 的本地快照中，`origin/main` 为 `606ee8aa9ca4915ec28dd7853fd5b42283ff54ea`，本地 `main` 为 `bac116ad8a7ac18812cfa6af72b140c45c6dbf83`，`origin/main...main` 为 `0 / 20`。
- `sync/upstream-20260726` 在本地 `main` 之上另有 47 个提交；它不是本任务的推进来源或 PR head。
- 当前 checkout 有既存未提交和未跟踪内容，不能作为审计、重写、验证或冲突解决工作区。
- 20 个提交是单父线性历史，初步分为兼容治理、adapter fallback、DOM traversal、字体测试与交接、image pipeline 五个 cohort。
- 删除任何中间提交都会改写其后所有提交 SHA，因此 curated 历史不能通过 fast-forward 替换现有本地 `main`。
- registry 中的 stable/upstream targets 已漂移；CI 将 stable `latest` 漂移作为阻断失败，`upstream/main` 在 sync 分支上也是阻断门禁。

## Key Decisions

- 经用户确认，不把 20 个提交作为不可拆分整体默认推进。逐提交审计后按 Trellis task 和独立验证边界形成 cohort，可排除能安全解耦且对主线无必要的元数据提交。
- task archive、spec、registry 或其他治理元数据如果构成产品契约、验证证据或门禁，则必须随所属 cohort 保留。
- `review-upstream-compat-targets` 是父任务下的阻断型子任务，先于隔离验证和 PR 准备完成；不得弱化门禁绕过漂移。
- 采用多个顺序 PR，而非一个 20 提交 PR。每个 PR 以此前已合并并刷新后的 `origin/main` 为 base，不维持长期 stacked PR 链。
- 全部 PR 合并后，先在单独授权下创建指向旧本地 `main` 完整 SHA 的备份引用，再将本地 `main` 受控重锚定到 `origin/main`。备份和重锚定都不是本次规划批准所授权的操作。

## Phase Transition Approval

- 用户于 2026-08-25 批准本文件对应的最终规划，允许后续会话运行 `task.py start` 并从只读的 20 提交审计开始执行。
- 用户明确要求本会话不运行 `task.py start`、不启动任何子任务，也不执行实现或远端操作；父任务和全部子任务继续保持 `planning`。
- 本批准不包含 push、PR 创建或修改、merge、备份引用创建、本地 `main` 重锚定或其他 ref 写操作。若规划产物发生实质变化，进入执行前必须重新提交最终规划摘要审批。

## Requirements

### R1. 固定执行快照

- 以只读 fetch 刷新远端引用，记录 `origin/main`、本地 `main`、共同基线、ahead/behind 和完整候选提交集合。
- 若不再是 `origin/main` 可达本地 `main` 的纯线性关系，停止执行并返回规划。

### R2. 建立完整提交账本

- `origin/main..main` 的每个提交必须恰好出现一次，记录完整 SHA、task/cohort、产品或治理意图、证据等级、依赖、风险、保留或排除结论及理由。
- 对保留提交记录其 curated SHA 和目标 PR；对排除提交说明其证据如何保留或为何不再需要。
- task `completed`、本地自验和 archive 状态不得冒充远端 review 或当前 CI 证据。

### R3. 隔离与推进边界

- 所有审计、历史构造和验证使用独立 worktree；不切换、清理或混入当前脏 checkout。
- 推进内容只能来自批准后的 `origin/main..main` cohort 及为当前 target review 必需的更新，不得包含旧 sync 分支的 47 个提交。

### R4. 兼容与质量门

- 先复审并固定当前 stable package 与 `upstream/main` 完整 SHA，更新必要的 registry/fingerprint 后运行阻断门禁。
- 每个 cohort 运行受影响包的 focused tests；每个 PR 候选至少通过 lint、type-check、build、workspace tests、oracle parity、core-delta、stable adapter 和 target 检查。
- 任何门禁失败都阻断对应 cohort，不得用扩大豁免、降低预算或 advisory 化替代修复或显式排除。

### R5. 顺序 review/PR 路径

- 计划顺序为兼容治理与 target refresh、adapter fallback、DOM traversal、字体、image pipeline；逐提交审计可在不违反依赖时合并或取消空 cohort。
- 不直接 push `main`，不 force-push。每个 review 分支的创建、push、PR 创建或修改均需后续远端操作授权。
- 一个 cohort 只有在前一 PR 已合并、`origin/main` 已刷新且自身在新 base 上重验后才能进入远端 review。

### R6. 合并后本地主线重锚定

- 全部批准 PR 合并并通过 required CI 后，记录旧本地 `main` 完整 SHA，并在单独授权下创建可恢复的本地备份引用。
- 在确认当前脏 checkout 不会被切换或覆盖的前提下，以非当前工作树或等价安全方式将本地 `main` 重锚定到刷新后的 `origin/main`。
- 最终验证本地 `main` 与 `origin/main` 完整 SHA 相同，备份引用仍解析到旧 SHA，旧 sync 分支未被改写。

## Child Task Map

1. `audit-local-main-20-commits`：固定快照并产出逐提交账本，无前置子任务。
2. `review-upstream-compat-targets`：依赖审计产出的能力和路径清单，复审漂移目标。
3. `validate-local-main-promotion`：依赖提交账本获批及目标复审完成，在隔离 worktree 验证每个 cohort。
4. `prepare-origin-main-pr`：依赖前三项完成，按 cohort 顺序准备 review 分支和 PR；远端写操作另行授权。
5. `verify-origin-main-alignment`：依赖全部批准 PR 合并，备份并重锚定本地 `main`；本地引用写操作另行授权。

## Acceptance Criteria

- [x] 执行快照、20 提交集合、拓扑与五个候选 cohort 可复现。
- [x] 每个候选提交恰好映射一次，并具有证据、风险、依赖和保留或排除结论。
- [x] stable/upstream target 漂移已解决，所有批准 cohort 在当前目标上通过规定门禁。
- [x] 每个顺序 PR 的 base、内容、验证证据和前置合并关系明确，且不含旧 sync 的 47 个提交或脏工作树内容。
- [x] 未经单独授权，没有执行 push、PR 状态变更、merge、备份引用创建或本地 `main` 改写。
- [x] 最终本地 `main` 与 `origin/main` 指向同一已验证提交，旧 main 备份可恢复，旧 sync 分支保持不变。

## Out Of Scope

- 合并、cherry-pick、rebase、删除或 force-push `sync/upstream-20260726`。
- 清理或提交当前工作树中的既存修改和未跟踪文件。
- 自动批准候选提交、绕过远端保护规则或代替人工 PR review。
- 向 upstream 仓库提交 PR，或推进 sync 分支后续 47 个提交。

## Risks And Deferred Items

- 远端 `origin/main`、npm stable 或 `upstream/main` 可能在执行期间继续移动；每个 PR 前必须刷新并重新验证。
- 逐提交审计可能发现 cohort 之间存在未记录依赖；此时应调整顺序或合并 cohort，并重新提交规划差异供复核。
- 具体保留和排除清单由审计子任务产出，不能在当前规划中预判。
