# 浏览器捕获懒加载激活预处理

## Goal

让浏览器插件在一次 capture 操作中主动激活页面已有的运行时懒加载逻辑，
从而发现只有进入视口、滚动或完成异步布局后才出现的真实图片。用户不需要
先手动把页面滚到底部再重新 capture；已经完成静态 source 发现的页面行为保持
不变。

本任务是 2026-07-31 图片背景/懒加载 source 修正之后的独立后续任务。前一任务
解决的是源码中已经存在且可明确读取的 `data-bgset`；本任务解决的是页面运行时
状态尚未激活导致的 source 不存在或尚未进入当前 capture inventory。

## Confirmed Facts

- `07-31-extension-lazy-background-capture`、`07-31-eyeondesign-image-background-
  extraction-fix` 和 `07-31-eyeondesign-web-to-dom-image-diagnosis` 已完成并归档。
- 现有 adapter 先通过 `analyzeCaptureTarget()` 创建资源 inventory，再在 start 时
  revalidate 一次，随后执行 image staging、font preflight 和 conversion；资源计划
  在 conversion 前不会因为新的页面状态自动重建。
- `waitForPageToSettle()` 等待已存在的字体、图片和 animation frames；它不会滚动
  页面、调用 `IntersectionObserver`、触发站点 scroll handler，也不会主动等待后来
  才插入的 DOM 节点。
- conversion 使用 `waitForImages: false`，因为已发现的资源在前面的 image stage
  处理。这个选项不能激活尚未被页面发现的资源。
- `resource-inventory` 已支持 active image、显式 allowlisted lazy source、CSS
  background 和 `data-bgset` source，但不会猜测任意 `data-*`，也不会执行页面脚本。
- `apps/extension` 的 page/element capture 入口目前直接把 target 交给 adapter，
  没有 capture 前的受控 scroll、激活循环或资源变化观察。
- `apps/extension/shared/capture-settings.ts` 已有可规范化、可持久化的 `advanced`
  settings；workspace controller 会把 draft settings 转成 engine settings，并支持
  显式保存默认值，适合承载 activation 开关。
- 当前 adapter `CapturePhase` 和 extension `WorkspaceView` 没有 activation 专用状态；
  busy guard、取消按钮、状态文本和进度映射均按现有 phase 白名单工作。
- eyeondesign 的下方卡片在未进入视口时可能仍是 placeholder；用户滚动后，页面
  的 IntersectionObserver/lazy-loader 才会把真实背景或图片 source 应用到 DOM/CSS。
- composed DOM 只保证可访问的 light DOM、open Shadow DOM 和 assigned slot；closed
  Shadow DOM、跨源 iframe 内部页面仍不能被当前捕获链路读取。

## Product Intent

- 用户执行一次 page 或 element capture 后，插件应尽可能得到页面已经设计为可加载的
  真实图片，而不是要求用户手动滚动和重复 capture。
- page capture 默认启用有界 activation；element capture 只激活选中目标及其必要
  可见祖先，不扩大为全页面扫描；两种 capture 都提供关闭策略。
- page activation 遍历 window/document 主滚动轴，并对目标范围内可识别的嵌套
  `overflow: auto/scroll` 容器做有界、逐层遍历；element activation 只触及选中目标
  及其必要祖先链上的容器。
- activation 遍历结束后恢复 capture 开始时的 window 和嵌套容器滚动位置，再进行
  最终稳定等待、inventory 和 conversion；虚拟列表离开视口后卸载的限制必须通过
  diagnostics 暴露。
- 每个位置至少等待两个 animation frames 加一个有界 quiet window；activation 使用
  独立总预算，默认不超过 10 秒，资源/节点连续稳定时提前结束，不能等待 network idle。
- adapter 和 extension 暴露独立的 `activating` phase/view、有限 activation progress
  和取消状态，用户可区分页面激活、图片准备、字体准备与 conversion。
- 激活是 capture 的受控 preflight，不是任意脚本执行器，也不是资源代理或网页重写器。
- 激活后必须重新分析并冻结新增 source，再统一进入现有 image scheduler；conversion
  阶段继续禁止 late fetch。
- 页面原始 scroll 位置、可恢复的 capture 前状态和用户取消/失败语义必须得到保护。
- 对需要副作用隔离的页面保留明确的关闭路径，关闭后继续使用当前静态快照行为。

## Requirements

### Activation Policy

- 增加独立于 `settleTimeoutMs` 的 lazy activation policy，至少能表达关闭、受控激活
  和当前静态行为；不能把“等待更久”误报为“已激活懒加载”。
- 激活必须有总超时、最大 pass/scroll 次数和 AbortSignal 取消路径；任何上限达到后
  都应继续执行已发现资源的 capture，并输出可诊断的 incomplete 状态。
- 激活范围、默认值和是否覆盖 page/element capture 在规划阶段确认，并记录为稳定
  的 adapter/extension 配置，而不是散落在页面入口中的常量。
- activation 开关应进入现有 `advanced` settings 的版本化/规范化流程；draft 修改、
  显式保存默认值和旧版缺字段的 fallback 必须保持现有 settings 语义。

