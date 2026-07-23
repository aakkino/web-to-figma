# 技术设计

## 设计目标

将“浏览器知道如何显示页面”和“DOM-to-Figma 需要可解析字体字节、稳定文本 token”之间的差异隔离在消费侧适配器中。适配器负责环境能力、资源发现和临时测量，`@figit/dom-to-figma` 继续负责 DOM 到 Figma 的核心转换。

## 边界

```text
网页 DOM / CSS / FontFaceSet
            |
            v
   capture adapter (extension or demo)
   - page settle gate
   - font source discovery and resolver
   - browser line-boundary preparation
   - exact cleanup
            |
            v
   @figit/dom-to-figma public API
   - createFigmaConverter
   - FontLoader / ImageLoader
   - ConvertResult.toClipboardItem()
            |
            v
       Figma clipboard payload
```

核心包不读取扩展消息、不访问站点权限、不修改页面永久状态。独立演示项目可以复用纯浏览器部分，但跨源资源能力由宿主环境提供。

## 捕获流程

1. 记录捕获根节点、视口尺寸和需要恢复的文本节点内联状态。
2. 默认在当前时间点暂停捕获范围内可枚举的动画，并记录需要恢复的播放状态。
3. 等待 `document.fonts.ready`、可见图片和布局相关异步内容；设置总超时并保存降级原因。
4. 扫描可访问的 `CSSFontFaceRule`，收集 family、weight、style、stretch、来源 URL 和 `src` 候选。
5. 为转换器创建带缓存的 `FontLoader`。同源 URL 直接获取，跨源 URL 通过扩展后台消息获取；无法获得时使用显式捆绑或通用 Fontsource 回退。
6. 对需要兼容的文本节点按当前浏览器布局计算字符行边界，暂时插入换行并切换为可保留换行的空白模式。
7. 调用 `converter.convert()` 生成 `ConvertResult`。
8. 在统一的 `finally` 中恢复文本、内联样式、动画状态和临时标记；恢复失败应被记录为捕获失败，而不是静默吞掉。
9. adapter 返回 `ConvertResult + diagnostics`；扩展或演示宿主在恢复页面后自行调用 `navigator.clipboard.write()`。

## 页面稳定化

adapter 提供 `settleTimeoutMs`，默认 `5000`，并使用同一个 deadline 约束全部等待：

- 并行观察 `document.fonts.ready` 与捕获根节点内图片的 load/error 状态。
- 资源满足条件后再等待两个 animation frame，确认测量与下一次 paint 之间没有立即变化。
- 任一阶段达到 deadline 后立即停止等待，记录阶段、未完成字体状态和图片数量，然后继续转换。
- `settleTimeoutMs: 0` 完全跳过资源与布局等待，适合已经由宿主稳定化的文档和对照测试。
- 所有 listener、timer 和 observer 都由统一 cleanup/AbortSignal 释放，超时不能留下后台等待。

当前发布包演示的字体和图片等待没有统一总截止时间；共享 adapter 不沿用这个缺陷。

## 动画快照

adapter 提供 `motion: "freeze" | "live"`，默认值为 `freeze`：

- `freeze` 通过捕获根节点的 `getAnimations({ subtree: true })` 枚举现有 CSS Animation、CSS Transition 和其他 Web Animations effect，只暂停转换前处于运行状态的动画，并保留其当前时间点。
- cleanup 只恢复 adapter 实际暂停过的动画；原本已暂停、finished 或 idle 的动画不被误启动。
- `live` 完全跳过动画枚举、暂停和恢复，用于站点兼容回避及核心包行为对照。
- 页面在捕获期间新创建的动画、自定义 `requestAnimationFrame` 循环、视频与 canvas 不承诺冻结。诊断记录已暂停动画数量和恢复失败。
- 动画、文本和任何临时样式共享一个 LIFO cleanup 栈；任一阶段失败都执行全部恢复，并聚合恢复错误。

## 通用字体解析器

### 输入与来源优先级

转换器当前向 `FontLoader` 提供 `{ family, weight, italic }`。外围解析器内部保留更丰富的候选记录，但在调用核心包时映射到现有请求。

来源按以下顺序尝试：

