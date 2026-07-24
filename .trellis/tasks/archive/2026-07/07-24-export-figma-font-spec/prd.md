# 独立导出 Figma 字体说明

## Goal

在浏览器扩展中新增一个独立的“复制字体说明”按钮。点击后扫描当前目标网页的字体使用情况，生成一份类似 design code / typography specification 的 Figma 格式说明板并写入剪贴板；用户粘贴到 Figma 后得到普通、可编辑的 FRAME/TEXT 节点。

## User Workflow

1. 用户打开或选中需要分析的网页。
2. 用户通过现有 picker 选择字体说明的分析范围；选择 `body` 表示分析整页。
3. 用户点击独立的“复制字体说明”按钮。
4. 扩展采集选中范围内的字体使用与解析结果，不执行完整页面视觉转换。
5. 扩展生成并写入一份独立的 Figma clipboard payload。
6. 用户在 Figma 粘贴，得到一个 `Typography` 字体说明 frame。

该按钮与现有“复制网页设计”按钮相互独立；两次操作分别写入剪贴板，不要求同时复制或同时粘贴。

## Confirmed Facts

- 现有 DOM -> Figma 管线已经能够生成、编码并写入 Figma clipboard payload。
- browser capture adapter 已按 `family + weight + italic` 收集字体请求，并提供 exact/fallback/failed、source、resolved family/weight/italic 等诊断。
- glyph-aware resolver 能区分原网页字体和实际用于 Figma 的 fallback 字体，这两组信息可以直接构成字体说明。
- `@figit/dom-to-figma` 已支持多 frame canvas，但本需求是独立按钮、独立 clipboard 输出，不应自动把说明 frame 附加到每次网页设计复制。
- 输出应由普通 Figma FRAME/TEXT 组成；无需 Figma 插件、plugin metadata 或自动恢复字体。
- 先前误建的 source metadata / Figma Handoff plugin 规划已清理，不属于本任务。

## Proposed Output

独立导出一个名为 `Typography` 的 Figma frame，包含三个信息层级：

- 来源：`document.title + hostname`，不包含 path、query 或 hash；
- 字体组合总数，以及 exact/fallback/failed 数量；
- Font resolution：按 source family stack + weight + style + resolved result
  聚合，每个 exact/fallback/failed 映射只展示一次并汇总 usage；
- Core styles：按 family stack + weight + style + font-size 聚合，固定样张只
  展示一次，line-height / letter-spacing 作为带 usage 的 variants；
- Rare variants：聚合后总 usage 为 1 的样式进入紧凑附录，不重复大样张或
  完整 font mapping；
- Core styles 按 usage 降序、font-size 降序、family 稳定排序；Rare variants
  使用相同稳定排序；不使用 Top-N 截断，不丢弃长尾 token。

字体说明不复制网页正文。样张使用固定、公开的拉丁与 CJK 字符，避免泄露页面内容。

## Font Usage Identity

MVP 至少按以下字段去重：

```ts
type FontUsageRecord = {
  sourceFamilyStack: ReadonlyArray<string>;
  sourceWeight: number;
  sourceStyle: string;
  fontSize: number;
  lineHeight: { kind: "normal" } | { kind: "px"; value: number };
  letterSpacing: { kind: "normal" } | { kind: "px"; value: number };
  resolvedFamily?: string;
  resolvedWeight?: number;
  resolvedItalic?: boolean;
  status: "exact" | "fallback" | "failed";
  source?: "page" | "transport" | "bundled" | "fallback";
  usageCount: number;
};
```

相同 source + typography token + resolved 结果在 inspection 层合并并计数；
不同 weight、style、font-size、line-height、letter-spacing 或 fallback 结果
不得在 inspection 层错误合并。文字颜色不属于 typography identity。

说明板展示层不得逐条渲染 inspection。它建立两个稳定投影：

```ts
type FontResolutionGroupKey =
  "familyStack + weight + style + resolution result";

type TypographyStyleGroupKey =
  "familyStack + weight + style + fontSize + resolution result";
```

Style group 保留全部 `{ lineHeight, letterSpacing, usageCount }` variants，
相同 variant 合并计数。只有 style group 的总 usage 决定 Core (`>= 2`) 或
Rare (`= 1`)；不得因进入 Rare 而丢失字段。

## Requirements

