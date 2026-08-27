# Journal - kino (Part 1)

> AI development session journal
> Started: 2026-07-21

---



## Session 1: Bootstrap Trellis Project Specs

**Date**: 2026-07-21
**Task**: Bootstrap Trellis Project Specs
**Branch**: `main`

### Summary

Replaced Trellis spec scaffolding with codebase-backed conventions for six workspace packages, shared repository guidance, concrete examples, and verified indexes, types, tests, and builds.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `3b557fa` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete

## Session 28: Reassess upstream rendering parity

**Date**: 2026-08-27
**Task**: Reassess upstream rendering parity
**Branch**: `task/reassess-upstream-cherry-pick`

### Summary

Reassessed upstream versus frozen sync, adapted border/gradient/effects/fractional geometry to current main, added executable upstream-main governance, preserved fork overrides, and completed independent verification.

### Main Changes

- Adapted reviewed upstream border, gradient, effects, and fractional geometry semantics without cherry-picking upstream commits.
- Added upstream-main adapter, exact absorbed-path governance, browser regressions, changeset, and rendering contract documentation.

### Git Commits

| Hash | Message |
|------|---------|
| `9986a89` | (see git log) |
| `a92dc5c` | (see git log) |
| `0e07a71` | (see git log) |
| `9826786` | (see git log) |
| `bf0bf8e` | (see git log) |
| `993b34a` | (see git log) |
| `f6a16fe` | (see git log) |

### Testing

- [OK] 269 dom-to-figma tests, workspace test/type/build, and 46-scene oracle parity passed.
- [OK] Stable/main adapters and governance checks passed with 14 governed + 11 absorbed and zero unmapped paths.

### Status

[OK] **Completed**

### Next Steps

- Push or open a PR only after separate authorization.


## Session 2: Browser capture adapter milestone

**Date**: 2026-07-24
**Task**: Browser capture adapter milestone
**Branch**: `main`

### Summary

Implemented a resilient browser capture adapter, fixed responsive and open Shadow DOM capture, documented the milestone, and planned the composed DOM utility package.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `f9ecdea` | (see git log) |
| `af1bec8` | (see git log) |
| `58a51f3` | (see git log) |
| `3950296` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 3: Extract composed DOM traversal utility

**Date**: 2026-07-24
**Task**: Extract composed DOM traversal utility
**Branch**: `main`

### Summary

Added @figit/composed-dom, injected optional core traversal, migrated capture adapter, validated package isolation and browser builds.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `e8b46a4` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 4: 完成分阶段资源管线与转换桥接

**Date**: 2026-07-24
**Task**: 完成分阶段资源管线与转换桥接
**Package**: dom-to-figma
**Branch**: `main`

### Summary

完成 staged-resource-pipeline：实现图片资源盘点、四路调度、预算/超时/重试/取消、字体阶段、占位图、dom-to-figma 可选预处理桥接及扩展资源代理；补充跨层测试、规范文档和 changeset。pnpm check-types、pnpm test、Chromium/Firefox 构建、任务校验、git diff --check 与人工浏览器烟测均完成。

### Main Changes

- Emit `WIDTH_AND_HEIGHT` only for browser-confirmed single-line `pre`/`nowrap` text.
- Preserve Auto Layout text sizing with `stackChildAlignSelf: AUTO`.
- Add browser regressions, a text oracle scene, patch changeset, and rendering contract.
- Verify the rebuilt extension against live Figma nodes through figma-cli-go.

### Git Commits

| Hash | Message |
|------|---------|
| `4da4c51` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 5: 完成浏览器扩展捕获工作区

**Date**: 2026-07-24
**Task**: 完成浏览器扩展捕获工作区
**Package**: extension
**Branch**: `main`

### Summary

完成页面内捕获工作区、设置持久化、工具栏 action 路由、捕获进度与恢复状态、剪贴板输出接入；用户已完成人工测试。已创建固定字体回退 planning 任务，未开始实现。

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `f6acba7` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 6: Glyph-aware fixed CJK font fallback

**Date**: 2026-07-24
**Task**: Glyph-aware fixed CJK font fallback
**Package**: extension
**Branch**: `main`

### Summary

Added glyph-coverage-aware font resolution, a fixed local Noto Sans TC fallback with real family metadata, and consumer-visible Figma payload alignment across adapter, extension, and core.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `ea9956a` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 7: Export aggregated Figma typography spec

**Date**: 2026-07-24
**Task**: Export aggregated Figma typography spec
**Package**: extension
**Branch**: `main`

### Summary

Added lossless typography inspection, aggregated resolution/core/rare report projection, independent Review clipboard command, browser decoding tests, and verified a real editable Figma paste.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `3d6e9b7` | (see git log) |
| `ab034f0` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 8: DOM-to-Figma image fit semantics

**Date**: 2026-07-25
**Task**: DOM-to-Figma image fit semantics
**Package**: extension
**Branch**: `main`

### Summary

Preserved CSS object-fit and object-position in Figma image paints, added intrinsic image metadata, browser/unit/oracle coverage, a patch changeset, and the rendering contract. Live Figma matrix inspection and the Portal image smoke remain documented residual checks.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `0149d62` | (see git log) |
| `5ea3317` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 9: Preserve single-line text in Figma

**Date**: 2026-07-25
**Task**: Preserve single-line text in Figma
**Package**: extension
**Branch**: `main`

### Summary

Preserved browser-enforced pre/nowrap single-line text during Figma remeasurement, added Auto Layout child alignment handling, regression coverage, oracle baseline, release changeset, and live figma-cli-go verification.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `ab0f56e` | fix(dom-to-figma): preserve nowrap text in Figma |
| `e25fece` | docs(spec): document single-line text sizing contract |

### Testing

- [OK] Core: 18 files / 159 tests; type-check and build passed
- [OK] Adapter: 12 files / 46 tests passed
- [OK] Extension: 7 files / 33 tests; type-check and Chrome MV3 build passed
- [OK] Oracle parity: 46 scenes passed
- [OK] Live Figma: `Join beta` rendered at `69.07 x 21` on one line

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 10: Controlled fork versioning

**Date**: 2026-07-25
**Task**: Controlled fork versioning
**Package**: extension
**Branch**: `chore/archive-controlled-fork-versioning`

### Summary

Created and protected the aakkino product fork, established immutable baseline tags, documented selective upstream intake, enabled repeatable fork CI, fixed two pre-existing formatting blockers, and verified worktree preservation.

### Main Changes

(Add details)

### Git Commits

| Hash | Message |
|------|---------|
| `7cbaeba` | (see git log) |
| `6f94661` | (see git log) |
| `a23f6e6` | (see git log) |
| `7d71fc7` | (see git log) |
| `ee651c2` | (see git log) |
| `896bec2` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete
