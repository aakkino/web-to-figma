# 浏览器扩展采集选项与持久化能力

## Goal

细化浏览器扩展的网页采集工作流，让用户能够按需控制图片、字体等资源的采集行为，并将采集配置与结果通过明确、可重复的方式持久化或导出。

用户价值：在采集质量、产物体积、隐私与后续使用方式之间做显式取舍，而不必依赖固定的插件默认行为。

## Confirmed Facts

- 本任务面向该项目已有的浏览器扩展及其底层转换能力。
- 需要研究并暴露更多可选项，至少覆盖图片资源与字体相关能力。
- 当现有底层能力不足时，允许规划相应的底层能力扩展。
- `@figit/dom-to-figma` 必须作为可替换的上游转换依赖尽可能解耦：扩展的产品状态、阶段编排、资源策略、进度协议和捕获包格式不得依赖其内部模块或私有缓存结构。
- `browser-capture-adapter` 与上游转换器之间应通过最小、结构化的能力端口连接；扩展只能通过本地 adapter/bridge 使用转换器，不能在 UI、存储或输出模块中传播上游专有类型。
- 优先在外围实现资源发现、用户决策、并发调度、超时、取消和进度；只有“图片已完整预处理且后续转换复用同一处理结果”无法通过现有公开 API 保证时，才允许给上游增加窄小、可选、通用的公开 hook。
- 任何上游 hook 必须保持既有默认行为与剪贴板 payload 不变，允许旧版转换器通过能力检测走明确降级路径，并具备独立发布包兼容测试。
- 需要增强持久化保存能力。
- 用户提出的结果出口至少包括：可选复制到剪贴板、保存到本地文件。
- 当前扩展弹窗只有“整页复制”“选择元素”与主题设置；只有主题通过 WXT `storage.defineItem` 持久化，尚无采集配置、结果历史或文件下载能力。
- 当前 popup 到 content 的触发协议只传递动作名，不携带采集配置；content 使用一个固定配置的惰性 `BrowserCaptureAdapter`，并始终把结果写入剪贴板。
- 当前剪贴板写入依赖 popup 用户操作沿同步注入事件传到 content script；这个用户激活链是跨浏览器行为中的关键约束。
- 图片已经支持页面直接获取失败后经后台无凭据 HTTP(S) 代理获取，并在转换器中嵌入产物；目前没有显式的图片包含、忽略或失败策略选项。
- 捕获适配层内部已经会遍历开放组合 DOM 并收集 `<img>` 节点，但该清单只用于页面稳定等待，不作为捕获前分析结果向调用方暴露，也不覆盖 CSS `background-image: url(...)`。
- 当前稳定等待会并行等待 DOM 图片的 `load`/`error` 与 `document.fonts.ready`，总预算默认 5 秒；图片总数、完成数和错误只在等待结束或超时后的诊断中返回，没有实时事件。
- 真正的图片字节获取与 PNG 转换/SHA-1 处理发生在主转换器深度优先遍历到每个 `<img>` 时；兄弟节点通过 `for...of` 逐个 `await`，因此图片资源处理与其他节点转换交错，且大量唯一图片可能形成没有统一截止时间的串行等待。
- 图片缓存会按 `currentSrc || src` 去重并跨同一转换器实例复用，但当前没有公开的预加载/预热接口，不能在转换前完整处理图片并复用已处理结果。
- 当前没有捕获进度回调或捕获取消信号；content UI 只显示统一的“Copying to Figma”toast。
- 字体已经支持页面字体、后台跨源获取、扩展内置 CJK 字体与通用回退，并提供 `fallback` / `strict` 两种失败策略和完整诊断；扩展当前固定使用 `fallback`。
- 捕获适配层还具备 `freeze` / `live` 动效模式、`auto` / `off` CJK 换行、可调稳定等待时限，以及开放 Shadow DOM 遍历；转换器具备 `auto` / `absolute` 布局模式。
- 转换结果已经提供原始 document、Kiwi bytes、base64、Figma 剪贴板 HTML envelope 与诊断信息，因此多个出口可以复用同一次转换结果。
- 当前 Kiwi bytes 是 Figma 私有剪贴板 `NODE_CHANGES` 数据，不是完整 `.fig` 文件，也不能由 Figma Plugin API 直接导入；仓库工具已把 HTML envelope 保存为 `.html` 用于回归与再次读取，但扩展没有面向用户的回放流程。
- 扩展已有 `storage` 与 `clipboardWrite` 权限，但没有 `downloads` 权限。
- Chrome 在 action 配置默认 popup 时不会触发 `action.onClicked`；直接唤起页面浮窗要求移除现有 default popup，并由 background action handler 定向通知当前 tab。
- Chrome content script 不能直接访问 `downloads` API；V1 优先在最终用户点击中使用 Blob + DOM download 保存 `.figit`，不新增带“管理下载”警告的 downloads 权限，除非浏览器验证证明该路径不可靠。
- `clipboardWrite` 在 Chrome/Firefox 扩展环境可放宽 transient activation，但 HTTP content script 与 Safari 语义不同；剪贴板 sink 必须保持独立可失败/重试，并分别验证 HTTPS 与 HTTP。
- 当前页面内浮窗、工具栏恢复和 ready/output 状态已实现，但 ready/output 没有返回 idle 的入口；错误页虽可重新发起整页分析，成功与输出终态仍需要刷新页面才能重新选择完整工作流。
- 当前 controller 在新分析开始时已通过 `engineFactory` 替换引擎，说明连续捕获的底层边界基本成立，尚缺显式复位命令、artifact 生命周期清理和连续捕获测试。

