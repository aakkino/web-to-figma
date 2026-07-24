# 修正 DOM-to-Figma 图片适配语义

## Goal

让 `@figit/dom-to-figma` 按浏览器已经计算出的 `object-fit` 与
`object-position` 语义生成 Figma 图片节点，修复宽高比不一致时把
`contain` 图片错误当成 `FILL` 裁切的问题，同时保持 capture adapter 对具体
DOM 转换引擎的可替换边界。

## Confirmed Facts

- Portal Founder memo 的签名是完整的 `90 x 46` SVG；clone 与原始资源的
  SHA-256 一致，运行时请求返回 `200 image/svg+xml` 并可完整解码。
- 签名 `<img>` 的浏览器盒约为 `272.77 x 51.59`，computed style 是
  `object-fit: contain`、`object-position: 0% 50%`。
- 当前图片节点转换器读取 computed style 和盒尺寸，但对所有图片固定写入
  `imageScaleMode: "FILL"`。该签名因此被放大到约 `273 x 139` 后裁成
  `273 x 52`，只剩中间约 37% 的高度；本地 cover 对照已复现故障截图。
- 图片盘点、调度、预算、重试和取消位于
  `@figit/browser-capture-adapter`；最终 `<img>` 到 Figma IMAGE paint 的映射仍由
  `@figit/dom-to-figma` 内部静态分派。
- adapter 只允许 `bridges/dom-to-figma.ts` 导入上游核心包，产品状态与
  `ConversionBridge` 使用项目自有类型。修复当前核心实现不需要扩大该边界。

## Requirements

- 修复必须位于 `packages/dom-to-figma` 的图片节点/图片样式所有权边界内。
  不得把 `FigmaImagePaint`、Kiwi wire 类型或核心内部配置泄漏到 adapter 或
  extension。
- 保持 `FigmaConverterConfig`、`ConversionBridge`、`ImagePreparationPort` 和
  `PreparedCapture` 的既有调用契约；若实证发现必须改公开 API 或 Kiwi schema，
  必须返回规划阶段单独评审，不能在本任务中静默扩大范围。
- 根据元素自身 realm 的 computed style 处理全部 CSS `object-fit` 计算值：
  `fill`、`contain`、`cover`、`none` 和 `scale-down`。任何未能精确表示的组合
  不得静默退化为 `FILL`。
- 保留 `object-position` 的双轴定位。至少覆盖关键字、百分比和计算后像素长度，
  包括本次报告的 `left center`，以及 left/center/right 与 top/center/bottom 的
  代表性组合。
- `fill` 应保持拉伸语义；`contain` 应完整显示资源并保留剩余透明空间；
  `cover` 应覆盖盒并按 position 裁切；`none` 应使用固有尺寸；`scale-down`
  应在 `none` 与 `contain` 结果中选择更小者。
- 保持图片节点的 measured box、border、corner radius、opacity、effects、
  parent index 和 Auto Layout child properties。图片适配不得改变外围布局。
- 保持 staged image preparation 的一次准备、冻结 element/source 映射、失败占位
  和转换期零网络行为。同一资源被多个不同 fit/position 节点引用时可有不同
  presentation，但不得重复获取或重复执行源资源处理。
- 优先使用现有 Figma IMAGE paint scale mode/transform 表达语义。只有实证证明
  wire 表达不足时才评估派生栅格 fallback；fallback 的内存、清晰度、缓存和
  SVG 放大质量必须先回到设计评审。
- 新增最小、可提交的合成图片 fixture，不把 Portal 的签名资产复制进仓库。
  Portal 页面只作为手工回归现场。
- 这是已支持输入的视觉修正，应提供 `@figit/dom-to-figma` patch changeset；
  不应仅为该修复提升 `@figit/fig-kiwi` 版本。

## Acceptance Criteria

- [ ] 对 `90 x 46` 资源和约 `273 x 52` 图片盒的
      `object-fit: contain; object-position: left center` fixture，输出完整内容、
      左侧对齐且无裁切、放大碎片或非预期拉伸。
- [ ] 浏览器测试覆盖 `fill`、`contain`、`cover`、`none`、`scale-down`，并覆盖
      center 与至少两个非居中 position；断言 consumer-visible node/paint 字段，
      不只断言私有 helper。
- [ ] `cover` 的方形头像基线仍为覆盖裁切；默认 `object-fit: fill` 的失配宽高盒
      按浏览器拉伸，不再被当成 cover。
- [ ] 同一图片资源在两个不同 fit/position 节点中只准备一次、注册可复用图片
      bytes，同时产生各自正确的 presentation。
- [ ] 直接 loader 路径与 staged preparation 路径对同一 DOM fixture 产生相同的
      图片表现；prepared 路径转换期间 loader/process/hash 调用次数为 0。
- [ ] placeholder 节点仍无 blob，并保持原 measured geometry、样式、顺序和
      Auto Layout child properties。
- [ ] `ConversionBridge` 与 extension 源码不新增核心包类型/import；既有
      import-boundary 测试继续通过。
- [ ] reported Portal Founder memo 手工 smoke 中签名完整且左对齐，方形头像无
      回归；记录实际 viewport、浏览器和 capture 设置。
- [ ] `pnpm --filter @figit/dom-to-figma test`、`check-types`、`build` 通过，
      `pnpm oracle:parity` 无新增图片/几何回归；adapter 边界测试通过。
- [ ] 增加 patch changeset，说明修复的是图片 fit/position 视觉语义且无需消费者
      迁移。

## Out Of Scope

- CSS `background-image`、mask、video、canvas 或 replaced element 以外的图片语义。
- 扩展 UI、捕获设置、资源代理、预算或重试策略变更。
- 把 leaf image converter 提升为公开插件 API。
- 为通过 parity 而放宽几何/oracle tolerance 或直接修改生成的 oracle fixture。
- 未经新评审修改 Kiwi schema、adapter 公共 contract 或增加 extension 特定核心策略。

## Open Questions

没有阻塞性的产品问题。Figma IMAGE paint 对非居中 FIT/CROP 的精确矩阵是技术
实证问题，由实施计划的 representation gate 解决；若现有 wire 字段不足，任务
回到规划阶段而不是自行扩大契约。
