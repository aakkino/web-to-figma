# 技术设计

## 设计目标

在核心 leaf converter 内建立明确的图片 presentation 解析层，把浏览器的
`object-fit` / `object-position` 计算结果转换为现有 Figma IMAGE paint 能力。
资源获取、格式规范化、hash、预算和重试保持原边界；本任务只改变同一已准备图片
如何放入 measured image box。

## Architecture And Ownership

```text
browser-capture-adapter
  inventory / scheduling / retry / budget
                  |
                  | project-owned ConversionBridge
                  v
bridges/dom-to-figma.ts
                  |
                  | public core API only
                  v
@figit/dom-to-figma
  ImagePreparation -> ImageCache -> image leaf converter
                                      |
                                      v
                              image presentation resolver
                                      |
                                      v
                         Figma ROUNDED_RECTANGLE + IMAGE paint
```

`converter/nodes/image/` 继续拥有 `<img>` 到 Figma 节点的映射。若新增纯解析或
几何 helper，放在该目录旁，不建立通用 utils，也不把 Figma paint 细节移到
adapter。`converter/styles/` 只在其他节点种类也需要同一 CSS 解析时才共享。

## Root Cause Contract

当前 leaf converter 使用 measured box 作为节点尺寸，却无条件发出 `FILL`。
对于报告现场：

```text
intrinsic = 90 x 46        aspect = 1.9565
box       = 272.77 x 51.59 aspect = 5.2873
FILL scale = 272.77 / 90 = 3.0308
rendered image height = 46 * 3.0308 = 139.42
visible vertical fraction = 51.59 / 139.42 = 37.0%
```

因此图片 bytes 完整，但 Figma 只显示居中的水平切片。修复的 contract 是保持
node box 不变，改变 box 内图片内容的 scale/alignment。

## Proposed Internal Model

先通过 representation spike 验证 Kiwi/Figma 字段，再冻结具体类型。推荐内部
形状如下：

```ts
type ImagePresentationInput = {
  fit: "fill" | "contain" | "cover" | "none" | "scale-down";
  position: string;
  box: { width: number; height: number };
  intrinsic: { width: number; height: number };
};

type ImagePresentation = {
  scaleMode: "FILL" | "FIT" | "STRETCH";
  transform: FigmaTransform;
};
```

该模型是核心内部实现建议，不是新公开 API。若 `none` / `scale-down` 需要现有
union 以外的内部分支，可以扩展为 discriminated union，但不能用宽泛对象或
未验证的 magic matrix 绕过类型。

## Representation Gate

实现前必须用最小非对称图片 fixture 验证 Figma/Kiwi 对下列组合的实际行为：

| CSS semantics | Candidate Figma representation | Gate |
| --- | --- | --- |
| `fill` | `STRETCH` | 验证失配宽高比确实拉伸且无裁切 |
| `cover` center | `FILL` | 保持当前正确基线 |
| `cover` non-center | `FILL` + paint transform | 验证裁切 anchor 与浏览器一致 |
| `contain` center | `FIT` | 验证透明 letterbox 与完整内容 |
| `contain` non-center | `FIT` + paint transform or equivalent | 验证 free-space alignment，不接受默认居中 |
| `none` | intrinsic-size placement + clipping | 验证不缩放和 position |
| `scale-down` | choose exact `none`/`contain` branch | 验证大小比较边界 |

优先从已编码 document 字段、round trip 和 live Figma/oracle 观察结果，不凭插件
API 名称推测内部矩阵语义。不得手改 `packages/fig-kiwi/src/schema.json`。

如果现有 IMAGE paint 无法精确表示某一必需组合：

1. 停止实现并记录不可表示的最小反例；
2. 比较 paint transform、父裁切节点、派生透明栅格三种策略；
3. 评估 node hierarchy、Auto Layout、blob dedup、内存预算和 SVG 清晰度；
4. 将 schema、bridge 或 per-element raster 扩展作为新的设计评审，不在本任务中
   静默引入。

## Object Position Resolution

从元素自身 `ownerDocument.defaultView.getComputedStyle(element)` 读取计算值。
解析结果应是横纵轴各自的 anchor/offset，而不是保留未经解释的字符串。

