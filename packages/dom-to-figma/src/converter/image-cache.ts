import { DedupCache } from "./dedup-cache";
import type { ImageBlobInfo, ImageLoader } from "./nodes/image/loader";
import { processImageFile } from "./nodes/image/loader";

export type ImageCache = DedupCache<HTMLImageElement, ImageBlobInfo>;

export function createImageCache(imageLoader: ImageLoader): ImageCache {
  return new DedupCache({
    load: (element) => {
      const request = {
        src: element.currentSrc || element.src,
        element,
      };
      return imageLoader(request).then(processImageFile);
    },
    toCacheKey: (element) => element.currentSrc || element.src,
  });
}
