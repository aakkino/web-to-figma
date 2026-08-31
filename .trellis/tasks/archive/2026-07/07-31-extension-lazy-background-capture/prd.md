# 修正并重构浏览器插件 lazy background 捕获

## Goal

修正浏览器插件对 `data-bgset` 型 lazy background 的捕获，使
`eyeondesign.aiga.org` 这类页面在不滚动、不执行页面 lazy-loader、不修改页面
DOM 的情况下，仍能把真实图片送入最终 Figma IMAGE payload。

## Requirements

- 只读取明确支持的 `data-bgset`，支持普通 URL/srcset、当前站点的 `-xs-`
  编码、base URI 解析、宽度/DPR 候选选择和协议拒绝。
- 在 inventory 阶段发现并 canonicalize owner 的背景 source，复用现有图片
  scheduler，在字体预检和 conversion 前完成一次请求并按 URL 去重。
- 通过 session-local conversion context 把 owner/source 传给 bridge；core 通过
  通用 resolver 在 computed background 为空时生成 `url(...)`，不认识站点属性。
- 已生效的 computed background 优先；普通 `<img>`、CSS background/gradient、
  dynamic rasterizer、stable-core fallback 和输出流程保持兼容。
- 转换失败、placeholder、unsupported 和 stale context 都有测试覆盖；禁止
  conversion 阶段 late fetch、页面滚动和 DOM mutation。

## Acceptance Criteria

- [x] `data-bgset` owner 进入 inventory，分析阶段不 fetch，资源和背景层计数正确。
- [x] `-xs-`、普通响应式候选、非法 scheme 和 malformed metadata 有回归测试。
- [x] source 在 conversion 前预加载，重复 source 去重，owner context 在 finally
  清理。
- [x] 无 computed background 的 owner 产生 IMAGE paint；已有 computed background
  不重复添加，页面 style 不被改写。
- [x] extension/core/adapter 测试、类型检查、Chrome/Firefox 构建和 zip 打包通过。
- [x] upstream compatibility fingerprints 和 oracle parity 通过。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
# 修正并重构浏览器插件 lazy background 捕获

## Goal

让浏览器扩展在不滚动、不执行页面 lazy-loader、不修改页面 DOM 的情况下，
捕获 eyeondesign.aiga.org 这类把真实图片放在元素级 `data-bgset` 的页面。
普通 `<img>`、已经生效的 CSS background、字体、剪贴板和现有输出流程必须保持
兼容。

## Confirmed Facts

- eyeondesign 首页当前有约 37 个 `data-bgset` 元素，真实图片 URL 位于
  `a.grid-item-block.lazyload[data-bgset]`，而不是 `<img data-src>`。
- 该站点脚本在 lazy-loader 工作前把 `data-bgset` 按 `-xs-` 标记截断，再交给
  background lazyload 逻辑；未进入视口的卡片因此仍保持粉色约 200x136 data URI
  占位图。
- 适配器当前只解析 `<img>` 的显式 lazy allowlist，并只从已生效的
  `getComputedStyle(element).backgroundImage` 发现背景图。
- 捕获转换前明确使用 `waitForImages: false`；滚动页面触发第三方 IntersectionObserver
  不是稳定的资源准备策略。
- core 已支持 source-keyed background IMAGE paint，但只读 computed CSS；它需要一个
  通用 resolver 才能消费适配器冻结的 lazy background source。

## Requirements

- 只从显式支持的元素字段发现 lazy background：`data-bgset`，并保留未来扩展
  `data-bg` 的清晰边界；不得猜测任意 `data-*`。
- 支持普通 `data-bgset` URL/srcset 形式以及当前站点的 `-xs-` 编码，按当前元素
  宽度和 DPR 选择候选；候选 URL 必须使用 owner document base URI 解析。
- 分析阶段不得发送网络请求、给页面元素分配 `src`、把临时 request owner
  插入页面 DOM 或修改页面样式；调度器可复用现有 detached image request owner。
- 每个冻结的 lazy background source 进入现有 image scheduler，和普通图片按 canonical
  URL 去重，并在字体预检和转换前准备完成。
- 将 owner element 与冻结 source 通过一次 conversion context 传给 bridge；core 用
  通用 background image resolver 生成 `url(...)` CSS override，仅在 computed
  background 为 `none` 时使用。
- 已经生效的 computed background 优先于 lazy metadata，避免重复 layer；普通
  `<img>` 的 placeholder/lazy precedence 保持不变。
- stable core 缺少背景能力时继续转换普通图片，并产生明确的 unsupported capability
  诊断，不引入 late fetch 或页面 mutation。
- 诊断必须能区分 lazy background prepared、placeholder、unsupported 和 failed。

## Acceptance Criteria

- [ ] `data-bgset` fixture 的真实 URL 进入 inventory，分析阶段 fetch 次数为 0，且
  plan 的 background layer/resource 计数正确。
- [ ] `-xs-` 编码会选择标记前的真实 URL；普通 comma-separated background set 能按
  DPR/宽度选择候选；非法 scheme 被拒绝。
- [ ] staging 在 conversion 前完成一次 canonical request；重复 owner/source 不重复
  请求。
- [ ] 没有 computed background 的 owner 通过 resolver 产生 IMAGE paint，而不改写
  `style.backgroundImage`；已经生效的 computed background 不重复添加。
- [ ] eyeondesign 回归 fixture 中，位于视口之外的卡片不再输出统一粉色占位图；真实
  图片 bytes 进入最终 IMAGE payload 或有明确失败诊断。
- [ ] 普通 `<img>`、现有 CSS URL/gradient、动态 background host rasterizer 和
  stable-core compatibility 测试继续通过。
- [ ] adapter/core/extension 类型检查、测试、构建和 Chromium/Firefox 打包通过。

## Out Of Scope

- 不滚动页面、不触发站点 lazy-loader、不把所有 lazy metadata 物化回页面 DOM。
- 不修改 Figma schema、剪贴板 envelope、输出 sink 或扩展权限。
- 不实现任意 CSS Paint 的推断；动态背景仍使用既有 host rasterizer seam。

## Dependencies And Ownership

- `internal/browser-capture-adapter` 拥有 lazy attribute allowlist、候选解析、资源
  inventory、staging context 和诊断。
- `packages/dom-to-figma` 只拥有通用 background resolver contract 和 paint 生成，
  不认识 `data-bgset` 或 eyeondesign。
- `apps/extension` 只消费 adapter API；除同步测试 fixture 外不增加页面脚本注入。
