# .figit 捕获包与输出回放

## Goal

把一次已准备的捕获结果变成可验证、可回放的 `.figit` 本地文件，让剪贴板与本地保存成为共享同一 payload、可独立成功或重试的输出目的地，并让用户在处理完当前结果后无需刷新页面即可开始下一次捕获。

## Confirmed Facts

- 页面内 Shadow DOM 捕获浮窗、工具栏唤起/恢复、整页捕获、元素选择以及 `ready-to-output` / output 状态已经存在。
- 当前 ready/output 界面只提供执行或重试输出，没有返回空闲工作区的命令；工具栏再次点击只恢复同一终态，页面刷新才会销毁该 content session。
- 当前错误页有一个仅重新发起整页分析的 `Start a new capture` 按钮，但成功、部分成功、全部输出失败和 ready-before-output 状态没有等价入口，也不能从该按钮重新选择元素。
- `WorkspaceController.analyzeTarget()` 已会通过 `engineFactory` 替换捕获引擎并清空 prepared/output 临时状态，因此底层具备同页创建全新 capture session 的主要能力；缺口集中在显式终态迁移、artifact 释放和 UI 入口。
- 现有 controller 测试已证明输出与失败 sink 重试不会重新捕获，但没有覆盖连续两次捕获或终态复位。
- 2026-07-29 刷新后 `upstream/main` 仍为已审查的 `cc8d4864e6be53d0d5047fbf97283b112b3117f4`，npm latest 仍为 `@figit/dom-to-figma@0.2.1`；stable/main adapter 可执行兼容检查均通过，因此本任务无需吸收新的上游转换器变更，继续依赖项目自有 clipboard HTML 边界即可。

## Requirements

- 本子任务消费 `07-24-staged-resource-pipeline` 的规范化 clipboard HTML 结果，并接入 `07-24-extension-capture-workspace` 的 ready-to-output 控制器；schema、校验和 sink 不得 import `@figit/dom-to-figma`。
- 工作区在开始分析时把当前 `location.href`、页面标题和目标 kind/label 快照为不含 DOM 引用的宿主元数据；artifact 层只消费该普通数据快照，不从 `PreparedCapture` 猜测来源，也不接收目标 Element。
- `.figit` V1 使用 UTF-8 JSON、扩展名 `.figit`、MIME `application/vnd.figit.capture+json`。
- 顶层至少包含 `format: "figit.capture"`、整数 `version`、`createdAt`、`producer`、`source`、`settings`、`diagnostics` 和 `payload`。
- `payload.type` 为 `figma-clipboard-html`，只保存一份精确 clipboard HTML envelope 与其 SHA-256；不得重复保存 Kiwi bytes 或 base64 字段。
- checksum 以 HTML 字符串的 UTF-8 bytes 计算。打开文件时依次验证可解析 JSON、结构、受支持版本、payload 类型和 checksum，任一失败不得触碰剪贴板。
- 打开文件在读取文本前执行 256 MiB 文件大小门禁；新捕获生成的 UTF-8 JSON 也必须通过相同上限。超限以稳定错误拒绝，避免对不受信任文件进行无界读取或解析。
- schema 使用项目自有普通数据结构，并对未知附加字段保持可忽略；不序列化函数、DOM 节点、上游 document、缓存对象或上游 TypeScript 类型。
- source URL 只保留 origin + pathname，并剥离 credentials、query 与 fragment；页面标题、目标类型、创建时间、实际设置可以保留。
- diagnostics 不保存图片或字体完整 URL。需要跨记录关联时使用规范化 URL 的 SHA-256 ID、稳定错误码和汇总计数。
- clipboard HTML payload 必须原样保存，不承诺对其承载的网页内容脱敏；界面不得把外围元数据脱敏误述为整个文件已匿名化。
- V1 不压缩、不生成 `.fig`、不重新访问网页，也不在打开时再次执行 DOM 转换。
- 捕获完成后先把 `PreparedCapture` 与宿主元数据构建成不可变 `OutputArtifact`，有效文件打开后也直接得到同一 artifact 类型；只有 artifact 构建/校验完成后才进入 ready-to-output。根据出口选择提供 Copy to Figma、Save .figit 或 Copy & Save，且最终输出只在用户明确点击后执行。
- 剪贴板与文件 sink 是可组合的独立操作，共享同一个不可变 payload；不得为不同 sink 重跑分析、资源阶段或 DOM 转换。
- 文件保存优先使用当前用户点击中的 Blob + object URL + DOM download，不新增 `downloads` 权限；对象 URL 必须在触发后释放。
- 打开文件使用明确的用户文件选择入口并限制/提示 `.figit`；有效包复用相同 ready 状态，可再次复制或另存。
- 多 sink 执行必须返回逐 sink 结果。一个成功、一个失败时保留成功事实和 ready artifact，只允许重试失败 sink。
- 输出失败、用户取消文件选择或剪贴板 API 不可用时提供稳定、可理解的错误，不销毁 artifact。
- `ready-to-output` 以及输出成功、部分成功或失败终态必须提供显式 `New capture` 命令；该命令只结束当前结果会话并返回空闲工作区，不自动选择整页、元素或立即开始分析。
- 当前 artifact 尚无任何成功输出或仍有失败 sink 时，执行 `New capture` 必须先确认丢弃；所有已选 sink 都成功后直接复位，不增加重复确认。
- 新建捕获必须在不刷新页面、不重新注入 content script 的情况下清除当前 artifact、source snapshot、捕获计划/进度/诊断、错误消息和逐 sink 输出结果，同时保留已打开的浮窗、当前 draft settings 与用户已保存的全局默认。
- 下一次整页或元素分析必须使用新的捕获引擎/新 session id；旧 session 的事件、缓存、prepared result 或迟到的异步结果不得更新或污染新捕获。
- 捕获、artifact preparation 或输出正在执行时不得复位；活动捕获继续使用既有 Cancel 语义，输出完成后才允许新建捕获。
- 输出成功后不得自动复位，因为用户仍可能再次复制、另存或查看逐 sink 结果；只有明确的 `New capture` 命令销毁当前内存 artifact。
- 需要分别验证 HTTPS 与 HTTP 页面中的 clipboard 能力，以及 Chromium/Firefox 的 Blob 下载行为；能力差异应成为 sink 错误，不污染捕获状态。
- MVP 不把 `.figit` 自动写入扩展 storage，不建立最近文件列表，也不引入云同步或加密承诺。