## Requirements

- 点击浏览器工具栏中的扩展图标必须直接在当前标签页唤起或恢复页面内捕获浮窗，不得要求用户先在 browser-action popup 中选择动作。
- 现有 default popup 必须移除；background `action.onClicked` 只向被点击的当前 tab 发出打开/恢复命令。
- 浮窗是用户工作流的统一入口；初始状态只展示可执行动作与当前设置，不应在打开时自动分析或捕获页面。
- 浮窗至少提供整页捕获、选择元素、打开本地捕获包三个入口；选择捕获目标后才进入分析、资源决策、分阶段处理和输出流程。
- 浮窗隐藏或最小化时，进行中的 session 不得被隐式取消；重新打开后需要恢复当前状态。
- 工具栏图标只执行打开、聚焦或恢复浮窗，不用于关闭浮窗；最小化、关闭和取消必须是浮窗内语义独立的命令。
- 浮窗采用固定右侧非模态布局：桌面宽度约 380px，距顶部/右侧 16px，最大高度为视口减 32px并内部滚动；窄视口宽度收缩至视口减 32px。
- 只有浮窗表面接收指针事件；页面其余区域保持可交互。元素选择期间浮窗自动最小化，完成或取消选择后恢复相应状态。
- 执行中可最小化为右下角进度按钮，点击恢复同一 session；MVP 不支持拖拽、自由缩放或坐标持久化。
- 扩展界面提供与实际底层能力对应的采集选项，不能展示无效或语义不一致的控制项。
- 基础流程只显示图片处理、字体模式和输出目的地；折叠的高级设置暴露布局模式、动效模式、CJK 换行和页面稳定等待。
- 高级设置默认值分别为 `layout: auto`、`motion: freeze`、`lineBreaks: auto`、`settleTimeoutMs: 5000`；稳定等待允许设为 0 跳过并设置受控上限。
- Shadow DOM 遍历保持开放组合 DOM 固定启用，trace 保持关闭；图片并发、缓存和内部重试次数不作为用户设置。
- 图片与字体能力需要分别定义采集范围、失败行为和产物表示方式。
- 字体提供兼容、快速、严格三种模式，不提供完全关闭字体处理的模式；所有模式都必须保持文字节点可编辑且不得静默丢失文字。
- 兼容模式默认尝试页面字体和允许的跨域 transport，失败后使用扩展内置字体度量并报告替代关系。
- 快速模式不请求远程字体，仅使用扩展内置字体作为转换度量，同时保留 payload 中请求的原始字体名称，并明确提示布局精度可能下降。
- 严格模式要求 family、weight、italic 精确匹配；失败时暂停并允许重试、切换兼容模式或取消。
- 字体阶段按去重后的 `family + weight + italic` 请求数报告进度。
- 执行完整捕获前需要先分析目标范围并报告图片节点数量，让用户基于实际资源规模决定是否处理图片。
- 用户确认开始时执行一次无网络快速重扫：目标失效则报错；唯一图片资源集合变化则更新分析并要求重新确认；只有节点引用数变化则更新计数后继续。
- 图片阶段开始后锁定资源计划，执行期间新增资源不加入当前任务，确保进度总量和缓存映射稳定。
- 图片分析同时报告 DOM 图片节点总数与按实际解析 URL 去重后的唯一资源数；用户理解页面规模使用节点数，资源处理进度、并发和失败统计使用唯一资源数。
- MVP 的可处理图片节点限定为 `HTMLImageElement` (`<img>`)；使用 `currentSrc || src` 解析响应式图片，遍历范围与开放组合 DOM 捕获语义一致。
- `data:`、`blob:` 与 HTTP(S) `<img>` 都进入清单；具体 loader/transport 仍遵循现有最小权限边界。
- 分析器需要检测 CSS `background-image: url(...)` 并单独报告为暂不支持的图片引用，但不得把它们混入可处理图片总数、进度或成功率。
- 用户确认处理图片后，捕获流程应先完成图片资源阶段，再进入字体/页面转换等后续阶段；选择不处理图片时应明确跳过图片阶段。
- 用户跳过图片或尽力处理时某张图片失败，输出中仍需保留对应节点的透明布局占位，包括原始尺寸、位置、圆角、边框和透明度；不得因删除图片节点导致 Auto Layout 重排。
- 透明占位不得获取或嵌入图片字节，图层名称需标明图片被跳过；主动跳过与加载失败必须在诊断中使用不同原因。
- 长时间任务必须暴露阶段、当前进度、总量与失败数量，不能只显示无法解释的统一等待状态。
- 图片阶段全部成功时自动进入后续阶段；存在失败时必须暂停并显示汇总，让用户选择仅重试失败资源、使用透明占位继续或取消捕获。
- 图片重试不得重新处理已成功资源，继续时将所有仍失败资源映射为已约定的透明占位。
- 图片阶段固定采用最多 4 个唯一资源并发、单项 15 秒截止和阶段 60 秒截止；这些参数属于运行策略，不作为用户设置。
- 单项或阶段超时进入失败集合；阶段超时必须中止排队及进行中的请求，再进入失败恢复界面。重试失败项获得新的阶段预算。
- 用户取消必须通过 AbortSignal 贯穿页面 loader、消息协议和后台 fetch，不能只隐藏进度或忽略仍在传输的特权请求。
- 进度显示已完成/总数、失败数与已耗时，不提供无法可靠计算的剩余时间预测。
- 图片阶段按去重后的 Figma-ready 图片字节跟踪累计体积；达到 64 MiB 时暂停并允许继续、剩余占位或取消，达到 128 MiB 时停止处理新图片并只允许剩余占位或取消。
- 体积阈值属于不可配置的运行保护；同一唯一资源只计一次，UI 同时报告资源进度和累计处理体积。
- 配置持久化采用全局默认与标签页临时会话两层：全局默认写入扩展 `storage.local`，分析结果、进度、失败项和浮窗状态只保存在当前 content session 内存中。
- 捕获期间修改设置不得自动覆盖全局默认；只有用户执行明确的“设为默认”命令才写入持久化配置。
- MVP 不提供按域名/站点覆盖，不自动把来源 URL、资源清单或捕获结果存入扩展内部历史。
- 采集结果应支持一个或多个用户可选出口，包括剪贴板与本地文件。
- 剪贴板与本地文件是可组合的独立出口，不是互斥模式；一次转换可同时写入两个出口，且不得为每个出口重复捕获页面。
- 默认只启用剪贴板以保持现有一键行为；本地保存默认关闭，并且任何时刻至少启用一个出口。
- 不同出口应基于同一份规范化采集结果，避免出现内容语义分叉；跨层结果以精确 clipboard HTML envelope、有效设置和项目自有诊断为契约，不传播上游转换类型。
- 面向用户的本地文件必须是可回放、带版本号的捕获包，而不是伪装成可直接导入 Figma 的 `.fig` 文件。
- V1 文件 sink 优先使用最终用户操作触发的 Blob 下载，不请求 `downloads` 权限；如果 Chrome/Firefox 验证失败，权限升级必须回到规划评审。
- 捕获包使用 `.figit` 扩展名与 `application/vnd.figit.capture+json` MIME，顶层包含 `format: "figit.capture"` 和整数 `version`。
- V1 捕获包使用 UTF-8 JSON，保存且只保存一份精确的 Figma clipboard HTML envelope；不得再重复保存同一 payload 的 bytes 或 base64 表示。
- payload 记录 SHA-256；回放必须先进行结构校验、版本校验和 checksum 校验，再构造 clipboard item。
- 捕获包 schema 只使用项目自有的普通数据结构，不能序列化或暴露 `@figit/dom-to-figma` 专有 TypeScript 类型。
- 捕获包至少保存原始 Figma 剪贴板 payload、来源 URL/标题/时间、实际生效的采集设置与捕获诊断。
- 捕获包外围元数据默认脱敏：source URL 只保留 origin + pathname，并移除 credentials、query 和 fragment；资源诊断不保存完整图片/字体 URL。
- 需要关联资源诊断时使用规范化 URL 的 SHA-256 标识及稳定错误码；页面标题、目标类型、时间和实际设置可以保留。
- clipboard payload 必须原样保存以保证回放一致性；产品文案需将其视为用户主动保存的捕获内容，而不是声称 payload 已脱敏。
- 扩展必须能够校验并重新打开受支持版本的捕获包，再将其中的 payload 写回剪贴板；回放不应重新访问原网页或重新执行 DOM 转换。
- 资源采集、配置保存和结果导出必须提供可理解的成功、失败与部分成功状态。
- 捕获或 `.figit` 校验完成后进入 `ready-to-output`，不得依赖捕获开始时的用户激活自动写剪贴板或下载文件。
- ready 状态根据已选出口提供 `Copy to Figma`、`Save .figit` 或 `Copy & Save` 明确命令；打开已有捕获包通过同一 ready 状态执行复制。
- 输出失败不得销毁已准备 artifact；用户可以只重试失败出口，且不得重新分析页面或转换 DOM。
- ready 或任一输出终态必须提供显式新建捕获命令，在保留浮窗和 draft/default settings 的同时丢弃当前内存 artifact 与 session 临时状态并返回 idle；下一次目标分析必须使用全新引擎/session，且不得要求刷新页面。
- 输出成功不得自动复位；活动捕获、artifact preparation 或输出运行中不得强制复位，避免与取消、用户激活和迟到结果发生竞态。

## Acceptance Criteria

- [x] 在普通网页点击扩展图标会直接显示当前标签页内的隔离浮窗，不出现中间 popup，也不自动启动捕获。
- [x] 浮窗空闲页可启动整页捕获、元素选择或打开捕获包；元素选择完成后自动回到浮窗的分析结果页。
- [x] 捕获进行中隐藏并重新打开浮窗会恢复同一 session 及最新进度，不会重复启动或丢失任务。
- [x] 浮窗在桌面和窄视口均不超出屏幕，内部溢出可滚动；浮窗之外不阻止页面交互。
- [x] 元素选择期间浮窗不会遮挡点击目标，任务最小化后仍能看到阶段/进度信号并一键恢复。
- [x] 浏览器限制页无法注入浮窗时会得到明确、非静默的反馈。
- [x] 用户能够在执行采集前查看并修改已纳入 MVP 的资源与输出选项。
- [x] 高级设置仅出现四项已确认能力，并将有效值传递到 adapter/bridge；Shadow DOM、trace 和内部调度参数不会出现在用户配置中。
- [x] 分析完成后，用户能在开始资源处理前看到目标范围内的图片节点总数，并明确选择处理或跳过。
- [x] 确认前资源集合变化会触发重新确认；仅引用节点数变化不会重复询问；执行期间进度总量不会因 DOM 动态变化而增加。
- [x] 同一图片 URL 被多个节点复用时，分析结果会分别显示节点数与唯一资源数，且资源只处理一次。
- [x] `srcset` 图片按浏览器实际选择的 `currentSrc` 计数和去重，普通 DOM 与开放 Shadow DOM 使用同一遍历语义。
- [x] CSS 背景图片会显示独立的“不支持”数量和说明，但不会被误报为已处理资源。
- [x] 处理图片时，UI 能按图片阶段显示至少 `已处理/总数` 与失败数；图片阶段结束后才进入后续转换阶段。
- [x] 图片全部成功会自动继续；部分失败不会静默继续，并提供重试失败项、占位继续和取消三个动作。
- [x] 重试后成功项不会发生重复网络请求或重复处理。
- [x] 图片调度从不超过 4 个并发；单项 15 秒或阶段 60 秒到期后任务进入可诊断的失败恢复状态。
- [x] 取消会终止排队和进行中的页面/后台请求，迟到结果无法更新或污染已取消或更新的 session。
- [x] 图片累计达到 64 MiB 会进入可恢复的软限制提示；达到 128 MiB 后不会再分配新图片处理任务或继续扩大 artifact。
- [x] 跳过图片时不会发起图片资源获取，且后续阶段仍能按约定策略完成。
- [x] 跳过或失败的图片在结果中保留原几何与支持的框样式，且不会导致相邻 Auto Layout 项目重新排列。
- [x] 已保存的用户配置会在约定的生命周期与作用域内恢复。
- [x] 新标签页浮窗载入全局默认；同一标签页隐藏并恢复浮窗时保留临时修改和进行中 session。
- [x] 临时捕获设置不会覆盖全局默认，点击“设为默认”后新会话才读取更新值。
- [x] 刷新或关闭标签页会清除临时 session，且扩展存储中不会出现按站点资源清单或自动捕获历史。
- [x] 启用剪贴板出口时，扩展会写入约定格式并明确反馈结果。
- [x] 启用本地文件出口时，扩展会生成约定格式的可用文件并明确反馈结果。
- [x] 同时启用两个出口时只执行一次页面捕获，并分别输出相同 payload。
- [x] 一个出口失败不会撤销另一个已经成功的出口，界面会明确报告部分成功和失败原因。
- [x] 长时间处理结束后不会自动触碰剪贴板或下载；最终输出点击会立即消费已准备 artifact，并获得新的用户激活。
- [x] 输出失败后单独重试出口不会重新执行资源阶段或转换阶段。
- [x] ready、输出成功、部分成功和失败后均可显式返回 idle，并在同一标签页连续完成第二次整页或元素捕获；旧 artifact、输出结果和迟到事件不会污染新 session，draft/default settings 保持不变。
- [x] UI 不允许提交零出口配置；首次使用默认保持现有“复制到剪贴板”行为。
- [x] 用户能够重新打开有效捕获包并把保存的结果再次复制到 Figma，回放结果与首次捕获的剪贴板 payload 一致。
- [x] 捕获包包含可检测的格式版本；损坏或不支持版本的文件会被拒绝并给出明确错误，不会写入剪贴板。
- [x] `.figit` 文件可作为 JSON 解析，且只包含一份 clipboard HTML payload；修改 payload 后 checksum 校验会失败。
- [x] 捕获包 source URL 不包含 credentials、query 或 fragment，资源诊断不泄露完整远程 URL；同一资源仍可通过哈希标识关联。
- [x] 回放有效 `.figit` 后写入剪贴板的 HTML 与首次捕获保存的 HTML 字节一致。
- [x] 图片或字体资源失败时，行为符合约定的容错策略，且不会静默生成不可诊断的产物。
- [x] 字体兼容模式会报告 exact/fallback 结果；快速模式不会发起页面或公共 CDN 字体请求；严格模式不会在存在不精确匹配时进入转换。
- [x] 严格模式失败后可重试、切换兼容模式或取消，且三种路径都不会静默丢弃文字节点。
- [x] UI 选项、扩展消息协议与底层转换能力具有自动化契约或行为测试覆盖。
- [x] adapter 的阶段状态机与资源清单测试可以使用伪转换引擎运行，不需要加载 `@figit/dom-to-figma` 实现。
- [x] adapter 不导入 `@figit/dom-to-figma` 的内部路径；具体上游集成集中在单一 bridge，替换或升级上游时无需修改 UI、配置存储、进度协议或捕获包模型。
- [x] 若上游增加图片预处理 hook，未启用该 hook 时现有 `createFigmaConverter()` 行为和输出保持不变，并通过 changeset、包测试及干净安装兼容验证。

