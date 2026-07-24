# 技术设计

## Architecture And Ownership

```text
Review target
  -> extension FontSpecPort
  -> browser-capture-adapter typography inspection
  -> extension temporary typography DOM
  -> existing BrowserCaptureAdapter capture
  -> existing dom-to-figma / fig-kiwi clipboard encoding
  -> navigator.clipboard.write
```

- `apps/extension` 负责按钮、运行状态、说明板视觉结构、临时 DOM 生命周期和 clipboard 写入。
- `internal/browser-capture-adapter` 负责按 composed DOM 遍历目标、读取 computed typography、排除扩展 UI、执行字体 preflight，并把 source token 与 resolved diagnostic 关联。
- `packages/dom-to-figma` 继续作为通用 DOM -> Figma 转换器；本任务不新增手写 Figma text/glyph encoder。
- `packages/fig-kiwi` 不改 schema，只复用现有 NODE_CHANGES 编码。

## Public Contracts

Adapter 增加只读 inspection 能力：

```ts
type TypographyToken = {
  familyStack: ReadonlyArray<string>;
  family: string;
  weight: number;
  style: "normal" | "italic" | "oblique";
  fontSizePx: number;
  lineHeight: { kind: "normal" } | { kind: "px"; value: number };
  letterSpacing: { kind: "normal" } | { kind: "px"; value: number };
};

type TypographyUsage = {
  token: TypographyToken;
  usageCount: number; // visible, non-empty text-node count
  resolution: FontDiagnostic;
};

type TypographyInspection = {
  usages: ReadonlyArray<TypographyUsage>;
  summary: { total: number; exact: number; fallback: number; failed: number };
};

interface BrowserCaptureAdapter {
  inspectTypography(
    target: CaptureInput,
    options?: { signal?: AbortSignal }
  ): Promise<TypographyInspection>;
}
```

Inspection 不包含网页文本、source code points、URL 或字体 bytes。code points 只在 adapter 内部用于 glyph coverage preflight，返回 extension 前必须移除。

Extension 增加：

```ts
interface FontSpecPort {
  copy(
    target: CaptureInput,
    settings: CaptureSettings
  ): Promise<{ status: "success" | "failed"; message: string }>;
}
```

## Typography Collection

1. 以 `CaptureAnalysis.plan.target` 为唯一目标，不重新选择或扩大到 document。
2. 使用与 capture 相同的 composed DOM strategy；跳过 display none、无父元素、空白文本、script/style/template 和 extension UI subtree。
3. 从每个可见文本节点的父元素读取 computed style。
4. 使用 standards-aware CSS value parser 解析 `font-family`，保留 quoted family、family 内逗号和顺序；不使用简单 split。
5. 归一化 weight、style、font-size、line-height、letter-spacing。
6. identity 由完整 source typography token 组成；文字颜色不参与。
7. 每个 identity 统计可见非空文本节点数，并合并用于字体覆盖的排序去重 code points。
8. preflight 仍按 source family/weight/italic 聚合；随后把 FontDiagnostic 回填到所有共享该字体请求的 typography token。
9. 最终按 source family、weight、style、size、line-height、letter-spacing 稳定排序。

## Report Rendering

Extension 创建一个连接到页面但位于极远离屏位置的临时根节点，使 getComputedStyle 和几何测量有效。节点使用唯一 data attribute，不放入扩展 shadow host，也不进入原目标 inventory。

说明板固定宽度，采用三个全宽纵向区段：

- Header：Typography、document title、hostname、统计摘要。
- Font resolution：Source / Figma / Resolution / Usage；按 source family stack、
  weight、style 和 resolved diagnostic 聚合，字号与 metrics 不参与 key。
- Core styles：Specimen / Source / Figma / Size and variants / Usage；按 family
  stack、weight、style、font-size 和 resolved diagnostic 聚合，总 usage >= 2。
- Rare variants：Source / Figma / Metrics / Usage 的紧凑附录；总 usage = 1，
  不显示固定大样张。
