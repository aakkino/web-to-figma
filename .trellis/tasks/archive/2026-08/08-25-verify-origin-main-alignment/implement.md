# Origin Main 最终对齐执行计划

## Phase 1: Read-Only Baseline

- [x] 刷新并确认 live/local `origin/main` 为 `13948d88e3ec6a0939f39d8f69ce3ef637976a68`。
- [x] 确认本地 `main` 仍为 `bac116ad8a7ac18812cfa6af72b140c45c6dbf83`。
- [x] 确认 HEAD 与 `sync/upstream-20260726` 仍为 `07bbcd751c34a378caeb91b10681842f37c64b7d`。
- [x] 记录 staged 为空及六个既有 tracked dirty 路径。
- [x] 确认目标 backup ref 不存在。

## Phase 2: Backup Authorization Gate

- [x] 取得创建 backup ref 的单独明确授权。
- [x] 原子创建 `backup/local-main-before-reconcile-20260826`，expected-old 为全零 SHA。
- [x] 核验 backup 精确指向旧 main，且 main、origin/main、sync、HEAD、index/worktree 未变化。
- [x] 由独立 check 复核 backup 创建结果。

## Phase 3: Main Reanchor Authorization Gate

- [x] 取得重锚定本地 `main` 的另一次明确授权。
- [x] 以旧 main SHA 为 expected-old，原子更新 `refs/heads/main` 到最终 `origin/main`。
- [x] 核验 `main == origin/main`，backup 与 sync/HEAD 不变，staged/dirty 集合不变。
- [x] 记录受 compare-and-swap 保护的恢复命令，但不执行。
- [x] 由独立 check 完成最终 ref、checkout 和恢复报告核验。

## Stop Conditions

- 任一 baseline ref 或 live remote SHA 漂移。
- backup 同名 ref 已存在或 compare-and-swap 失败。
- 当前 checkout、staged 或 tracked dirty 集合变化。
- 需要 checkout、reset、force、remote push、ref deletion 或未授权写操作。
