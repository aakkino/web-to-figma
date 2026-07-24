# 实施计划

## 0. Representation And Regression Baseline

- [x] 增加最小非对称 SVG/PNG fixture：内容触及上下边、左右不对称，能够区分
      crop、stretch、center 与 left/right positioning；不复制 Portal 签名资产。
- [x] 在 browser test 中冻结当前报告场景的 measured box、computed fit/position、
      source hash 和错误 `FILL` 输出，确保修复前测试可稳定复现。
- [ ] 用现有 fig-kiwi decode/round-trip 与可用的 live Figma/oracle 路径验证
      `FIT`、`FILL`、`STRETCH` 和 paint transform 的真实语义。
- [x] 记录五种 `object-fit` 与非居中 `object-position` 的表示决策，包括 intrinsic
      dimensions 是否必需及 lazy staged 场景的数据来源。
- [x] Review gate：若现有 paint 字段不能精确覆盖必需矩阵，停止并更新
      `design.md`；未经评审不得修改 Kiwi schema、bridge contract、node hierarchy
      或引入 per-element raster fallback。

## 1. Image Presentation Resolver

- [x] 在 `converter/nodes/image/` 内增加 typed presentation helper，输入 computed
      fit/position、box 和必要的 intrinsic dimensions，输出验证过的 scale mode 与
      transform。
- [x] 实现 `fill`、`contain`、`cover`、`none`、`scale-down` 的穷尽分派；未知值
      使用明确、测试覆盖的浏览器默认语义，不得无条件 `FILL`。
- [x] 解析 object-position 的关键字、百分比、计算后长度和 edge offsets，保留
      fractional geometry。
- [x] 为纯 position/geometry helper 添加 Node 单元测试，覆盖正 free space、负
      free space、零尺寸和 scale-down 边界。
- [x] 若需要 prepared intrinsic metadata，在核心处理/cache 内以最小 additive
      方式提供；确保 adapter 不读取或转发核心内部字段。

## 2. Leaf Converter Integration

- [x] 将 `elementToImageNodeChange` 的硬编码 `imageScaleMode: "FILL"` 替换为
      presentation resolver 结果。
- [x] 保持 node measured size、border、corner radius、opacity、effects、blob hash、
      parent index 和 child stack fields。
- [x] 保持 placeholder 无 blob、无 presentation work，并验证 skipped node 的
      geometry/name/order 不变。
- [x] 验证一个 source 被不同 fit/position 元素引用时，源资源只准备/处理一次，
      每个节点独立输出正确 paint。
- [x] 验证 direct loader 与 staged preparation 输出一致，conversion walk 不触发
      二次 fetch/process/hash。

## 3. Browser And Parity Coverage

- [x] 扩展 `figma.image.browser.test.ts`，覆盖五种 fit、center/non-center position、
      raster/SVG、fractional box 和 lazy prepared image。
- [x] 添加 reported-shape regression：`90 x 46` 内容进入约 `273 x 52` 的
      `contain left center` 盒时完整、左对齐、无裁切。
- [x] 保留方形 `cover` 头像和历史同宽高比图片基线，防止正确场景回归。
- [x] 添加最小 image-fit oracle scene；只提交经干净 paste/capture 派生的 fixture，
      不手改 oracle JSON 或放宽 tolerance。
- [x] 运行 adapter import-boundary 与 prepared-image reuse 测试，证明替换能力和
      staged contract 未改变。

## 4. Validation And Release

- [x] `pnpm --filter @figit/dom-to-figma test`
- [x] `pnpm --filter @figit/dom-to-figma check-types`
- [x] `pnpm --filter @figit/dom-to-figma build`
- [x] `pnpm --filter @figit/browser-capture-adapter test`
- [x] `pnpm --filter @figit/browser-capture-adapter check-types`
- [x] `pnpm oracle:parity`
- [ ] 对 `http://localhost:8123/` 的 Founder memo 执行扩展 capture 手工 smoke，记录
      浏览器、viewport、settings，并同时检查签名与方形头像。
- [ ] 运行 `pnpm lint` 和 `git diff --check`，确认没有 schema、baseline 或无关
      formatting churn。
- [x] 增加 `@figit/dom-to-figma` patch changeset；仅当实际公开文档行为需要说明时
      更新 README。

## Risky Files And Rollback Points

- `packages/dom-to-figma/src/converter/nodes/image/converter.ts`：consumer-visible
  paint 行为，必须由 browser/oracle fixture 保护。
- `packages/dom-to-figma/src/converter/nodes/image/loader.ts` 与
  `converter/image-preparation.ts`：只有 intrinsic metadata 确属必要时才改，防止
  破坏缓存、预算或 abort contract。
- `packages/dom-to-figma/src/converter/types/paint.ts`：优先复用现有字段；任何新 wire
  字段触发规划回退。
- `internal/browser-capture-adapter/src/bridges/dom-to-figma.ts`：预期不改；若实现需要
  修改它，先证明不是核心内部 presentation 问题并重新评审 replaceability。
- 回滚单位是 presentation helper、leaf integration、fixture 与 changeset；不得回滚
  staged resource pipeline 或 adapter import boundary。

## Remaining Verification Blockers

- Live Figma oracle capture is not configured: `FIGMA_STORAGE_STATE` and
  `FIGMA_FILE_KEY` are missing. The connected Desktop bridge can verify the E2E
  file connection but its read API omits image fill matrices.
- The Portal Founder memo extension smoke remains pending because it requires
  the same real paste/capture path. No keyboard injection was used against the
  active Desktop plugin session.
- Root `pnpm lint` currently reports 135 repository-wide errors, primarily the
  existing CRLF formatting baseline. Targeted Biome checks for all files
  changed by this task pass; `git diff --check` passes.

## Review Before Start

- [x] 用户确认 PRD 的完整 fit/position 范围与“核心内部修复、bridge 不变”边界。
- [x] 用户确认 representation gate 未通过时应回到规划，而不是自动采用栅格化或
      schema 扩展。
- [x] 通过评审后再运行
      `python ./.trellis/scripts/task.py start 07-24-dom-to-figma-image-fit`。
