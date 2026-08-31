# 本地主线推进验证设计

验证以 cohort 为最小单位。第一个 cohort 以刷新后的 `origin/main` 为 base；后续 cohort 在前序合并前只能做预验证，正式 PR 前必须在新的 base 上重新构造并复验。

每份报告绑定 base/head SHA、resolved compatibility targets、focused test 选择依据和完整命令结果。CI 的 advisory 配置不降低本任务本地 promotion gate 的通过要求。
