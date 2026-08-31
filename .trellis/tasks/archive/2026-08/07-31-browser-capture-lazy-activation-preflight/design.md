# 技术设计

## 设计目标与边界

本任务只扩展浏览器捕获 adapter 和 extension workspace 的 capture preflight。它复用
已有的 composed DOM、resource inventory、image scheduler、font preflight 和 bridge
context，不修改 `@figit/dom-to-figma` 的背景语义，也不引入页面脚本注入、网络代理或
新的 WebExtension 权限。

核心约束是：滚动可以触发页面已有的懒加载运行时，但资源发现和准备仍必须回到现有
冻结 inventory；conversion 只能读取已经 staged 的 source。

## Capture Flow

当前流程在 `analyze -> review -> start` 之间保留 review，不在用户点击 page/element
入口时滚动页面。activation 只发生在用户确认 start 后：

```text
analyze target
  -> review
  -> start
     -> lazyActivation=off: revalidate existing plan
     -> lazyActivation=auto:
          snapshot scroll contexts
          bounded activation traversal
          restore initial scroll contexts
          settle restored layout
          final inventory
     -> image staging
     -> font preflight
     -> normal settle
     -> conversion
```

auto 模式下 activation 产生的新资源是预期结果，不应触发旧的
`resource-set-changed -> review` 中断；engine 直接把最终 inventory 更新到当前 session。
off 模式继续沿用现有 revalidation 行为。

## Contracts

### Settings

adapter 增加可选的 source-compatible 字段：

```ts
type LazyActivationMode = "auto" | "off";

type CaptureSettings = {
  // existing fields...
  lazyActivation?: LazyActivationMode;
};

type BrowserCaptureAdapterOptions = {
  // existing fields...
  lazyActivation?: LazyActivationMode;
};
```

engine 在 merge 时把缺失值规范化为 `"auto"`，因此既有直接使用 adapter 的调用者
不需要立即增加字段；prepared settings 在 runtime 中始终带有有效的模式。

extension 的 project-owned settings 增加：

```ts
advanced: {
  // existing fields...
  lazyActivation: "auto" | "off";
}
```

旧 storage 缺少该字段时按 `auto` 读取。UI 使用现有 Advanced settings 的 binary
control；draft、显式 Save defaults、controller 到 engine 的映射共享现有 settings
normalizer，不新增平行配置。

### Activation Progress And Diagnostics

activation 不在 diagnostics 中保存页面文本、第三方脚本内容或 activation 自己的原始
URL。建议的 project-owned shape 为：

```ts
type ActivationStatus =
  | "off"
  | "not-applicable"
  | "completed"
  | "budget-exhausted"
  | "timed-out"
  | "canceled"
  | "target-lost"
  | "restore-failed";

type ActivationProgress = {
  pass: number;
  maxPasses: number;
  step: number;
  maxSteps: number;
  containersVisited: number;
  elapsedMs: number;
};

type ActivationDiagnostics = {
  mode: "auto" | "off";
  scope: "page" | "element" | "canvas";
  status: ActivationStatus;
  passes: number;
  scrollSteps: number;
  containersVisited: number;
  discoveredNodes: number;
  discoveredResources: number;
  elapsedMs: number;
  restored: boolean;
  errors: ReadonlyArray<string>;
};
```

`CaptureDiagnostics.activation` 在 runtime 中始终生成，但在 public type 上保持 additive
optional 以减少既有 consumer fixture 的 source break。`CaptureState` 增加可选的
`activationProgress`，用于 `activating` phase 的 UI；完成后保留最终 diagnostics。

`ActivationStatus` 是停止原因，不等于 image failure：budget/time limit 后仍可继续
现有 inventory 的 staging；只有 abort、target lost 或不可恢复的 restore 错误才沿用
既有 cancel/failure 语义。

## Activation Engine

新增 adapter 内部模块 `lazy-activation.ts`，不导出页面站点知识。它接收 target、当前
inventory、dom traversal、isExcluded、mode、预算和 AbortSignal，返回最终 inventory
以及 activation diagnostics。

### Scope And Context Discovery

- page target：包含 document/window 主滚动上下文，以及 `openComposedDomTree` 在 root
  范围内发现的可滚动 element。
- element target：包含 window、从 target 向 document 祖先链上的可滚动 element，以及
  target 子树内的可滚动 element；不扫描无关页面 sibling。
- canvas target：返回 `not-applicable`，不滚动、不改变现有 canvas capture 语义。
- 可滚动 element 需要满足 connected、未被 `isExcluded` 排除、computed
  `overflow-x/y` 为 `auto`/`scroll`/`overlay` 中可用的值，并且对应 scroll size 大于
  client size。CSS `hidden` 不因有溢出就被强行打开。
- extension shadow host 必须通过已有 `isExcluded` 规则排除；open Shadow DOM 和
  assigned slot 由同一 composed traversal 处理，closed Shadow DOM/跨源 iframe 不
  进入 context list。

每个 context 保存原始 `scrollTop`/`scrollLeft`；window 额外保存 `scrollX`/`scrollY`。
保存顺序与恢复顺序相反，恢复操作位于 activation 的 `finally`，覆盖 success、budget、
timeout、cancel、target lost 和 conversion 前异常。

### Position Planning

每个 context 只规划有界位置：起点、终点以及按 scrollport 主轴尺寸计算的中间位置；
存在水平溢出时对 carousel 等容器增加水平位置。位置使用直接 scroll state 设置，
不调用站点内部函数；不依赖 `scrollIntoView` 的隐式多容器副作用。

