import type {
  FontDiagnostic,
  TypographyInspection,
  TypographyLetterSpacing,
  TypographyLineHeight,
  TypographyToken,
} from "@figit/browser-capture-adapter";

export const CORE_STYLE_MIN_USAGE = 2;

export type TypographySourceStyle = Pick<
  TypographyToken,
  "familyStack" | "family" | "weight" | "style"
>;

export type FontResolutionGroup = TypographySourceStyle & {
  id: string;
  resolution: FontDiagnostic;
  usageCount: number;
};

export type TypographyMetricVariant = {
  lineHeight: TypographyLineHeight;
  letterSpacing: TypographyLetterSpacing;
  usageCount: number;
};

export type TypographyStyleGroup = TypographySourceStyle & {
  fontSizePx: number;
  resolutionId: string;
  resolution: FontDiagnostic;
  usageCount: number;
  variants: ReadonlyArray<TypographyMetricVariant>;
};

export type TypographyReportProjection = {
  resolutions: ReadonlyArray<FontResolutionGroup>;
  coreStyles: ReadonlyArray<TypographyStyleGroup>;
  rareStyles: ReadonlyArray<TypographyStyleGroup>;
};

type MutableResolutionGroup = Omit<FontResolutionGroup, "id" | "usageCount"> & {
  usageCount: number;
};

type MutableStyleGroup = Omit<
  TypographyStyleGroup,
  "resolutionId" | "usageCount" | "variants"
> & {
  resolutionKey: string;
  usageCount: number;
  variants: Map<string, TypographyMetricVariant>;
};

export function projectTypographyInspection(
  inspection: TypographyInspection
): TypographyReportProjection {
  const resolutions = new Map<string, MutableResolutionGroup>();
  const styles = new Map<string, MutableStyleGroup>();

  for (const usage of inspection.usages) {
    const source = sourceStyle(usage.token);
    const resolutionKey = groupKey(source, usage.resolution);
    const existingResolution = resolutions.get(resolutionKey);
    if (existingResolution) {
      existingResolution.usageCount += usage.usageCount;
    } else {
      resolutions.set(resolutionKey, {
        ...source,
        resolution: usage.resolution,
        usageCount: usage.usageCount,
      });
    }

    const styleKey = JSON.stringify([resolutionKey, usage.token.fontSizePx]);
    const existingStyle = styles.get(styleKey);
    const variantKey = metricKey(
      usage.token.lineHeight,
      usage.token.letterSpacing
    );
    if (existingStyle) {
      existingStyle.usageCount += usage.usageCount;
      const existingVariant = existingStyle.variants.get(variantKey);
      if (existingVariant) {
        existingVariant.usageCount += usage.usageCount;
      } else {
        existingStyle.variants.set(variantKey, {
          lineHeight: usage.token.lineHeight,
          letterSpacing: usage.token.letterSpacing,
          usageCount: usage.usageCount,
        });
      }
      continue;
    }
    styles.set(styleKey, {
      ...source,
      fontSizePx: usage.token.fontSizePx,
      resolutionKey,
      resolution: usage.resolution,
      usageCount: usage.usageCount,
      variants: new Map([
        [
          variantKey,
          {
            lineHeight: usage.token.lineHeight,
            letterSpacing: usage.token.letterSpacing,
            usageCount: usage.usageCount,
          },
        ],
      ]),
    });
  }

  const sortedResolutions = [...resolutions.entries()].sort((left, right) =>
    compareResolutions(left[1], right[1])
  );
  const resolutionIds = new Map(
    sortedResolutions.map(([key], index) => [key, formatResolutionId(index)])
  );
  const projectedStyles = [...styles.values()]
    .map((style): TypographyStyleGroup => {
      const { resolutionKey, variants, ...group } = style;
      return {
        ...group,
        resolutionId: resolutionIds.get(resolutionKey) ?? "F00",
        variants: [...variants.values()].sort(compareVariants),
      };
    })
    .sort(compareStyles);

  return {
    resolutions: sortedResolutions.map(([key, resolution]) => ({
      ...resolution,
      id: resolutionIds.get(key) ?? "F00",
    })),
    coreStyles: projectedStyles.filter(
      (style) => style.usageCount >= CORE_STYLE_MIN_USAGE
    ),
    rareStyles: projectedStyles.filter(
      (style) => style.usageCount < CORE_STYLE_MIN_USAGE
    ),
  };
}

function formatResolutionId(index: number): string {
  return `F${String(index + 1).padStart(2, "0")}`;
}

function sourceStyle(token: TypographyToken): TypographySourceStyle {
  return {
    familyStack: token.familyStack,
    family: token.family,
    weight: token.weight,
    style: token.style,
  };
}

function groupKey(
  source: TypographySourceStyle,
  resolution: FontDiagnostic
): string {
  return JSON.stringify([
    source.familyStack,
    source.weight,
    source.style,
    resolution.status,
    resolution.source ?? null,
    resolution.resolvedFamily ?? null,
    resolution.resolvedWeight ?? null,
    resolution.resolvedItalic ?? null,
  ]);
}

function metricKey(
  lineHeight: TypographyLineHeight,
  letterSpacing: TypographyLetterSpacing
): string {
  return JSON.stringify([lineHeight, letterSpacing]);
}

function compareResolutions(
  left: MutableResolutionGroup,
  right: MutableResolutionGroup
): number {
  return (
    right.usageCount - left.usageCount ||
    compareSourceStyles(left, right) ||
    compareResolution(left.resolution, right.resolution)
  );
}

function compareStyles(
  left: TypographyStyleGroup,
  right: TypographyStyleGroup
): number {
  return (
    right.usageCount - left.usageCount ||
    right.fontSizePx - left.fontSizePx ||
    compareSourceStyles(left, right) ||
    compareResolution(left.resolution, right.resolution)
  );
}

function compareSourceStyles(
  left: TypographySourceStyle,
  right: TypographySourceStyle
): number {
  return (
    left.familyStack.join(", ").localeCompare(right.familyStack.join(", ")) ||
    left.weight - right.weight ||
    left.style.localeCompare(right.style)
  );
}

function compareResolution(
  left: FontDiagnostic,
  right: FontDiagnostic
): number {
  return (
    left.status.localeCompare(right.status) ||
    (left.resolvedFamily ?? "").localeCompare(right.resolvedFamily ?? "") ||
    (left.resolvedWeight ?? 0) - (right.resolvedWeight ?? 0) ||
    Number(left.resolvedItalic ?? false) - Number(right.resolvedItalic ?? false)
  );
}

function compareVariants(
  left: TypographyMetricVariant,
  right: TypographyMetricVariant
): number {
  return (
    right.usageCount - left.usageCount ||
    compareMetric(left.lineHeight, right.lineHeight) ||
    compareMetric(left.letterSpacing, right.letterSpacing)
  );
}

function compareMetric(
  left: TypographyLineHeight | TypographyLetterSpacing,
  right: TypographyLineHeight | TypographyLetterSpacing
): number {
  if (left.kind !== right.kind) {
    return left.kind.localeCompare(right.kind);
  }
  return left.kind === "px" && right.kind === "px"
    ? left.value - right.value
    : 0;
}