- 在扩展现有操作区域增加独立、明确命名的“复制字体说明”命令。
- 字体说明复用当前 picker 选择范围；不得绕过选择直接扫描整个 document。用户选择 `body` 时才视为整页分析。
- 该命令只生成字体说明 payload，不生成网页设计 frame。
- 不改变现有网页设计复制按钮的行为、输出或用户激活/clipboard 时序。
- inventory 必须来自 computed font 使用与 resolver 结果，不得从生成后的节点名称反推。
- `font-family` stack 必须保序，并正确解析 quoted family 及 family 内逗号；不得使用简单 `split(",")`。
- exact 条目必须保留 source 信息；fallback 条目必须同时展示 source 与实际 Figma 字体。
- inspection 必须保留完整 typography token；说明板 Core style 必须展示
  family stack、weight、style、font-size 和全部 line-height / letter-spacing
  variants；Rare variant 使用紧凑行但字段不得丢失。不采集文字颜色。
- failed 条目必须明确显示 Missing/Unavailable，不得编造 resolved 字体。
- 说明 frame 自身必须使用稳定、已覆盖样张字符的字体，不得递归加入网页 inventory。
- 输出必须是有效的 Figma clipboard 格式，粘贴后为普通可编辑节点。
- 不记录网页正文、字体 URL、CSS rule 原文或字体 bytes。
- 页面来源仅记录 `document.title` 与 `location.hostname`；不得记录完整 URL、path、query 或 hash。
- 同一页面与相同 resolver 结果应生成稳定排序和稳定布局，便于比较。
- Font resolution 不得因字号、行高或字距差异重复；Core style 不得因行高或
  字距差异重复完整样张。

## Acceptance Criteria

- [x] 扩展出现独立的“复制字体说明”按钮，且不替代现有网页设计复制按钮。
- [x] inventory 只包含选中元素及其可遍历后代的 typography token；选择 `body` 时覆盖整页可见文本。
- [x] 点击后剪贴板只包含一个字体说明 Figma frame。
- [x] 粘贴到 Figma 后说明内容为可编辑 FRAME/TEXT，而不是截图或纯文本。
- [x] exact、fallback、failed 三种结果具有清晰且一致的视觉表达。
- [x] fallback 行同时显示原网页 family/weight/style 与实际 Figma family/weight/style。
- [x] `font-family: "A, Display", Inter, sans-serif` 保持三个有序 family。
- [x] 重复字体组合被去重并显示稳定 usage count。
- [x] font-size 不同的组合分别形成 style group；line-height / letter-spacing
  差异作为 group 内 variants 展示；文字颜色差异不会产生重复项。
- [x] Font resolution 映射只展示一次；Core style 总 usage 至少为 2，usage
  为 1 的完整 token 全部进入紧凑 Rare variants，且没有 Top-N 截断。
- [x] 说明中不出现网页正文、字体 URL 或字体二进制信息。
- [x] 说明板显示 document title 与 hostname，但不包含 URL path、query 或 hash。
- [x] 空页面或没有可见文本时仍生成有效空状态 frame。
- [x] extension、adapter、dom-to-figma 的相关测试、类型检查和构建通过。
- [x] 真实 Figma 粘贴 smoke 验证节点可编辑、布局可读、文本不溢出。

## Out Of Scope

- Figma 插件或任何 plugin metadata。
- 自动下载、安装、嵌入或分发网页字体。
- 自动把网页设计中的 fallback 文本恢复为原字体。
- 将字体说明自动附加到每次网页设计复制。
- 保存网页正文、字体 URL、CSS rule 或字体二进制。
- 逐字符 font run 或完整还原浏览器 fallback cascade。

## Confirmed Product Decisions

- adapter inspection 采用完整 typography token；说明板使用 resolution、Core
  styles、Rare variants 三层投影，避免逐 token 重复完整样张。
- Core/Rare 阈值按聚合 style usage 判定：`>= 2` 为 Core，`= 1` 为 Rare；
  不做 Top-N 截断。
- 文字颜色明确排除，不参与去重或说明板字段。
- 分析范围复用当前选择/捕获目标；只有显式选择 `body` 才分析整页。
- 页面来源只显示 `document.title + hostname`，不输出完整 URL。
- “复制字体说明”按钮放在目标选择后的 Review 面板，与 `Start capture` 并列并复用同一目标。
