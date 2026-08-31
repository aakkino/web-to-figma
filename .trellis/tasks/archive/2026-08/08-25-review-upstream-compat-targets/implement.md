# Upstream 兼容目标复审计划

- [x] 读取已批准提交账本和治理 cohort。
- [x] 解析 npm stable version/tag/commit 与 `upstream/main` commit。
- [x] 对比 `docs/upstream-core-delta.json` 的旧 targets 和 fingerprints。
- [x] 在隔离 worktree 构造必要 target-refresh 变更。
- [x] 运行 `upstream-core-delta:check`、stable `--verify-latest`、`upstream-adapter:stable` 和 upstream-main 报告。
- [x] 输出精确 target、报告、治理 cohort diff 和阻断结论。
- [x] 独立复核 candidate 的 12/12 结构断言、live Git/npm targets、三份 JSON 报告和 checkout/ref 不变性。
