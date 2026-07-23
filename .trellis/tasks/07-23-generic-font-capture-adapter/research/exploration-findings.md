# 探索结论

## 任务背景

这次探索从 Heho BMR 页面开始，目标逐步收敛为：把 `dom-to-figma` 当作正在开发的开源依赖，在消费侧补齐真实浏览器环境中的字体资源、页面稳定化和文本换行问题。Heho 只用于复现和回归，不应成为通用实现的条件分支。

## 已验证的核心包事实

- 发布包 `@figit/dom-to-figma` 当前已验证使用 `0.2.0`；独立消费项目的 `package.json` 固定为精确版本，未修改 `node_modules`。
- `FontLoader` 的请求字段是 `family`、`weight`、`italic`，返回字体 `ArrayBuffer`，可选 `resolvedFamily`、`resolvedWeight`、`resolvedItalic`。
- 字体缓存键基于 family、weight、italic；请求没有文本或 code point，因此无法仅凭当前接口表达逐字符 fallback。
- 核心包使用 fontkit 解析字体字节，当前路径不接受字体集合等格式；字体来源和格式验证应在外围完成。
- tokenizer 主要按 ASCII 空格和 `\n` 拆分，转换路径固定关闭了按字符拆词。连续 CJK 文字在浏览器中已经换行时，仍可能在转换结果中成为过长 token。
- `ConvertResult` 通过 `toClipboardItem()` 暴露复制数据，适配器可以围绕公开 API 编排，不需要接触内部节点实现。

## 已验证的浏览器与扩展事实

- `document.fonts.ready` 只能说明浏览器字体使用状态已稳定，不能提供字体文件字节，也不能告诉应用每个字符最终使用了候选栈中的哪一个字体。
- `document.fonts` 不保证暴露完整的 `@font-face` URL；同源 CSSOM 可以扫描，跨源 stylesheet 访问 CSSOM 可能抛出 `SecurityError`。
- `local()` 允许浏览器使用本机字体，但扩展不能把它当作可重复读取字体文件的来源。
- 扩展已经有 typed `fetchFont` 消息和后台 base64 URL 获取能力。后台目前限制 `http`/`https`、省略 credentials，并与 `fetchImage` 使用同一安全边界。
- 扩展已有 page-aware font loader 和 Fontsource fallback，但 content 转换流程还需要统一的页面 settle、换行预处理和 cleanup 编排。
- 任何临时 DOM 修改都必须在成功和异常路径恢复，不能把捕获辅助状态留给站点。

## 形成的解决策略

### 字体

字体解析器不能把 CSS family 名字直接当作字体文件。应先收集候选来源，再获取、解析和匹配字重/斜体，最后交给现有 `FontLoader`。来源顺序为同源 URL、扩展后台跨源 URL、显式捆绑字体、通用 Fontsource fallback。失败时保留可编辑文字，并标记 fallback 原因。

已确认默认使用最接近的可解析字体继续转换，并提供 strict 模式。核心转换器会在节点级捕获字体异常，因此 strict 必须在转换前预检去重字体请求；仅依赖 loader 抛错会产生静默缺失文字。MVP 的精确匹配边界是 family、weight、italic 和可解析 bytes。

混合字体栈是当前 API 的边界：例如 Latin、CJK 和 emoji 可能分别由不同字体覆盖。MVP 使用覆盖面更广的字体或明确的 fallback；逐字精确 fallback 需要未来引入 font-run 或带 code point 的上游 API。

### 换行

浏览器 `Range.getClientRects()` 可以读取当前视口的真实字符行边界。对连续 CJK 文本，将这些边界临时编码为 `\n`，再让转换器按换行拆分，可以保留页面的视觉行结构。测量前要把 `normal`/`nowrap` 的源码空白折叠为普通空格，避免 HTML 缩进产生额外 Figma 行。所有修改在 `finally` 中恢复。

已确认第一版默认启用保守自动模式，只处理浏览器实际多行且符合安全检测条件的连续 CJK 文本；调用方可以关闭该能力，关闭后不进行 Range 测量或 DOM 修改。

### 依赖路线

核心包保持独立、可升级、可回滚；扩展和演示项目持有 adapter。先用 adapter 测试证明哪些能力必须上游化，再提出小范围可选 API，而不是直接维护核心包 fork。

第一版 adapter 已决定放在 `internal/browser-capture-adapter`，作为 `private: true` 的 workspace 包供扩展和发布包回归项目共享。扩展权限与后台消息保留在 `apps/extension`，通过注入接口连接；多站点验证稳定后再讨论公开 npm 包。

页面稳定化默认采用 5 秒总预算，满足条件立即继续。预算覆盖字体、图片和布局帧，任何单项都不能无限等待；超时记录诊断后继续转换，调用方可调整预算或用 `0` 跳过。

动态页面默认在当前时间点暂停捕获范围内由 Web Animations API 暴露的动画，转换结束或失败后恢复原播放状态，并提供 `motion: "live"`。仓库的 oracle harness 已证明禁用动画和等待稳定帧能提高确定性；真实扩展采用暂停当前帧而非重置动画样式，以减少视觉状态变化。视频、canvas 和自定义 JS 循环留作已知边界。

共享 adapter 只返回 `ConvertResult + diagnostics`，不写剪贴板。扩展 content entrypoint 保留 `navigator.clipboard.write()`，避免破坏现有 popup 到 content 的用户激活链。

## 已完成的回归证据

在 `published-package-test` 中，使用 `@figit/dom-to-figma@0.2.0` 的 Auto 和 Absolute 两种布局都已完成浏览器回归：页面可复制，输出页面尺寸约为 `1280 x 1819`，BMR 描述文字按浏览器结果生成约四行，源 DOM 恢复，且没有未处理的页面/控制台/网络错误。

这证明消费侧修补路线可行，但不等于字体和换行问题已经对任意站点解决；本任务要把一次性修补提炼成可测试的通用模块。

## 未解决的边界

- 真实字体 bytes 不可得时，无法同时保证原字体度量、视觉完全一致和文字可编辑。
- 换行结果依赖捕获视口、缩放比例和字体加载时机，不能作为跨视口的固定语义。
- 跨源 iframe、需要登录的资源、受 CSP 或权限限制的字体需要明确失败和降级。
- 核心包未来若增加浏览器换行策略或 code point-aware font resolver，adapter 需要保留兼容分支并用行为测试锁定结果。
