# 吸收上游样式、效果与类型变化：设计

## Scope

本任务只吸收 `upstream/main@cc8d4864e6be53d0d5047fbf97283b112b3117f4`
中与 converter 样式、效果和类型直接相关的通用能力，并补强已有
`upstream-main-compatibility` 门禁。任务保持单一，因为所有改动共享同一上游
基线、相同 converter 接入点和同一套 parity 验收。

## Intake Boundary

| 能力 | 吸收方式 | fork 保留项 |
| --- | --- | --- |
| Text effects / radial paint types | 直接移植增量 union/field | 现有 kiwi schema 与其他节点类型 |
| Text-shadow / filter drop-shadow | 复用上游 parser，按意图接入本地 converter | ring-shadow 与本地文本布局 |
| Color matrix | 移植纯函数，替换为 composed-aware leaf gating | Shadow DOM 与真实子节点语义 |
| Radial / angled gradients | 移植 parser，并传入真实 frame box | text-gradient 继承与现有 paint 顺序 |
| Uniform double border | 移植 parser，以 synthetic child 接入 | per-side decomposition、child ordering、Auto Layout |
| Basic upstream object-fit | 不吸收 | fork 完整 image presentation |

Oracle montage、PR publisher、release changeset 和包版本不在本任务内。

## Integration Flow

```text
upstream style/type primitives
  -> fork frame/text integration points
  -> existing converter document
  -> kiwi encoding
  -> browser/oracle parity
```

底层 `styles/*` 与 `types/*` 文件按上游实现移植。冲突只在调用层按 fork 语义
解决：

- frame converter 负责 color-matrix gating、gradient box 和 double-border
  metadata 解构；
- text converter 只新增 text-shadow effects，不替换 glyph/font/nowrap 逻辑；
- walker 通过既有 child emission 规则放置 double-border inner line；
- image converter 保持 fork 实现，不接受上游 scale-mode-only 路径。

## Executable Upstream-Main Gate

复用 stable adapter fixture 的临时 consumer 模式，但 core 来源改为固定的
`upstream/main` commit 构建产物。检查至少覆盖：

1. adapter 对该 core 的类型兼容；
2. optional capability negotiation；
3. adapter-owned image fallback；
4. 一次基础转换与 clipboard 输出；
5. 无论成功失败都清理临时目录。

普通 PR 中该 job 保持 advisory，`sync/upstream-*` PR 中保持 blocking。

## Compatibility And Rollback

- 每组能力独立提交，但全部属于同一 Trellis 任务。
- 任一能力出现 browser/parity 回退时，只回滚该能力，不回滚其他已验证项。
- 上游 target 在实施前若移动，停止执行并重新审查新增 commit。
- 只有确认上游提供等价完整语义时才允许退役 registry 项；本轮不退役
  `image-presentation`。
