# 实施计划

## 0. 基线与契约冻结

- [x] 记录当前 `getComposedChildren`、slot 投影、坐标 parent 和 Leibal 回归行为。
- [x] 固定 `@figit/dom-to-figma@0.2.0` 默认 light DOM 的测试与剪贴板快照。
- [x] 确认当前 composed-tree helper 尚未发布，列出迁移后需要删除的临时公开导出。

## 1. 建立独立 Utility 包

- [x] 创建 `packages/composed-dom`，配置 ESM、类型声明、构建、Vitest browser 和定向 Biome。
- [x] 定义 `DomTreeChild`、`DomTreeVisit` 和 `DomTreeStrategy` 的最小公共 API。
- [x] 实现 `lightDomTree`，严格保持 `childNodes` 顺序和父节点契约。
- [x] 实现 `openComposedDomTree`，覆盖 open Shadow Root、assigned slot、fallback slot、嵌套 slot、文本节点、去重和 iframe realm。
- [x] 编写 README、限制说明和 semver 契约，禁止 deep import。

## 2. 核心遍历策略注入

- [x] 在 `createFigmaConverter` 配置中增加可选、结构兼容的 `domTraversal`，默认实现保持 light DOM。
- [x] 将 strategy 通过 conversion context 传给 walker 和 auto-layout inference。
- [x] 使用 `composedParent` 完成元素、文本和 wrapped text 的相对测量，不把几何逻辑移入 utility。
- [x] 保留 stacking order、classification、trace、图片 `currentSrc` 和 Figma node conversion 的核心所有权。
- [x] 删除核心包中尚未发布的 composed-tree helper 导出与重复实现。
- [x] 添加默认模式不变和显式 composed 模式的浏览器回归测试。

## 3. Capture Adapter 迁移

- [x] 让 adapter 依赖 `@figit/composed-dom`，默认选择 `openComposedDomTree`。
- [x] 用 strategy walker 替换页面等待、字体扫描和 CJK 换行中的手写递归。
- [x] 将同一 strategy 注入核心 converter，确保预处理与转换节点集合一致。
- [x] 移除 adapter 对核心 composed-tree helper 的导入。
- [x] 更新 adapter peer dependency 与兼容性说明。

## 4. 跨包验证

- [x] 验证 light DOM、open shadow、默认/命名 slot、fallback、嵌套 slot、重复分配保护和 iframe realm fixture。
- [x] 验证核心默认 payload/snapshot 与基线一致。
- [ ] 回归 Leibal、Heho、thefrontpage 和 Siteleaf 真实站点；上一字体适配任务的结果保留为本次重构前基线。
- [x] 回归发布包示例：`npm test`、Playwright clipboard smoke、无 console/HTTP/资源错误。
- [x] `npm pack` utility/core/私有 adapter，并在仓库外干净临时项目中安装待发布 `0.3.0` 核心 tarball，验证构建和浏览器运行时解析均不回落到 workspace。
- [x] 构建 Chrome MV3 与 Firefox MV2；Firefox 仅有 WXT 的 data-collection reminder。
- [x] 检查依赖图、包根 exports、无循环依赖和 utility 零运行时依赖。

## 5. 文档与发布准备

- [x] 更新 dom-to-figma、capture adapter 和 extension 架构文档。
- [x] 添加 utility changelog 与 `0.1.x -> 1.0.0` API 冻结门禁。
- [x] 明确 core/adapter/utility 兼容矩阵和升级检查步骤。
- [x] 评审并保留最小结构化 traversal hook，避免核心维护第二套 composed-tree 算法。

## 验证命令

```powershell
pnpm --filter @figit/composed-dom lint
pnpm --filter @figit/composed-dom check-types
pnpm --filter @figit/composed-dom test
pnpm --filter @figit/composed-dom build
pnpm --filter @figit/dom-to-figma check-types
pnpm --filter @figit/dom-to-figma test
pnpm --filter @figit/dom-to-figma build
pnpm --filter @figit/browser-capture-adapter check-types
pnpm --filter @figit/browser-capture-adapter test
pnpm --filter @figit/browser-capture-adapter build
pnpm --filter extension check-types
pnpm --filter extension build
pnpm --filter extension build:firefox
pnpm test
npm --prefix published-package-test test
git diff --check
```

全仓 `pnpm lint` 仍需执行并区分本任务问题与仓库既有 CRLF/Trellis 生成文件诊断；本任务改动文件必须通过定向 Biome。

## Review Gates

1. API gate：utility 公共面只表达树语义，不包含 Figma、字体、网络或扩展能力。
2. Compatibility gate：核心默认模式的 payload 与快照保持不变。
3. Consistency gate：adapter 预处理和核心转换使用同一 strategy。
4. Browser gate：Shadow DOM/slot fixture 与四个真实站点回归通过。
5. Release gate：版本范围、README、changelog 和升级矩阵完成后才允许发布稳定版。

## Risky Files And Rollback Points

- `packages/dom-to-figma/src/converter/walk.ts`：遍历顺序、GUID 和父子关系风险最高；默认策略快照是首要回滚门禁。
- `packages/dom-to-figma/src/converter/layout/infer.ts`：strategy 与 walker 不一致会产生错误 auto-layout；必须成对切换。
- `internal/browser-capture-adapter/src/font-resolver.ts` 与 `text-line-breaks.ts`：节点集合变化可能影响诊断和临时 DOM cleanup。
- utility 切换可以按消费者逐个回滚；核心默认 light DOM 路径不得依赖 composed strategy 才能运行。