## Acceptance Criteria

- [x] 有效 V1 对象序列化后可作为 JSON 解析，只含一份 clipboard HTML；序列化/解析往返保持 HTML 字符串和 checksum 一致。
- [x] 新捕获的 source/target 元数据来自分析开始时的普通数据快照；artifact/output 模块的公开契约不包含 `Element`、`Node` 或其他 DOM 引用。
- [x] 修改 payload 任一字符会导致 checksum 失败；畸形 JSON、缺字段、错误 format、未知 version 和错误 payload type 均被明确拒绝且剪贴板调用次数为 0。
- [x] 大于 256 MiB 的输入在 `File.text()`/JSON parse 前被 `file-too-large` 拒绝；生成超过同一上限的包不能进入 ready 状态。
- [x] source URL 中 credentials、query、fragment 被移除；诊断序列化结果不含原始图片/字体 URL，但相同规范化资源得到相同哈希 ID。
- [x] schema 与 sink 模块的依赖检查不包含 `@figit/dom-to-figma`，测试可用纯字符串 fixture 运行。
- [x] 只选剪贴板、只选文件和两者同时选择分别执行正确命令；两者同时选择时捕获/转换计数仍为 1。
- [x] Copy to Figma 写入的 `text/html` 与保存文件 payload HTML 完全一致；打开有效 `.figit` 后再次复制也一致。
- [x] 打开后再次保存保留原始 `createdAt`、producer/source/settings/diagnostics/payload 逻辑内容，不把打开时间伪装为捕获时间，也不重新构建 checksum。
- [x] Save .figit 产生正确文件名后缀和 MIME，触发下载后释放 object URL，不要求 `downloads` permission。
- [x] 一个 sink 失败时另一个成功结果不被回滚；单独重试失败 sink 不调用捕获引擎。
- [x] fresh capture 或打开的 `.figit` 进入 ready 后，以及输出成功、部分成功或失败后，浮窗都能通过 `New capture` 返回包含整页、元素选择和打开文件入口的 idle 状态，无需刷新。
- [x] 尚无成功输出或仍有失败 sink 时 `New capture` 会要求确认；所有已选 sink 都成功后直接复位，取消确认会完整保留当前 artifact 和输出状态。
- [x] 复位后旧 artifact 与逐 sink 结果不可再被执行或重试，旧 capture/source/progress/error 不再显示；draft settings、浮窗可见状态和显式保存的全局默认保持不变。
- [x] 连续两次捕获得到不同的 session id，并分别只执行一次分析/转换；旧引擎事件和旧 artifact 的迟到结果不能改变第二次捕获状态或 payload。
- [x] capture、artifact preparation 或 output running 期间 `New capture` 不可执行；成功输出不会自动清除仍可重试/再次输出的 artifact。
- [x] 用户取消打开文件返回空闲/原 ready 状态，不显示为捕获失败；损坏文件保留在错误状态供重新选择。
- [x] 扩展 storage 中不会出现捕获 payload 或自动历史记录。
- [x] HTTPS 与 HTTP 的剪贴板验证结果有记录；Chromium MV3 与 Firefox 构建/手工 smoke 覆盖复制、下载、打开、checksum 拒绝和部分失败。

## Out Of Scope

- 自动在输出成功后开始下一次捕获、批量捕获队列、捕获历史、撤销复位或恢复已丢弃 artifact。
- 在活动捕获或运行中的输出中强制复位；这些阶段继续使用现有取消、完成和重试语义。

## Confirmed Product Decision

- 当前 artifact 尚无任何成功输出或仍存在失败 sink 时，`New capture` 需要丢弃确认；所有已选 sink 都成功后直接复位。用户取消确认时不改变 artifact、逐 sink 结果或当前视图。

## Dependencies And Ownership

- 数据依赖：`07-24-staged-resource-pipeline` 的规范化结果必须提供精确 clipboard HTML、有效设置与结构化诊断；source/target 普通数据快照由扩展宿主在分析入口补充，不扩大 capture engine contract。
- UI 依赖：`07-24-extension-capture-workspace` 提供 artifact-preparing/ready/output 状态与文件入口，并把 `OutputPort` 调整为 `prepare/open -> OutputArtifact -> execute/retry`；纯 schema、codec 和 sink 可先独立实现，最终接线在工作区契约稳定后完成。
- 主要所有权：扩展内项目自有捕获包、校验、脱敏、checksum、clipboard/download 协调模块及对应输出 UI。
- 本任务不修改 DOM 转换算法、资源调度或上游 npm 包。

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