### Controlled Page Activation

- 在资源 staging 前执行激活 preflight，使用浏览器原生滚动/视口行为让现有页面懒
  加载机制自然运行；不得注入或调用站点内部 loader 函数。
- page 模式覆盖 document 主滚动轴及目标范围内的嵌套可滚动容器；element 模式只
  覆盖选中目标和必要祖先链上的容器。不可可靠识别或跨源的滚动上下文保持未激活，
  不能通过扩大范围来绕过边界。
- 保存 window 和本任务涉及的可滚动宿主状态，在成功、失败、取消和 conversion
  异常路径中尽力恢复；恢复失败必须进入 diagnostics，不得掩盖主要 capture 结果。
- 每个激活 pass 至少等待可观测的 layout/animation-frame 稳定窗口，并重新运行
  inventory，识别新增节点、变化的 `src`/`currentSrc`、computed background 和
  已允许的 lazy metadata。
- 激活遍历完成后恢复初始滚动状态，等待恢复后的布局稳定，再生成最终 inventory；
  如果恢复动作改变资源集合，必须在预算内重新评估一次，不能直接使用中间 pass。
- 只有当资源 revision/节点资源集合达到稳定，或达到显式预算时，才停止激活；禁止
  依赖固定的无限滚动或无界 MutationObserver。
- 激活期间不能把临时图片 owner 插入页面 DOM、永久改写页面 inline style、改变
  页面资源 URL，或把任意 `data-*` 当作 source。

### Resource Pipeline Integration

- 激活发现的新 source 必须通过现有 canonical URL 去重、image scheduler、预算、
  cancellation 和 placeholder 语义准备完成后才能 conversion。
- conversion 只消费最后一次稳定 inventory 和 session-local frozen source map；
  激活结束后才发生的 source 变化必须记录为 late-change/incomplete，而不能在
  conversion 内隐式发起请求。
- 已有 `data-bgset` resolver、普通 `<img>`、CSS raster/gradient background、动态
  background rasterizer、font preflight 和稳定 core fallback 行为保持兼容。
- 优先在 `internal/browser-capture-adapter` 实现通用策略；`packages/dom-to-figma`
  不应认识 IntersectionObserver、scroll policy 或 eyeondesign 属性。只有必要的
  通用 contract 才能改变 core，并按 soft-fork compatibility 规则登记。

### Diagnostics And UX

- diagnostics 至少能区分 activation off、completed/stable、budget-exhausted、
  timed-out、canceled、target-lost、restore-failed 和 resource-set-changed。
- 记录 activation pass/scroll 数、新增 resource/node 数、耗时和是否恢复成功；不
  保存任意页面文本、原始资源 URL 或第三方脚本内容。
- activation 失败不能直接丢弃已经成功准备的资源；应沿用现有 best-effort、retry
  和 placeholder 状态语义。
- 用户界面需要显示稳定、简洁的状态/失败信息，但不应把“扫描预算耗尽”误述为图片
  请求失败。
- activation 运行期间必须沿用现有 Cancel 语义，并在 UI 中明确表示正在激活页面资源；
  不得让用户误以为 capture 已经进入 image staging 或 conversion。
- activation 使用独立的 `activating` adapter phase 和 extension view；该 phase 必须
  进入现有 busy guard、minimize/restore 和 Cancel 映射，完成或失败后回到既有流程。

## Acceptance Criteria

- [x] eyeondesign 在不手动滚动的单次 page capture 中，视口外的已设计为懒加载的
  卡片能被激活并进入最终真实 IMAGE payload；不能激活的资源有明确诊断。
- [x] element capture 对选中目标的 activation 范围和恢复行为有浏览器回归覆盖，且
  不因激活扩大到整个页面，除非最终策略明确允许。
- [x] activation off 与默认旧行为保持一致：不滚动、不触发页面 lazy-loader，且现有
  静态 `data-bgset` 修正继续有效。
- [x] 新增节点、`src/currentSrc` 变化、computed background 变化和 allowlisted lazy
  source 都能在 re-inventory 后进入一次资源 staging；conversion 不执行 late fetch。
- [x] `lazyActivation: "auto" | "off"` 进入 extension advanced settings，旧设置缺少
  字段时默认 `auto`；draft、保存默认值、adapter engine settings 和 prepared settings
  的映射保持一致。
- [x] adapter 在 auto 模式发出 `activating` phase/progress，extension 显示对应状态，
  Cancel 能中止 activation 并恢复滚动；off 模式不发起滚动。
- [x] 相同 canonical source 在多个 pass/owner 中只准备一次；image budget、失败、
  retry、placeholder 和 cancellation 语义与现有测试一致。
- [x] 成功、超时、取消、目标断开、conversion 失败和资源恢复失败都能恢复 capture
  前 scroll 状态；恢复失败被记录但不会吞掉主要错误。
- [x] 达到最大 pass/scroll/timeout 后 capture 有界结束，不会因为无限滚动、不断插入
  节点或持续网络活动卡死；diagnostics 标明停止原因。