## Out of Scope

- 将 CSS `background-image`、`mask-image`、`border-image`、伪元素内容图、`<svg><image>`、canvas、video/poster 等非 `<img>` 图像来源嵌入 Figma。
- 生成、解析或伪装完整 `.fig` 文件，以及依赖 Figma Plugin API 直接导入捕获结果。
- 扩展内部自动捕获历史、云同步、按站点配置覆盖或后台自动保存。
- 浮窗拖拽、自由缩放、位置持久化和多窗口同步。
- `.figit` 压缩、加密、云分享或跨产品公共交换协议；V1 只承诺本扩展的版本化回放。
- 将私有 `@figit/browser-capture-adapter` 发布为公共 npm 包；先稳定内部能力端口。
- Safari 专项适配与发布；MVP 的浏览器门禁为仓库现有的 Chromium MV3 与 Firefox 构建/验证路径。
- 把 trace、Shadow DOM、并发数、缓存阈值或内部重试次数变成用户可编辑设置。

## Task Decomposition

- `07-24-staged-resource-pipeline`：拥有捕获前资源分析、计划复核、图片优先阶段、字体阶段、进度/超时/取消/内存保护、占位语义，以及与 `@figit/dom-to-figma` 的唯一桥接边界。
- `07-24-extension-capture-workspace`：拥有工具栏直达页面浮窗、捕获控制器、元素选择集成、全局默认/标签页会话设置和阶段状态展示。
- `07-24-figit-capture-artifact`：拥有 `.figit` V1 schema、脱敏、checksum、打开/校验/回放、剪贴板与 Blob 下载 sink，以及部分成功后的单出口重试。
- 父任务拥有统一需求、跨子任务协议和最终集成验收，通常不直接承载功能实现；只有跨边界接线或验收修复无法合理归属子任务时才在父任务处理。
- 依赖顺序为资源管线先行；工作区和捕获包只能消费项目自有的稳定协议，不能直接消费上游转换类型。捕获包的纯 schema/sink 可并行设计，但页面内集成应在工作区控制器契约确定后完成。
- MVP 首要流程已确定为“点击工具栏图标 -> 页面内浮窗 -> 选择整页或元素 -> 分析并确认资源 -> 图片/字体/转换分阶段执行 -> 用户显式输出”；默认出口为仅剪贴板。

