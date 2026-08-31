# 文本与字体正确性上游化

## Goal

将字体回退、CJK 字形覆盖与单行文本尺寸修复整理为可上游化的独立补丁。

## Requirements

- 将字体协商与单行文本尺寸拆成两个独立、可单独回滚的上游候选。
- 核心只向 `FontLoader` 提供排序去重后的所需 code points，并忠实使用 loader 返回的 resolved family/style；字体目录、网络与产品 fallback 顺序留在 adapter。
- code point 收集必须按 Unicode code point 而非 UTF-16 code unit 工作，不泄露完整源文本，并忽略不需要字形的空白。
- CJK、拉丁、混合文字、emoji/补充平面字符及缺失字形路径必须有确定测试。
- 仅当 DOM 实际单行、CSS 明确保留单行、无显式换行且无 ellipsis 时启用 Figma `WIDTH_AND_HEIGHT`。
- auto-layout 父级中的单行文本必须保持 hug-size，而多行、显式换行和截断文本保持固定盒语义。
- 不改变 adapter 已有的字体预检、bundled font 与诊断行为。
- 只准备本地原子提交和上游 PR 草稿；发布需用户另行批准。

## Acceptance Criteria

- [x] FontLoader 可以依据 `codePoints` 选择覆盖实际字形的字体，Figma payload family 与加载字节一致。
- [x] 未实现 glyph-aware 行为的旧 loader 仍可忽略可选字段并正常工作。
- [x] CJK、混合文字、非 BMP code point、空白和重复字符测试通过。
- [x] nowrap/pre 单行在普通父级和 auto-layout 父级中保持浏览器测得尺寸。
- [x] normal wrapping、显式换行、ellipsis 和真实多行不被错误设置为 `WIDTH_AND_HEIGHT`。
- [x] 两个上游候选没有 extension 或 adapter 运行时依赖，提交与 PR 草稿彼此独立。
- [x] 文本浏览器测试、字体 resolver 测试、extension 集成与 oracle parity 全部通过。

## Notes

- 依赖 `07-25-upstream-core-delta-governance`；完成治理后可与 DOM traversal 工作并行。
- 相关来源提交为 `ea9956a` 与 `ab0f56e`，实施时必须重新按当前路径拆分。
