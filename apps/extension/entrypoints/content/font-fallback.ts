import type { FontLoader } from "@figit/browser-capture-adapter";

export type CjkFallbackWeight = 400 | 500 | 600 | 700;

export type CjkFallbackPath =
  | "/fonts/noto-sans-tc-composite-400.ttf"
  | "/fonts/noto-sans-tc-composite-500.ttf"
  | "/fonts/noto-sans-tc-composite-600.ttf"
  | "/fonts/noto-sans-tc-composite-700.ttf";

export type CjkFallbackVariant = {
  family: string;
  weight: CjkFallbackWeight;
  path: CjkFallbackPath;
};

export const CJK_FALLBACK_VARIANTS: ReadonlyArray<CjkFallbackVariant> = [
  {
    family: "Noto Sans TC Thin",
    weight: 400,
    path: "/fonts/noto-sans-tc-composite-400.ttf",
  },
  {
    family: "Noto Sans TC Thin Medium",
    weight: 500,
    path: "/fonts/noto-sans-tc-composite-500.ttf",
  },
  {
    family: "Noto Sans TC Thin SemiBold",
    weight: 600,
    path: "/fonts/noto-sans-tc-composite-600.ttf",
  },
  {
    family: "Noto Sans TC Thin",
    weight: 700,
    path: "/fonts/noto-sans-tc-composite-700.ttf",
  },
];

export function selectCjkFallbackVariant(weight: number): CjkFallbackVariant {
  return CJK_FALLBACK_VARIANTS.reduce((best, candidate) => {
    const bestDistance = Math.abs(best.weight - weight);
    const candidateDistance = Math.abs(candidate.weight - weight);
    if (candidateDistance < bestDistance) {
      return candidate;
    }
    if (candidateDistance === bestDistance && candidate.weight < best.weight) {
      return candidate;
    }
    return best;
  });
}

export function createFixedCjkFallbackLoader(
  loadBytes: (
    variant: CjkFallbackVariant,
    signal?: AbortSignal
  ) => Promise<ArrayBuffer>
): FontLoader {
  return async (request, signal) => {
    const variant = selectCjkFallbackVariant(request.weight);
    return {
      bytes: await loadBytes(variant, signal),
      resolvedFamily: variant.family,
      resolvedWeight: variant.weight,
      resolvedItalic: false,
    };
  };
}
