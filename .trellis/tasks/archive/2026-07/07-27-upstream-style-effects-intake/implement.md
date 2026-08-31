# 吸收上游样式、效果与类型变化：实施计划

## Preconditions

- 用户批准本 PRD、设计和实施计划。
- 工作从 fork `main` 建立新的 `sync/upstream-YYYYMMDD` 分支。
- `upstream/main` 仍解析为计划固定的 `cc8d4864e6be53d0d5047fbf97283b112b3117f4`；
  若已移动则先重新审查。
- 当前工作树的无关未提交改动必须保留，不得被覆盖或带入同步提交。

## Checklist

- [x] 记录精确 refs，运行治理、stable adapter 和当前 upstream-main 基线检查。
- [x] 移植 text effects、radial paint、shadow、filter-color、gradient、border
      底层实现及上游聚焦单元测试。
- [x] 在本地 frame/text/walk 接入点按设计整合；明确保留 image converter 的
      object-position、none/scale-down 和 intrinsic-size 语义。
- [x] 增加 fork 边界测试：Shadow DOM color filter、double-border child
      ordering/Auto Layout、text/filter shadows、radial/angled gradients。
- [x] 新增固定 upstream-main 源码构建与 adapter 临时 consumer 检查，并接入
      现有 advisory/blocking CI policy。
- [x] 运行完整门禁，审查 core registry/fingerprint；只更新实际受影响的登记项。
- [x] 形成最终 intake 审计，列出吸收能力、保留补丁、冲突解决和回滚提交。

## Validation

```sh
pnpm upstream-core-delta:check
pnpm test:upstream-core-delta
pnpm upstream-core-delta:stable -- --verify-latest
pnpm upstream-core-delta:main
pnpm upstream-adapter:stable
pnpm lint
pnpm check-types
pnpm build
pnpm test
pnpm oracle:parity
```

新增的 upstream-main executable command 也必须本地通过，并验证 ref 漂移或
API 缺失时会失败。

## Risk And Rollback Points

- `packages/dom-to-figma/src/converter/nodes/frame/converter.ts`: color filter、
  gradient box、double-border metadata 的集中冲突点。
- `packages/dom-to-figma/src/converter/nodes/text/converter.ts`: 必须保留字体、
  glyph、nowrap 和 composed-parent 行为。
- `packages/dom-to-figma/src/converter/walk.ts`: synthetic child 不得改变真实
  DOM child order 或进入 Auto Layout 流。
- `.github/workflows/ci.yml` 与 compatibility scripts: 普通 PR advisory、同步
  PR blocking 的条件不得反转。

每个能力提交是独立回滚点。质量门失败时保留其他已通过能力，恢复对应能力并
在最终审计中记录阻塞原因。