- [x] 动画、sticky/fixed 元素、滚动容器和 open Shadow DOM 至少有针对性测试；closed
  Shadow DOM、跨源 iframe 和无限滚动的限制在结果中明确体现。
- [x] adapter、extension 类型检查和测试通过，Chrome MV3/Firefox MV2 构建与手工
  smoke 覆盖 page/element capture、取消、恢复和真实图片输出。
- [x] 若修改 `packages/dom-to-figma`，stable/upstream-main consumer、oracle parity
  和 upstream core delta registry 检查通过；若只修改 adapter/extension，记录无需
  core delta 的理由。

## Out Of Scope

- 猜测任意 `data-*`、调用框架私有 lazy-loader、注入第三方脚本或重写页面 DOM/CSS。
- 通过网络拦截、远程代理或预抓取页面所有 URL 来绕过浏览器懒加载。
- 保证隐藏 tab、未展开 accordion、未激活 carousel、closed Shadow DOM、跨源 iframe
  或所有 canvas/video/WebGL 运行时内容都可被捕获。
- 无预算的无限滚动、广告/推荐流的完整加载和页面业务状态自动恢复。
- `.figit` 文件、剪贴板/download sink、Figma schema 和与本问题无关的背景语义重构。

## Dependencies And Ownership

- 前置任务：已完成的 `07-31-extension-lazy-background-capture`、
  `07-31-eyeondesign-image-background-extraction-fix` 和现有 staged-resource
  pipeline；本任务复用它们的 frozen source、scheduler 和 diagnostics 边界。
- 主要所有权：`internal/browser-capture-adapter` 负责 activation policy、状态快照、
  re-inventory、预算和 diagnostics；`apps/extension` 负责默认配置、用户入口和
  页面 capture target 范围。
- `packages/dom-to-figma` 默认不改动；若需要新增通用 contract，必须保持 optional、
  source-compatible，并登记精确 runtime paths、测试和 removeWhen。
- 现有 `figit-capture-artifact` 任务与本任务独立；本任务不依赖 `.figit` 输出流程。

## Confirmed Product Decisions

### Activation Default And Scope

page capture 默认启用有界 activation；element capture 只激活选中目标及其必要可见
祖先，不执行全页面滚动；两者都提供关闭策略。这样覆盖整页下方资源，同时限制选中
小元素时的网络、滚动和页面状态副作用。

### Activation Traversal

page activation 遍历 window/document 主滚动轴，并对目标范围内可识别的嵌套
`overflow: auto/scroll` 容器做有界、逐层遍历；element activation 只触及选中目标及
其必要祖先链上的容器。每个上下文都必须单独保存和恢复滚动状态。

### Final Scroll State

激活遍历结束后，在最终 inventory 和 conversion 前恢复 capture 开始时的 window 及
嵌套容器滚动位置，并做一次稳定等待和最终 inventory/conversion。这样 sticky/fixed
元素、背景 attachment 和布局测量保持用户开始 capture 时的语义，同时已经激活的
图片通常仍会保留。虚拟列表或会在离开视口后主动卸载节点的页面不能保证同时保留
所有内容，必须通过 diagnostics 明确标记，而不是当作普通图片失败。

### Activation Quiescence And Budget

采用“至少两个 animation frames，加一个有界 quiet window”的稳定判定，并设置独立的
activation 总超时和最大 scroll step/container/pass 数。默认总预算不超过 10 秒，连续
位置不再产生资源/节点变化时提前结束；不把 network idle 当作完成条件。这样能等待
常见 IntersectionObserver 和异步 class/src 更新，又不会被广告、分析请求或无限滚动
拖住。更长预算可能提高复杂站点覆盖率，但会增加用户等待和页面副作用。

### Activation Control Surface

关闭 activation 作为现有 `advanced` settings 中的明确开关，默认保持开启，并在
diagnostics/失败恢复中显示当前模式；不新增独立的“滚动加载”动作。这样普通用户
得到一次 capture 的完整行为，遇到页面副作用时可以关闭。若只提供隐藏配置，调试和
问题复现困难；若做成主操作按钮，则会增加工作区复杂度并改变现有 capture flow。

开关契约采用 `lazyActivation: "auto" | "off"`：`auto` 表达按 page/element 范围
执行有界策略，`off` 保持静态快照；这样未来可以加入更保守的 activation 模式而不
破坏 settings schema。该开关位于现有 `advanced` settings，默认开启并支持保存默认
值。

### Activation Runtime Phase

已确认增加独立的 `activating` phase/view、有限进度字段和取消状态。它能清楚表达页面
正在被临时滚动、支持现有 Cancel，并让 activation diagnostics 与 image staging/
conversion 分开；代价是需要扩展公共 phase 联合类型、workspace 映射、UI 文案和测试。

## Open Questions

无阻塞性产品问题。`design.md` 固化 page/element 范围、嵌套容器遍历、滚动恢复、
10 秒预算、`auto/off` settings 和独立 phase；`implement.md` 给出逐步改动和验证门。

## Notes

- 本文件记录规划阶段需求；复杂任务的 `design.md` 和 `implement.md` 已完成，等待
  用户评审后才能进入开发。
- 不在 `task.py start` 前实施代码。
