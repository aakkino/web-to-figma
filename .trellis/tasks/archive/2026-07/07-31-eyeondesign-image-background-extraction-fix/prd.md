# 修正 CSS 背景图与懒加载图片提取

## Goal

基于 eyeondesign.aiga.org 诊断 artifact，修正 DOM-to-Figma 对 CSS raster background 和 lazy image source 的发现、资源准备与最终 IMAGE paint 生成，让页面中以 CSS 背景渲染的主要内容图片进入 Figma payload，同时保留现有 gradient 与 `<img>` 行为。

## Source Artifact

- 诊断报告：`.trellis/tasks/archive/2026-07/07-31-eyeondesign-web-to-dom-image-diagnosis/research/diagnosis.md`
- 原始提取证据：同一 archive 目录下的 `research/eyeondesign-*.json` 与视口截图。
- 兼容性 fork 考察：`research/compatibility-fork-assessment.md`。本仓是 upstream core 的 soft fork，修正必须按低漂移、可重复同步的边界落地。
- 根因已确认：请求和资源准备成功；当前采集器只计划 `<img>`，Frame 转换器只将 CSS 背景渐变转为 paint，raster `url(...)` 不产生 IMAGE paint。

## Confirmed Facts

- `internal/browser-capture-adapter/src/resource-inventory.ts` 将资源模型限定为 `HTMLImageElement`，CSS `background-image` 目前只增加 unsupported 计数。
- `internal/browser-capture-adapter/src/capture-engine.ts` 在转换前完成已计划资源的 staging；未计划的晚到图片会得到透明 placeholder，而不会临时发起请求。
- `packages/dom-to-figma/src/converter/nodes/frame/converter.ts` 已统一读取 `computedStyle.backgroundImage`，但交给只支持 linear/radial gradient 的 helper。
- `packages/dom-to-figma` 已具备 IMAGE paint、blob 注册、图片格式处理和 object-fit/object-position 计算能力，但这些能力目前只服务 `<img>` 节点。
- 该修复会跨 `internal/browser-capture-adapter` 与 `packages/dom-to-figma` 两个边界，属于复杂任务；开始实现前需要完成 `prd.md`、`design.md` 和 `implement.md`。

## Scope Decision

用户要求一次性实现完整的 CSS background 修正范围。本任务纳入：

- 多个 `background-image` layer 的解析、顺序和资源去重。
- `background-size`、`background-position`、`background-repeat`，包括 repeat/tile 与 sprite 类裁剪语义。
- background color、gradient、raster image 的混合顺序，以及 `background-blend-mode`。
- `background-origin`、`background-clip`、`background-attachment` 和 fixed/local/scroll 的静态捕获语义。
- CSS `image-set()`、动态 CSS paint 或其他不能直接交给现有 gradient helper 的背景来源；无法原生映射到 Figma 时必须有明确的保真兜底或诊断结果，不能静默丢失。
- 与背景图片发现相关的 lazy source 候选，采用确定性的 adapter allowlist 和 frozen source resolver；不执行任意站点脚本、不改写页面 DOM。

## Proposed Direction

- 按 soft fork 的低漂移边界拆分实现：通用 CSS background-to-Figma Paint parity 放在 core；资源发现、懒加载策略、staging、预算和 diagnostics 放在 fork-owned adapter；浏览器静态 raster fallback 放在 fork 的可选通用 capability seam 后。拆分的目的在于定期吸收 upstream 时降低冲突，不要求每个 commit 都可直接回推 upstream。
- 可由 Figma paint 原生表达的背景层，沿用现有 image loader、staging、预算、placeholder 和 blob 处理链路，保留可编辑的 paint 结构。
- Figma 无法完整表达的背景层或合成行为，使用浏览器当前 viewport、computed style 和捕获状态进行确定性静态栅格化，并在 diagnostics 中标记 fallback 原因、影响范围和捕获状态。
- `background-blend-mode` 只有在背景层顺序、裁剪、透明度和混合结果能够与 Figma paint 合同一致时才走原生映射；否则与 `background-attachment` 的运行时滚动语义、动态 CSS paint 一样走栅格化兜底。
- 资源诊断区分 active `<img>`、CSS background、lazy-unresolved、native paint、raster fallback 和 placeholder。
- 使用小型 DOM fixture、浏览器回归与 eyeondesign 页面级回归覆盖；不引入远程代理或站点特定硬编码。

## Requirements

