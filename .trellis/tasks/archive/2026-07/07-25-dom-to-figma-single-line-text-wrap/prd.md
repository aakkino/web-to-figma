# 修复 Figma 单行文本意外换行

## Goal

让浏览器明确保持单行的文本在 DOM-to-Figma 粘贴后仍保持单行，修复 Portal
`Join beta` 按钮文字因 Figma 字体重新度量而在空格处意外换行的问题，同时不改变
普通段落、固定宽度多行文本和截断文本的既有行为。

## Confirmed Facts

- Portal 原页面在 `1728px` viewport 下的按钮约为 `141.078 x 48px`，文字 Range
  约为 `69.078 x 20px`，只有一个 client rect。
- 文字 computed style 是 Inter 600、`16px`、`line-height: 20.8px`、
  `white-space: pre`；浏览器字体已成功加载。
- 转换器已通过 `isTextOnSingleLine` 识别浏览器是否换行，但所有 TEXT 节点都省略
  `textAutoResize`，使 Figma 以固定宽度重新排版。
- 当前文本框约为浏览器 Range 宽度加既有 width buffer。Figma 的字体度量略宽时，
  `Join beta` 会超过固定文本框并在空格处换成两行。
- Kiwi schema 已支持 `TextAutoResize.NONE`、`WIDTH_AND_HEIGHT` 和 `HEIGHT`；本修复
  不需要修改 schema、adapter、extension API 或 clipboard 公共结构。

## Requirements

- 修复位于 `packages/dom-to-figma` 的文本节点转换边界内，不向 adapter 或 extension
  泄漏核心类型或策略。
- 只对浏览器实际呈现为单一视觉行、且 computed `white-space` 明确为 `pre` 或
  `nowrap` 的文本输出 `textAutoResize: "WIDTH_AND_HEIGHT"`。
- 包含显式换行、浏览器实际多行、ellipsis 截断或其他依赖固定文本框表达的文本不得
  被转成横向自适应。
- 普通 `white-space: normal` 文本即使在当前 viewport 恰好只有一行，也保持既有
  固定文本框策略；本任务不建立所有单行文本的通用推断。
- 保持现有字符、字体解析、glyph、baseline、width buffer、对齐、位置、父节点尺寸和
  多行重排行为；合格单行 TEXT 位于 Auto Layout 父级时，必须输出
  `stackChildAlignSelf: "AUTO"`，避免 Figma 将横向自适应归一化为 FILL。
- 使用元素自身 realm 的 computed style，避免 iframe/shadow capture 读取错误 window。
- 增加 consumer-visible browser 测试和真实 Figma smoke；不能只测试私有 helper。
- 作为已支持输入的视觉修正，增加 `@figit/dom-to-figma` patch changeset；消费者无需
  迁移。

## Acceptance Criteria

- [x] Portal 等价 fixture 的 `Join beta` 输出一个 TEXT 节点，characters 不变，
      `textAutoResize` 为 `WIDTH_AND_HEIGHT`，粘贴到 Figma 后保持单行。
- [x] `white-space: pre` 和 `nowrap` 的单行代表性用例均覆盖，并保留原 measured
      位置、字体、字号、行高和父按钮几何；Auto Layout 子文本输出 `AUTO` 对齐。
- [x] 显式换行的 `pre`、浏览器实际多行文本、`white-space: normal` 单行文本和
      ellipsis 文本继续省略 `WIDTH_AND_HEIGHT`。
- [x] 现有多行 baseline、CJK line-break、文本对齐、Auto Layout 和 font fallback
      测试无回归。
- [x] Kiwi schema、browser-capture-adapter contract 和 extension capture 设置不变。
- [x] `pnpm --filter @figit/dom-to-figma test`、`check-types`、`build` 与
      `pnpm oracle:parity` 通过。
- [x] Chrome 扩展重建后在 Portal clone 执行手工 smoke：按钮外框仍约为原尺寸，
      `Join beta` 单行且居中；记录 viewport、浏览器与 capture 设置。
- [x] 增加 core patch changeset，说明单行文本粘贴后的重排修复且无需消费者迁移。

## Out Of Scope

- 给所有当前只占一行的 `white-space: normal` 文本启用横向自适应。
- 重新设计所有 TEXT 节点的 `NONE / WIDTH_AND_HEIGHT / HEIGHT` 策略。
- 修改字体解析、fallback、width buffer 常量或 Figma/Kiwi schema。
- 修复与本场景无关的文本截断、line clamp、富文本混排或响应式布局问题。
- 修改 Portal clone 或为单一站点增加 extension 特判。

## Open Questions

没有阻塞性产品问题。任务采用已评估并获准落盘的保守范围；扩大到普通单行文本需
另行评审。
