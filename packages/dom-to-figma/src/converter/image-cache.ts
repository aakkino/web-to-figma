import { DedupCache } from "./dedup-cache";
import type { ImageBlobInfo, ImageLoader } from "./nodes/image/loader";
import { processImageFile } from "./nodes/image/loader";

export type ImageSourceResolver = (element: HTMLImageElement) => string | null;

export type ImageCache = {
  get(element: HTMLImageElement): Promise<ImageBlobInfo>;
  getBySource(src: string, element: HTMLImageElement): Promise<ImageBlobInfo>;
  clear(): void;
};

export function createImageCache(
  imageLoader: ImageLoader,
  resolveSource: ImageSourceResolver = defaultImageSourceResolver
): ImageCache {
  const sourceCache = new DedupCache<
    { src: string; element: HTMLImageElement },
    ImageBlobInfo
  >({
    load: ({ src, element }) =>
      imageLoader({ src, element }).then(processImageFile),
    toCacheKey: ({ src }) => src,
  });

  return {
    get(element) {
      const src = resolveSource(element) ?? defaultImageSourceResolver(element);
      if (!src) {
        return Promise.reject(
          new Error("Image element has no prepared source")
        );
      }
      return sourceCache.get({ src, element });
    },
    getBySource(src, element) {
      return sourceCache.get({ src, element });
    },
    clear() {
      sourceCache.clear();
    },
  };
}

function defaultImageSourceResolver(element: HTMLImageElement): string | null {
  return element.currentSrc || element.src || null;
}
