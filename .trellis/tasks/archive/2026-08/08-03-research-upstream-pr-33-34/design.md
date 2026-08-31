# PR #33/#34 cherry-pick compatibility research design

## Scope And Boundaries

本任务只产生研究证据和决策建议。研究对象是两个独立的移动目标：功能 PR #33
与 release PR #34。`upstream/main`、npm stable target、当前 fork head 和治理
registry 是比较基线。主工作树、产品代码、registry 和远端状态均为只读边界。

## Evidence Model

每份报告使用同一证据层级：

1. **Identity**：研究时间、URL、head/base ref、精确 SHA、state、review、merge、
   checks、npm version/tag/commit。
2. **Patch topology**：commit graph、merge base、patch-equivalent commits、相对
   `upstream/main` 的有效 commit 与 file delta。
3. **Semantic surface**：runtime、types、tests、oracle、fixtures/snapshots、
   changesets/release metadata 分组。
4. **Fork compatibility**：本地对应实现、capability、`removeWhen`、absorbed path、
   shared path、runtime budget、adapter boundary 和 parity contract。
5. **Disposition**：整 PR、选择性 commit、等待合入后刷新目标、不吸收四种选择的
   风险、前置条件、验证门和回滚点。

移动 ref 本身不是证据。报告中的判断只能绑定到最终记录的 SHA。

## PR #33 Analysis Flow

```text
GitHub PR metadata + fetched PR head
  -> compare commit graph with upstream/main
  -> identify patch-equivalent PR #32 ancestry
  -> isolate dotted-border effective delta
  -> map changed paths to fork ownership/governance
  -> compare behavioral and parity contracts
  -> evaluate four intake dispositions
```

关键判断包括：

- 是否存在已等价合入 `upstream/main`、绝不能再次 cherry-pick 的提交；
- `border.ts` 当前若属于 `absorbedUpstreamPaths`，候选改动在 pin 未刷新时是否必然
  触发 absorbed-path drift；
- dotted dash pattern 是否只覆盖 uniform dotted，是否明确保留 dashed/mixed-style
  限制，以及这些限制是否与 fork rendering contracts 一致；
- oracle baseline/snapshot 是否是必须随 runtime commit 吸收的证据，还是需要在 fork
  parity corpus 中重新测量后独立更新；
- PR 的 GitHub merge/check 状态是否足以进入 intake，或只构成待观察信号。

## PR #34 Analysis Flow

```text
GitHub PR metadata + release branch + npm registry
  -> resolve proposed package versions and included commits
  -> compare release branch with upstream/main and PR #33
  -> separate metadata from runtime capability
  -> model post-merge stable-target refresh
  -> decide whether any cherry-pick is valid
```

release PR 的版本 bump、changelog 和 changeset consumption 不自动属于 fork。若 npm
`latest` 移动，正确动作是对发布 tag/commit 做显式 stable target review，并在临时
consumer 中运行 adapter 兼容；不是把上游 release commit cherry-pick 到 fork。

## Isolated Verification

- 通过 `git fetch`/GitHub API 获取 refs 和元数据，只更新远端引用，不切换主工作树。
- 使用系统临时目录中的 `git archive` 或 detached worktree 检查候选源代码；清理前
  校验临时目录绝对路径。
- 优先运行 PR 自带的 focused unit tests 和静态类型检查。完整安装或 oracle 测量仅在
  环境可复现且不会污染主工作树时执行。
- 对 fork 运行现有只读治理/target 检查；若命令依赖当前 dirty runtime，报告必须
  标注结果包含用户工作区状态，不能归因于候选 PR。
- 未运行的门禁必须列为 intake 前置条件，不能用推断性“应通过”替代。

## Report Structure

- `pr-33-compatibility-audit-2026-08-03.md`：身份、拓扑、有效 delta、语义矩阵、
  fork 冲突/治理影响、验证、处置建议。
- `pr-34-release-compatibility-audit-2026-08-03.md`：身份、拟发布内容、#33 包含关系、
  stable target 影响、验证与处置建议。
- `pr-33-34-cherry-pick-decision-2026-08-03.md`：跨 PR 决策表、执行顺序、触发器、
  未决风险和明确的 no-action 边界。

## Compatibility And Rollback

- 研究不落产品行为，因此回滚单位仅为本任务 research 文件。
- 若 ref 在研究中移动，废弃旧的中间结论，记录漂移并重新生成最终快照；不得把两次
  SHA 的证据混在一个结论中。
- 若临时验证失败，保留失败命令和错误类别；不在本任务内修复候选 PR 或 fork。
- 任何后续 intake 都必须单独获得用户批准、创建/继续执行任务，并重新运行当时的
  blocking gates。
