# 抽取稳定的 Composed DOM Utility 包

## Goal

将开放 Shadow DOM 与 slot 投影遍历抽取为独立、版本化的浏览器 DOM tree utility，并通过可选遍历策略降低 `browser-capture-adapter` 与 `dom-to-figma` 核心的耦合。

完成后，页面资源等待、字体扫描、文本预处理和 DOM-to-Figma 转换应共享同一套浏览器树语义；上游核心包升级时，本地需要维护的改动应收敛到一个向后兼容的遍历策略注入口。

## Confirmed Facts

- 当前未发布的 Shadow DOM 修复直接修改了 `packages/dom-to-figma` 的遍历、布局推断和公开入口。
- `internal/browser-capture-adapter` 的页面等待、字体扫描和换行预处理目前从 `@figit/dom-to-figma` 导入 composed-tree helper。
- `@figit/dom-to-figma` 当前版本为 `0.2.0`；`@figit/browser-capture-adapter` 当前为私有 `0.0.0` workspace 包。
- Leibal 回归证明 open Shadow Root 与 slot 投影是通用捕获需求；closed Shadow Root 无法通过标准页面 API 可靠读取。
- 原字体适配任务要求核心默认行为向后兼容，因此新方案不能让普通消费者被迫切换到 composed-tree 语义。

## Requirements

- 建立一个只依赖标准浏览器 DOM API 的独立包，建议目录为 `packages/composed-dom`、包名为 `@figit/composed-dom`。
- 包必须提供普通 light DOM 与开放 composed DOM 两种稳定遍历策略，并明确节点顺序、slot assigned/fallback 内容和 composed parent 的契约。
- 包不得依赖 Figma wire format、`@figit/dom-to-figma`、WXT/WebExtension API、网络 transport、字体解析或剪贴板。
- 遍历实现必须兼容不同 Window/iframe realm，不能依赖主窗口的 `instanceof` 判断。
- `@figit/dom-to-figma` 只增加可选的结构化遍历策略注入口，默认继续使用 light DOM，并让 walker 与 auto-layout inference 使用同一个策略。
- `@figit/browser-capture-adapter` 默认使用 open composed DOM 策略，并将同一策略用于图片等待、字体请求收集、CJK 换行预处理和转换器调用。
- Figma 坐标测量、stacking order、可见性判断和图片 `currentSrc` 选择继续由各自领域包负责，不进入 DOM utility。
- 只允许从包根入口导入公开 API，不允许消费者依赖包内深层文件。
- 对 closed Shadow Root、跨源 iframe、动态 DOM 变化和不可见节点过滤给出明确限制，不伪装为已支持。
- 提供版本策略、迁移说明和多消费者兼容矩阵，使 utility 与核心包可以独立升级。

## Acceptance Criteria

- [x] `@figit/composed-dom` 的类型检查、浏览器测试、构建和定向 lint 通过，且运行时无第三方依赖。
- [x] light DOM 策略保持 `childNodes` 顺序；open composed 策略覆盖开放 Shadow Root、命名/默认 slot、fallback slot、嵌套 slot、文本节点和去重。
- [x] `@figit/dom-to-figma` 默认配置的既有测试与剪贴板快照保持不变，新增 composed 策略必须由调用方显式启用。
- [x] walker、文本位置计算和 auto-layout inference 使用同一遍历策略，不出现父子关系或坐标空间分歧。
- [x] `@figit/browser-capture-adapter` 不再从 `@figit/dom-to-figma` 导入 `getComposedChildren` 或 `getComposedChildNodes`。
- [x] 页面稳定化、字体扫描、换行处理和转换对同一 fixture 访问相同的 composed descendants。
- [x] Leibal 回归继续捕获 39 个开放 Shadow DOM card 的可见内容，不重新出现大面积空白或未分配 light-DOM 字面量。
- [x] Heho、thefrontpage、Siteleaf、发布包示例以及 Chrome MV3/Firefox MV2 构建继续通过。
- [x] 依赖图不存在循环，核心包默认消费者不需要安装扩展 runtime 或 capture adapter。
- [x] 私有 adapter 以 tarball 安装到不含 monorepo 解析路径的临时项目后，能与声明支持的精确核心版本完成构建和浏览器 smoke，不再依赖 `file:` junction 作为发布兼容证据。
- [x] README 和 changelog 明确 semver、浏览器运行条件、closed Shadow Root 限制和升级验证方式。

## Out of Scope

- 读取或破解 closed Shadow Root。
- 将 composed DOM 克隆成临时 light DOM，或永久修改被捕获页面。
- 在 utility 中执行资源等待、字体 fallback、布局测量、CSS stacking、可见性过滤或 Figma 节点生成。
- 跨源 iframe 内部 DOM 捕获。
- 在本任务中公开发布 `@figit/browser-capture-adapter`。

## Open Question

- utility 是先以 `0.1.x` 在 workspace 内验证后发布 `1.0.0`，还是完成本任务后直接承诺公开 `1.0.0` API？推荐先内部验证 `0.1.x`，通过多站点和多消费者门禁后再发布 `1.0.0`。

## Notes

- 该任务是当前字体捕获适配任务中发现的后续架构工作；创建任务不代表批准实现。
- 当前 composed-tree 核心改动尚未作为稳定公共 API 发布，因此迁移期间可以在不产生外部破坏的前提下调整其导出位置。
