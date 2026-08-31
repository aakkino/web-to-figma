# Upstream 兼容目标复审设计

从审计账本读取能力与路径范围，分别解析 registry pin、npm stable 和只读 fetch 后的 `upstream/main`。将 resolved SHA、版本、registry diff 和检查报告写入 task research；任何 moving ref 名称都不能单独作为证据。

registry 更新仅反映已审查目标和实际 patch fingerprint。失败时保留旧配置作为历史证据并阻断，不通过扩大 path scope、提高预算或把 stable gate 改为 advisory 解决。
