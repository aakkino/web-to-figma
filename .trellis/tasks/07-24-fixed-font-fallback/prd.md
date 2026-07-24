# 固定字体回退与 Figma 字体载荷

## Goal

当页面字体无法获取时，使用固定 CJK fallback 并明确 Figma payload 的字体选择，避免不可覆盖字符产生空白字形。

## Confirmed Facts

- 字体解析器当前只验证 bytes 可解析且 name table family 与候选 family 一致，不验证候选字体是否覆盖捕获文本中的 code point。
- 字体预检会先于转换执行，并按 `family + weight + italic` 缓存结果；转换阶段复用同一个 resolver，因此可以在预检阶段聚合同一字体请求的字符覆盖需求。
- `@figit/dom-to-figma` 当前收到 `resolvedFamily` 后仍有意把 `fontName.family`、`fontMetaData[*].key.family` 和合成 PostScript 名保留为原始页面 family。
- 扩展当前只把固定 CJK 字体配置为常见 family 的 alias；未命中 alias 的 family 会进入 Noto Sans Arabic 通用 fallback，而该字体不含 CJK glyph。
- 内置四个 CJK 文件都覆盖常用 CJK 与拉丁字符，但其真实 name table family 不完全相同：400/700 为 `Noto Sans TC Thin`，500 为 `Noto Sans TC Thin Medium`，600 为 `Noto Sans TC Thin SemiBold`。
- 当前 500/600 文件按统一的 `Noto Sans TC Thin` family 声明，会被 resolver 的 family 校验拒绝。

## Requirements

- 当页面声明的字体无法通过页面直读、后台字体传输或已有精确字体规则获取，或取得的字体不覆盖该样式请求所需的 CJK/拉丁字符时，统一使用扩展内置的固定 CJK fallback catalog；常见 Web 字体不需要逐个加入别名表。
- 页面字体可以精确获取时，继续优先使用页面字体，不被固定 fallback 覆盖。
- 固定 fallback 使用现有内置 Noto Sans TC composite 字体，并按请求字重选择最近可用的 400/500/600/700 变体；若请求斜体，则降级到同字重附近的 normal 变体并明确诊断。
- 同一 `family + weight + italic` 请求中的任一目标字符不被精确字体覆盖时，整个文本样式请求使用一个固定 fallback 变体；本任务不拆分逐字符 font run。
- 使用 fallback 的文本节点，其 Figma payload 中顶层 `fontName` 与 `fontMetaData` 必须一致声明实际 fallback family/style/weight，不能只保留原始但可能缺字的页面字体族。
- 保留现有 `exact` / `fallback` / `failed` 字体诊断，使用户能区分精确字体和固定 fallback。
- 变更限定在字体解析、转换载荷和相关测试；不引入远程字体下载、不实现逐字符多字体混排、不改变图片或布局流程。

## Acceptance Criteria

- [x] 使用首选字体为 `Inter` 的中文/拉丁混合页面 fixture，且页面字体不可获取时，捕获结果包含完整可编辑文本；每个非空白目标字符都有非 `.notdef` glyph。
- [x] 同一 fixture 的 fallback 诊断报告 `status: "fallback"`、`source: "fallback"`、实际 fallback family/weight/italic；不依赖 `Inter` 等 alias 配置才能触发。
- [x] 当可解析的 Inter Latin 字体只覆盖拉丁字符但文本还包含中文时，resolver 拒绝把它视为 exact，并改用覆盖全部目标字符的固定 fallback。
- [x] fallback 文本的 Figma payload 中 `fontName.family` 和 `fontMetaData[*].key.family` 都使用实际 fallback family；可获取且覆盖目标字符的页面 `@font-face` 仍保留原始 family。
- [x] 400/500/600/700 字重分别选择对应本地字体，其他字重按绝对距离选择最近变体；距离相同时选择较低字重，并在诊断中保留请求值和解析值。
- [x] italic 请求使用最近 normal 变体，诊断包含 `resolvedItalic: false` 且状态为 fallback。
- [x] resolver 与 bridge/core 浏览器回归覆盖“字体文件可解析但缺少 CJK glyph”的路径，并断言文本节点未被静默丢弃。
- [x] 扩展测试、适配层测试、类型检查和 Chromium/Firefox 构建全部通过。

## Notes

- 当前已知根因：`Inter` 未命中 CJK 别名后落入不含中文字形的 Noto Sans Arabic；字体文件“可解析”不等于覆盖文本中的所有字符。
- 固定 CJK fallback 的目标是解决中文/拉丁场景；阿拉伯文、希伯来文、Emoji 等脚本覆盖不在本任务范围内。

## Out of Scope

- 逐字符或逐 script 的多字体 run、浏览器实际 fallback 链完整还原。
- 下载新的远程字体、扩大扩展权限，或恢复 Noto Sans Arabic 作为非 CJK 专用 fallback。
- 修改图片、布局、换行测量、捕获 artifact 或剪贴板输出流程。
- 保证阿拉伯文、希伯来文、Emoji 等非目标脚本的字体覆盖。

## Confirmed Family Decision

- 400/500/600/700 变体均按各自字体文件的真实 name table family 输出；500 使用 `Noto Sans TC Thin Medium`，600 使用 `Noto Sans TC Thin SemiBold`。
- 本任务不修改或重新生成字体二进制，也不强求四个字重在 Figma 中显示为同一个 family。
