import type {
  BrowserCaptureAdapter,
  CaptureInput,
  FontDiagnostic,
  TypographyInspection,
  TypographyLetterSpacing,
  TypographyLineHeight,
} from "@figit/browser-capture-adapter";

import type { CaptureSettings } from "../../shared/capture-settings";
import type {
  FontResolutionGroup,
  TypographyMetricVariant,
  TypographySourceStyle,
  TypographyStyleGroup,
} from "./font-spec-projection";
import { projectTypographyInspection } from "./font-spec-projection";

const REPORT_WIDTH = 1200;
const REPORT_MIN_HEIGHT = 240;
const REPORT_HOST_OFFSET_PX = 100_000;
const SPECIMEN = "Aa Bb 0123 / 中文字样";
const REPORT_FONT_STACK = "Arial, sans-serif";
const RESOLUTION_GRID = "80px 340px 300px 220px 80px";
const CORE_STYLE_GRID = "210px 240px 310px 180px 80px";
const RARE_STYLE_GRID = "320px 420px 220px 80px";

export type FontSpecCopyResult = {
  status: "success" | "failed";
  message: string;
};

export type FontSpecPort = {
  copy(
    target: CaptureInput,
    settings: CaptureSettings
  ): Promise<FontSpecCopyResult>;
};

export type FontSpecPortOptions = {
  createAdapter(settings: CaptureSettings): BrowserCaptureAdapter;
  writeClipboard(clipboardHtml: string): Promise<FontSpecCopyResult>;
};

export function createFontSpecPort(options: FontSpecPortOptions): FontSpecPort {
  return {
    async copy(target, settings) {
      const document = targetDocument(target);
      const adapter = options.createAdapter(settings);
      let host: HTMLElement | null = null;
      try {
        const inspection = await adapter.inspectTypography(target);
        const mounted = mountTypographyReport(document, inspection);
        host = mounted.host;
        const width = Math.max(
          REPORT_WIDTH,
          Math.ceil(mounted.report.getBoundingClientRect().width),
          mounted.report.scrollWidth
        );
        const height = Math.max(
          REPORT_MIN_HEIGHT,
          Math.ceil(mounted.report.getBoundingClientRect().height),
          mounted.report.scrollHeight
        );
        const capture = await adapter.capture({
          element: mounted.report,
          width,
          height,
          name: "Typography",
        });
        return await options.writeClipboard(capture.clipboardHtml);
      } catch (error) {
        return {
          status: "failed",
          message:
            error instanceof Error && error.message
              ? error.message
              : "Unable to copy the typography spec.",
        };
      } finally {
        host?.remove();
      }
    },
  };
}

export function buildTypographyReport(
  document: Document,
  inspection: TypographyInspection
): HTMLElement {
  const projection = projectTypographyInspection(inspection);
  const report = createElement(
    document,
    "div",
    `width:${REPORT_WIDTH}px;min-height:${REPORT_MIN_HEIGHT}px;padding:40px;background:#ffffff;color:#18181b;font-family:${REPORT_FONT_STACK};display:flex;flex-direction:column;gap:0;`
  );
  report.dataset.figitFontSpec = "report";
  report.setAttribute("aria-label", "Typography specification");
  report.append(
    createReportHeader(
      document,
      inspection,
      projection.resolutions.length,
      projection.coreStyles.length,
      projection.rareStyles.length
    )
  );

  if (inspection.usages.length === 0) {
    report.append(
      createTextElement(
        document,
        "p",
        "No visible text was found in the selected target.",
        "padding:32px 0;font-size:14px;line-height:22px;color:#71717a;"
      )
    );
    return report;
  }

  appendFontResolutionSection(document, report, projection.resolutions);
  appendCoreStylesSection(document, report, projection.coreStyles);
  appendRareStylesSection(document, report, projection.rareStyles);
  return report;
}

function createReportHeader(
  document: Document,
  inspection: TypographyInspection,
  resolutionCount: number,
  coreStyleCount: number,
  rareStyleCount: number
): HTMLElement {
  const header = createElement(
    document,
    "header",
    "display:flex;flex-direction:column;gap:10px;padding-bottom:28px;border-bottom:2px solid #18181b;"
  );
  header.append(
    createTextElement(
      document,
      "h1",
      "Typography",
      "font-size:32px;line-height:40px;font-weight:700;color:#18181b;"
    ),
    createTextElement(
      document,
      "p",
      pageSource(document),
      "font-size:14px;line-height:20px;color:#52525b;"
    ),
    createTextElement(
      document,
      "p",
      summaryText(inspection, resolutionCount, coreStyleCount, rareStyleCount),
      "font-size:13px;line-height:20px;color:#3f3f46;"
    )
  );
  return header;
}

