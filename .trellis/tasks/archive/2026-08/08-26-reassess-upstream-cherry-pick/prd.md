# 复审 sync 与当前 upstream 的能力差距

## Goal

以当前 `upstream/main` 与冻结的 `sync/upstream-20260726` 的完整分叉为主比较，逐项判断 upstream-only 更新是否已被 sync 本地等价实现、应在当前 fork `main` 上重新移植、无需动作、允许退役 fork 实现，或具备直接 cherry-pick 条件，并形成不混入本地产品 promotion 的受控后续计划。

## Confirmed Baseline

- 只读快照：`2026-08-26`。
- 当前 upstream：`upstream/main@859efea8d7f8330783c6c4e3e520fd673e877336`；npm `latest` 为 `@figit/dom-to-figma@0.2.4`，peeled tag 同为 `859efea8...`。
- 冻结 sync：`sync/upstream-20260726@07bbcd751c34a378caeb91b10681842f37c64b7d`。
- 共同基线：`ac830db5b89d2e8e7eede86f9419303988ae1938`。
- 拓扑：`24` 个 upstream-only commits、`109` 个 sync-only commits；`--cherry-pick` 计数仍为 `24/109`，没有 patch-ID 等价提交。
- 当前 fork 实施目标是 `main@13948d88e3ec6a0939f39d8f69ce3ef637976a68`，不是 dirty sync checkout。sync 只作为历史本地适配与产品候选的只读来源。
- 全仓 tree diff 的 `434 files / +69538 / -4865` 被大量 Trellis、extension 和产品历史放大，不能代表 upstream core 缺口；core-focused 差异必须单独解释。

## In Scope

- 建立全部 24 个 upstream-only commits 的 ledger，并区分功能行为、测试/工具/docs 和 release。
- 深入复审 11 个功能提交：早期 double border、text/filter shadow、color matrix、gradient/object-fit，以及后续 dotted/3D/complex border、gradient-background 和 blur/backdrop-filter parity。
- 复核五个 upstream test-only scenes 是否应作为后续验证输入，而不是直接代码 intake。
- 复核当前 `main` 中六项 fork overrides 的 removal conditions：responsive Shadow DOM、composed traversal、glyph-aware font fallback、image presentation、image-loader cancellation、nowrap text sizing。
- 形成 patch boundary、依赖、目标树、验证和授权证据。

## Requirements

- R1. 主结论必须基于 `upstream/main...sync/upstream-20260726` 的 `24/109` 分叉，不再把“2026-08-25 后无新 commit”误当成完整差距结论。
- R2. 24 个 upstream-only commits 必须逐条、且仅一次进入 ledger：11 个功能、5 个 test-only、4 个工具/docs、4 个 release。
- R3. 每个功能组必须区分：sync 已有本地非等价适配、sync 尚缺的 upstream 后续语义、以及当前 fork `main` 必须保留的独有 contract。
- R4. 直接 cherry-pick 只有在 patch 边界单一、依赖闭合、目标路径职责一致、文本/patch/tree 证据成立且验证门禁明确时才可建议；clean apply 本身不足。
- R5. upstream mixed commits 中与 fork override 重叠的切片必须拆开处理；例如 `cc8d486` 的 gradient 可评估，object-fit 不得覆盖 fork 的完整 object-position/none/scale-down contract。
- R6. test-only、tool/docs 和 release commits 默认“无需动作”；其场景可进入验证计划，但不得为了保留 upstream SHA 而 cherry-pick metadata/baseline。
- R7. 后续实现必须从 upstream final tree、sync 本地适配意图和 current `main` contracts 三方重建；禁止 whole-sync merge 或顺序重放全部 24 commits。
- R8. locally adapted runtime path 必须 capability-owned 并生成 reviewed fingerprint；只有与 pinned upstream 内容完全等价时才可进入 `absorbedUpstreamPaths`。
- R9. `task.py start`、子任务/branch/worktree、代码、registry、commit、push 和 PR/merge 分别受明确授权约束。

## Disposition

