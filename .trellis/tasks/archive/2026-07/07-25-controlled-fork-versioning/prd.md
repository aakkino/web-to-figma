# 可控 Fork 版本治理

## Goal

把当前本地仓库确立为 `figitdesign/web-to-figma` 的独立产品 fork：本地和个人远端默认只推进 fork 自身历史，上游变化仅在显式评估、测试和评审后选择性吸收，避免同步操作意外改变本地产品分支。

## Confirmed Facts

- 当前 `origin` 同时用于 fetch/push，并指向 `https://github.com/figitdesign/web-to-figma.git`；本地账号对该仓库只有 READ 权限。
- 当前 GitHub 登录账号为 `aakkino`，`aakkino/web-to-figma` 尚不存在。
- 本地 `main` 以 `ac830db` 为当前上游共同基线，相对 `origin/main` 为 ahead 35 / behind 0。
- 执行时首次刷新源仓库发现 `upstream/main` 已新增 5 个提交；经用户单独批准，使用精确租约将新建 fork 的 `main` 初始化为本地快照，未吸收这些提交。
- 已提交差异共 219 个文件、约 20,939 行新增和 808 行删除；其中 106 个文件属于 Trellis spec、任务和记录。
- `apps/extension` 已修改上游 15 个既有源码文件中的 12 个，属于 fork 自有产品层；`packages/dom-to-figma` 修改上游 99 个既有源码文件中的 16 个，仍需控制为小型通用补丁面。
- 新增的私有 `internal/browser-capture-adapter` 和 `packages/composed-dom` 承担了大部分新增能力。现有 spec 要求扩展策略留在外围、上游专属映射集中在 bridge、核心仅增加可选通用 hook。
- 工作区另有 5 个已跟踪文件修改，以及 323 个未跟踪文件、约 91 MiB；首次建立 fork 不需要提交或推送这些内容。
- `published-package-test` 是有价值的消费侧回归入口，但当前未跟踪树混有浏览器构建、截图、第三方离线站点副本和字体等资产；`heho` 是回归夹具而非产品源码。
- `@figit/browser-capture-adapter` 的 peer range 为 `@figit/dom-to-figma >=0.3.0 <0.4.0`，而当前核心版本仍是 `0.2.0`；Changesets 会报告不一致，但这不阻止建立 Git fork。

## Requirements

- 采用“独立产品 fork + 选择性吸收 upstream”的长期策略，不配置自动同步上游到 fork `main`。
- 在 GitHub 账号 `aakkino` 下创建 `web-to-figma` fork。
- 最终 remote 拓扑固定为：`origin` 指向 `aakkino/web-to-figma` 并用于 fetch/push；`upstream` 指向 `figitdesign/web-to-figma` 并仅作为读取来源。
- 本地 `main` 只跟踪 `origin/main`，不得跟踪或 pull `upstream/main`。
- 在共同基线提交 `ac830db` 建立不可移动的基线标签，用于后续计算 fork patch；在首次个人远端快照建立对应 fork release 标签。
- 首次推送只包含当前 HEAD 可达的 35 个已提交变更；工作区修改和所有未跟踪文件保持字节级不变，不得被 add、stash、clean 或提交。
- 创建个人 fork 后先推送 `main` 和治理标签，再验证本地 HEAD、工作区状态和远端分支指向未发生非预期变化。
- 个人 fork 的 `main` 禁止 force push 和删除；初次推送及 CI 成功后，再启用 PR 与必要检查门禁，避免保护规则阻塞仓库初始化。
- 日常功能在 `feat/*` 等短期分支完成。上游吸收必须在 `sync/upstream-YYYYMMDD` 分支进行，默认选择性 cherry-pick；只有经过显式评估时才允许整合完整 `upstream/main`。
- 每次上游吸收前记录 `main...upstream/main` 的提交和文件差异，重点审查 `apps/extension`、`packages/dom-to-figma`、workspace manifest、lockfile 与 CI。
- 上游吸收完成前必须通过现有 CI 的 check/parity 门禁及受影响包测试；不得直接在本地 `main` 上解决上游冲突。
- 将包版本不一致记录为独立发布治理问题；本任务不借修改 remote 的机会改变 package version、peer range 或 changeset。
- 将未跟踪内容治理记录为后续独立工作：保留可复现测试源码，忽略/外置生成物和第三方大体积夹具。本任务不批量提交或删除它们。

## Acceptance Criteria

- [x] `gh repo view aakkino/web-to-figma` 显示其 parent 为 `figitdesign/web-to-figma`。
- [x] `git remote -v` 仅显示个人 fork 为 `origin`、源仓库为 `upstream`，且 URL 符合要求。
- [x] `branch.main.remote=origin`、`branch.main.merge=refs/heads/main`，本地 `main` 不跟踪 `upstream/main`。
- [x] `origin/main` 与本地 HEAD 指向同一提交，个人远端完整包含初始 35 个本地提交及本任务后续治理提交。
- [x] 基线标签准确指向 `ac830db`，fork 快照标签准确指向执行时的本地 HEAD，且均已推送到 `origin`。
- [x] `fork-base/ac830db...fork-v0.1.0` 保持 `0 35`；刷新后的 `upstream/main...main` 为 `5 41`，共同基线仍为 `ac830db`，未隐式吸收或丢失提交。
- [x] 治理变更前复算的 334 路径内容指纹与预检完全一致；未清理、stash 或改写用户工作区。
- [x] `main` 的 force push 和删除受到远端保护；PR 门禁和两个实际 CI check context 已启用并验证。
- [x] 仓库中有可审阅的上游同步约定，明确禁止直接 Sync Fork/pull 到 `main`，并规定 sync 分支、差异审查、选择性吸收和测试门禁。
- [x] package peer/version 不一致与未跟踪测试资产不被隐藏，均保留为后续任务，没有混入初始 fork 快照。

## Out Of Scope

- 实现 `.figit` 功能或修改当前其他 Trellis 任务的需求。
- 提交、删除、移动或重新生成 `published-package-test`、`heho`、Trellis 工具文件和其他现有未跟踪内容。
- 发布 npm 包、修改包名/scope、执行 Changesets release 或解决 `0.2.0` / `>=0.3.0` 版本不一致。
- 将现有 35 个提交重写、压缩或 rebase。
- 自动吸收任何未来 upstream 提交。

## Open Questions

- 无阻塞产品问题。执行前由用户审阅本规划；批准后才进入 Git/GitHub 变更阶段。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