function appendFontResolutionSection(
  document: Document,
  report: HTMLElement,
  groups: ReadonlyArray<FontResolutionGroup>
): void {
  const section = createReportSection(document, "font-resolution");
  section.append(
    createSectionHeading(
      document,
      "Font resolution",
      `${groups.length} mapping${groups.length === 1 ? "" : "s"}`
    ),
    createTableHeader(
      document,
      ["Ref", "Source", "Figma", "Resolution", "Usage"],
      RESOLUTION_GRID
    )
  );
  for (const group of groups) {
    section.append(createFontResolutionRow(document, group));
  }
  report.append(section);
}

function appendCoreStylesSection(
  document: Document,
  report: HTMLElement,
  groups: ReadonlyArray<TypographyStyleGroup>
): void {
  const section = createReportSection(document, "core-styles");
  section.append(
    createSectionHeading(
      document,
      "Core styles",
      `${groups.length} repeated style${groups.length === 1 ? "" : "s"}`
    )
  );
  if (groups.length === 0) {
    section.append(
      createTextElement(
        document,
        "p",
        "No typography style is used more than once.",
        "padding:18px 0;font-size:13px;line-height:20px;color:#71717a;border-bottom:1px solid #e4e4e7;"
      )
    );
    report.append(section);
    return;
  }
  section.append(
    createTableHeader(
      document,
      ["Specimen", "Style", "Size and variants", "Font ref", "Usage"],
      CORE_STYLE_GRID
    )
  );
  for (const group of groups) {
    section.append(createCoreStyleRow(document, group));
  }
  report.append(section);
}

function appendRareStylesSection(
  document: Document,
  report: HTMLElement,
  groups: ReadonlyArray<TypographyStyleGroup>
): void {
  const section = createReportSection(document, "rare-variants");
  section.append(
    createSectionHeading(
      document,
      "Rare variants",
      `${groups.length} single-use style${groups.length === 1 ? "" : "s"}`
    )
  );
  if (groups.length === 0) {
    section.append(
      createTextElement(
        document,
        "p",
        "No single-use typography variants.",
        "padding:18px 0;font-size:13px;line-height:20px;color:#71717a;"
      )
    );
    report.append(section);
    return;
  }
  section.append(
    createTableHeader(
      document,
      ["Style", "Metrics", "Font ref", "Usage"],
      RARE_STYLE_GRID
    )
  );
  for (const group of groups) {
    section.append(createRareStyleRow(document, group));
  }
  report.append(section);
}

function createReportSection(
  document: Document,
  kind: "font-resolution" | "core-styles" | "rare-variants"
): HTMLElement {
  const section = createElement(
    document,
    "section",
    "display:flex;min-width:0;flex-direction:column;gap:0;"
  );
  section.dataset.fontSpecSection = kind;
  return section;
}

function createFontResolutionRow(
  document: Document,
  group: FontResolutionGroup
): HTMLElement {
  const row = createDataRow(document, RESOLUTION_GRID, "font-resolution");
  row.dataset.resolution = group.resolution.status;
  const figma = createCell(document, [resolvedFontLabel(group)]);
  const status = createElement(
    document,
    "div",
    "display:flex;min-width:0;flex-direction:column;gap:5px;"
  );
  status.append(createStatusBadge(document, group.resolution));
  row.append(
    createTextElement(
      document,
      "p",
      group.id,
      "font-size:13px;line-height:20px;font-weight:700;color:#18181b;"
    ),
    createSourceCell(document, group),
    figma,
    status,
    createUsageCount(document, group.usageCount)
  );
  return row;
}

function createCoreStyleRow(
  document: Document,
  group: TypographyStyleGroup
): HTMLElement {
  const row = createDataRow(document, CORE_STYLE_GRID, "core-style");
  const specimen = createTextElement(
    document,
    "p",
    SPECIMEN,
    specimenStyle(group)
  );
  row.append(
    specimen,
    createSourceCell(document, group),
    createMetricsCell(document, group),
    createFontReferenceCell(document, group),
    createUsageCount(document, group.usageCount)
  );
  return row;
}

function createRareStyleRow(
  document: Document,
  group: TypographyStyleGroup
): HTMLElement {
  const row = createDataRow(document, RARE_STYLE_GRID, "rare-style");
  row.append(
    createSourceCell(document, group, `Size ${formatPixels(group.fontSizePx)}`),
    createVariantCell(document, group.variants),
    createFontReferenceCell(document, group),
    createUsageCount(document, group.usageCount)
  );
  return row;
}

