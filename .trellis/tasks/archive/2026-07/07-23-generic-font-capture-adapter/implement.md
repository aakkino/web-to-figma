# 实施计划

## 0. 基线与夹具

- [x] 创建私有 workspace 包 `internal/browser-capture-adapter`，包名为 `@figit/browser-capture-adapter`；通用模块不得依赖扩展 runtime API。
- [x] 将 `@figit/dom-to-figma` 配置为 adapter 的 peer dependency 和 workspace 开发依赖，并让独立回归项目通过本地 file dependency 消费 adapter。
- [x] 固定当前发布包演示项目和扩展的构建基线，记录 `@figit/dom-to-figma@0.2.0` 的行为。
- [x] 建立最小 HTML 夹具：Latin、连续 CJK、混排、emoji、显式换行、候选字体栈、`normal`/`nowrap`。
- [x] 将 Heho BMR 页面截图和 BMR 描述段落作为回归样例，不把 Heho 选择器写入通用模块。

## 1. 字体来源与解析

- [x] 抽取字体候选数据结构和可注入的 fetch/transport 接口，避免纯逻辑依赖浏览器全局。
- [x] 实现同源 `@font-face` 扫描，处理可访问 CSSOM、多个 `src`、格式提示和 `local()` 限制。
- [x] 接入既有 `fetchFont` 消息；补齐非 2xx、空 bytes、非法 URL 和 base64 解码错误处理。
- [x] 实现按 family/weight/italic/source 的缓存和并发去重。
- [x] 用 fontkit 或核心包实际使用的解析路径验证字体 bytes，并覆盖 fallback 与 `resolvedFamily` 诊断。
- [x] 实现默认 `fontFailure: "fallback"` 与可选 `"strict"`；strict 在转换前预检去重字体请求，不能依赖核心包抛错传播。
- [x] 覆盖精确匹配、family 替代、字重/斜体替代、不可解析 bytes、网络失败和 strict 整体失败测试。

## 2. 页面稳定化与文本测量

- [x] 实现默认 5000ms 的 settle gate，用统一 deadline/AbortSignal 等待 `document.fonts.ready`、图片完成或失败以及两个稳定布局帧。
- [x] 支持调用方调整 `settleTimeoutMs` 或设为 `0` 跳过；超时继续转换并报告未完成阶段和资源数量。
- [x] 实现默认 `motion: "freeze"` 和可选 `"live"`；暂停捕获范围内当前运行的 Web Animations，并只恢复 adapter 实际暂停的实例。
- [x] 建立 LIFO cleanup 栈，聚合动画、文本和临时样式恢复错误，保证中途异常仍执行所有 cleanup。
- [x] 实现 CJK 行边界测量和临时换行，先处理 CSS 空白折叠，再写入视觉换行。
- [x] 将换行策略暴露为默认 `auto`、可选 `off` 的 adapter 配置，并保证 `off` 不触发测量或 DOM 修改。
- [x] 为每个临时修改返回 cleanup，并用 `try/finally` 恢复 text content、inline style 和临时属性。
- [x] 用混排夹具验证不会重复显式换行、不会把源码缩进转换成可见换行，也不会把 cleanup 留在页面上。
- [x] 覆盖自动检测的正例、跳过条件和显式关闭路径，记录测量节点数与跳过原因。
- [x] 覆盖字体永不 ready、图片永不完成、提前稳定、超时 cleanup 和零等待路径，验证总耗时不会绕过配置预算。
- [x] 覆盖运行、暂停、finished、idle、转换失败、恢复失败和 `motion: "live"`，确认动画 currentTime 与原始播放状态不被重置。

## 3. 捕获编排与接入

- [x] 组装 `capture-adapter`，统一编排 motion、settle、font loader、line-break preparation、convert 和 cleanup，并返回 `ConvertResult + diagnostics`。
- [x] 将扩展 content entrypoint 的整页/元素复制改为调用 adapter，保留现有 Shadow DOM UI、尺寸计算和消息类型。
- [x] 保持剪贴板写入与 toast 在扩展 content entrypoint，验证 adapter 没有改变同步触发和用户激活链。
- [x] 让独立 `published-package-test` 使用同一套外围策略或等价测试夹具，确认发布版 API 不依赖 workspace 内部实现。
- [x] 在诊断信息中区分原始字体、fallback 字体、settle timeout、换行测量失败和剪贴板失败。
- [x] 验证字体加载失败不会在 fallback 模式下静默减少预期文本，在 strict 模式下不会生成部分成功的剪贴板结果。

## 4. 验证与文档

- [x] 运行核心包已有测试和扩展类型检查，确保未改变核心包默认行为。
- [x] 运行浏览器回归：至少检查 Auto/Absolute 两种布局、页面尺寸、文本节点恢复、剪贴板解码和控制台错误。
- [x] 运行独立发布包项目的 `npm test` 和 Playwright smoke；保留失败时的截图/trace。
- [x] 更新扩展 README，说明字体来源、权限边界、CJK 视口限制、降级策略和核心包升级检查。
- [x] 根据验证中形成的新通用约束更新 `.trellis/spec/extension/frontend/`，只记录已被代码和测试证明的规则。

## 验证命令

```powershell
pnpm --filter @figit/browser-capture-adapter check-types
pnpm --filter @figit/browser-capture-adapter test
pnpm --filter @figit/browser-capture-adapter build
pnpm --filter extension check-types
pnpm --filter extension build
pnpm --filter extension build:firefox
pnpm --filter @figit/dom-to-figma test
pnpm --filter @figit/dom-to-figma build
npm --prefix published-package-test test
pnpm lint
git diff --check
```

