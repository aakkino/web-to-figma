# 验证 origin main 最终对齐

## Goal

全部批准 PR 合并后，保留旧本地 `main` 的可恢复引用，并安全地让本地 `main` 与 `origin/main` 指向同一已验证提交。

## Background

- 旧本地 `main` 的已审计完整 SHA 为 `bac116ad8a7ac18812cfa6af72b140c45c6dbf83`。
- 当前脏 checkout 与旧 sync 分支均为 `sync/upstream-20260726`，已审计完整 SHA 为 `07bbcd751c34a378caeb91b10681842f37c64b7d`。
- PR #2-#5 已按批准顺序合并，最终 live/local `origin/main` 为 `13948d88e3ec6a0939f39d8f69ce3ef637976a68`。
- 共享 checkout 有六个既有 tracked dirty 路径且 staged 为空；最终操作不得切换 checkout 或触碰其 index/worktree。

## Dependencies

- 父任务：`08-25-reconcile-local-main-with-origin-main`。
- 必须等待 `prepare-origin-main-pr` 的全部批准 PR 合并并记录 required CI 结果。
- 备份引用创建和本地 `main` 重锚定分别需要明确授权。

## Requirements

- 刷新并记录最终 `origin/main`、旧本地 `main` 和旧 sync 分支完整 SHA。
- 在单独授权后以 compare-and-swap 方式创建 `backup/local-main-before-reconcile-20260826`，仅当同名 ref 不存在时指向旧 main SHA，并验证可解析。
- 在另一次单独授权后，不切换或覆盖当前脏 checkout，以 compare-and-swap ref 操作将本地 `main` 从已记录旧 SHA 重锚定到 `origin/main`。
- 验证 main/origin 一致、backup 不变、sync 不变，并记录恢复命令。
- 不执行任何 remote push、force、branch deletion、checkout、reset、merge 或 worktree cleanup。

## Acceptance Criteria

- [x] backup ref 精确指向旧本地 main 且可恢复。
- [x] 本地 `main` 与 `origin/main` 完整 SHA 相同。
- [x] 当前脏 checkout 内容和旧 sync 分支 SHA 均未改变。
- [x] 最终 ref 报告和恢复步骤可复核。
- [x] staged 集合仍为空，六个既有 tracked dirty 路径保持一致。

## Out Of Scope

- 删除备份、清理工作树、删除或改写旧 sync 分支。
- 推送本地 `main` 或 backup ref 到远端。
