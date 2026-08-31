# 审计 sync/upstream-20260726 分支

## Goal

对长期存在的 `sync/upstream-20260726` 做一次完整、只读、可复核的分支审计，明确哪些提交已经过 Trellis 技术审查，哪些只是 no-action 上游研究，哪些属于后来混入的 fork 产品工作，以及该分支下一步应保留、改名、拆分、部分移植还是放弃。

审计要消除两个容易混淆的结论：某个 upstream commit/PR “无需 cherry-pick 或 merge”，不自动等于本地 sync 分支中的所有独有提交都无需进入 fork `main`。

## Background

- 当前审计对象为本地 `sync/upstream-20260726`，已知 HEAD 为 `07bbcd7`，相对本地 `main` 有 47 个独有提交；执行时必须重新解析并记录完整 SHA 和计数。
- 2026-07-27 的上游样式 intake 在 `cc8d486` 基线上形成了完整技术审计，记录了选择性移植提交及通过的治理、adapter、workspace 和 oracle 门禁，但没有 push 或 PR。
- 2026-08-03 的 PR #33/#34 任务是 no-action 研究，明确没有执行 cherry-pick、merge、push 或产品代码修改。
- 在 2026-07-27 intake 审计收尾点 `4c27bc2` 之后，当前分支又增加了 31 个提交；这些提交包含多个 fork 产品任务，不能继承原 intake 审计结论。
- 当前工作树有 tracked 修改和大量 untracked 内容；它们不是分支提交历史的一部分，必须单独盘点，不能被静默纳入审计结论。
- `upstream/main` 和 npm stable 已在 2026-08-25 发生移动，旧的精确 ref 结论只能用于历史审计，不能作为新 intake 的批准。

## Requirements

### R1. 固定审计快照

- 记录审计时间、当前分支、工作树 HEAD、`main`、`origin/main`、`upstream/main`、相关 tag 和共同基线的完整 SHA。
- 记录 `main...sync/upstream-20260726` 与 `upstream/main...sync/upstream-20260726` 的 ahead/behind、merge-base、cherry/patch 比较信号。
- 若远端引用需要刷新，只允许 fetch；不得切换分支或改变工作树内容。

### R2. 完整提交归类

- 对 `main..sync/upstream-20260726` 的每个提交恰好归入一个主类别：已审查 upstream intake、upstream no-action/research、fork 产品实现、Trellis/task/journal 元数据或其他待解释提交。
- 对每个提交或连续提交组记录对应 Trellis task、任务状态、审计/验证文件、能力或产品意图，以及是否已有独立回滚点。
- 不能用 task `completed` 或 `archived` 代替分支级审查证据。

### R3. 审查证据分级

- 区分规划完成、任务自验、Trellis quality check、最终 intake audit、GitHub PR review、CI 和实际进入 `origin/main`。
- 明确 2026-07-27 intake 审计覆盖的精确提交边界，以及其后提交不继承该结论。
- 明确 2026-08-03 no-action 结论针对的上游候选，不把它扩大解释为整个本地分支的处置决定。

### R4. 工作树隔离

- 单独列出 tracked、staged、untracked、ignored 和 stat/line-ending-only 状态，不把未提交内容计入分支提交审计。
- 标明哪些内容可能属于当前新任务、Trellis 平台刷新、产品测试、临时目录或外部试验；不删除、不暂存、不提交。

### R5. 形成处置矩阵

- 对每个提交组给出至少一种明确状态：保留并进入 main 候选、需要重新验证、应拆分移植、已被替代、仅保留历史记录或可放弃。
- 给出整个分支的推荐处置及理由，并列出执行该处置前仍需用户批准的状态变更。
- 将历史 upstream intake 与 2026-08-25 新 upstream 更新分开；本任务不承担新上游 cherry-pick 设计或实施。

## Acceptance Criteria

- [x] 审计报告记录全部相关 refs 的完整 SHA、时间和比较命令，提交计数可复现。
- [x] `main..sync/upstream-20260726` 中每个提交被恰好映射一次，映射总数与 `git rev-list --count` 一致，没有遗漏或重复。
- [x] 报告为每个提交组链接对应的 Trellis task 和实际验证证据，并明确证据等级与缺口。
- [x] 报告单独确认 2026-07-27 intake 的已审查边界、2026-08-03 no-action 研究边界以及其后产品提交边界。
- [x] 报告确认是否存在 `origin/sync/upstream-20260726` 或相关 PR，并区分本地技术审查与远端 PR 审查。
- [x] 当前 tracked/untracked 工作树被单列，不出现在已提交分支处置矩阵中。
- [x] 报告给出可执行且可逆的分支处置建议，列明保留、拆分、移植、放弃和重新验证对象。
- [x] 报告说明哪些旧 upstream 结论已被当前 `upstream/main`/stable 移动触发失效，但不执行新的 intake。
- [x] 审计全过程不执行 cherry-pick、merge、rebase、reset、clean、commit、push、PR 修改或分支删除。
- [x] 任务质量检查确认报告内 SHA、计数、任务路径和结论均能由 Git/Trellis 记录复核。

## Out Of Scope

- 实际合并、cherry-pick、rebase、提交、push、创建或修改 PR。
- 删除、重命名或清理分支与工作树文件。
- 更新 upstream registry pin、stable target、fingerprint 或 package version。
- 实施 2026-08-25 新发现的 upstream runtime 变化。
- 重新运行所有历史产品任务的完整浏览器或人工 smoke；缺失证据只记录为缺口。
