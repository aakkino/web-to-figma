# sync/upstream-20260726 分支审计执行计划

## 1. 固定快照

- [x] 记录 `git status --porcelain=v2 --branch`，不刷新 index 或暂存内容。
- [x] 使用进程局部 `safe.directory` 配置刷新 `origin` 与 `upstream` refs；不切换分支。`origin` 刷新成功；`upstream` TLS 失败，已在报告中作为外部证据缺口记录。
- [x] 解析 HEAD、`main`、`origin/main`、`upstream/main`、merge-base、ahead/behind 和当前 registry targets。
- [x] 查询 fork 托管仓库中是否存在同名远端分支或历史 PR。已确认 fetched `origin` 不含同名分支；GitHub PR/API 查询不可用，未将其推断为不存在。

## 2. 构造完整提交账本

- [x] 导出 `main..sync/upstream-20260726` 的完整提交、父节点、文件集和 patch/cherry 信号。
- [x] 将每个 SHA 映射到一个主类别和一个提交组，验证总数、唯一性和顺序。
- [x] 标记 2026-07-27 intake 边界、2026-08-03 no-action research 边界及其后产品任务边界。

## 3. 映射 Trellis 证据

- [x] 解析 archive task JSON、PRD、design、implement、research 和 verification 文件。
- [x] 将每个提交组关联到实际任务证据；没有证据时明确标为缺口。
- [x] 按 L0-L5 评定最高审查等级，不把 completed/archive 等同于 branch review。
- [x] 用 `trellis mem` 复核对分支处置有影响但未完整写入任务文档的历史决定。

## 4. 审计 upstream 决策边界

- [x] 复核 `cc8d486` patch-retirement、2026-07-27 selective intake 和 PR #33/#34 no-action 三类不同结论。
- [x] 识别哪些历史结论仍只适用于旧固定 SHA/version，哪些已因当前 upstream/stable 移动而需要未来独立复审。
- [x] 不执行新的 cherry-pick 候选语义审查；只记录触发器和后续任务边界。

## 5. 隔离当前工作树

- [x] 分别记录 staged、tracked、untracked、ignored 和内容哈希一致但状态异常的路径。
- [x] 按可能归属分组并标记风险；不 add、restore、clean、commit 或删除。

## 6. 形成处置报告

- [x] 写入 `research/sync-upstream-20260726-branch-audit-2026-08-25.md`。
- [x] 为每个提交组给出保留、重新验证、拆分移植、已替代、仅历史记录或可放弃建议。
- [x] 给出整个分支的首选处置和可逆执行顺序，列出所有需要用户另行授权的动作。

## 7. 验证与独立检查

- [x] 用 Git 命令重新计算 SHA、计数和提交集合，确认账本无遗漏或重复（47/47、无重复、与 Git 范围精确相等）。
- [x] 用结构化 JSON 解析验证 task 映射和报告引用路径存在（13 个引用路径均存在）。
- [x] 运行 `git diff --check -- .trellis/tasks/08-25-audit-sync-upstream-20260726`，以及未跟踪报告的 `--no-index --check`；无空白错误。
- [x] 运行 Trellis task/context validation。`implement.jsonl` 与 `check.jsonl` 均通过；脚本从任务目录解析 Git root 时误报当前记录分支不存在，实际 `git branch --show-current` 仍为 `sync/upstream-20260726`。
- [x] 由 `trellis-check` 对照 PRD、设计和历史证据执行独立只读审查；已核对 47/47 账本、refs/tags、任务状态、证据路径、审查等级、工作树隔离和处置建议，并补正公开 PR 证据边界。

## Safety Gates

- 不运行 `cherry-pick`、`merge`、`rebase`、`reset`、`clean`、`commit`、`push` 或分支删除。
- 不运行 `git add`、`git restore` 或会改写当前工作树/index 的格式化命令。
- 不修改 registry、package version、产品代码、远端 PR 或 GitHub review 状态。
- GitHub、npm 或 fetch 不可用时记录外部证据缺口，不猜测通过状态。
