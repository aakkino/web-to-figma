# 本地主线推进验证计划

- [x] 读取批准账本和 target review 报告。
- [x] 为 C1 创建并核验隔离 detached worktree。
- [x] 构造全部 curated commits，记录 original-to-curated SHA 映射；C1+C2 合并为首个可 promotion 单元。
- [x] 从 C1 changed paths 选择 focused checker tests 和 governance check。
- [x] 对 C1+C2、C3、C4、C5 运行 focused 与完整 promotion gates；全部通过。
- [x] 保存 C1 blocker 报告和 JSON artifact；清理前确认 `D:\w2f-v4` 干净且在共享 checkout 外；worktree 登记和 `.git` 已移除，未强制递归删除残留目录。
- [x] 独立复核 C1 映射、六叶 registry 断言、governance artifacts、历史截图哈希及 trace timeout；报告保存于 `research/c1-trace-timeout-independent-check-2026-08-25.md`。
- [x] 完成基于当前 `origin/main` 的累计预验证；正式顺序 PR 前仍须在每个新接受 base 上重建复验。
