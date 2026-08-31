# 原版上游适配器降级路径

## Goal

让 internal/browser-capture-adapter 可在原版上游能力缺失时安全降级，解除对 fork-only API 的硬依赖。

## Requirements

- 保持 `internal/browser-capture-adapter/src/bridges/dom-to-figma.ts` 为整个 adapter 和 extension 唯一的 converter import boundary。
- 用显式能力检测代替对 `createImagePreparation` 的强制断言。
- 当核心提供 staged image preparation 时继续使用原生路径；缺失时使用 adapter-owned staging/cache fallback。
- fallback 必须支持预取、取消、占位、清理和转换期读取，并保持现有 `ImagePreparationPort` 对上层调用者不变。
- fallback 不得要求修改 vanilla upstream 核心，也不得把 extension 产品状态带入 converter 配置。
- 保持 fork workspace 路径的当前行为和性能特征；能力协商不得在每张图片上重复进行。
- 同时测试 fork workspace、最新稳定 vanilla upstream 和缺少可选能力的结构化 fixture。
- 保留对真正不可支持的核心版本的稳定错误，但缺少 `createImagePreparation` 本身不再构成致命错误。

## Acceptance Criteria

- [x] 安装不导出 `createImagePreparation` 的受支持 vanilla upstream 时，bridge 创建和基本捕获不抛 `UnsupportedCaptureCapabilityError`。
- [x] 原生 staged 路径与 adapter fallback 路径都通过图片成功、跳过、失败、取消和 `clearCache` 测试。
- [x] fallback 下 staged 图片、占位诊断和转换结果与当前 fork 行为一致。
- [x] import-boundary 测试继续证明 extension 零直接导入、adapter 仅一个 bridge 导入。
- [x] 最新稳定 upstream 兼容 job 为 blocking；`upstream/main` 遵循父任务的 advisory/blocking 规则。
- [x] 未删除或破坏现有公开导出；若弃用错误类型，提供迁移说明。

## Notes

- 责任目录为 `internal/browser-capture-adapter`；它不是当前 Trellis package 清单中的独立 package，因此任务元数据保持跨包。
- 本任务依赖 `07-25-upstream-core-delta-governance` 的基线和矩阵规则。
- fallback 的“一致”指可见透明占位几何、调度决定和项目诊断一致；vanilla `0.2.1` 只能通过公开 `imageLoader` 注册透明 blob，无法复刻 fork-only 的 `Image (skipped)` 名称和零 blob 元数据。该限制已进入 adapter README 与 staged-resource spec。
