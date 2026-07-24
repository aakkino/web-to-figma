# 分阶段资源管线与上游转换桥接

## Goal

把当前不可见、与 DOM 遍历交错的资源等待改造成可分析、可确认、可取消且可恢复的阶段式捕获引擎。图片必须先于字体和 DOM 转换处理，同时把 `@figit/dom-to-figma` 限制在可替换的桥接边界内。

## Requirements

- 本子任务是 `07-24-extension-capture-persistence` 的第一实现依赖；对外先交付稳定的项目自有捕获端口、状态事件与规范化结果，后续工作区和 `.figit` 不得直接依赖上游类型。
- 捕获引擎必须把分析、复核、图片准备、图片恢复、字体准备、严格字体恢复、页面稳定、DOM 转换、完成、失败与取消表示为明确状态；状态机可使用伪转换桥运行测试。
- 分析阶段不发起资源网络请求，并使用与转换一致的开放组合 DOM 遍历。
- 图片分析报告 `<img>` 节点数、按 `currentSrc || src` 去重的唯一资源数，以及单独的 CSS `background-image: url(...)` 暂不支持计数。
- 可处理来源限于 `<img>` 的 `data:`、`blob:` 与 HTTP(S) URL；其他图像来源不进入可处理总数。
- 用户确认开始时执行一次无网络复核：目标失效则失败；唯一资源集合变化则回到确认；只有引用节点数或 unsupported 计数变化则更新后继续。
- 图片阶段开始后锁定元素到资源的映射，阶段期间新增或改变的资源不加入本次计划。
- 用户选择处理图片时，所有计划内唯一图片必须先完成准备，随后才允许字体准备和 DOM 转换；用户选择跳过时不得由捕获引擎主动获取图片字节。
- 图片调度固定最多 4 个唯一资源并发、单资源 15 秒、单轮阶段 60 秒；阶段超时中止排队和进行中任务，重试失败项获得新的阶段预算。
- 进度事件至少包含阶段、已完成/总量、失败数、累计 Figma-ready 图片字节和已耗时；不得伪造 ETA。
- 图片结果按唯一资源去重缓存。重试只处理失败项，已成功项在后续转换中必须复用同一份已处理结果，不得再次请求或再次转码/哈希。
- 图片准备失败时暂停并暴露重试失败项、使用透明占位继续、取消三种决定；全部成功自动进入下一阶段。
- 主动跳过和继续失败图片时都生成透明布局占位，保留尺寸、位置、圆角、边框、透明度及 Auto Layout 子项语义，并用明确图层名区分真实图片；诊断区分 `user-skipped` 与处理失败。
- 图片累计按去重后的 Figma-ready PNG/JPEG/GIF bytes 计量。达到 64 MiB 软限制时暂停并允许继续、剩余占位或取消；达到 128 MiB 硬限制后不得开始更多图片，只允许剩余占位或取消。
- 取消使用 AbortSignal 贯穿页面直接 loader 与扩展后台 HTTP(S) 无凭据 fetch；排队任务不再开始，进行中请求被中止，迟到结果不能更新旧 session。
- 字体阶段按去重后的 `family + weight + italic` 报告进度，并提供 `compatible`、`fast-local`、`strict` 三种模式。
- `compatible` 默认允许页面/后台字体 transport 并使用内置字体回退；`fast-local` 不得发起页面或公共 CDN 字体请求；`strict` 只接受 family、weight、italic 精确匹配。
- 严格字体失败必须暂停并提供重试、切换 compatible、取消；任何模式都必须保留可编辑文字，不能依赖上游节点级吞错而静默丢失文字。
- 转换成功只向调用方返回项目自有的规范化捕获结果，至少包含精确 clipboard HTML envelope、实际设置和结构化诊断；不得返回或继承上游 `ConvertResult`。
- adapter 的公共业务类型、状态协议、诊断和结果不得导入或重新导出 `@figit/dom-to-figma` 类型；所有上游 import 集中在一个明确 bridge 边界，扩展源码不直接调用上游。
- 优先使用上游现有公开能力。只有完整图片预处理、缓存复用或透明占位无法由现有 API 保证时，才可增加窄小、可选、通用且向后兼容的公开 hook。
- 不允许深层导入、复制或 fork 上游实现。任何新增上游 hook 在未启用时必须保持 `createFigmaConverter()` 的默认行为与 payload 不变，并附 changeset、包测试和干净安装兼容验证。
- 对不具备可选 hook 的转换实现必须做能力检测并返回明确的不支持/降级诊断，不能静默退回到“图片在 DOM 遍历时才串行处理”的旧语义。

## Acceptance Criteria

- [x] 对包含重复 `src`、`srcset/currentSrc` 和开放 Shadow DOM 的夹具分析时，节点数、唯一资源数和 unsupported CSS 数量正确且无网络调用。
- [x] 开始前复核能分别覆盖目标断开、唯一集合变化、引用数变化和 unsupported 数变化；图片阶段开始后总量保持锁定。
- [x] 图片准备严格先于字体和转换事件；跳过图片时 loader 调用次数为 0。
- [x] 10 个唯一图片的调度从不超过 4 并发；单项与阶段超时均产生稳定错误码和可恢复状态。
- [x] 部分失败后重试只调用失败资源；转换阶段读取已准备缓存，不重复成功资源的网络请求、转码或哈希。
- [x] 用户取消会中止直接及后台请求，排队项不启动，旧 request/session 的迟到响应不改变当前状态。
- [x] 64 MiB 与 128 MiB 边界分别进入软暂停和硬停止；同一 URL 多节点只计一次。
- [x] 跳过或失败图片在输出中保留几何、边框、圆角、透明度与 Auto Layout 顺序，并具有 `Image (skipped)` 或等价明确名称。
- [x] compatible、fast-local、strict 三种字体模式具有行为测试；fast-local 无远程字体请求，strict 不精确时不会进入 DOM 转换。
- [x] 严格字体恢复的重试、切换 compatible、取消三条路径均有状态机测试，文字节点不会因字体错误静默消失。
- [x] 状态机和调度单元测试使用 fake bridge 即可运行，不加载 `@figit/dom-to-figma`。
- [x] adapter 的公共类型检查证明没有重新导出上游类型；仓库中除 bridge 边界和依赖装配外，扩展/adapter 业务模块不 import 上游。
- [x] 规范化结果只暴露 clipboard HTML、项目诊断和有效设置，后续消费者无需知道 Kiwi bytes、Figma document 或上游 helper 方法。
- [x] 若增加上游 hook，默认转换回归 payload 不变，旧配置继续工作，并通过核心包 test/build、changeset 和隔离安装消费测试。
- [x] Chromium MV3 与 Firefox 构建均通过，后台资源取消协议不会扩大允许的 URL scheme 或凭据范围。

## Dependencies And Ownership

- 上游：父任务 `07-24-extension-capture-persistence` 中已确认的统一需求。
- 下游：`07-24-extension-capture-workspace` 和 `07-24-figit-capture-artifact` 消费本任务稳定的状态事件与规范化结果。
- 主要所有权：`internal/browser-capture-adapter`；必要时修改 `packages/dom-to-figma` 的最小公开 hook，以及 `apps/extension` 的资源 transport/取消协议。
- 本任务不实现页面浮窗、设置存储、`.figit` schema 或最终输出按钮。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
