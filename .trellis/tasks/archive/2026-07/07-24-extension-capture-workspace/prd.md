# 页面内捕获工作区与设置

## Goal

让用户点击浏览器工具栏图标后，直接在当前页面内进入一个可恢复的捕获工作区，在同一浮窗中完成目标选择、配置、资源确认、阶段观察和失败处理。

## Requirements

- 本子任务依赖 `07-24-staged-resource-pipeline` 已评审的项目自有捕获端口；UI、设置和控制器不得 import `@figit/dom-to-figma`。
- 移除现有 default popup。点击扩展工具栏图标必须由 background `action.onClicked` 向当前 tab 发送打开/恢复命令，不自动开始捕获。
- 普通页面显示既有 content-script Shadow DOM 内的非模态工作区；受限页无法注入时必须显示明确的扩展自有反馈，不能静默失败或新增宽泛权限。
- 工具栏重复点击只打开、聚焦或恢复，不切换关闭。关闭、最小化和取消是工作区内三个不同命令。
- 空闲页提供整页捕获、选择元素、打开 `.figit` 三个入口；本子任务为打开文件和输出提供 UI/控制器接入点，文件协议与 sink 由 `07-24-figit-capture-artifact` 实现。
- 面板固定在右上：top/right 16px、目标宽度 380px、max-height 为视口减 32px并内部滚动；窄视口宽度为视口减 32px，不支持拖拽、resize 或位置持久化。
- Shadow host 继续不拦截页面指针，只有面板和明确交互控件接收事件；面板不得意外进入捕获结果。
- 元素选择开始时面板自动最小化，完成后回到分析结果，取消后回到空闲/原状态；picker 必须排除扩展 UI 自身。
- 运行中可最小化为右下角稳定尺寸的进度按钮，点击后恢复同一 session；隐藏或恢复不得重启任务。
- 基础设置仅展示图片处理默认值、字体模式和剪贴板/本地文件出口；至少选择一个出口，默认仅剪贴板。
- 折叠高级设置仅展示布局 `auto|absolute`、动效 `freeze|live`、CJK 换行 `auto|off`、稳定等待时间；默认分别为 auto、freeze、auto、5000ms，0 表示跳过并设受控上限。
- Shadow DOM、trace、图片并发、超时、内存阈值和内部重试不得成为用户设置。
- 全局默认使用版本化的扩展 `storage.local` 记录，并且只有用户点击“设为默认”才写入；当前面板编辑不会自动覆盖默认值。
- 分析计划、当前设置、阶段进度、失败集合、ready 结果和面板显示状态只存当前标签页内存；隐藏/恢复保留，导航、刷新、关闭或扩展失效清除。
- 捕获控制器必须根据引擎事件显示图片节点数、唯一资源数、unsupported CSS 数、资源体积、已完成/总量、失败数和已耗时，不显示虚假 ETA。
- 分析页让用户明确选择处理或跳过图片；唯一资源集合变化时要求重新确认，只有引用计数变化时更新并继续。
- 图片失败页提供仅重试失败、占位继续、取消；64 MiB 软限制提供继续、剩余占位、取消；128 MiB 硬限制不提供继续处理。
- 严格字体失败页提供重试、切换 compatible、取消；成功阶段自动前进，但最终输出必须等待用户显式点击。
- controller 保留已准备结果与各 sink 状态，使单个输出失败后可以只重试该输出而不重新捕获；具体 sink 执行由捕获包子任务提供。
- 所有新增 document/window/background 消息监听器必须跟随 content context 或组件生命周期清理；过期 session 事件不得更新当前界面。

## Acceptance Criteria

- [ ] Chromium 普通网页点击工具栏图标直接显示页面内工作区，不出现 popup，也不自动分析或复制。
- [ ] 再次点击工具栏会恢复已关闭/最小化的现有 session；不会把打开的工作区切换为隐藏。
- [ ] 受限页面点击后获得清晰反馈，background 不出现未处理的 sendMessage/injection 异常。
- [ ] 空闲页可进入整页分析、元素选择和打开捕获包流程；picker 完成/取消均回到正确状态。
- [ ] 桌面与窄视口下浮窗不越界、内容可滚动，面板外页面仍可点击；进度按钮和面板不会因文案变化跳动。
- [ ] 捕获进行中最小化、恢复和工具栏再次打开都保留同一 session id、进度与失败集合。
- [ ] 基础/高级设置只包含已确认选项；零出口不能提交，首次使用默认仅剪贴板。
- [ ] 临时设置不会写入 storage；点击“设为默认”后，新标签页读取新值，当前 session 保持其有效设置快照。
- [ ] 刷新/关闭清除临时计划和 ready 结果，storage 中不存在站点资源清单、自动历史或来源 URL。
- [ ] 分析页同时显示图片节点数、唯一资源数和 unsupported CSS 数，并在资源集合变化时回到确认。
- [ ] 图片、内存和严格字体的每个恢复动作都映射到引擎的单一合法命令；按钮连点不能启动并行重复阶段。
- [ ] 阶段 UI 显示真实 completed/total、failed、elapsed 和 MiB，不显示 ETA；完成后进入 ready-to-output 而非自动访问剪贴板/下载。
- [ ] 使用 fake engine 的 reducer/controller 测试覆盖空闲、选择、分析、复核、各阶段、恢复、ready、部分输出成功、失败和取消。
- [ ] content UI 不出现在捕获结果中，所有 listener/observer 在卸载或 session 替换时清理。
- [ ] `extension` 类型检查、Chromium 构建与 Firefox 构建通过，并完成至少一个普通页面和一个开放 Shadow DOM 页面手工 smoke。

## Dependencies And Ownership

- 阻塞依赖：`07-24-staged-resource-pipeline` 的捕获端口、事件与规范化结果完成评审。
- 集成依赖：`07-24-figit-capture-artifact` 提供打开、校验和 sink 实现后，接入本任务预留的 ready/output 控制器接口。
- 主要所有权：`apps/extension/entrypoints/content`、工具栏 action 路由、面板状态与设置模块。
- 本任务不定义 `.figit` 文件字节格式，不实现上游转换器或资源处理算法。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