## Confirmed Product Decisions

### Toolbar-Invoked In-Page Workspace

- 浏览器工具栏图标直接调用当前页面内的捕获浮窗；现有 popup 不再作为主要产品界面。
- 打开浮窗只进入空闲工作区，不预先选择整页或元素，也不开始资源分析。
- 所有后续步骤都在同一浮窗中完成：选择工作流、确定目标、查看资源清单、确认图片策略、观察阶段进度、处理失败和执行输出。
- 工具栏图标负责直接唤起浮窗；浮窗内的明确命令负责开始、取消、重试或完成输出。
- 再次点击工具栏图标始终打开、聚焦或恢复现有浮窗，不切换为隐藏；用户通过浮窗自身控件最小化或关闭。

### In-Page Panel Geometry

- 固定在右上区域，top/right 16px，目标宽度 380px，max-height 为 viewport - 32px，内容内部滚动。
- 宽度在窄视口收缩为 viewport - 32px；Shadow host 继续全屏 pointer-events none，面板表面单独 pointer-events auto。
- Picker active 时自动最小化，结束后恢复；running 状态可收为右下角进度按钮并保留 session。
- MVP 不提供拖拽、resize 或位置持久化。

### Replayable Local Capture

- 本地保存的主要用途是可回放备份，而不是仅供开发调试或立即建立外部集成协议。
- 捕获包是项目自有、可版本化的格式；它封装当前可工作的 Figma 剪贴板 payload 与必要元数据。
- 扩展提供重新打开并复制到 Figma 的回放路径，使本地保存成为闭环工作流。
- 原始 `.html` envelope 与人类可读调试 JSON 不作为 MVP 的主要用户出口；是否提供开发者导出留待后续范围决策。