1. 页面同源 `@font-face` 的可解析 URL。
2. 扩展后台代理获取的跨源 `@font-face` URL。
3. 应用明确配置的捆绑字体，例如提供给离线或高一致性场景的 CJK 字体。
4. Fontsource 或等价通用字体回退。
5. 可诊断的失败结果；是否继续转换由捕获策略决定。

`local()` 只作为浏览器显示能力的线索，不作为可重复取得字节的保证。`data:` 和 `blob:` 需要单独验证生命周期与解析能力，不能直接当作普通 URL 假定永远可用。

### 选择、验证与缓存

- 规范化 family 引号、大小写和空白；将 CSS weight 映射到数值请求，区分 normal/italic，保留 stretch/variation 作为未来扩展字段。
- 获取 ArrayBuffer 后用核心包兼容的字体解析器验证 bytes、family、weight、italic 和格式；字体集合格式若当前核心包不接受，应在选择阶段失败并继续回退。
- 缓存至少按 `source URL + family + weight + italic` 去重，并避免把一个错误结果永久缓存为成功字体。
- 可以使用 `resolvedFamily` 将回退字体的度量字节映射到请求字体，但必须在 trace/诊断信息中标明这不是原始字体。
- 当前 API 没有文本/code point 输入，因此混合字体栈不能完全由一个 `FontLoader` 请求表达。MVP 对混排使用覆盖度较高的合成或捆绑字体；未来若需要逐字精确 fallback，应增加 font-run 或 code point-aware 上游接口。

### 字体失败策略

adapter 对外提供 `fontFailure: "fallback" | "strict"`，默认值为 `fallback`：

- `fallback` 依次尝试页面字体、后台 transport、捆绑字体和通用字体。发生 family、weight 或 italic 替代时继续转换，但把请求值、实际值、来源和原因写入诊断。
- `strict` 在调用核心转换器前收集捕获根节点内去重后的字体请求并执行预检。只要有请求不能被精确满足，就终止整次捕获并列出失败请求。
- 必须预检是因为核心转换器当前在节点级捕获异常；仅让 `FontLoader` 抛错会导致对应文字节点被跳过，而不是可靠地使整次转换失败。
- MVP 的 strict 精确性以 family、weight、italic 和可解析 bytes 为边界；逐 code point 的真实浏览器 fallback 需要未来的 font-run API，不在本阶段伪装为已解决。

### 扩展安全通道

内容脚本只发送结构化的 `fetchFont` 消息。后台统一执行：

- 仅接受 `http:` / `https:`。
- 使用无凭据请求，并明确处理非 2xx、空响应和解析失败。
- 以既有 base64 消息格式返回二进制，不在 content script 中绕过消息类型自行建立代理。
- 遵循 manifest 的 host permission，不为了字体解析扩大权限范围。

## CJK 换行适配

当前转换器 tokenizer 只按 ASCII 空格和 `\n` 切分，并且转换路径固定关闭了按字符拆词。连续 CJK 文本会因此成为一个过长 token，即使浏览器已经正确换行，生成的 Figma 文本也可能只得到单行或错误宽度。

适配器使用浏览器 `Range.getClientRects()` 读取真实布局：

- 对文本节点建立逐字符 Range，按 rect 的 `top`/`y` 变化识别行边界。
- `white-space: normal` 和 `nowrap` 的测量副本先将 HTML 缩进造成的空白折叠为普通空格，避免源码格式换行被错误当成视觉换行。
- 只把浏览器实际产生的行边界临时写入 `\n`，并临时使用 `pre-line` 保留这些换行。
- 既有显式换行、不可见节点、空文本和不参与捕获的区域跳过。
- 适配器结束后恢复原始 text content 与原始 `style.whiteSpace` 状态，不改变页面业务行为。

该策略是当前视口的视觉捕获策略，不替代 CSS 的响应式文本语义。窗口、缩放或字体状态改变后必须重新测量。

默认策略已确认为保守自动模式。adapter 对外提供可关闭的配置，例如 `lineBreaks: "auto" | "off"`：

- `auto` 是默认值，只处理有连续 CJK、浏览器实际多行且 `white-space` 语义可安全映射的节点。
- `off` 完全跳过 Range 测量和临时文本修改，用于特殊站点回避及与核心包原始行为对照。
- 第一版不提供强制处理所有文本的模式，避免把浏览器本来没有产生的换行写入结果。

