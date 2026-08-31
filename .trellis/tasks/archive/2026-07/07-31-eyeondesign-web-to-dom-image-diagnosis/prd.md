# eyeondesign web_to_dom 图片提取诊断

## Goal

对 `https://eyeondesign.aiga.org/` 执行一次仓库现有的 `web_to_dom`/DOM-to-Figma 提取流程，确认页面结构是否能够被提取，并定位图片未进入提取结果的准确原因，为后续最小范围修复或兼容性决策提供可复现证据。

本任务独立于现有的浏览器扩展采集持久化和 `.figit` 捕获包任务，不作为其子任务。

## Confirmed Facts

- 用户指定的目标页面为 `https://eyeondesign.aiga.org/`。
- 已使用仓库现有 `@figit/browser-capture-adapter`/DOM-to-Figma 链路完成不滚动和滚动两次真实提取；页面最终 URL 和标题正确，capture 均成功。
- 目标页的主要内容图片位于 `a.grid-item-block.lazyloaded` 的 CSS `background-image: url(...)`；可见 `<img>` 大量为 `data:image/png` 占位图或零尺寸 lazyload 节点。
- 图片资源请求和准备均成功：不滚动为 8/8，滚动后为 22/22，失败数均为 0；图片丢失发生在 CSS raster background 的发现/转换边界，不是网络、解码或 CORS 失败。
- 当前采集清单只计划 `<img>` 来源，并将 CSS 背景图作为 unsupported 计数；当前 Frame 转换器只把线性/径向渐变转换为 paint，普通 raster `url(...)` 不生成 IMAGE paint。
- 需要优先复用仓库已有的捕获、图片加载和转换链路，不先引入新的提取器或第三方服务。

## Requirements

- 使用当前仓库可运行的 `web_to_dom`/DOM-to-Figma 入口对目标页面执行真实提取，并记录运行环境、页面 URL、等待条件和结果摘要。
- 盘点目标页面中可见图片候选，包括 `<img>`、`srcset`/懒加载属性、CSS `background-image` 以及由页面脚本生成的图片；记录其规范化来源、尺寸和加载状态，不在任务文档中保存不必要的图片二进制。
- 沿图片发现、资源请求/加载、解码、转换节点生成和最终 HTML/clipboard payload 的链路逐段检查，明确图片丢失发生在哪一层。
- 对每个失败类别记录可复现证据，例如 DOM 属性与计算样式、`complete`/natural size、请求响应、CORS/credentials、MIME、解码错误、转换诊断或 payload 中的节点/资源计数。
- 区分目标站点特有问题与仓库通用转换器缺陷；如确认需要代码修复，先在任务设计中定义最小影响范围和验证方式，不扩大到无关页面或转换算法重构。
- 输出一份结论，包含根因、影响范围、是否可通过配置或等待策略解决，以及建议的后续修复边界。

## Acceptance Criteria

- [x] 目标页面完成至少一次真实 `web_to_dom` 提取，运行命令、时间、页面状态和结果位置可追溯。
- [x] 页面图片候选已分类，至少覆盖 `<img>` 与 CSS 背景图；每类都标明是否进入 DOM、资源是否成功加载以及是否进入最终提取结果。
- [x] 已用链路证据定位图片丢失的具体阶段，而不是只记录“没有图片”的表象。
- [x] 结论明确区分站点侧限制、浏览器运行时限制和仓库代码缺陷，并给出可复现步骤。
- [x] 本任务不修改代码；研究记录说明了等待、滚动和页面侧替代路径的限制，并给出后续最小修复边界。
- [x] 未修改现有独立 Trellis 任务，也未把本任务挂到其他任务下面。

## Out Of Scope

- `.figit` 文件格式、剪贴板/下载 sink 和扩展捕获状态机的改动。
- 对所有网站的图片兼容性重构，或与本页面无关的 DOM 布局、字体、颜色和排版修复。
- 未经诊断证据支持的批量重写图片加载策略或引入远程代理。

## Resolution

本任务按“只提交诊断并另开修复任务”的路径完成。原因是根因同时涉及 CSS raster background 资源模型、背景层转换语义和 lazy 属性策略，直接在诊断任务中改动会扩大范围；后续修复应以研究报告列出的四类回归用例为边界。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
