# 实施计划

## 1. 建立失败回归

- [x] 在 adapter resolver 单元测试中聚合同一样式的拉丁/CJK 字符，使用可解析但不含 CJK 的 Open Sans/Inter fixture，证明当前候选会被错误视为 exact。
- [x] 在 core 浏览器测试中增加 loader 返回 `resolvedFamily` 的场景，断言当前 payload 仍错误保留请求 family。
- [x] 为 extension 固定 catalog 抽出可纯测的变体选择逻辑，并固定 400/500/600/700、等距与 italic 降级预期。

## 2. 实现 Glyph-Aware Resolver

- [x] 扩展公开 `FontProperties` 的可选 `codePoints`，使 `collectRequests` 按样式聚合排序去重的 code point，同时避免把原始文本写入诊断。
- [x] 在 fontkit bytes 校验中加入目标 CJK/拉丁 code point 覆盖检查；空白和控制换行不作为缺字。
- [x] 让 page、transport、bundled 与 fallback 候选使用同一覆盖验证入口，保持来源优先级、缓存和失败重试行为。
- [x] 为 coverage miss 增加稳定、安全的 attempt 标签，并验证 exact/fallback/failed 与 strict 行为。

## 3. 固定 Extension Fallback Catalog

- [x] 移除依靠 `CJK_FONT_ALIASES` 命中常见 Web family 的策略，将本地 CJK catalog 作为所有未满足请求的固定 fallback。
- [x] 按每个文件的真实 name table family 声明四个变体；500/600 分别输出 `Noto Sans TC Thin Medium` / `Noto Sans TC Thin SemiBold`，不修改字体二进制。
- [x] 实现最近字重选择，等距选择较低字重；italic 降为 normal 并返回 resolved metadata。
- [x] 保留字体 bytes Promise 缓存与失败后清除缓存的行为。
- [x] 更新 extension README，删除 Noto Sans Arabic 通用 fallback 和 alias 行为描述，说明中文/拉丁范围及样式级 fallback 取舍。

## 4. 修正 Core Figma Payload

- [x] 让 core 文本请求携带排序去重的 code point，字体缓存键包含 code point 签名；在 `LoadedFont` 中保存实际 family，并更新 `loadFont` 的 family/PostScript 语义。
- [x] 让文本节点顶层 `fontName` 与 `fontMetaData` 一致使用实际 family/style/weight；精确字体路径保持不变。
- [x] 增加浏览器回归，解码或检查 consumer-visible TEXT node，确认 fallback 字体不会只停留在 metrics bytes。
- [x] 更新公开注释/README，并为 `@figit/dom-to-figma` 添加行为变更 changeset。

## 5. 集成验证

- [x] 用 `Inter` 中文/拉丁混合 fixture 运行 adapter + bridge 转换，断言文本完整、目标字符 glyph 非 `.notdef`、诊断与 payload family 一致。
- [x] 验证可获取且覆盖目标字符的页面 `@font-face` 仍为 exact，不被固定 fallback 覆盖。
- [x] 验证 400/500/600/700、350/450/550/650/800 与 italic 请求的 resolved metadata 和 payload。
- [x] 检查同一捕获内缓存复用、失败重试、strict 预检和 fast-local 行为没有回归。

## Validation Commands

```powershell
pnpm --filter @figit/browser-capture-adapter test
pnpm --filter @figit/browser-capture-adapter check-types
pnpm --filter @figit/browser-capture-adapter build
pnpm --filter @figit/dom-to-figma test
pnpm --filter @figit/dom-to-figma check-types
pnpm --filter @figit/dom-to-figma build
pnpm --filter extension test
pnpm --filter extension check-types
pnpm --filter extension build
pnpm --filter extension build:firefox
pnpm lint
git diff --check
```

本任务改变 TEXT payload 的字体字段，但不改变 geometry、布局推断或 paint；默认不要求 `pnpm oracle:parity`。若实现过程中修改文本测量、glyph positioning 或 line wrapping，则必须补跑 parity gate。

## Validation Result

- 适配层、core、extension 的测试、类型检查与构建均通过，Chrome 与 Firefox 构建均通过。
- workspace `pnpm check-types`、任务上下文校验和 `git diff --check` 通过。
- 变更文件定向 Biome 检查通过，仅报告既存 complexity/magic-number 提示。
- 仓库级 `pnpm lint -- --max-diagnostics=100` 被大量既存 CRLF 与未跟踪生成目录 `heho/` 的诊断淹没；本任务未修改这些文件，未将该仓库基线问题计为本任务失败。

## Risky Files And Rollback Points

- `internal/browser-capture-adapter/src/font-resolver.ts`：覆盖校验、聚合与缓存键最容易造成 exact/fallback 误判；先用 resolver 测试锁定再接 extension。
- `apps/extension/entrypoints/content/convert.ts`：fallback catalog 和静态资产选择；不触碰捕获/剪贴板编排。
- `packages/dom-to-figma/src/converter/nodes/text/primitives/font/loader.ts` 与 text converter：公开 loader 行为和 consumer-visible payload；单独提交测试以便回滚。
- `apps/extension/public/fonts/*`：默认不改。只有用户选择统一 family 时才允许增加可重复生成脚本并更新二进制。

## Review Gate Before Start

- [x] 用户确认 500/600 按字体文件真实 family 输出，不修改字体二进制。
- [x] 用户审阅 `prd.md`、`design.md` 和 `implement.md`，明确批准进入实现。
- [x] 运行 `task.py start 07-24-fixed-font-fallback`，确认当前会话指针不再指向 `07-24-figit-capture-artifact`。
