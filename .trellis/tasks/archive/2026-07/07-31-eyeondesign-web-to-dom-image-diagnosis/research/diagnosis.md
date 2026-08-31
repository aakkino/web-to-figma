# eyeondesign 图片提取诊断

## 结论

`https://eyeondesign.aiga.org/` 的页面结构和 DOM-to-Figma 主流程可以完成提取。图片请求、响应和资源准备均成功；页面照片没有进入结果的主因是站点把内容图片渲染为 `a.grid-item-block.lazyloaded` 元素的 CSS `background-image: url(...)`，而当前采集器只把 `<img>` 来源纳入图片资源计划，当前转换器也只把 CSS 背景中的线性/径向渐变转换为 Figma paint。普通 raster `url(...)` 在转换时返回空 paint，因此视觉上最大的卡片图片会丢失。

懒加载是第二个独立问题：页面滚动后 `<img>` 资源从 8/9 个增加到 22 个，但滚动不会改变 CSS 背景图仍不支持的事实。当前运行没有发现图片网络、解码或 CORS 失败。

## 可复现运行

- 目标页面：`https://eyeondesign.aiga.org/`
- 页面标题：`Eye on Design – AIGA Eye on Design`
- 运行日期：2026-07-31（Asia/Shanghai）
- 浏览器：Playwright Chromium `147.0.7727.15`
- 视口：`1440 x 1100`
- 入口：临时 harness 通过 workspace alias 加载现有 `@figit/browser-capture-adapter`，调用 `createBrowserCaptureAdapter().capture({ element: document.body })`。
- 等待：页面 `domcontentloaded` 后等待 8 秒；adapter settle timeout 15 秒；滚动场景按约 0.8 个视口逐段滚动，每段等待 250 ms，完成后再等待 3 秒。

运行方式（先启动临时 Vite harness）：

```text
vite --config .tmp/eyeondesign-diagnosis/vite.config.mts --host 127.0.0.1 --port 4174
node .tmp/eyeondesign-diagnosis/run.mjs
node .tmp/eyeondesign-diagnosis/run.mjs --scroll
```

原始结果保存在本目录的 `eyeondesign-no-scroll.json` 和 `eyeondesign-scrolled.json`；视口截图分别为 `eyeondesign-no-scroll-viewport.png` 和 `eyeondesign-scrolled-viewport.png`。

临时 harness 源文件在两次运行完成并写入上述证据后已清理；报告、原始 JSON 和截图保留在任务目录中。

## 运行结果

| 场景 | `<img>` 节点 | 已加载 `<img>` | 资源计划 | CSS 背景图候选 | 图片准备 | payload |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| 不滚动 | 103 | 100/103 | 8 | 45 | 8/8，失败 0 | 568 nodes，47 IMAGE paints，264 blobs |
| 滚动后 | 116 | 115/116 | 22 | 60 | 22/22，失败 0 | 568 nodes，47 IMAGE paints，264 blobs |

网络证据：不滚动场景记录 8 个图片请求，滚动场景记录 21 个图片请求，所有图片响应均为 HTTP 200；没有图片请求失败。响应 MIME 覆盖页面实际使用的 GIF、JPEG 和 PNG。非图片失败只涉及无关的 stylesheet/analytics 请求。

## DOM 证据

1. `<img>` 数量多，但不等于页面照片数量。不滚动和滚动后的快照都包含 96 个 `data:image/png` 来源，主要是页面占位图；不少 `<img>` 的 `naturalWidth` 有值但渲染尺寸为 `0 x 0`。
2. 真实内容图片出现在父级链接的计算样式中。例如滚动后的快照包含以下实际渲染区域：

   - `a.grid-item-block.lazyloaded` + `hero-ads-1024x640.gif`，约 `1292 x 804`
   - `a.grid-item-block.lazyloaded` + `bumpy-gif-low-1024x1024.gif`，约 `609 x 414`
   - `a.grid-item-block.lazyloaded` + `Driftwell-LIFESTYLE_SHOT-1024x683.jpg`，约 `609 x 414`
   - `a.grid-item-block.lazyloaded` + `Iridescene-Heroimage-3-1024x640.jpg`，约 `381 x 259`

   这些 URL 都位于 `backgroundImage`/`sources`，不是可见 `<img>` 的有效盒子。