### `.figit` Capture Package V1

- 文件扩展名 `.figit`，MIME `application/vnd.figit.capture+json`，编码 UTF-8 JSON。
- 顶层至少包含 format、version、createdAt、producer、source、settings、diagnostics 和 payload。
- payload 类型为 `figma-clipboard-html`，保存精确 HTML 字符串及其 SHA-256；不重复保存 bytes/base64。
- V1 不增加 ZIP/自定义二进制层；回放按结构、受支持版本和 checksum 顺序验证，失败时不触碰剪贴板。
- schema 属于扩展/adapter 边界，与具体转换器类型解耦；producer 元数据可以记录版本，但不能成为解析依赖。

### Capture Package Privacy

- replay payload 保持字节一致，不尝试对其中的网页内容做脱敏。
- source URL 只保存 origin + pathname，剥离 credentials、search 和 hash。
- 图片/字体资源 URL 不进入 diagnostics；使用规范化 URL SHA-256、稳定错误码和汇总计数进行关联。
- 页面标题、捕获目标、时间、有效设置和非敏感诊断汇总保留。
- MVP 不建立扩展内部捕获历史；`.figit` 文件是用户明确触发的唯一持久化结果载体。

### Composable Output Destinations

- 剪贴板和本地捕获包使用复选式多选，允许只复制、只保存或同时执行。
- 默认值为仅剪贴板；至少保留一个已选出口。
- 多出口共享同一次转换结果，并按出口独立报告成功或失败。
- artifact 准备完成后由用户显式执行所选出口；按钮文案按选择显示 Copy to Figma、Save .figit 或 Copy & Save。
- 失败 artifact 保留在当前 session，允许只重试失败 sink；打开 `.figit` 复用同一 ready-to-output 模型。