| 范围 | 数量 | 分类 | 结论 |
| --- | ---: | --- | --- |
| upstream target/npm/registry refresh | - | 无需动作 | live target 已是已审查的 `859efea8`，不修改 pin。 |
| 早期 style upstream slices | 5 commits 中的 style slices | 本地重新移植/适配 | sync 有功能重叠但 patch 不等价；从 upstream final semantics 重新取舍。 |
| `cc8d486` object-fit slice | 1 mixed-commit slice | 保留 fork 实现 | 不单独吸收 upstream object-fit；继续由更完整的 fork image-presentation capability 承担。 |
| 后续 border 功能 commits | 3 | 本地重新移植/适配 | dotted、3D、complex border/outline/rounded dash 未在 sync 完整体现，且目标 frame tree 已分叉。 |
| `7dd5da2` fractional frame/element slice | 1 mixed-commit slice | 本地重新移植/适配 | 只独立评估不再 rounding 的 frame/element geometry。 |
| `7dd5da2` text-buffer-removal slice | 1 mixed-commit slice | 保留 fork 实现 | upstream 切片与 fork contract 冲突；保留 alignment-aware text width buffer 与 nowrap 行为。 |
| 后续 gradient-background commit | 1 | 本地重新移植/适配 | `922e12e` 增加 explicit-stop、conic/repeating gradient semantics，并由 BG-08/09/15 场景验证；它不是延期的本地 CSS raster background 产品。 |
| 后续 effects commit | 1 | 本地重新移植/适配 | `20a438c` 将 CSS blur sigma 映射为 Figma `2x` radius；需与现有 drop-shadow/color-matrix 适配共同复审。 |
| upstream test-only scenes | 5 | 无需动作 | 不作为独立代码 intake；其中 inline/transparent border 场景随 geometry cohort 重建，其余按需作为验证案例，不 cherry-pick baseline/snapshot commits。 |
| upstream tool/docs | 4 | 无需动作 | 不属于本轮 converter compatibility intake。 |
| upstream release commits | 4 | 无需动作 | 版本身份已由 target/npm pin 记录，不重放 changeset release。 |
| 六项 current-main fork overrides | 6 capabilities | 保留 fork 实现 | upstream 未满足完整 removal conditions。 |
| 退役 fork 实现 | 0 | 退役 fork 实现 | 当前没有合格项。 |
| 直接 cherry-pick | 0 | 可直接 cherry-pick | 所有功能提交在 sync 文本试投均冲突；工具 clean apply 也无本轮产品价值。 |

## Acceptance Criteria

- [ ] 研究报告逐条覆盖 24 个 upstream-only commits，分类总数为 `11 + 5 + 4 + 4 = 24`。
- [ ] 报告记录共同基线、`24/109` 拓扑、patch-ID 和 sync/current-main 目标树证据。
- [ ] border、gradient-background、effects、geometry-conflict 四组都有“upstream 新增语义 / sync 状态 / current-main 约束 / 处置”结论。
- [ ] 早期 style 重叠明确标为本地非等价适配，不能被表述为已 cherry-pick。
- [ ] 六项 fork overrides 保留；没有无证据的 capability retirement、target/fingerprint refresh 或 budget change。
- [ ] test/tool/release commits 与功能 intake 分离；直接 cherry-pick 候选为空且有边界和依赖证据。
- [ ] 后续 cohort、验证矩阵、rollback points 和所有写授权边界完整。
- [ ] sync 的 11 个本地产品候选继续排除，不形成 whole-branch merge 建议。

## Out Of Scope

- 109 个 sync-only commits 的完整产品 promotion 复审。
- 旧 sync 中 11 个本地产品提交：CSS raster background extraction、lazy capture、capture artifact/persistence、edge stabilization、font diagnostics 等。
- `css-background-images` 本地 capability 的 promotion/retirement；但 upstream `922e12e` 的 gradient-background parity 属于本轮。
- 未经新最终规划批准的 `task.py start`、产品代码或 registry 修改。
- branch/ref、commit、push、PR/merge、sync/backup 删除或 dirty checkout 清理。

## Risks And Deferred Items

- upstream moving ref 在 activation 前若不再是 `859efea8`，必须返回 planning 重建 ledger。
- upstream commits 夹带 oracle baseline、changeset、docs 或其他 capability；必须移植行为与测试意图，不重放派生 metadata。
- sync/current-main 的 frame、walk、text、gradient、blur 和 border trees 均已分叉，文本冲突只是风险下限，不代表完整语义差距。