`pnpm lint` 的全仓扫描仍会命中工作区既有的 CRLF/Trellis 生成文件格式
诊断；本次源码范围的 adapter、extension 和 published 示例已通过定向
Biome 检查，`git diff --check` 通过。

浏览器验证记录：

- `http://127.0.0.1:4173/` 的发布包演示页已加载；
- Auto 与 Absolute 转换均已写入剪贴板；
- Auto 剪贴板已由 `fig-kiwi` 解码为 v106、306 个 node changes；
- BMR 描述文字保持约四行的浏览器排版，适配器测试确认页面 DOM 恢复；
- Latin/CJK/emoji 夹具的字体和换行结果没有未处理异常；
- Chromium MV3 与 Firefox MV2 扩展构建均通过。扩展实际整页/元素点击链和 Safari-equivalent 行为未在当前自动化环境手动执行。
- 使用最终 Chrome MV3 产物对 Heho 的 `learn-healthy-eating-2` 实际页面触发整页复制，剪贴板解码得到 1547 个 node changes、389 个文本节点、4010 个中文字符和 4874 个 glyph；无中文缺字、字体解析失败或复制失败告警。弹窗人工点击链与桌面 Figma 实际粘贴仍保留为手工验收项。
- 使用最终 Chrome MV3 产物对 `thefrontpage.dev` 回归：修复前 `Georgia 900` fallback 失败并丢失文本节点；加入本地通用 fallback 后得到 703 个 node changes、308 个文本节点，页面内 2 个阿拉伯字符均有 glyph，实际命中扩展内置 `noto-sans-arabic-400.ttf`，无字体解析、缺字、节点处理或复制错误。
- 使用最终 Chrome MV3 产物对 `siteleaf.com` 回归：页面 root 宽度为 1144px，但真实 body 内容宽度为 1361px；修复前整页入口只传 root 宽度，右侧溢出图像会被裁剪。改为由 adapter 在 settle 后测量后，Figma frame 为 1361x8591px，最大内容边界一致且无转换/复制错误。
- 使用最终 Chrome MV3 产物对 `leibal.com` 回归：页面使用 39 个开放 Shadow DOM `display-card`，文章图片不在 light DOM；修复前只有 11 个图片节点且卡片区域为空。加入 composed-tree 与 slot 投影遍历后得到 805 个 node changes、222 个文本节点和 88 个可见图片节点，剪贴板解码成功且未出现 `bottom-title-name` 字面量。桌面端隐藏的移动导航/卡片图片被按实际 `display:none` 状态跳过。

里程碑资格说明：

- 当前 workspace 的类型检查、测试、核心/adapter 构建和 Chrome/Firefox 扩展构建是里程碑门禁。
- `published-package-test` 的 `npm test` 继续作为构建 smoke，但其 `file:` adapter junction 可能解析 workspace peer，不能作为 registry `0.2.0` 的独立安装证明。
- 真正的发布兼容门禁必须把 adapter 打成 tarball，并在不含 monorepo `node_modules` 解析路径的临时项目中与指定核心版本安装、构建和运行；该工作已转交 `07-23-composed-dom-utility-package`。
- 本里程碑不发布 npm 包；它保存新架构任务开始前已经通过真实站点验证的行为基线。

最终里程碑验证（2026-07-23）：

- `pnpm check-types` 通过，覆盖 7 个 workspace package。
- `pnpm test` 通过：300 tests passed，5 skipped。
- `pnpm oracle:parity` 通过 44 个场景；报告保留既有的 14 个 `geometry.width` 观察项，但 parity gate 为通过。
- `@figit/dom-to-figma`、`@figit/browser-capture-adapter`、Chrome MV3、Firefox MV2 和 `published-package-test` build smoke 均通过。
- Firefox 构建仅报告 WXT 的 `data_collection_permissions` 提醒，没有构建失败。
- 本任务新增 adapter/Shadow DOM 测试文件的定向 Biome 检查通过，`git diff --check` 通过。
- 全仓 `pnpm lint` 仍因仓库既有 CRLF 和 Trellis/生成文件扫描产生大量格式诊断；没有将全仓历史格式化纳入本里程碑。

## Review Gates

1. 计划评审：确认私有 adapter 包的默认行为，且未把 Heho 站点逻辑或扩展权限塞进核心包。
2. 字体评审：确认来源优先级、跨源安全规则、缓存键和 fallback 可诊断。
3. DOM 评审：确认所有临时修改都有异常安全的 cleanup，并且测量只描述当前视口。
4. 兼容性评审：确认 `0.2.0` 发布包和 workspace 包都通过同一组行为断言。
5. 完成评审：通过类型、构建、浏览器回归后，再更新 spec、提交变更并结束任务。

## 风险与回滚点

- 若浏览器页面跨源字体无法获得，先保留 Fontsource/捆绑字体 fallback；不扩大权限，不阻塞所有复制。
- 若换行预处理在某类布局产生误测，可按策略开关关闭，仅回滚该节点的临时换行，不回滚字体加载器。
- 若核心包新版本改变 `FontLoader` 或 tokenizer，先锁定已验证版本，修复 adapter 兼容层后再升级。
- 若可编辑文字与视觉精度无法同时满足，默认选择可编辑文字，并在结果诊断中明确度量差异；视觉兜底另开任务。