function createSectionHeading(
  document: Document,
  title: string,
  count: string
): HTMLElement {
  const heading = createElement(
    document,
    "div",
    "display:flex;align-items:baseline;justify-content:space-between;gap:20px;padding:30px 0 12px;border-bottom:1px solid #18181b;"
  );
  heading.append(
    createTextElement(
      document,
      "h2",
      title,
      "font-size:18px;line-height:26px;font-weight:700;color:#18181b;"
    ),
    createTextElement(
      document,
      "p",
      count,
      "font-size:12px;line-height:18px;color:#71717a;"
    )
  );
  return heading;
}

function createTableHeader(
  document: Document,
  labels: ReadonlyArray<string>,
  columns: string
): HTMLElement {
  const row = createReportRow(document, labels);
  row.setAttribute(
    "style",
    baseStyle(
      `display:grid;grid-template-columns:${columns};gap:20px;padding:12px 0;border-bottom:1px solid #a1a1aa;color:#52525b;font-family:Arial,sans-serif;font-size:10px;line-height:15px;font-weight:700;text-transform:uppercase;`
    )
  );
  return row;
}

function createDataRow(
  document: Document,
  columns: string,
  kind: "font-resolution" | "core-style" | "rare-style"
): HTMLElement {
  const row = createElement(
    document,
    "div",
    `display:grid;grid-template-columns:${columns};gap:20px;padding:${kind === "rare-style" ? "13px" : "18px"} 0;border-bottom:1px solid #e4e4e7;align-items:start;`
  );
  row.setAttribute(`data-${kind}`, "true");
  return row;
}

function createSourceCell(
  document: Document,
  source: TypographySourceStyle,
  extraLine?: string
): HTMLElement {
  return createCell(document, [
    source.familyStack.join(", "),
    `${source.weight} / ${source.style}`,
    ...(extraLine ? [extraLine] : []),
  ]);
}

function createMetricsCell(
  document: Document,
  group: TypographyStyleGroup
): HTMLElement {
  const cell = createCell(document, [`Size ${formatPixels(group.fontSizePx)}`]);
  cell.append(createVariantCell(document, group.variants));
  return cell;
}

function createVariantCell(
  document: Document,
  variants: ReadonlyArray<TypographyMetricVariant>
): HTMLElement {
  const cell = createElement(
    document,
    "div",
    "display:flex;min-width:0;flex-direction:column;gap:3px;overflow-wrap:anywhere;"
  );
  for (const variant of variants) {
    cell.append(
      createTextElement(
        document,
        "p",
        `LH ${formatMetric(variant.lineHeight)} / LS ${formatMetric(variant.letterSpacing)} / ${variant.usageCount} use${variant.usageCount === 1 ? "" : "s"}`,
        "font-size:11px;line-height:16px;color:#71717a;overflow-wrap:anywhere;"
      )
    );
  }
  return cell;
}

function createFontReferenceCell(
  document: Document,
  group: TypographyStyleGroup
): HTMLElement {
  const cell = createElement(
    document,
    "div",
    "display:flex;min-width:0;flex-direction:column;gap:5px;"
  );
  cell.append(
    createTextElement(
      document,
      "p",
      group.resolutionId,
      "font-size:13px;line-height:19px;font-weight:700;color:#27272a;"
    ),
    createStatusBadge(document, group.resolution)
  );
  return cell;
}

function createUsageCount(document: Document, usageCount: number): HTMLElement {
  return createTextElement(
    document,
    "p",
    String(usageCount),
    "font-size:14px;line-height:22px;font-weight:700;color:#18181b;"
  );
}

function specimenStyle(group: TypographyStyleGroup): string {
  const family =
    group.resolution.status === "failed"
      ? REPORT_FONT_STACK
      : quoteFontFamily(group.resolution.resolvedFamily ?? group.family);
  return `font-family:${family};font-size:24px;line-height:32px;font-weight:${group.resolution.resolvedWeight ?? group.weight};font-style:${group.resolution.resolvedItalic ? "italic" : "normal"};color:#18181b;overflow-wrap:anywhere;`;
}

