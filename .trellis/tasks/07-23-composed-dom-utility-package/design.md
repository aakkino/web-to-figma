# 技术设计

## 目标架构

`@figit/composed-dom` 只描述浏览器中的树结构。它不理解 Figma、扩展权限、字体或网络：

```text
                    @figit/composed-dom
                       /          \
                      v            v
 @figit/browser-capture-adapter   @figit/dom-to-figma
 - settle/images/fonts/text       - walker/layout inference
 - selects composed strategy      - accepts optional strategy
                      \            /
                       v          v
                    one tree policy
```

扩展只依赖 capture adapter；adapter 创建或接收一个 tree strategy，将它同时用于捕获预处理和核心转换。核心包默认使用 light DOM，因此没有配置新策略的现有消费者保持原行为。

## Package Boundary

建议建立：

```text
packages/composed-dom/
  src/index.ts
  src/types.ts
  src/light-dom.ts
  src/open-composed-dom.ts
  src/walk.ts
  src/*.browser.test.ts
  README.md
  CHANGELOG.md
  package.json
```

推荐包名为 `@figit/composed-dom`。名称刻意限定在 composed DOM，避免承诺成为包含查询、事件、CSS 和 mutation 的通用 DOM 工具箱。

运行时仅依赖标准 DOM API，包声明 `sideEffects: false`，不依赖 `@figit/dom-to-figma`。测试使用真实 Chromium 覆盖 Shadow DOM 与 slot 行为。

## Public Contract

第一版公开面保持最小：

```ts
export interface DomTreeChild {
  readonly node: Node;
  readonly composedParent: Element;
}

export interface DomTreeVisit extends DomTreeChild {
  readonly depth: number;
}

export interface DomTreeStrategy {
  children(parent: Element): ReadonlyArray<DomTreeChild>;
  walk(root: Element): Iterable<DomTreeVisit>;
}

export const lightDomTree: DomTreeStrategy;
export const openComposedDomTree: DomTreeStrategy;
```

契约定义：

- `children()` 返回调用时的快照，不注册 observer，也不承诺后续 DOM 变化会反映在旧数组中。
- `lightDomTree` 保持 `element.childNodes` 顺序。
- `openComposedDomTree` 在存在开放 Shadow Root 时使用 shadow children 替换 host light children。
- slot 使用 `assignedNodes({ flatten: true })`；没有 assigned nodes 时使用 slot fallback children。
- `composedParent` 是消费侧用于父子关系和相对测量的扁平树父元素，不保证等于 `node.parentElement`。
- utility 返回所有节点类型；是否跳过 comment、空文本、隐藏元素或扩展 UI 由消费者决定。
- 遍历按文档/composed 顺序进行，并使用访问集合避免错误页面结构导致重复或递归环。
- closed Shadow Root 对外表现为不可访问；包只声明支持 open roots，不猜测隐藏实现。

## Core Integration

核心包不需要在默认路径中硬编码 `@figit/composed-dom`。它公开一个结构兼容的可选策略：

```ts
export interface DomTraversalStrategy {
  children(parent: Element): ReadonlyArray<{
    node: Node;
    composedParent: Element;
  }>;
}

createFigmaConverter({
  domTraversal?: DomTraversalStrategy;
});
```

默认实现位于核心包内，只返回 light DOM children。`openComposedDomTree` 通过 TypeScript 结构类型直接满足该接口；核心包因此不必依赖 utility 包。

同一个 `domTraversal` 必须沿转换上下文传递给：

- `converter/walk.ts` 的递归与 text emission；
- `converter/layout/infer.ts` 的 flow children 和 auto-layout 推断；
- 需要 composed parent 的相对坐标测量。

stacking order 仍由核心 walker 在 strategy 返回的节点上计算。图片 `currentSrc`、Figma trace、几何和 node classification 不属于 strategy。

## Adapter Integration

capture adapter 默认持有 `openComposedDomTree`，但允许测试或调用方传入策略。它使用 `walk(root)` 完成：

- 待加载图片收集；
- 字体请求文本节点收集；
- CJK 临时换行候选收集。

调用核心转换器时传入同一 strategy 的 `children` 能力，避免“资源层看 composed tree、转换层看 light DOM”或反向不一致。

adapter 不再从核心包导入 composed-tree helper。它继续把核心包声明为 peer dependency，但最低兼容版本需要调整到包含 traversal hook 的版本。

## Compatibility And Versioning

- 新 utility 在 API 冻结前使用 `0.1.x`；多消费者门禁通过后发布 `1.0.0`。
- slot 顺序、flatten 语义或 `composedParent` 定义变化属于 major change。
- 保持既定语义的浏览器兼容修复属于 patch change；新增可选遍历元数据属于 minor change。
- 核心包建议发布 `0.3.0`，以明确新增 traversal extension point；adapter peer range 调整为 `>=0.3.0 <0.4.0`。
- 只支持包根 exports，禁止 deep import，以便内部文件可重构。
- 发布兼容测试先对 adapter 执行 `npm pack`，再安装到仓库外的临时项目；不得使用会回溯到 monorepo `node_modules` 的 `file:` junction 作为隔离证据。

当前 `getComposedChildren` / `getComposedChildNodes` 尚未形成已发布契约。迁移完成后从核心公开入口移除，避免同时维护两套入口。

## Alternatives Considered

### 核心直接依赖 utility

实现最简单，但会把新的 runtime dependency 强加给所有核心消费者，也会提高上游接受补丁的成本。推荐使用结构化可选策略，保持核心无直接依赖。

### adapter 克隆或展开 Shadow DOM

可以避免核心 hook，但克隆节点无法可靠保留 computed style、自定义元素状态、slot 布局、图片生命周期和几何，因此不采用。

### 核心与 adapter 各保留一份 helper

短期改动少，但 slot 与 parent 语义会继续漂移，无法保证预处理与转换访问相同节点，因此不采用。

## Rollout And Rollback

先新增 utility 和合同测试，不切换消费者；再切换 adapter；最后给核心增加默认关闭的 strategy hook。每一步都可以独立回滚。

若 composed 模式出现站点回归，adapter 可临时切换到 `lightDomTree`；核心默认路径始终为 light DOM，因此 utility 故障不应影响未启用该能力的公共消费者。

若上游暂不接受 traversal hook，本地需要维护的补丁仅保留策略传递点，不再同时维护 composed-tree 算法。上游一旦接受该 hook，utility 和 adapter 可以独立演进而不形成核心 fork。
