# 实施计划

## 1. 锁定 Typography Contract

- [x] 在 adapter 定义 TypographyToken、TypographyUsage、TypographyInspection。
- [x] 引入 standards-aware CSS family-list parser，覆盖 quoted family、逗号 family、generic family。
- [x] 明确 normal/px 的 line-height 与 letter-spacing 归一化和稳定 key。
- [x] 补充隐私测试，确保 inspection 不暴露原文、URL 或 font bytes。

## 2. 实现 Adapter Inspection

- [x] 新建 typography inventory 模块，复用 composed DOM 遍历和 exclusion 规则。
- [x] 聚合完整 token、文本节点 usage count 与目标 code points。
- [x] 复用 font resolver preflight，将 exact/fallback/failed diagnostic 关联到 token。
- [x] 在 BrowserCaptureAdapter 暴露 inspectTypography，不改变 CaptureEngine 既有方法语义。
- [x] 添加 unit/browser tests：范围、Shadow DOM、extension UI 排除、去重、排序、empty、failed。

## 3. 构建 Extension Font Spec Port

- [x] 新建纯数据到 DOM 的 typography report builder。
- [x] 实现 header、摘要、表头、token 行、固定 Latin/CJK specimen 和 empty state。
- [x] 添加稳定排版与文本换行约束，确保长 family stack 不溢出。
- [x] 创建离屏临时 DOM host，并在 finally 清理。
- [x] 用独立 adapter capture report root，复用现有 clipboard writer。
- [x] 验证 report root 不会进入 source inventory，也不影响页面 DOM after completion/failure。

## 3A. 收敛说明板展示聚合

- [x] 新增纯函数 projection：Font resolution、Core styles、Rare variants。
- [x] Font resolution 排除 size/line-height/letter-spacing，映射只展示一次。
- [x] Core style 按 family/weight/style/size/resolution 聚合，并完整保留 metrics variants。
- [x] 使用聚合 usage 阈值 `>= 2` / `= 1` 区分 Core 与 Rare，不做 Top-N 截断。
- [x] 改造 report DOM，Rare 行不重复 specimen，并添加高碎片页面回归测试。

## 4. 接入 Review UI

- [x] WorkspaceController 保存独立 font-spec running/success/failed state 和 copyFontSpec command。
- [x] ReviewView 增加次级 Copy typography spec 按钮，与 Start capture 并列。
- [x] 运行期间禁用冲突操作；成功/失败后仍停留 Review，可重复执行。
- [x] 更新 controller tests，覆盖 target passthrough、并发锁、重试和普通 capture state 不变。
- [x] 更新 extension README/操作文案。

## 5. Figma Output Verification

- [x] browser test 解码/检查单一 Typography root frame 和可编辑 TEXT。
- [x] 断言 title + hostname，不含 path/query/hash。
- [x] 断言完整 token、resolved mapping、status、usage count 与固定 specimen。
- [x] 断言 exact/fallback/failed 和 empty inventory。
- [x] 真实 Figma 粘贴 smoke 检查布局、编辑性、长文本换行与无溢出。
- [x] 确认现有网页 capture payload 在未触发新按钮时无变化。

## Validation Commands

```powershell
pnpm --filter @figit/browser-capture-adapter test
pnpm --filter @figit/browser-capture-adapter check-types
pnpm --filter @figit/browser-capture-adapter build
pnpm --filter @figit/dom-to-figma test
pnpm --filter @figit/dom-to-figma check-types
pnpm --filter extension test
pnpm --filter extension check-types
pnpm --filter extension build
pnpm --filter extension build:firefox
pnpm check-types
pnpm exec biome check <changed-files>
git diff --check
```

若修改通用 converter 的 geometry、text measurement 或 Kiwi schema，追加 `pnpm oracle:parity`；按当前设计不应触发。

## Risky Files And Rollback Points

- `internal/browser-capture-adapter/src/font-resolver.ts`：避免再次复制 font request 解析；inventory 应共享规范化 helper。
- `internal/browser-capture-adapter/src/capture-adapter.ts` / public types：inspection 必须是加法契约。
- `apps/extension/entrypoints/content/workspace-controller.ts`：font-spec state 不得污染 capture/output state machine。
- `apps/extension/entrypoints/content/convert.ts`：临时 DOM、独立 adapter 与 clipboard cleanup。
- `apps/extension/entrypoints/content/app.tsx`：Review 按钮状态与文案。

## Review Gate Before Start

- [x] 用户确认独立按钮、独立 clipboard 输出，不附加到普通网页 capture。
- [x] 用户确认完整 typography token，不包含文字颜色。
- [x] 用户确认复用当前选择范围，选择 body 才分析整页。
- [x] 用户确认只显示 document title + hostname，不显示完整 URL。
- [x] 用户确认按钮位于 Review 面板，与 Start capture 并列。
- [x] 用户审阅 prd.md、design.md、implement.md 并批准后续新会话进入实现；本会话不运行 `task.py start`。
