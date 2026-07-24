# 固定字体回退与 Figma 字体载荷

## Goal

当页面字体无法获取时，使用固定 CJK fallback 并明确 Figma payload 的字体选择，避免不可覆盖字符产生空白字形。

## Requirements

- 当页面声明的字体无法通过页面直读、后台字体传输或已有精确字体规则获取时，统一使用扩展内置的固定 CJK fallback；常见 Web 字体不需要逐个加入别名表。
- 页面字体可以精确获取时，继续优先使用页面字体，不被固定 fallback 覆盖。
- 固定 fallback 使用现有内置 Noto Sans TC composite 字体，并按请求字重选择最近可用的 400/500/600/700 变体；不支持的斜体必须有明确的降级诊断。
- 使用 fallback 的文本节点，其 Figma payload 必须声明一个实际覆盖捕获字符的 fallback 字体，不能只保留原始但可能缺字的页面字体族。
- 保留现有 `exact` / `fallback` / `failed` 字体诊断，使用户能区分精确字体和固定 fallback。
- 变更限定在字体解析、转换载荷和相关测试；不引入远程字体下载、不实现逐字符多字体混排、不改变图片或布局流程。

## Acceptance Criteria

- [ ] 使用首选字体为 `Inter` 的中文/拉丁混合页面 fixture，且页面字体不可获取时，捕获结果包含完整可编辑文本，不出现中文空缺字形。
- [ ] 同一 fixture 的 fallback 诊断报告 `source: "fallback"` 和固定 fallback family；不依赖 `Inter` 等别名配置才能触发。
- [ ] fallback 文本的 Figma payload 使用固定 fallback family；可获取的页面 `@font-face` 仍保留原始 family。
- [ ] 400/500/600/700 字重分别选择对应本地字体，其他字重选择最近变体并保留诊断信息。
- [ ] 补充 resolver/bridge 回归测试，覆盖字体文件可解析但缺少 CJK glyph 的情况；测试断言文本节点未被静默丢弃。
- [ ] 扩展测试、适配层测试、类型检查和 Chromium/Firefox 构建全部通过。

## Notes

- 当前已知根因：`Inter` 未命中 CJK 别名后落入不含中文字形的 Noto Sans Arabic；字体文件“可解析”不等于覆盖文本中的所有字符。
- 固定 CJK fallback 的目标是解决中文/拉丁场景；阿拉伯文、希伯来文、Emoji 等脚本覆盖不在本任务范围内。
- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