## 失败与降级

| 场景 | 行为 | 诊断 |
| --- | --- | --- |
| 页面字体尚未稳定 | 等待至超时，继续使用已解析字体 | 记录 settle timeout |
| `@font-face` URL 不可读 | 尝试后台代理或下一来源 | 记录 URL、状态和来源 |
| 字体 bytes 不可解析 | fallback 模式尝试下一来源；strict 模式预检失败 | 标记来源和解析错误 |
| 混合字体覆盖不足 | 使用覆盖更广的捆绑字体 | 记录可能的度量差异 |
| Range 测量失败 | 保持原文转换，不破坏 DOM | 记录节点和异常 |
| 剪贴板或解码失败 | 让复制流程失败并显示原因 | 不留下临时 DOM 状态 |

核心包当前没有公开的文本转路径兜底。默认策略已确认为使用替代字体保留可编辑文字；strict 模式通过转换前预检避免核心包静默跳过字体失败的文字。转路径或转图片只作为未来需要视觉优先时的显式策略，不应静默替换所有文字。

## 预期模块边界

通用、无扩展权限依赖的部分应进入一个共享 adapter 包：

- `font-resolver`：候选发现、来源选择、bytes 校验和缓存。
- `page-stability`：字体、图片和布局稳定化等待。
- `motion-snapshot`：动画枚举、当前帧暂停和精确恢复。
- `text-line-breaks`：Range 测量、临时换行和 cleanup。
- `capture-adapter`：按顺序编排上述能力并调用 `createFigmaConverter`。
- `diagnostics`：结构化记录字体替代、等待超时、动画、换行和 cleanup 结果。

扩展专属的后台 `fetchFont` transport 和消息权限继续留在 `apps/extension/shared/`，通过接口注入通用 resolver。`apps/extension/entrypoints/content/convert.ts` 只保留用户动作、根节点尺寸和剪贴板交互。`published-package-test` 继续作为发布包的消费侧回归入口，不复制核心包实现。

规划阶段比较过两种落点：

| 落点 | 优点 | 代价 |
| --- | --- | --- |
| `internal/browser-capture-adapter`，`private: true` | 扩展和回归项目共享实现，API 可继续演进 | 外部项目暂时不能直接从 npm 安装 |
| `packages/browser-capture-adapter`，公共包 | 外部消费者立即可复用 | 第一版就承担 semver、文档、兼容和安全抽象承诺 |

已确认第一版使用 `internal/browser-capture-adapter`，包名为 `@figit/browser-capture-adapter`，并设置 `private: true`。验证多站点行为、稳定 API 后，再以独立任务评审是否迁移到 `packages/` 公开发布。

adapter 包不得导入 WXT、WebExtension messaging、manifest 权限或直接执行剪贴板写入。它通过宿主提供的字体 transport 获取直接 fetch 失败的资源；扩展实现该 transport，独立回归项目可以只提供浏览器直接 fetch 或测试 transport。

`@figit/browser-capture-adapter` 将 `@figit/dom-to-figma` 声明为 peer dependency，并在 monorepo 开发时使用 workspace dev dependency。`published-package-test` 通过本地 file dependency 消费私有 adapter，同时继续精确安装发布版 `@figit/dom-to-figma@0.2.0`，从而验证真实公开契约。

adapter 的捕获结果至少包含核心 `ConvertResult` 与结构化 diagnostics。剪贴板写入、toast 文案和用户激活链属于宿主：扩展继续在 content entrypoint 内写入剪贴板，adapter 不引入异步跨上下文消息来替代这一步。

## 兼容性与演进

- 扩展使用 workspace 依赖，独立演示项目固定 `@figit/dom-to-figma@0.2.0` 验证发布包协议。
- 核心包升级必须先跑 adapter 回归；若 `FontLoader`、tokenizer 或 `ConvertResult` 契约变化，适配器应在类型检查或行为测试阶段失败。
- 第一阶段不修改 `packages/dom-to-figma`。当 adapter 证明某个能力无法在外围可靠实现时，再单独提出向上游增加可选 hook 的变更，避免把扩展权限和站点策略耦合进通用库。
