# 图片管线与表现语义上游化

## Goal

拆分图片暂存、占位与 object-fit/object-position 行为，形成通用上游补丁并收缩 fork 核心差异。

## Requirements

- 将图片差异拆成两类：通用视觉正确性进入上游候选，资源调度/预算/占位策略留在 adapter。
- `object-fit`、`object-position`、intrinsic size 和 Figma transform 映射必须形成不依赖 extension 的独立核心补丁。
- staged preparation 在 adapter fallback 验证后优先移出核心；只有上游明确需要通用 hook 时才保留最小可选接口。
- 图片处理必须保持格式转换、哈希/字节计数、取消、缓存清理和避免转换期意外网络请求的现有保证。
- placeholder 原因和调度诊断继续由产品层拥有；核心只接收表达转换所需的通用结果。
- 每个上游候选只解决一个行为问题，并带纯函数测试、浏览器集成测试和 CSS 语义依据。
- 实际提交上游 PR 需要用户另行明确批准。

## Acceptance Criteria

- [x] `fill`、`contain`、`cover`、`none`、`scale-down` 及关键 `object-position` 组合有稳定测试并匹配浏览器语义。
- [x] 图片表现补丁可以在 vanilla upstream 上独立应用，不依赖 staged scheduler 或 extension。
- [x] adapter fallback 下，预取成功、预算跳过、加载失败、晚到请求和取消的输出与当前 fork 等价。
- [x] staged preparation 从核心删除或缩成上游可接受的最小可选 hook，且 bridge 不再硬依赖它。
- [x] 转换阶段不会绕过已确定的 placeholder 决策发起未计划网络请求。
- [x] 上游候选提交和 PR 草稿按表现语义与可选 hook 分离，未获批准前不发布。
- [x] 图片浏览器测试、extension 捕获测试和 oracle parity 全部通过。

## Notes

- 依赖差异治理；staged core API 的退役额外依赖 `07-25-vanilla-upstream-adapter-fallback`。
- 减少核心文件数不是单独验收标准，表现与资源语义必须先证明等价。
