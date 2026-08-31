# 实施计划

## 0. Contract And Settings

- [x] 在 adapter types 中增加 `LazyActivationMode`、activation status/progress/
  diagnostics 和 additive optional settings 字段；runtime 默认规范化为 `auto`。
- [x] 在 extension shared settings 中增加 `advanced.lazyActivation`，完成旧 storage
  fallback、merge、保存默认值和 unit tests。
- [x] 更新 `PreparedCapture`/`CaptureDiagnostics` 的空诊断构造，保证 off、canvas 和
  auto 终态都有稳定 activation diagnostics。
- [x] 扩展 `CapturePhase`/`CaptureState` 的 `activating` 和 progress 合同，先固定
  phase 事件形状再接入实现。

## 1. Activation Runtime

- [x] 新增 adapter 内部 lazy activation 模块，定义 window/element scroll context 快照、
  可滚动上下文发现、主轴/横向 position planning 和 scope filtering。
- [x] 实现 `MutationObserver + 2 RAF + bounded quiet window`，所有 timer、observer、
  scroll operation 和 inventory pass 都检查 AbortSignal/deadline。
- [x] 实现 10 秒、2 pass、32 container、64 step 的默认预算，以及稳定 revision 提前
  结束和 budget/timed-out diagnostics。
- [x] 实现 `try/finally` 滚动恢复，覆盖 success、cancel、target lost、conversion 前
  异常和恢复失败；不永久修改页面 style/DOM。
- [x] 为 canvas target 返回 not-applicable，为 closed Shadow DOM/cross-origin iframe
  保留明确不可见边界。

## 2. Capture Engine Integration

- [x] 在 `executeStart()` 前置 auto activation；只在 start 后滚动，不能在 analyze/review
  阶段改变页面状态。
- [x] activation 期间发出 `activating` phase/progress，并把用户取消连接到当前
  session AbortController。
- [x] auto activation 完成后把最终 inventory/analysis/diagnostics 写入 session，避免
  预期的 resource-set change 再次要求 review；off 路径保持现有 revalidation。
- [x] 确保最终 inventory 完成后才进入现有 image scheduler、font preflight、settle 和
  conversion；验证 converter 不会看到未 staging 的 source。
- [x] 增加 engine browser tests：phase ordering、new node/source revision、dedupe、
  restore/cancel/timeout、off no-scroll、canvas no-op。

## 3. Extension Workspace And UI

- [x] `content/convert.ts` 将 advanced activation mode 传给 adapter；typography spec
  adapter 明确使用 `off`。
- [x] `workspace-controller.ts` 接入 engine settings、`activating` view、busy guard、
  cancel 和 progress 快照；保持旧 session/stale event 防护。
- [x] `app.tsx` 在 Advanced settings 增加 auto/off 控件，显示 activation progress 和
  稳定的 budget/restore 文案；不增加第二个 capture action。
- [x] 更新 workspace/controller/UI tests，覆盖旧设置、保存 defaults、phase mapping、
  cancellation、element/page scope 和 output flow 未被激活阶段污染。

## 4. Regression And Browser Validation

- [x] 增加 fixture：scroll event 激活 `data-src`/`src`、style background、异步 DOM node、
  nested scroller、sticky/fixed element、virtualized removal 和 infinite growth。
- [x] 对 eyeondesign 做从初始 scroll 位置开始的一次 page capture，确认真实图片进入
  payload、初始 scroll state 恢复、activation diagnostics 可解释。
- [x] 对 element capture 做选中目标附近 activation，确认不遍历无关 page sibling；对
  `off` 做行为对照。
- [x] Chrome MV3/Firefox MV2 手工 smoke：capture、cancel、timeout/budget、restore、
  image retry/placeholder、clipboard 输出和 extension UI。

## 5. Verification Commands

```powershell
pnpm --filter @figit/browser-capture-adapter test
pnpm --filter @figit/browser-capture-adapter check-types
pnpm --filter extension test
pnpm --filter extension check-types
pnpm --filter extension build
pnpm --filter extension build:firefox
pnpm check-types
git diff --check
pnpm upstream-adapter:stable
pnpm upstream-adapter:main
pnpm oracle:parity
```