- Specimen 使用固定字符串 `Aa Bb 0123 / 中文字样`，每个 Core style 仅一次。
- 标签和元数据使用稳定 fallback；specimen 尝试使用 resolved family/weight/style。
- Exact、Fallback、Missing 使用文字和克制的状态色双重表达，不能只依赖颜色。
- 长 family stack 自动换行；数值使用统一单位和确定性格式。
- 同一 Core style 的 line-height / letter-spacing variants 按 usage 降序、metrics
  稳定排序并完整列出；不做 Top-N 截断。
- Font resolution 和 style group 均优先按 usage 降序排列，再按字号降序和
  family/weight/style 稳定排序。
- 每个信息区段必须是独立的纵向容器，顶层只直接包含 Header 与三个区段；
  不得把超过 9 个表头/数据行全部平铺为同级节点。Figma clipboard 的字符串
  sibling position 在两位数后可能按字典序重排，区段容器同时是语义边界和
  粘贴顺序保护。
- 空 inventory 生成正常 header 与空状态，不抛错。

临时根节点完成布局后作为唯一 CaptureElementInput 交给独立 adapter 的现有 `capture()`。返回 clipboard HTML 后调用现有 clipboard writer。无论 inspection、conversion 或 clipboard 是否失败，都在 finally 删除临时 DOM。

## Workspace Interaction

- ReviewView 在 `Start capture` 旁新增次级 `Copy typography spec` 按钮。
- 按钮使用 `state.capture.analysis.plan.target.input`，因此与 Review 的当前目标完全一致。
- WorkspaceController 增加独立 font-spec output state：idle/running/success/failed。
- font-spec 运行不改变 capture engine phase、prepared capture 或普通 output state。
- 运行期间锁定两个 Review 操作，防止并发 capture 与 report inspection。
- 成功显示可重用的完成消息；失败保留 Review 状态，可直接重试。

## Source And Privacy

Header 从当前 target 的 `ownerDocument` 读取并只输出：

```text
{document.title} - {location.hostname}
```

不输出 protocol、port、path、query、hash、网页正文、CSS rule、font URL 或 bytes。document title 为空时只显示 hostname；两者都不可用时显示 `Untitled page`。

## Failure Matrix

| Condition | Result |
| --- | --- |
| target disconnected | 保持 Review，显示 target lost，要求重新选择 |
| no visible text | 复制有效空状态 frame |
| exact font | source 与 Figma 字体均显示，状态 Exact |
| fallback font | 同时显示 source 与 resolved，状态 Fallback |
| failed font | Figma 栏显示 Unavailable，specimen 使用说明板 fallback |
| report font fallback | 继续导出，并保持 metadata 文字可读 |
| clipboard unavailable/rejected | 保持 Review，显示可重试错误 |
| inspection/conversion throws | cleanup 临时 DOM，保持普通 capture 状态不变 |

## Compatibility And Rollback

- 默认网页 capture 路径、settings、PreparedCapture 和 clipboard output contract 不变。
- 新 adapter inspection 是加法能力；现有 `capture/analyze/start` 行为不变。
- 说明板生成器可从 extension 独立移除，回滚时不影响 glyph-aware fallback。
- 若临时 DOM 方案在真实页面有布局隔离问题，可迁移到同源临时 iframe；inspection contract 与 UI 不变。

## Trade-Offs

- 使用临时 DOM 复用成熟 converter，避免复制 Figma text/glyph 逻辑；代价是必须严谨 cleanup 和隔离 CSS。
- usageCount 采用文本节点数量而非字符数，既避免泄露正文，也使大型段落不会压倒其他 token。
- inspection 保留完整 typography token 便于测试和未来导出；说明板采用聚合
  projection，牺牲逐 token 的平铺对应关系，换取可扫描的 handoff 主体。Rare
  appendix 保证这种展示聚合不会丢失长尾信息。
