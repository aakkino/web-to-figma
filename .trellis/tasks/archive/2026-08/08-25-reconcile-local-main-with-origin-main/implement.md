# 本地 main 与 origin/main 对齐执行计划

## Phase 0. Parent Activation

- [x] 用户批准最终规划摘要后启动父任务；当前回合不得启动。
- [x] 按顺序启动和完成子任务，不把父子关系当作隐式依赖。

## Phase 1. Commit Audit

- [x] 启动 `audit-local-main-20-commits`。
- [x] 刷新并固定 refs、merge-base、ahead/behind 和 20 个完整 SHA。
- [x] 产出恰好 20 行的提交账本及 cohort、证据、风险、keep/exclude 建议。
- [x] 用户复核实际推进集合；若拓扑或 cohort 边界实质变化，返回父任务规划。

## Phase 2. Compatibility Target Review

- [x] 在提交账本获批后启动 `review-upstream-compat-targets`。
- [x] 固定当前 npm stable 与 `upstream/main` 完整 commit，审查 registry/fingerprint 差异。
- [x] 更新候选治理 cohort 并通过 stable/upstream 阻断门禁。

## Phase 3. Isolated Cohort Validation

- [x] 在前两项完成后启动 `validate-local-main-promotion`。
- [x] 为每个非空 cohort 从最新接受 base 创建隔离 worktree。
- [x] 运行 focused tests 和完整 promotion gate，记录目标、命令、exit code 与 artifacts。
- [x] 任何失败阻断对应 cohort 和后续 PR。

## Phase 4. Sequential PRs

- [x] 在验证通过后启动 `prepare-origin-main-pr`。
- [x] 每次远端写操作前取得明确授权。
- [x] 按 governance、adapter、traversal、font、image 顺序创建 review branch 和 PR。
- [x] 每个 PR required CI 与 review 完成后才请求 merge 授权。
- [x] 合并后刷新 `origin/main`，下一 cohort 在新 base 上重新构造和验证。

## Phase 5. Final Alignment

- [x] 所有批准 PR 合并后启动 `verify-origin-main-alignment`。
- [x] 记录旧本地 `main` 完整 SHA并取得本地 ref 写操作授权。
- [x] 创建 `backup/local-main-before-reconcile-YYYYMMDD`，验证其解析到旧 SHA。
- [x] 在不切换当前脏 checkout 的方式下将本地 `main` 重锚定到 `origin/main`。
- [x] 验证 `main == origin/main`，backup 可恢复，sync 分支 SHA 未变化。

## Required Validation

```sh
pnpm lint --diagnostic-level=error --max-diagnostics=none
pnpm check-types
pnpm build
pnpm test
pnpm oracle:parity
pnpm upstream-core-delta:check -- --report <artifact>
pnpm upstream-core-delta:stable -- --verify-latest --report <artifact>
pnpm upstream-adapter:stable
pnpm upstream-core-delta:main -- --report <artifact>
```

账本为每个 cohort 追加受影响包的 focused tests。验证命令必须在对应隔离 worktree 中运行，并记录精确 base/head SHA。

## Stop Conditions

- refs 不再是已规划拓扑；
- 候选提交无法恰好映射或出现未解释依赖；
- stable/upstream target 无法通过阻断复审；
- 任一完整门禁或 required CI 失败；
- 需要未获授权的 push、PR、merge、备份 ref 或本地分支改写；
- 当前脏 checkout 或旧 sync 分支有被覆盖或混入的风险。