element scope 先保证 target 所在的 window/祖先容器到达 target 可见范围，再遍历 target
子树中的可滚动上下文。page scope 遍历完整 document 主轴和 root 范围内的嵌套上下文。

默认 budget 常量：

```text
activation timeout: 10_000 ms
quiet window:      100 ms, plus 2 animation frames
max passes:        2
max containers:    32
max scroll steps:  64 total per activation
```

这些是安全上限而非完成条件。每个 scroll、timer、observer callback 和 inventory
重新扫描前后都检查 AbortSignal 和 deadline；超过任一上限停止 traversal，并保留当前
已发现资源。

### Quiet Window And Re-inventory

每次移动后执行：

1. 等待两个 `requestAnimationFrame`，让 IntersectionObserver 和布局回调获得执行机会；
2. 在最多 100ms 的 quiet window 中观察 target scope 的 `MutationObserver` 变化；
3. quiet window 结束后调用 `analyzeCaptureTarget()`，比较 resource revision、节点数、
   lazy/background layer counts 和滚动范围；
4. 更新 progress，并把新增资源计数累加到 activation diagnostics。

不等待 network idle，也不要求页面所有请求结束。页面脚本可以因为 scroll 自然启动
请求，但 adapter 不读取其网络队列，也不在 conversion 阶段补发请求。

一轮完整 context traversal 后，如果滚动范围和 inventory 没有新变化则结束；如果页面
扩展了滚动范围或新节点/source 出现，则最多再执行一轮。最终 activation pass 结束后
恢复初始 scroll state，再等待恢复后的 layout，最后重新调用 `analyzeCaptureTarget()`。
恢复使资源集合发生变化时，允许在剩余 budget 内进行一次最终评估；仍变化则结束并
记录 `resource-set-changed`/virtualization limitation，而不无限重试。

### Restore And Result

恢复成功后返回最终 inventory。恢复失败不会静默吞掉结果：若仍能得到有效 target，
继续 capture 并将 diagnostics status 标为 `restore-failed`；若 target 已断开或 abort
已发生，则沿用 target-lost/canceled 结果。activation 不负责 image bytes，所有返回
资源交给既有 image scheduler。

## Engine Integration

`executeStart()` 的改动顺序：

1. 读取 session settings 和 initial inventory。
2. `lazyActivation === "auto"` 且 target 是 element input 时进入 `activating`；page
   input 也进入 `activating`；canvas 记录 `not-applicable` 后走现有流程。
3. 通过事件更新 `activationProgress`；命令 `cancel` 复用 session AbortController。
4. activation 返回最终 inventory 后更新 `session.inventory`、analysis、diagnostics 和
   imageStage，并跳过旧的 resource-set review 中断。
5. `lazyActivation === "off"` 直接走现有 `revalidateCapturePlan()`。
6. 两条路径汇合到现有 `runImageStage -> continueAfterImages -> settleAndConvert`。

`settleAndConvert()` 保持 `waitForImages: false`。这次改动只把“页面运行时发现 source”
放到 staging 之前，不改变 converter 的 late-request 防护。

## Extension Integration

- `shared/capture-settings.ts` 增加 `CaptureLazyActivation`、default `auto`、缺字段
  normalization、patch merge 和 settings tests。
- `content/convert.ts` 的 adapter factory 把 `settings.advanced.lazyActivation` 传给
  adapter/engine；font-spec 独立 capture 使用 `off`，避免复制 typography spec 时
  滚动页面。
- `workspace-controller.ts` 的 engine settings、phase/view mapping、busy guard 和
  cancel path 增加 `activating`/`activation-progress`。
- `app.tsx` 的 Advanced settings 增加 checkbox/toggle，进度视图显示简短 activation
  状态；不增加独立“滚动加载”按钮。
- `PreparedCapture` 的 settings 和 diagnostics 通过现有 output/artifact 边界自然
  带出，不修改 `.figit` schema；artifact 任务不需要被本任务接线。

## Compatibility And Rollback

- 预计只修改 `internal/browser-capture-adapter` 和 `apps/extension`，不修改
  `packages/dom-to-figma`，因此不新增 upstream core delta registry entry。
- 如果后续确实需要 core contract，必须保持 optional、source-compatible，并在
  `docs/upstream-core-delta.json` 注册精确路径、测试、reviewBy 和 removeWhen；本任务
  不允许以 activation 需求为理由扩大 core patch。
- `auto` 运行遇到 budget/timeout 时沿用 best-effort；遇到页面副作用的用户可切换
  `off`，作为即时回滚路径。
- 若 browser smoke 发现 scroll restoration 破坏页面状态，先保留 adapter activation
  diagnostics 和 `off` 路径，禁止删除恢复逻辑或把默认行为改成无界等待。

## Test Design

- adapter unit/browser：window 和嵌套 container snapshot/restore、position planning、
  open Shadow DOM、element scope、off no-op、two-frame/quiet window、revision changes、
  max budget、abort、target lost、restore failure、virtualized removal。
- capture engine：phase sequence、auto 直接替换 final inventory、off 保持旧
  revalidation、activation 后 source 只 staging 一次、cancel 后不 conversion。
- extension settings/controller：旧 storage defaults、`auto/off` patch/save、engine
  mapping、activating view/busy/cancel、font-spec forced off。
- live browser：eyeondesign 从页面顶部单次 page capture、真实 IMAGE/pink placeholder
  对比、初始 window/container scroll 恢复、element capture 不触发全页遍历、off 模式
  行为对比；Chrome MV3 和 Firefox MV2 各执行 smoke。