- `left/top` -> 0，`center` -> 0.5，`right/bottom` -> 1；
- percentage 使用 `(boxSize - renderedObjectSize) * percentage`；
- 计算后长度相对于对应起始边定位；
- edge-offset 形式按对应边反向计算；
- 当 free space 为负数时，同一公式控制 cover 的裁切窗口；
- fractional measured geometry 保持到最终字段允许的精度，不提前 `Math.ceil`
  presentation 中间值。

现有节点 box 取整行为是否保留由 parity fixture 决定；本任务不能顺便重构所有
图片 geometry。

## Intrinsic Dimensions

优先使用可靠的 `naturalWidth` / `naturalHeight`。representation spike 还必须覆盖
页面 `<img loading="lazy">` 未解码、但 staged preparation 已持有可用 bytes 的
场景。

若 paint transform 需要固有尺寸且 DOM 元素仍为 0：

- 在核心图片处理结果中记录解码所得尺寸；
- 该元数据只供核心 cache/leaf converter 使用；
- adapter 仍只观察 opaque preparation 结果和 `byteLength`；
- 不因尺寸元数据让 conversion walk 重新 fetch、decode 或 hash。

若这要求改变当前 root-exported `PreparedImage` 类型，应保持 additive、说明发布
影响，并再次确认 clean consumer 与 bridge 仍无需读取该字段。

## Data Flow

1. leaf converter 从元素自身 realm 读取 measured rect 和 computed style。
2. `ImageCache` 返回已准备或直接加载的同一 Figma-ready image resolution。
3. presentation resolver 获得 fit、position、box 和必要的 intrinsic size。
4. resolver 产生已验证的 scale mode/transform；节点继续使用原 border、radius、
   opacity、effects、parent/stack 字段。
5. blob manager 注册源图片 bytes；presentation 不改变 source hash。
6. placeholder 分支不运行 presentation，也不注册 blob。

同一 source 的不同元素共享资源 resolution，但每个节点独立计算 presentation。
这保持资源去重，同时允许一个节点 `cover`、另一个节点 `contain left`。

## Compatibility And Replaceability

- `ConversionBridge` 的 `convert -> { clipboardHtml }` contract 不变。
- adapter 的 project-owned requests、events、diagnostics 和 fake bridge 测试不变。
- `FigmaConverterConfig` 不新增 extension-specific option。
- 输出 clipboard bytes 会因视觉修正而变化，这是 patch 行为变更；消费者无需迁移。
- 替换引擎仍可实现同一 `ConversionBridge`。建议把报告 fixture 作为黑盒 fidelity
  case，而不是要求替换引擎复用本核心的内部 helper。
- 不新增 `@figit/fig-kiwi` schema 字段时，不发布 fig-kiwi changeset。

## Testing Strategy

- Pure tests：position parser、free-space/crop offset、scale-down 分支和 fractional
  geometry。
- Browser tests：真实 computed style、natural dimensions、SVG/raster、五种 fit、
  非居中 position、共享资源与 staged/direct parity。
- Consumer-visible assertions：检查最终 node/paint 字段和解码 document，不只检查
  helper 返回值。
- Oracle scene：使用全高、非对称、透明背景图片，使 center crop、stretch 和
  position 错误可被像素/属性 tier 明确发现。
- Boundary regression：adapter import-boundary、fake bridge 和 prepared reuse 测试。
- Manual smoke：Portal Founder memo 签名与相邻方形 cover 头像一起验证。

## Risks And Rollback

- 最大风险是误解 Figma paint transform 坐标系；representation gate 必须先于代码。
- `object-fit` 默认值是 `fill`，正确映射为 STRETCH 可能改变大量显式失配宽高的
  历史输出。fixture 和 oracle 必须区分预期修正与无关回归。
- 非居中 contain 若只能通过额外 node 表示，可能破坏 Auto Layout/parent index；
  未验证前不采用。
- per-element raster 会增加内存并破坏单 blob 复用；未经过新评审不采用。
- 回滚应只撤回 presentation resolver/integration 和对应 changeset，不撤销 staged
  resource pipeline 或 bridge decoupling。