### Repeat Capture Lifecycle

- ready/output 终态保留当前 artifact，直到用户明确执行 `New capture`；输出成功本身不隐式清空结果。
- `New capture` 只结束当前结果会话并返回 idle，不自动选择目标或开始分析；用户可重新选择整页、元素或打开捕获包。
- 复位保留浮窗和 draft/default settings，清除 target/plan/progress/diagnostics/artifact/sink result，并让下一次分析使用全新引擎与 session id。
- 当前 artifact 尚无任何成功输出或仍有失败 sink 时显示丢弃确认；所有已选 sink 都成功后直接复位，取消确认时保留当前结果。

### Upstream Decoupling Boundary

- 用户确认采用“扩展体验层 / 私有 capture adapter 编排层 / npm 转换核心能力层”的职责划分。
- 仓库中没有 `dom_to_html` 包或符号；本规划按用户所指为 `@figit/dom-to-figma` 处理。
- `@figit/dom-to-figma` 视为可升级、可替换的上游 peer dependency，而不是扩展业务模型的所有者。
- adapter 自有协议必须能够由测试替身实现；上游专属映射集中在 bridge。
- 不复制、fork 或深层导入上游实现。外围能力优先；必要的上游改动限制为保持向后兼容的可选通用 hook。

### Image Inventory Counts

- 捕获前分析同时显示图片节点数量和唯一图片资源数量。
- 节点数按当前捕获范围与组合 DOM 遍历语义计算；唯一资源按图片实际解析后的 URL 去重。
- 图片阶段的总量、完成量、失败量和并发调度均以唯一资源为单位；后续转换将同一处理结果映射回所有引用节点。

### Capture Plan Revalidation

- Analyze 产生当前目标与图片资源集合的 session-local 计划，不发起资源网络请求。
- 用户开始处理时快速重扫；目标 disconnected 时失败，唯一资源集合变化时回到 review，只有引用节点数变化时更新显示并继续。
- unsupported CSS background 计数变化只更新提示，不阻塞开始。
- 图片阶段启动后锁定计划；后续 DOM 新增资源留给下一次捕获。