- 资源分析阶段不得发起网络请求；必须产生稳定的 source/resource identity，供 image scheduler 与 converter 共享。
- 资源准备阶段必须在转换开始前完成所有已发现的 raster background 资源，并沿用现有失败、预算、取消和 placeholder 语义。
- 转换阶段必须为每个背景 layer 生成可验证的 Figma paint 或静态 raster fallback，包含实际图片 blob；不得把 CSS background 静默当作空背景。
- 静态 raster fallback 必须由真实浏览器执行背景计算和合成，结果绑定当前捕获 viewport/state，并记录不可继续编辑或保留运行时滚动行为的限制。
- core 必须提供通用 `imageSourceResolver` 和可选 background rasterizer capability；默认行为保持现有 `currentSrc || src` 与 direct image loader 语义。
- 现有 linear/radial gradient、背景色、普通 `<img>`、重复 source 去重和 `unplanned-late` 保护行为不得回归。
- CSS 背景 URL 必须使用元素文档的 base URI 规范化，并遵守当前 loader 对协议、HTTP 状态和 CORS 的处理边界。
- lazy source 策略必须明确记录发现、未解析、准备失败和 placeholder 状态；不得仅通过延长等待时间声称完成支持。
- 资源计数、revision/revalidation、预算和最终 payload 统计必须覆盖新增资源类型、layer 顺序和 fallback 结果。
- 发布 core 的新增逻辑不得依赖 `internal/browser-capture-adapter`、eyeondesign 选择器、lazy `data-*` allowlist 或 adapter 的预算/placeholder API；这些只属于 fork-owned integration。
- 上游旧 core 缺少新 capability 时，普通 `<img>` 必须继续兼容；CSS background 不能静默丢弃，必须返回明确的 capability/diagnostic 结果。
- 新增 core 文件和对 upstream 高频文件的修改必须有明确的 fork capability 归属；不得为了满足 runtime budget 把完整语义压入无关的高冲突文件。

## Acceptance Criteria

- [ ] 单层和多层 raster CSS background fixture 能被发现、准备，并在最终 payload 中产生带 blob 的 IMAGE paint 或明确的 raster fallback。
- [ ] `background-size`、`background-position`、`background-repeat`/tile、sprite 裁剪和 layer 顺序均有可断言的输出。
- [ ] `background-color`、gradient、raster image、`background-blend-mode`、clip/origin/attachment 组合均不会静默丢失。
- [ ] `image-set()`、动态 CSS paint 等非直接 URL 来源会被解析或进入带原因的 raster fallback/诊断路径。
- [ ] 可原生表达的背景保持 IMAGE/gradient paint；无法准确表达的 blend/attachment/dynamic paint 进入带捕获状态和原因的静态 raster fallback，不静默降级为空背景。
- [ ] 同一 background source 在多个元素上只准备一次，同时每个元素保留自己的盒子几何。
- [ ] active `<img>`、lazy-unresolved、CSS background 和加载失败分别有可断言的 inventory/diagnostic 状态。
- [ ] `data-src`/`data-srcset` 的处理符合最终产品决策；未决来源不会在 converter 阶段产生隐式网络请求。
- [ ] 现有 gradient、`<img>`、placeholder、预算、取消和 revalidation 测试通过。
- [ ] eyeondesign 回归提取中，主要 `a.grid-item-block.lazyloaded` 图片进入 payload；原始 HTTP 200/资源准备行为不回归。
- [ ] `@figit/dom-to-figma` 与 `@figit/browser-capture-adapter` 的类型检查、测试和相关 lint 通过。
- [ ] core parity、adapter staging、raster fallback 和本地 governance 分成可独立 review 的逻辑 commits；每个 commit 都能在定期吸收 upstream 时独立识别、重放和验证。
- [ ] `paint(...)` 或未知动态 image function 在没有 host rasterizer 时进入显式 `unsupported-background-source` diagnostics，不静默成功。
- [ ] core runtime delta 预算、精确路径映射和 `absorbedUpstreamPaths` 变化在治理 registry 中完成 review。

## Out Of Scope

- `.figit` 格式、剪贴板/download sink、扩展捕获状态机和无关任务的改动。
- 对所有懒加载框架的脚本执行、滚动模拟或 DOM 改写。
- 跨域远程代理、站点特定硬编码和全量 DOM 布局重构。

## Decisions

- 背景语义采用混合方案：能准确映射的 layer 保留为 IMAGE/gradient paint；无法完整表达的 blend/attachment/dynamic paint 在浏览器侧静态 rasterize，并附带 fallback diagnostics。这样优先保留可编辑性，同时保证当前捕获状态的视觉结果；代价是 fallback 会失去部分可编辑性、运行时滚动语义，并增加栅格化的性能和内存成本。
- 落地采用 soft-fork low-drift change stack：通用 core parity、adapter 的发现/staging/lazy policy、浏览器 raster fallback 和本地治理保持独立；目标是可重复吸收 upstream 并控制冲突面，而不是要求直接回推 upstream。
- lazy source 采用确定性 precedence：active `currentSrc/src/srcset` 优先；空 source 或明确 data placeholder 时按 `data-srcset`、`data-src`、`data-lazy-srcset`、`data-lazy-src`、`data-original-src`、`data-original` 解析；data-only source 通过 frozen `imageSourceResolver` 提供给 core；未知 `data-*` 不执行、不猜测。
- 静态 fallback 使用 core 的 deterministic canvas renderer；`paint(...)` 等无法从 computed style 重建像素的动态来源使用可选 host rasterizer，未提供时记录 unsupported diagnostics。

## Resolved Planning Questions

- Windows upstream-main tar/symlink 修复纳入本任务，但只作为独立的验证基础设施 commit；它不进入 core、adapter 或浏览器 fallback 运行时边界。这样本任务完成后，`pnpm upstream-adapter:main` 在当前 Windows 开发环境中可重复执行，同时仍必须通过真实的 clean external consumer gate。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
