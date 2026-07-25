# 技术设计

## Design Goal

复用转换器已掌握的浏览器视觉行信息，只在 CSS 明确禁止自动换行的安全场景中告诉
Figma 横向自适应文本框。父布局仍由浏览器 measured geometry 驱动；本任务只改变
TEXT 节点在 Figma 重派生时的 resize mode。

## Ownership And Data Flow

```text
DOM Text / Element
  -> ownerDocument.defaultView.getComputedStyle(element)
  -> browser visual-line measurement
  -> conservative auto-resize eligibility
  -> Figma TEXT node change
       textAutoResize = WIDTH_AND_HEIGHT | undefined
       stackChildAlignSelf = AUTO | existing
```

策略留在 `converter/nodes/text/`。不修改 walker、adapter bridge、extension capture
options 或 Kiwi schema。

## Eligibility Contract

推荐增加一个内部判定，输入 computed style、原始内容和浏览器视觉行结果：

```ts
function shouldAutoResizeSingleLineText(input: {
  isSingleLine: boolean;
  whiteSpace: string;
  textOverflow: string;
  text: string;
}): boolean;
```

返回 `true` 必须同时满足：

1. Range client rect 证明浏览器只有一个视觉行；
2. computed `white-space` 是 `pre` 或 `nowrap`；
3. 内容没有会形成第二视觉行的显式换行；
4. 不是 ellipsis 截断表达。

满足时输出 `textAutoResize: "WIDTH_AND_HEIGHT"`；当该 TEXT 的直接父级是已推断
Auto Layout 时，同时输出 `stackChildAlignSelf: "AUTO"`。Figma 会把继承的
`STRETCH` 与 `WIDTH_AND_HEIGHT` 归一化为横向 FILL、纵向 HUG，仍会在固定宽度内
换行；Kiwi `AUTO` 对应 Plugin API 的 `INHERIT`，可保留横纵 HUG。其他文本继续
省略 resize 字段，维持当前 Figma 默认 `NONE`。不在本任务中启用 `HEIGHT`。

## Why Not All Single-Line Text

`white-space: normal` 的段落、标题、表格单元格可能只在当前 viewport 恰好是一行。
若统一设置 `WIDTH_AND_HEIGHT`，Figma 会丢失作者的固定宽度意图，并可能改变居中、
右对齐、Auto Layout 间距或响应式基线。CSS 明确的 `pre/nowrap` 是更窄、可解释且可
回滚的边界。

## Geometry And Compatibility

- 保留 measured size、position 和 width buffer；`WIDTH_AND_HEIGHT` 只允许 Figma 在
  自身字体重度量后消除微小宽度不足。
- 父 frame 尺寸和 padding 不随这些字段主动改变。真实 Figma smoke 必须验证固定按钮
  外框没有因子节点自适应而增长，并验证 TEXT 为横纵 HUG、alignment 为 INHERIT。
- 公开 converter API 和 wire schema 不变；只有部分 TEXT node payload 从缺省字段变为
  已存在 enum 值，属于 patch 行为修正。
- 若 live Figma 证明父 Auto Layout 会因该字段产生不可接受的尺寸漂移，回滚此策略，
  再评估更精确的固定宽度或 derived layout 表达，不扩大 schema。

## Validation Strategy

- Browser tests 断言最终 TEXT node 的 `textAutoResize`，以及 normal/multiline/ellipsis
  负例。
- 保留现有 baseline/glyph/position assertions，避免为了单行修复破坏文本数据。
- Oracle 增加按钮式 `pre` 文本，并关注文字行数、父几何和横向居中。
- Chrome extension 重建后在 Portal clone 进行真实 paste smoke；自动测试无法替代
  Figma 对 TEXT node 的重派生行为。