### MVP Image Source Scope

- 可处理来源仅包含 `<img>`，以 `currentSrc || src` 作为实际资源标识，并覆盖组合 DOM 中的开放 Shadow DOM。
- 支持由现有 loader 处理的 `data:`、`blob:` 和 HTTP(S) URL；后台特权 transport 继续只接受无凭据 HTTP(S)。
- CSS `background-image: url(...)` 只检测并单独报告为 unsupported reference；CSS 背景尺寸、定位、平铺、多图层和实际嵌入留给后续独立能力。
- `<svg><image>`、伪元素内容图、CSS mask/border image、canvas、video/poster 等非 `<img>` 图像来源不进入本次 MVP 的可处理清单。

### Skipped Image Representation

- 主动跳过和尽力处理失败的图片都保留透明布局占位，而不是删除节点。
- 占位保留原始尺寸、位置、圆角、边框和透明度，不包含图片字节；图层命名为 `Image (skipped)` 或等价的明确名称。
- 诊断区分 `user-skipped` 与资源获取/处理失败，避免把用户选择误报成错误。

### Image Failure Recovery

- 图片阶段默认尽力处理，不因第一张失败立即终止整个捕获。
- 所有唯一资源成功时自动进入后续阶段。
- 存在失败时暂停，并向用户提供 `Retry failed`、`Continue with placeholders`、`Cancel capture`；重试集合只包含失败资源。
- 用户选择继续后，仍失败资源使用透明占位并保留结构化失败诊断。

### Image Scheduling And Cancellation

- 图片预处理使用固定并发 4、单资源超时 15 秒、阶段总预算 60 秒。
- 阶段截止时 abort 所有排队和进行中的工作；未完成项以 timeout 原因进入失败恢复。
- Retry failed 只调度失败集合并获得新的 60 秒预算；成功缓存保持不变。
- Cancel 的 AbortSignal 必须传入直接 fetch 和后台代理；消息协议需要支持按 session/request 标识取消后台 fetch。
- UI 报告 completed/total、failed 和 elapsed，不显示 ETA。

### Image Memory Budget

- 按去重后的 Figma-ready PNG/JPEG/GIF 字节累计资源体积，相同资源只计一次。
- 64 MiB 为软阈值：暂停并提供 continue、placeholder remaining、cancel。
- 128 MiB 为硬阈值：不再处理新资源，只提供 placeholder remaining 或 cancel。
- 阈值固定为运行保护，不进入高级设置；面板同时显示资源数量进度与累计 MiB。

### Font Processing Modes

- `compatible`（默认）：页面字体与允许的 transport 优先，扩展内置字体回退；保持可编辑文字并记录替代诊断。
- `fast-local`：禁止远程字体请求，只使用扩展内置字体度量；payload 仍请求原始字体名称，但布局精度允许下降。
- `strict`：family、weight、italic 必须精确满足；失败时暂停，提供 retry、switch to compatible、cancel。
- 字体请求以 family、weight、italic 组合去重并作为阶段进度单位；没有 `off` 模式。

### Settings Persistence Scope

- `storage.local` 只保存用户显式提交的全局默认，包括输出目的地、图片默认选择、字体模式和纳入 MVP 的高级设置。
- 当前标签页内的临时选择、资源计划、阶段进度、失败集合和浮窗状态保存在内存 session 中。
- 隐藏/恢复浮窗保留 session；导航、刷新、关闭标签页或扩展失效会释放 session。
- MVP 不实现站点级覆盖、自动历史库或后台持久化捕获结果。

### Advanced Capture Settings

- 折叠高级设置包含 `layout: auto | absolute`、`motion: freeze | live`、`lineBreaks: auto | off` 与受控范围的 `settleTimeoutMs`。
- 默认值沿用当前稳定行为：auto、freeze、auto、5000 ms；0 ms 明确表示跳过页面稳定等待。
- 开放 Shadow DOM 遍历固定启用，trace 固定关闭；分析与转换不得采用不同 DOM tree strategy。
- 图片并发、缓存容量、内部重试次数等运行策略由实现和测试控制，不写入用户配置或捕获包的可编辑设置。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
