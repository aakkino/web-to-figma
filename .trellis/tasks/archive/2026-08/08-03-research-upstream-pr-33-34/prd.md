# Research upstream PR 33 and 34 compatibility

## Goal

依据项目正式的上游兼容治理规则和已经完成的 patch-retirement、
style-effects intake 审计，对上游 PR #33 与 PR #34 做一次可复现的
cherry-pick 前研究，为后续“等待、拒绝、按提交选择性吸收、刷新兼容目标”决策
提供精确证据。研究本身不改变 fork 运行时代码或远端状态。

## Background

- 正式规则位于
  `.trellis/spec/dom-to-figma/frontend/upstream-compatibility.md`；其中要求固定
  精确 ref/commit、逐项检查 capability 的 `removeWhen`、保留 partial overlap，
  并禁止为了宣称补丁退休而 cherry-pick 只覆盖部分语义的混合提交。
- `docs/fork-maintenance.md` 规定 required upstream fixes 默认通过 cherry-pick
  选择性吸收，完整 upstream merge 仅为例外；包版本和 peer range 对齐属于独立
  release 工作。
- 2026-07-26 patch-retirement 审计拒绝把混合的 `cc8d486` 作为
  `image-presentation` 退休提交；2026-07-27 style-effects intake 随后按能力拆分
  吸收通用样式实现，并保留 fork 更完整的图片语义。
- 上一轮只读观察显示 PR #33 是 dotted-border 主题分支，曾包含已经通过 PR #32
  合入主线的祖先提交；PR #34 是计划发布 `@figit/dom-to-figma@0.2.2` 的
  changesets release PR。执行研究时必须重新获取实时状态，不能沿用旧快照。

## Requirements

### R1. 固定研究快照

- 记录研究时间、`upstream/main`、PR #33 head/base、PR #34 head/base、npm
  `latest`、拟发布版本及全部精确 SHA。
- 记录 PR state、draft/review/merge 状态和 checks；把 GitHub 元数据与本地 Git
  对象交叉验证。
- 若研究过程中任一目标移动，重新解析一次并只对最终快照给出结论。

### R2. PR #33 有效增量审计

- 区分 PR 分支历史与相对当前 `upstream/main` 的有效新增补丁，使用 patch-id /
  `git cherry` / `--cherry-pick` 识别已经等价合入的提交，避免重复吸收 PR #32。
- 列出 dotted-border 生产代码、单元测试、oracle scenes、snapshot/baseline 和
  changeset 的变更边界，并区分运行时能力与生成/发布证据。
- 对照 fork 当前实现、`absorbedUpstreamPaths`、注册 capability、shared paths、
  runtime budget 和相关 rendering/parity contract，判断直接 cherry-pick 是否会
  造成 absorbed-path drift、语义回退或治理登记变化。
- 检查 dotted、dashed、mixed per-side style、stroke/dash representation、圆角及
  oracle parity 等语义边界；明确上游测试能证明和不能证明的内容。
- 分别评估“整 PR cherry-pick”“仅挑有效 runtime/test commit”“等待合入 main 后
  刷新 pin 再吸收”“不吸收”四种处置。

### R3. PR #34 发布兼容审计

- 确认 PR #34 的有效差异是否仅为 release metadata，以及它实际包含哪些已合入
  upstream capability；不得把版本号推断成运行时功能证据。
- 判断 PR #34 与 PR #33 是否存在包含、排序或发布依赖；若 release 分支尚未包含
  PR #33，明确两者不得作为一个原子 cherry-pick 单元。
- 评估 PR #34 合入和 npm 发布后，对 `targets.stable`、tag/commit pin、adapter
  stable fixture、package/peer range 以及 fork 自身 release metadata 的影响。
- 明确 release PR 是否应 cherry-pick，或者只应在发布后触发稳定版目标刷新。

### R4. 组合决策与可追溯证据

- 输出逐 PR 和组合决策矩阵：候选提交、能力、语义等价性、冲突/漂移、必需门禁、
  推荐处置、触发下一次复审的条件。
- 每个结论必须指向精确 SHA、文件/测试证据、正式 spec 条款或历史审计范例。
- 研究报告必须明确区分事实、推断、尚未验证事项和决策建议。

## Acceptance Criteria

- [x] `research/pr-33-compatibility-audit-2026-08-03.md` 固定 PR #33 最终快照，
  识别 patch-equivalent/重复祖先和有效增量，并完成 capability、治理及 parity
  审查。
- [x] `research/pr-34-release-compatibility-audit-2026-08-03.md` 固定 PR #34 与
  npm 快照，说明发布内容、与 #33 的关系及稳定版兼容目标影响。
- [x] `research/pr-33-34-cherry-pick-decision-2026-08-03.md` 给出独立和组合处置
  矩阵，并对每个建议标明前置条件、验证门和复审触发器。
- [x] 报告覆盖正式 spec 中的 exact ref、partial overlap、`removeWhen`、
  absorbed path、runtime budget、adapter stable/main 与 sync-branch blocking 规则。
- [x] 报告复用 2026-07-26 和 2026-07-27 历史审计的证据结构，并解释本次结论与
  历史结论相同或不同的原因。
- [x] 所有 live 事实来自研究期间重新获取的 GitHub、Git 和 npm 数据；命令、SHA
  与来源链接足以复现。
- [x] 研究不执行 cherry-pick、merge、rebase、push、PR 修改、registry 指纹更新、
  包发布或产品代码修改。
- [x] 最终 `git status` 表明除本任务规划/研究制品外，用户原有工作区修改均保持
  不变。

## Out Of Scope

- 实际 cherry-pick 或按意图移植 PR #33。
- 合并、关闭、review 或修改上游 PR #33/#34。
- 更新 `docs/upstream-core-delta.json`、兼容 target、fingerprint 或 CI。
- 更新 fork 包版本、changeset、peer range，或执行发布。
- 修复研究发现的 converter、测试、oracle 或发布问题。

## Risks And Constraints

- PR head、mergeability、release branch 和 npm `latest` 都是移动状态；报告必须
  以 exact SHA 和时间戳限定结论。
- 当前 checkout 存在用户未提交修改。所有候选代码验证必须使用临时导出目录或
  隔离 worktree，禁止切换或清理主工作树。
- PR #33 的 stale ancestry 可能让普通 three-dot diff 夸大有效变更；必须做
  patch-equivalence 分析。
- GitHub checks 通过不等于 fork 的 compatibility/parity 门已通过；报告不得把
  preview/release checks 当作完整兼容证据。
