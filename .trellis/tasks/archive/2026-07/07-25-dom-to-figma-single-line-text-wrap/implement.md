# 实施计划

## 1. Regression Baseline

- [x] 在 browser test 中加入 Portal 等价按钮：固定 `48px` 高、左右 `36px` padding、
      Inter 600、`16px`、`white-space: pre`、文本 `Join beta`。
- [x] 冻结浏览器 Range 只有一个视觉行、TEXT measured width 和当前省略
      `textAutoResize` 的失败输出。
- [x] 增加 `nowrap`、normal 单行、显式换行 `pre`、真实多行和 ellipsis 对照。

## 2. Conservative Text Auto Resize

- [x] 在 `converter/nodes/text/` 内实现 typed eligibility 判定，使用节点自身 realm 的
      computed style。
- [x] 对合格的 `pre/nowrap` 单行输出 `WIDTH_AND_HEIGHT`，其他文本维持字段缺省。
- [x] 保持 width buffer、position、font/glyph/baseline 和父布局字段不变；Auto Layout
      子文本按 live Figma 证据输出 `stackChildAlignSelf: AUTO`。
- [x] 更新原先无条件断言 `textAutoResize` 缺省的测试，使 normal 固定宽度契约仍被
      明确保护。

## 3. Regression Coverage

- [x] 覆盖 pre/nowrap 正例和 normal/multiline/ellipsis 负例的 consumer-visible 字段。
- [x] 验证按钮父 frame 尺寸、padding、文本居中和 Auto Layout child properties。
- [x] 增加最小 text oracle scene，不复制 Portal 站点资源。
- [x] 运行现有多行 baseline、CJK line-break、alignment、Auto Layout 和 font fallback
      回归测试。

## 4. Validation And Release

- [x] `pnpm --filter @figit/dom-to-figma test`
- [x] `pnpm --filter @figit/dom-to-figma check-types`
- [x] `pnpm --filter @figit/dom-to-figma build`
- [x] `pnpm --filter @figit/browser-capture-adapter test`
- [x] `pnpm oracle:parity`
- [x] `pnpm --filter extension check-types && pnpm --filter extension test`
- [x] 重建 Chrome extension，并在 Portal clone/Figma 执行真实 paste smoke。
- [x] 增加 `@figit/dom-to-figma` patch changeset并更新 rendering contract。
- [x] 运行 targeted Biome、`git diff --check`，记录仓库级 lint 的任何既有基线问题。

## Risky Files And Rollback

- `converter/nodes/text/converter.ts`：共享 TEXT 输出策略，错误条件会影响全站文本。
- `figma.text.browser.test.ts`：必须同时保护正例与负例，不能把现有多行保护改成宽泛
  auto-resize。
- `figma.autolayout.browser.test.ts`：关注子文本宽度变化是否推动父 frame。
- 回滚单位是 eligibility 判定、条件字段和对应 fixture；不回滚字体、width buffer、
  CJK line-break 或 Auto Layout 管线。

## Review Before Start

- [x] 用户评审并确认保守范围：仅 `pre/nowrap` 单行，不覆盖 normal 单行。
- [x] 用户确认 ellipsis 与显式/实际多行保持固定文本框策略。
- [x] 评审通过后再运行 `task.py start 07-25-dom-to-figma-single-line-text-wrap`。

## Verification Record

- 2026-07-25: core 18 files / 159 tests、adapter 12 files / 46 tests、extension
  7 files / 33 tests 全通过；core/extension type-check 与 core/extension build 通过。
- 2026-07-25: oracle parity 46 scenes 通过；新增 text scene 登记 1 个既有模型范围内的
  `geometry.width` finding，最大 2px。
- 2026-07-25: targeted Biome 与 `git diff --check` 通过。仓库级 `pnpm lint` 被现有
  CRLF/Trellis/JSON 格式基线阻断（75,347 errors），本任务文件无 lint error。
- 2026-07-25: live Figma 自动 paste 未执行；Desktop 插件连接正常，但 harness 缺少
  `FIGMA_STORAGE_STATE` 与 `FIGMA_FILE_KEY`。配置后重跑：
  `pnpm --filter @figit/oracle-harness run cli figma paste txt/txt-01-single-line-button --run-id text-wrap-live`。
- 2026-07-25: 用户粘贴的 live 失败实例 `92:11950` 为 `69.07 x 42`、横向 FILL、
  纵向 HUG；同一节点通过 figma-cli-go 设置 alignment INHERIT + 横纵 HUG 后变为
  `70 x 21` 单行，父按钮保持 `142 x 48`、左右 padding 36。由此补充 wire 字段
  `stackChildAlignSelf: AUTO`。两次局部截图导出均因 bridge 的 30 秒 request deadline
  超时，但结构与几何读取成功。
- 2026-07-25: 重建 Chrome MV3 扩展后再次真实粘贴。修复前节点 `94:11955` 为
  `69.07 x 42` 两行；最新节点 `95:11960` 为 `69.07 x 21` 单行，characters 保持
  `Join beta`，父按钮 `95:11956` 保持 `140 x 48`、左右 padding 36 且文本居中。
  由 figma-cli-go 读取节点结构与几何完成验收。
