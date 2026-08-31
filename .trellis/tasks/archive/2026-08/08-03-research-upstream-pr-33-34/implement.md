# PR #33/#34 compatibility research execution plan

## 1. Freeze Live Targets

- [x] 记录研究开始时间与当前 fork/upstream refs。
- [x] `git fetch upstream --prune`，并显式获取 PR #33/#34 head refs；不切换主工作树。
- [x] 通过 `gh pr view`/GitHub API 记录 state、head/base SHA、review、merge、checks、
  commits、files 与更新时间。
- [x] 查询 npm `@figit/dom-to-figma` 的 `latest`、版本时间线与目标 tag commit。

## 2. Audit PR #33

- [x] 计算 merge base、`git cherry`、patch-id、left/right cherry-pick log，识别
  PR #32 的等价祖先和 PR #33 真正新增 commits。
- [x] 按 runtime/types/tests/oracle/snapshot/changeset 分类有效文件差异。
- [x] 对照当前 fork `border.ts`、相关 tests/scenes、rendering/parity spec、delta
  registry 与 `absorbedUpstreamPaths`。
- [x] 审查 dotted/dashed/mixed-style/rounding/dash representation 语义和测试缺口。
- [x] 在隔离目录运行可行的 focused tests/type-check；记录未运行门禁及原因。
- [x] 写入 `research/pr-33-compatibility-audit-2026-08-03.md`。

## 3. Audit PR #34

- [x] 比较 release branch、`upstream/main` 与 PR #33，确认实际包含关系。
- [x] 提取拟发布版本、changelog、changeset consumption 和 package/tag provenance。
- [x] 对照 fork 的 stable target、adapter fixture、package/peer range 与 release
  separation policy。
- [x] 在可行时运行 registry/stable metadata 检查；不得发布或修改 pin。
- [x] 写入 `research/pr-34-release-compatibility-audit-2026-08-03.md`。

## 4. Produce Combined Decision

- [x] 建立逐 PR/逐 commit disposition matrix，覆盖整 PR、选择性 commit、等待、拒绝。
- [x] 标注 absorbed-path drift、partial overlap、runtime budget、adapter/parity gates、
  blocking/advisory CI 和复审触发器。
- [x] 写入 `research/pr-33-34-cherry-pick-decision-2026-08-03.md`。
- [x] 在结束前再次解析 live refs；若移动，更新全部报告到同一最终快照。

## 5. Validation And Review

- [x] 检查每个事实都有 SHA、命令输出摘要、文件证据或外部来源链接。
- [x] 检查事实、推断、未验证项和建议明确分离。
- [x] 检查报告逐项覆盖 PRD acceptance criteria 和正式 compatibility spec。
- [x] `git diff --check -- .trellis/tasks/08-03-research-upstream-pr-33-34`。
- [x] `python ./.trellis/scripts/task.py validate 08-03-research-upstream-pr-33-34`
  （如 CLI 需要完整路径则按帮助调整）。
- [x] 确认主工作树没有因研究命令新增产品代码、registry 或远端修改。

## Risk Controls

- 不执行 `cherry-pick`、`merge`、`rebase`、`push`、`gh pr review/edit/merge`。
- 不对当前 dirty checkout 执行 switch/reset/clean，不删除用户文件。
- 临时目录必须位于系统 temp 或已验证的任务专用路径，清理前解析绝对路径。
- PR refs 或 npm latest 发生漂移时停止引用旧结论，并以最终一致快照重跑比较。

## Completion Evidence

- Final live revalidation at `2026-08-03T06:52:39.6173865Z` found no movement:
  `upstream/main` remained `cc8d486`, PR #33 remained `03a49c6`, PR #34
  remained `06a3daf`, and npm `latest` remained `0.2.1`.
- Isolated candidate `28c9858`: focused Node border test (6 tests) and
  `@figit/dom-to-figma` type check passed. Browser/oracle, adapter, and full
  sync-branch gates are recorded as deferred intake prerequisites in the reports.
- Fork governance and stable metadata checks passed after using a process-local
  Git safe-directory setting; no global Git configuration was changed.
- Task validation passed, and `git diff --check` produced no output.
- `.trellis/spec/dom-to-figma/frontend/upstream-compatibility.md` now records
  the squash-lineage false-positive rule: generic cherry/patch-ID results must
  be corroborated with PR merge metadata and an interleaved-commit-aware tree
  comparison before selecting an intake commit.