3. 一个 footer logo 只有 `data-srcset="/wp-content/themes/aiga-eod-v2/dist/images/aiga-logo-horizontal.png"`，没有 `src`、`currentSrc` 或有效 `srcset`。当前清单解析器因此无法把它加入资源计划。
4. 对同一页面先后执行不滚动与滚动提取，payload 仍是 47 个 IMAGE paint，而资源计划从 8/9 个增加到 22 个。这说明 payload 中的 IMAGE paint 主要来自已分类的 `<img>` 节点/占位图，不代表 CSS 卡片照片已经被转换。

## 代码链路定位

- `internal/browser-capture-adapter/src/resource-inventory.ts:65-83` 只在 `isImageElement(element)` 为真时解析来源；`isImageElement` 在 `:176-178` 只接受 `img`。
- `internal/browser-capture-adapter/src/resource-inventory.ts:180-217` 的来源解析只读取 `currentSrc || src 属性 || element.src`，而 `countUnsupportedBackgroundImages` 只计数 `background-image` 的 `url(...)`，不会创建待准备资源。
- `packages/dom-to-figma/src/converter/nodes/frame/converter.ts:489-499` 将计算样式传给 `cssBackgroundToFigmaPaints`。
- `packages/dom-to-figma/src/converter/styles/gradient.ts:348-371` 只处理 `linear-gradient` 和 `radial-gradient`，普通 `url(...)` 走末尾 `return []`。
- `packages/dom-to-figma/src/converter/classify.ts:22-27` 只把 `<img>` 分类为 `image`；`packages/dom-to-figma/src/converter/convert.ts:171-184` 随后调用 `<img>` 专用转换器。
- `packages/dom-to-figma/src/converter/nodes/image/converter.ts:23-104` 从 `<img>` 的盒子、natural size 和 image cache 生成 `IMAGE` paint，因此无法替代一个父级 CSS background 的视觉区域。
- `internal/browser-capture-adapter/src/bridges/dom-to-figma.ts:277-295` 对未进入资源准备计划、但在转换阶段迟到的 `<img>` 使用 `unplanned-late` 透明占位图。这是懒加载来源未及时进入计划时的保护行为，不是本次 CSS 背景图主因。

## 根因分类

| 层级 | 结论 | 证据 |
| --- | --- | --- |
| 站点 | 内容图片主要使用 CSS background，且同时存在 lazyload 占位 `<img>` | `grid-item-block` 背景候选、96 个 data PNG、可见背景区域 |
| 浏览器运行时 | 图片能够请求并完成加载；滚动会触发更多懒加载 | 图片响应全为 200，准备阶段 8/8 与 22/22，失败数为 0 |
| 仓库代码 | CSS raster background 未纳入资源准备，也未转换为 IMAGE paint；data lazy 属性未被主动解析 | `resource-inventory.ts`、`gradient.ts`、`frame/converter.ts` 对应分支 |

## 替代路径与最小修复边界

- 仅增加等待时间不能解决 CSS background，因为等待不会改变转换器对 `url(...)` 的处理结果。
- 在提取前滚动页面或由站点脚本先触发 lazyload，可以增加 `<img>` 资源的发现数量，但仍不能把 `grid-item-block` 的 CSS 照片带入结果；它也不保证只存在于 `data-src`/`data-srcset` 的资源都被激活。
- 页面侧临时规避方式是把背景图改为真实 `<img>`，但这改变站点 DOM，不适合作为通用提取方案。
- 后续最小修复应拆成两个可回归的边界：
  1. 将 raster CSS background URL 纳入资源清单/准备阶段，并在转换时按 background layer、尺寸、位置、重复方式生成对应的 Figma image paint 或合成子节点；需要保留现有 gradient 行为并单独处理 sprite 背景的裁剪限制。
  2. 明确 lazy 属性策略：在清单阶段识别 `data-src`、`data-srcset`、`data-original` 等候选，或提供显式的页面激活/滚动等待选项；不能把“等待完成”当作已发现资源的替代。

本任务只提交诊断，不直接修改转换器；若要实现上述修复，建议另开独立修复任务并以 `grid-item-block` CSS background、梯度背景、占位 `<img>`、lazy-only `<img>` 四类回归用例作为验收边界。
