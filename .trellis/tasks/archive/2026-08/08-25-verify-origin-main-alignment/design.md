# Origin Main 最终对齐设计

## Ref 边界

本任务只修改两个本地 ref，且分成两个独立授权门：

1. 创建 `refs/heads/backup/local-main-before-reconcile-20260826`，目标为旧 `main` `bac116ad8a7ac18812cfa6af72b140c45c6dbf83`。
2. 将 `refs/heads/main` 从旧 SHA 原子更新到最终 `origin/main` `13948d88e3ec6a0939f39d8f69ce3ef637976a68`。

两步均使用 `git update-ref <ref> <new> <expected-old>`。backup 创建使用全零 expected-old，防止覆盖已有 ref；main 更新使用已审计旧 main SHA，防止并发漂移。任何 compare-and-swap 失败都立即停止，不采用 force 或无条件重试。

## Checkout 隔离

当前 checkout 固定在 `sync/upstream-20260726@07bbcd751c34a378caeb91b10681842f37c64b7d`。直接更新未 checkout 的 `main` ref 不触碰 HEAD、index 或 worktree，因此不需要 checkout、reset 或 stash。操作前后记录：

- `HEAD`、当前 branch、`sync/upstream-20260726` SHA；
- staged 路径集合；
- tracked dirty 路径集合；
- `main`、`origin/main`、backup ref 完整 SHA。

## Verification And Recovery

最终要求 `main == origin/main == 13948d88...`，backup 仍为 `bac116ad...`，sync/HEAD 仍为 `07bbcd75...`。恢复旧 main 的受保护命令为：

```powershell
git -c safe.directory=D:/desktop_directory/web-to-figma update-ref refs/heads/main bac116ad8a7ac18812cfa6af72b140c45c6dbf83 13948d88e3ec6a0939f39d8f69ce3ef637976a68
```

恢复命令只记录，不在本任务中执行。backup ref 不删除、不推送。

## Failure Handling

- live `origin/main`、旧 `main`、sync 或 checkout 状态漂移：停止并重新规划。
- backup ref 已存在且目标不同：停止，禁止覆盖。
- 任一 `update-ref` 失败：保留当前状态并报告；不得改用 `branch -f`、reset 或 checkout。
- main 更新后验证不通过：不自动恢复；报告精确 refs，并等待新的明确授权。
