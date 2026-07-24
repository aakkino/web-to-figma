import { DedupCache } from "./dedup-cache";
import type {
  FontLoader,
  FontProperties,
  LoadedFont,
} from "./nodes/text/primitives/font/loader";
import { loadFont } from "./nodes/text/primitives/font/loader";

export type FontCache = DedupCache<FontProperties, LoadedFont>;

export function createFontCache(fontLoader: FontLoader): FontCache {
  return new DedupCache({
    load: (properties) => loadFont(fontLoader, properties),
    toCacheKey: ({ family, weight, italic, codePoints }) =>
      `${family}:${weight}:${italic}:${normalizeCodePoints(codePoints).join(",")}`,
  });
}

function normalizeCodePoints(
  codePoints: ReadonlyArray<number> | undefined
): ReadonlyArray<number> {
  return [...new Set(codePoints ?? [])].sort((left, right) => left - right);
}
