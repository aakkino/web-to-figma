# Composed DOM 遍历端口上游化

## Goal

将 Composed DOM 与 Shadow DOM 遍历能力整理为通用、可测试、可上游接受的补丁。

## Requirements

- 上游核心补丁只引入通用 DOM traversal strategy 注入点和默认 light-DOM 实现，不引入 extension 或捕获调度依赖。
- 默认配置必须保持上游当前 light DOM 行为，Shadow DOM/slot 遍历仅由消费者显式选择。
- strategy 必须覆盖 walker、分类、form 控件、auto-layout 子项收集和 composed parent 关系，避免同一转换中混用两棵树。
- 核心 hook 与 `@figit/composed-dom` 的 open-shadow 实现分离；上游可先接受 hook，adapter 仍可提供策略实现。
- slot 展开必须处理 assigned nodes、fallback content、nested slots、去重和循环保护。
- 输出顺序必须确定，且不得重复转换同一 composed node。
- 本地产出拆分良好的提交、上游 PR 文案和测试证据；实际提交 PR 需另行批准。

## Acceptance Criteria

- [x] 不传 strategy 时，现有 light DOM snapshots 和 parity 不变化。
- [x] 传入 open composed strategy 时，open Shadow Root、named/default slot、fallback slot 和 nested slot 按浏览器 composed tree 转换。
- [x] walker 与 auto-layout inference 对同一父子关系和顺序达成一致。
- [x] 核心 hook 补丁不增加 `@figit/composed-dom` 运行时依赖，能够被上游单独审阅。
- [x] adapter 继续从 `@figit/composed-dom` 注入策略，extension 没有直接核心导入。
- [x] 形成至少一个原子、通用的上游候选提交和完整 PR 草稿，但未获批准前不发布。
- [x] 完整 workspace types/build/tests 与 oracle parity 通过；workspace lint 受仓库既有 CRLF 基线阻断，本任务文件 scoped lint 通过。

## Notes

- 依赖 `07-25-upstream-core-delta-governance`；不依赖文本任务，可与其并行。
- 上游若只接受 traversal hook，也已显著降低核心差异；open composed 实现可以继续作为外部策略包维护。
