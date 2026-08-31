# Origin main 顺序 PR 设计

四个 promotion unit 使用 `review/local-main-<unit>-YYYYMMDD`，以最新已刷新 `origin/main` 为 base。首个 unit 合并 C1+C2，建议分支名为 `review/local-main-governance-adapter-20260825`。PR 不形成长期 stacked 链；前序 PR 合并后，下一 unit 重新构造、验证和发布。

PR 描述引用提交账本、target review 和验证报告，并列出 original-to-curated SHA、排除项及回滚单位。远端状态变化均是独立授权边界。

本次授权仅允许创建并核验首个本地 review branch。push、PR 创建/修改、merge 仍分别等待明确授权。