function createStatusBadge(
  document: Document,
  resolution: FontDiagnostic
): HTMLElement {
  const colors = {
    exact: { foreground: "#166534", background: "#dcfce7" },
    fallback: { foreground: "#92400e", background: "#fef3c7" },
    failed: { foreground: "#991b1b", background: "#fee2e2" },
  }[resolution.status];
  return createTextElement(
    document,
    "span",
    resolutionLabel(resolution),
    `display:inline-block;width:max-content;padding:3px 7px;background:${colors.background};color:${colors.foreground};font-size:10px;line-height:14px;font-weight:700;text-transform:uppercase;`
  );
}

function createCell(
  document: Document,
  lines: ReadonlyArray<string>
): HTMLElement {
  const cell = createElement(
    document,
    "div",
    "display:flex;min-width:0;flex-direction:column;gap:4px;overflow-wrap:anywhere;"
  );
  for (const [index, line] of lines.entries()) {
    cell.append(
      createTextElement(
        document,
        "p",
        line,
        index === 0
          ? "font-size:12px;line-height:18px;font-weight:600;color:#27272a;overflow-wrap:anywhere;"
          : "font-size:11px;line-height:16px;color:#71717a;overflow-wrap:anywhere;"
      )
    );
  }
  return cell;
}

function createReportRow(
  document: Document,
  labels: ReadonlyArray<string>
): HTMLElement {
  const row = document.createElement("div");
  for (const label of labels) {
    row.append(createTextElement(document, "span", label, ""));
  }
  return row;
}

function createTextElement<K extends keyof HTMLElementTagNameMap>(
  document: Document,
  tag: K,
  text: string,
  style: string
): HTMLElementTagNameMap[K] {
  const element = createElement(document, tag, style);
  element.textContent = text;
  return element;
}

function createElement<K extends keyof HTMLElementTagNameMap>(
  document: Document,
  tag: K,
  style: string
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  element.setAttribute("style", baseStyle(style));
  return element;
}

function baseStyle(style: string): string {
  return `all:initial;box-sizing:border-box;font-family:${REPORT_FONT_STACK};letter-spacing:normal;${style}`;
}

function mountTypographyReport(
  document: Document,
  inspection: TypographyInspection
): { host: HTMLElement; report: HTMLElement } {
  const host = document.createElement("div");
  host.dataset.figitFontSpecHost = "true";
  host.setAttribute(
    "style",
    `all:initial!important;position:fixed!important;left:-${REPORT_HOST_OFFSET_PX}px!important;top:0!important;width:${REPORT_WIDTH}px!important;z-index:-2147483648!important;pointer-events:none!important;`
  );
  const shadow = host.attachShadow({ mode: "open" });
  const report = buildTypographyReport(document, inspection);
  shadow.append(report);
  document.documentElement.append(host);
  return { host, report };
}

function targetDocument(target: CaptureInput): Document {
  const element =
    "frames" in target ? target.frames[0]?.element : target.element;
  if (!element) {
    throw new Error("Typography target is empty.");
  }
  return element.ownerDocument;
}

function pageSource(document: Document): string {
  const title = document.title.trim();
  let hostname = "";
  try {
    hostname = document.defaultView?.location.hostname ?? "";
  } catch {
    hostname = "";
  }
  if (title && hostname) {
    return `${title} - ${hostname}`;
  }
  return title || hostname || "Untitled page";
}

function summaryText(
  inspection: TypographyInspection,
  resolutionCount: number,
  coreStyleCount: number,
  rareStyleCount: number
): string {
  const { total, exact, fallback, failed } = inspection.summary;
  return `${total} tokens / ${resolutionCount} font mappings / ${coreStyleCount} core styles / ${rareStyleCount} rare variants / ${exact} exact / ${fallback} fallback / ${failed} missing`;
}

function resolutionLabel(resolution: FontDiagnostic): string {
  switch (resolution.status) {
    case "exact":
      return "Exact";
    case "fallback":
      return "Fallback";
    case "failed":
      return "Missing";
    default:
      return "Missing";
  }
}

function resolvedFontLabel(group: FontResolutionGroup): string {
  if (group.resolution.status === "failed") {
    return "Unavailable";
  }
  const family = group.resolution.resolvedFamily ?? group.family;
  const weight = group.resolution.resolvedWeight ?? group.weight;
  const style = group.resolution.resolvedItalic ? "italic" : "normal";
  return `${family} / ${weight} / ${style}`;
}

function formatMetric(
  metric: TypographyLineHeight | TypographyLetterSpacing
): string {
  return metric.kind === "normal" ? "normal" : formatPixels(metric.value);
}

function formatPixels(value: number): string {
  return `${Number(value.toFixed(2))} px`;
}

function quoteFontFamily(family: string): string {
  return `"${family.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}
