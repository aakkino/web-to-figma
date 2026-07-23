# 通用 DOM-to-Figma 字体解析与扩展适配

## Goal

以官方发布的 `@figit/dom-to-figma` 作为稳定依赖，在外围建立可复用的网页捕获适配层。
适配层需要让任意站点在浏览器扩展和独立演示项目中尽可能保留原网页的字体、CJK 换行和页面最终布局，同时保持转换结果中的文字可编辑。

Heho BMR 页面是回归样例，不是业务范围。任务的产物应能被其他站点复用，也应能在上游包升级后通过测试发现兼容性变化。

## Requirements

- 使用发布版 `@figit/dom-to-figma`，不得通过修改 `node_modules`、复制核心实现或站点专用分支来解决问题。
- 在转换前等待页面进入可测量状态：网页字体、图片和影响布局的异步内容完成加载，或在超时后以明确的降级策略继续。
- 解析网页声明的字体候选栈，并按可获得性、字重、斜体和格式选择可被 `dom-to-figma` 读取的字体字节；同一字体请求应可复用缓存。
- 支持扩展环境下的跨源字体获取，并遵守现有消息通道的 URL 校验、无凭据请求和失败返回约束。
- 对浏览器已经完成排版、但转换器无法自动拆分的连续 CJK 文本，提供通用的临时换行适配；适配必须在转换完成或失败后恢复原始 DOM 和原始内联样式。
- 转换测量期间默认在当前时间点暂停捕获范围内的 CSS/Web Animations 动画与 transition，并在成功或失败后恢复原播放状态；调用方可以关闭冻结。
- 保留混合语言场景的可预期行为：拉丁文字、CJK、数字、标点、emoji 和显式换行不得因适配器而丢失或重复。
- 将适配器作为独立外围能力接入扩展的复制流程；核心包默认行为和公开协议保持向后兼容。
- 为字体来源、字体选择、页面稳定化、换行恢复和复制结果建立自动化回归样例；Heho 页面只作为其中一个固定夹具。
- 文档明确说明无法取得原始字体字节时的降级路径，以及可编辑文字与视觉精确度之间的取舍。

## Acceptance Criteria

- [x] `apps/extension` 的整页和元素复制通过 adapter 完成字体加载、页面稳定化和换行处理；adapter/extension 不修改 `node_modules`，也不包含站点专用分支。
- [x] 至少覆盖以下字体来源：同源 `@font-face`、扩展后台代理的跨源 `@font-face`、显式捆绑字体、Fontsource 或等价的通用回退字体。
- [x] 字体选择至少区分 family、weight、italic，并对重复请求去重；字体不可解析或不可获得时会记录可诊断原因并走降级路径。
- [x] 默认字体失败策略会使用最接近的可解析字体继续转换，并显式报告替代关系；`strict` 策略在转换前发现无法精确满足的字体请求时使整次捕获失败，不得静默丢弃文字节点。
- [x] CJK 连续文本在固定浏览器视口下的换行边界与浏览器布局一致或有明确可接受误差；源 DOM 在成功、超时和异常转换后都恢复到转换前状态。
- [x] CJK 换行适配默认以保守自动模式启用，并可由调用方关闭；关闭后不得再测量或修改文本节点。
- [x] 页面稳定化满足条件后立即继续，默认总等待不超过 5 秒；超时会继续转换并报告未完成资源，调用方可以调整时长或用 `0` 关闭等待。
- [x] 动画默认在当前时间点冻结，转换完成或失败后恢复原播放状态；`motion: "live"` 不暂停动画，也不注册恢复操作。
- [x] 具备拉丁、CJK、混排、emoji、多个候选字体和显式换行的测试，并覆盖 `normal`、`nowrap` 等常见空白处理。
- [x] 在后续 Shadow DOM 扩展之前，使用 `@figit/dom-to-figma@0.2.0` 的独立演示基线可以构建、运行并复制结果；里程碑之后的真正隔离安装需要按下述边界重新验证。
- [x] 复制出的结果可以被 Figma/`fig-kiwi` 解码，且浏览器控制台、页面异常和网络异常在回归流程中没有未处理错误。
- [x] 任务文档和扩展 README 给出接入方式、限制、降级行为以及升级核心包时的验证步骤。

## Notes

### Constraints

- CSS `font-family` 是候选栈，不等于每个字符的最终字体；浏览器的 `document.fonts.ready` 也不提供可直接复用的字体字节。
- `local()` 字体通常只能被浏览器使用，扩展无法可靠地提取操作系统字体文件。
- 跨源 CSSOM 可能因同源策略不可读；扩展的后台请求只能在允许的 URL 范围内工作。
- 当前 `FontLoader` 请求只包含 family、weight、italic，不包含文本或 code point，因此本任务第一阶段不承诺完美表达每个字符的真实 fallback 字体。
- 浏览器测量得到的换行边界与视口、缩放、字体加载状态相关，不能把某一次测量结果误认为跨视口的永久文本语义。