若仓库级 lint 继续被既有 `.tmp` 配置文件阻塞，必须单独运行并审查所有触及文件的
Biome 检查，不把无关配置错误归因于本任务。

## Review Gates

1. Settings gate：旧 settings 缺字段默认为 auto，auto/off 经过 extension -> adapter
   -> engine 全链路，保存 defaults 和 draft 行为不变。
2. Activation gate：window/嵌套 contexts 有界遍历，2 RAF + quiet window，预算和
   AbortSignal 生效，所有路径恢复滚动状态。
3. Inventory gate：activation 后最终 inventory 取代初始计划，新增 source 全部在
   image staging 前准备，conversion 无 late fetch。
4. UX gate：独立 activating phase 可见、可取消、不可重复 start，budget/restore 状态
   文案不冒充图片失败。
5. Compatibility gate：core 未改动时 upstream adapter stable/main、oracle parity
   通过；若 core 被触及，先补 upstream registry 和 consumer review。
6. Live gate：eyeondesign 单次 page capture 输出真实图片，element scope 不扩大，off
   模式保持旧行为，Chrome/Firefox scroll restoration 均通过。

## Risky Files And Rollback Points

- `internal/browser-capture-adapter/src/types.ts`、`capture-engine.ts`、`capture-adapter.ts`
  和新 lazy activation module：phase/settings/cleanup contract 变化集中在这里。
- `apps/extension/shared/capture-settings.ts`、`content/convert.ts`、
  `content/workspace-controller.ts`、`content/app.tsx`：settings 和 UI 映射变化。
- 发生 scroll state 泄漏时，立即保留 `off` mode 并禁用 auto runtime，不删除 finally
  restore 或改为无限等待。
- 发生虚拟列表结果不完整时，保留明确 diagnostics 和 scope 限制，不扩大到网络代理、
  DOM mutation 或框架私有 loader。
- 任何 core 文件变化都必须在同一开发批次停止并完成 upstream delta 评估；不能把
  core 修改混入 adapter activation commit。

## Atomic Commit Boundaries

1. `feat(adapter): add bounded lazy activation contracts`
2. `feat(adapter): activate and re-inventory lazy resources`
3. `feat(extension): expose lazy activation settings and phase`
4. `test(extension): cover browser lazy activation regression`
5. `docs(task): record activation compatibility and verification`

提交可以合并为一个 review change，但每组边界必须保持可独立审查，不混入 `.figit`、
无关 DOM-to-Figma 或生成 artifact 变更。

## Definition Of Ready For Development

- [x] Page/element activation scope and nested scroll traversal are decided.
- [x] Initial scroll restoration before final inventory/conversion is decided.
- [x] Ten-second bounded budget, quiet-window rule and stop semantics are decided.
- [x] `lazyActivation: "auto" | "off"` settings contract is decided.
- [x] Independent `activating` phase/view and cancellation semantics are decided.
- [x] Core ownership boundary and upstream compatibility rule are defined.
- [x] User reviews `prd.md`, `design.md` and `implement.md` and approves development.
- [x] `task.py start` is run only after planning approval.

## Verification Results

- Adapter: 14 test files / 77 tests passed; type-check, package lint, and build
  passed.
- Extension: 7 test files / 35 tests passed; type-check, Chrome MV3 build, and
  Firefox MV2 build passed.
- Workspace type-check, stable adapter compatibility, upstream-main adapter
  compatibility, oracle parity (52 scenes), and `git diff --check` passed.
- This task did not modify `packages/dom-to-figma`; lazy activation remains
  adapter-owned, so no upstream core delta registry entry is required.
- Live page evidence is recorded in
  `research/live-eyeondesign-smoke.md`.
- Repository-wide `pnpm lint` remains blocked by the pre-existing nested root
  configs in `.tmp/lint-validation-20260726/biome.jsonc` and
  `.tmp/upstream-image-loader-cancellation/biome.jsonc`; all 14 touched source
  files pass a directed Biome check.
- Chrome/Firefox loaded-extension manual smoke passed on 2026-08-01, as
  confirmed by the user.
