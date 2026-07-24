# 技术设计

## Architecture And Boundaries

本任务保持现有三层所有权：

```text
页面文本与 computed style
  -> browser-capture-adapter 字体请求聚合、候选验证、固定 fallback 选择与诊断
  -> dom-to-figma FontLoader/LoadedFont 契约与 Figma 文本载荷
  -> extension 注入本地 Noto Sans TC composite catalog
```

- `internal/browser-capture-adapter` 负责收集同一字体样式实际需要的字符、验证 glyph 覆盖、选择来源和记录诊断。
- `packages/dom-to-figma` 负责把 loader 明确返回的实际 family/style/weight 一致写入 Figma `fontName` 和 `fontMetaData`。
- `apps/extension` 负责固定 fallback catalog、静态字体 URL、缓存与最近字重选择，不把常见 Web family 维护成 alias 列表。
- 不修改 extension transport、权限、图片管线、捕获状态机或剪贴板编排。

## Font Request And Coverage Flow

1. `collectRequests` 遍历可视文本节点，按规范化的 `family + weight + italic` 聚合文本字符。
2. 聚合结果只保留验证所需字符，不把原文写入诊断；空白与控制换行不作为 glyph 覆盖门槛。
3. `preflight` 仍按字体样式去重并在转换前调用 resolver。resolver 依次尝试页面直读、background transport、显式精确 bundled 规则、固定 fallback。
4. 每个候选经 fontkit 解析后，同时校验 name table family 和目标 CJK/拉丁 code point 覆盖。缺字视为候选失败并继续下一来源，而不是 parseable success。
5. `FontProperties` 增加可选的、排序去重后的 `codePoints`，不携带原文。adapter 在预检阶段按样式聚合 code point，并在当前捕获中固定该样式的解析结果；核心 converter 为每个文本节点传入 code point，随后复用预检选择。
6. 固定 fallback loader 根据请求 weight 选择 400/500/600/700 最近变体；等距时选较低权重。italic 一律降为 normal，并通过 resolved metadata 进入诊断。

字符覆盖检查限定为本任务目标脚本：CJK 与拉丁可见 code point。这样可以修复当前中文/拉丁混排而不声称已经解决 Emoji、阿拉伯文或完整 Unicode fallback。整个字体样式请求只选择一个字体；若任一目标字符要求 fallback，该样式的所有文本节点都复用同一 fallback 结果。core 字体缓存键包含 code point 签名，避免不同字符集合跨节点或跨捕获错误共享不覆盖字符的字体。

## Payload Contract

`FontFile.resolvedFamily` 从“仅用于 metrics 的替代说明”调整为“loader 选择的实际 Figma family”。`loadFont` 保存 `actualFamily`，文本 converter 在以下字段使用同一值：

- `fontName.family`
- `fontName.style`
- `fontName.postscript`
- `derivedTextData.fontMetaData[*].key.family`
- `derivedTextData.fontMetaData[*].fontWeight`
- `derivedTextData.fontMetaData[*].fontStyle`

没有 `resolvedFamily` 时行为不变，精确页面字体仍输出请求 family。存在替代 family 时，PostScript 名优先使用已解析字体的真实 name table 值；只有字体未提供 PostScript 名时才按实际 family/style 合成。

这是 `@figit/dom-to-figma` 的公开 loader 行为变更：`FontProperties` 新增可选 `codePoints`，`resolvedFamily` 改为实际 payload family。需要浏览器测试、README/注释更新和 changeset。adapter bridge 只透传通用字体字段，不新增扩展专属耦合。

## Built-In Catalog Compatibility

当前字体文件元数据为：

| Weight | Name table family | PostScript |
| --- | --- | --- |
| 400 | `Noto Sans TC Thin` | `NotoSansTCThin-Regular` |
| 500 | `Noto Sans TC Thin Medium` | `NotoSansTCThin-Medium` |
| 600 | `Noto Sans TC Thin SemiBold` | `NotoSansTCThin-SemiBold` |
| 700 | `Noto Sans TC Thin` | `NotoSansTCThin-Bold` |

已确认采用低风险方案：catalog 为每个变体声明真实 family 和 resolved metadata，不修改约 19 MB 的字体二进制。500/600 在 Figma payload 中分别使用 `Noto Sans TC Thin Medium` 和 `Noto Sans TC Thin SemiBold`；本任务不要求四个权重归入同一个 family。

## Diagnostics And Failure Behavior

- 精确页面/transport 字体覆盖目标字符时：`status: "exact"`，保持原始 family。
- 候选可解析但缺字时：在安全的 attempts 中记录 `glyph-coverage-miss`，继续固定 fallback；不记录页面文本或原始 URL。
- 固定 fallback 成功时：`status: "fallback"`、`source: "fallback"`，resolved family/weight/italic 与 payload 一致。
- 固定 fallback 自身不覆盖目标字符或 bytes 无效时：保留 `failed`，compatible 模式不得让 converter 静默吞掉该原因；strict 模式仍在转换前失败。
- 现有请求/byte cache 的失败重试语义保持不变。

## Compatibility And Rollback

- resolver 覆盖验证可独立回滚到 parseable-only 逻辑；不会影响 transport 或页面 CSSOM 扫描。
- extension catalog 可独立回滚到现有 alias + Noto Sans Arabic fallback，但这会重新引入本任务根因。
- core payload 变更若导致下游兼容问题，可回滚为原始 family；resolver 和诊断测试仍可保留，但任务的 Figma 字体载荷验收将不成立。
- 不迁移现有存储数据，也不改变捕获 artifact schema。

## Trade-Offs

- 样式级 fallback 会让混合文本中的拉丁部分也使用 CJK fallback，视觉上不如逐字符 font run 精确，但能保证一个可编辑文本节点内的目标字符都有 glyph。
- 在预检阶段聚合字符并固定同次捕获的样式选择；公开 FontLoader 请求增加不含原文的可选 code point 列表，并让缓存键包含该列表。代价是同一样式下一个 CJK 节点会使同次捕获的 Latin-only 节点也使用同一 fallback。
- 输出真实 fallback family 会使 Figma 明确知道使用哪个字体，修复缺字；代价是目的端缺少该 family 时会显示 missing-font 状态，而不再假装原始页面 family 可用。