### Out of Scope

- 修改 Figma wire format、fig-kiwi 协议或核心转换器的默认语义。
- 为扩展提供任意 URL 的通用代理，或放宽现有的 host permission、scheme 和 credentials 安全策略。
- 可靠提取所有操作系统本地字体、检查所有跨源 iframe 内部 DOM，或保证第三方登录后内容可复制。
- 为某个站点添加永久选择器、固定坐标或业务文案补丁。
- 在第一阶段强制引入“转路径/转图片”的视觉兜底；该能力可作为字体字节完全不可得时的后续独立方案。

### Confirmed MVP Boundary

先把能力实现为扩展和独立演示项目可共享的 adapter 模块，核心包保持外部依赖；等 adapter 测试覆盖稳定后，再依据真实缺口提交小范围的上游 API 提案，例如可选的浏览器换行策略或带 code point 信息的字体解析接口。

该边界已于本轮规划确认。任务已获批准并通过 `task.py start` 进入
`in_progress`，实现范围仍限制在 adapter、扩展外围接入和独立回归项目。

### Confirmed Packaging Decision

- adapter 第一版放在 `internal/browser-capture-adapter`，包名使用 `@figit/browser-capture-adapter` 并保持 `private: true`。
- 扩展和发布包回归项目共同消费该包；行为与 API 经多站点验证稳定后，再单独评审迁移到 `packages/` 和公开发布。
- 扩展后台代理、typed messaging 和 host permission 不进入 adapter 包，只通过宿主注入的 transport 接口连接。

### Confirmed CJK Line-Break Decision

- CJK 浏览器换行适配默认使用保守自动模式，并提供调用方关闭选项。
- 自动模式只处理转换器当前无法正确拆分、浏览器实际出现多行、且空白模式受支持的文本节点。
- 关闭后不执行 Range 测量和临时 DOM 修改，用于规避特殊站点或进行核心包行为对照。

### Confirmed Font-Failure Decision

- 默认使用最接近的可解析字体继续转换，保留可编辑文字，并在结果诊断中报告请求字体与实际替代字体。
- adapter 提供可选 `strict` 模式；它在转换前预检去重后的字体请求，无法精确满足 family、weight 或 italic 时使整次捕获失败。
- 默认和 strict 模式都不得把字体错误静默变成缺失文字。文字转路径或图片不进入本次 MVP。

### Confirmed Page-Settle Decision

- 一键复制在字体、图片和布局满足稳定条件后立即继续，默认总等待预算为 5 秒。
- 5 秒是覆盖所有等待项的硬截止时间；任何单个 `fonts.ready`、图片或布局观察都不得绕过该预算。
- 超时后记录待完成资源和阶段并继续转换；调用方可以调整预算，设置为 `0` 时完全跳过稳定化等待。

### Confirmed Motion Decision

- 转换测量期间默认暂停捕获范围内由 Web Animations API 暴露的 CSS 动画与 transition，保持当前时间点，不重置到动画起点。
- 转换完成或失败后恢复转换前的播放/暂停状态；调用方可以使用 `motion: "live"` 完全关闭冻结。
- 视频、canvas、自定义 JS 定时器以及动画期间新创建的 effect 不在本次 MVP 的强制暂停范围内，相关限制写入诊断和文档。

### Planning Status

已确认 MVP、私有包、CJK 换行、字体失败、页面稳定预算和动画策略。当前没有阻塞实现的开放产品决策；实现和验证记录见 `implement.md`。

### Post-MVP Milestone Boundary

字体 adapter 完成后，真实站点回归又暴露了整页溢出、响应式图片和开放
Shadow DOM/slot 遍历问题。当前里程碑有意保留这些已经通过浏览器验证的
workspace 修复，因此包含 `packages/dom-to-figma` 的临时 composed-tree 与
`currentSrc` 改动；这不再是最初“核心保持纯外部依赖”的最终架构。

`published-package-test` 当前通过 `file:` junction 消费私有 adapter。由于该
adapter 的真实路径位于 monorepo 内，构建工具可能从 adapter 自身的
`node_modules` 解析 workspace 核心；因此后续的 `npm test` 只能视为构建 smoke，
不能单独证明 adapter 与 registry `@figit/dom-to-figma@0.2.0` 的隔离兼容性。

该里程碑是进入架构抽取前的可回滚源码快照，不是新的 npm 发布候选。核心
耦合、稳定遍历接口和真正的 packed/clean-install 兼容验证由后续任务
`.trellis/tasks/07-23-composed-dom-utility-package` 负责。
