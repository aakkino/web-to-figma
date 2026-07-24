import { DedupCache } from "./dedup-cache";
import type { ImagePreparation, ImageResolution } from "./image-preparation";
import type { ImageLoader } from "./nodes/image/loader";
import { processImageFile } from "./nodes/image/loader";

export type ImageCache = DedupCache<HTMLImageElement, ImageResolution>;

export function createImageCache(
  imageLoader: ImageLoader,
  imagePreparation?: ImagePreparation
): ImageCache {
  return new DedupCache({
    load: (element) => {
      const request = {
        src: element.currentSrc || element.src,
        element,
      };
      if (imagePreparation) {
        return Promise.resolve(imagePreparation.resolve(request));
      }
      return imageLoader(request)
        .then(processImageFile)
        .then((image) => ({
          kind: "image" as const,
          image: { ...image, byteLength: image.bytes.length },
        }));
    },
    toCacheKey: (element) => element.currentSrc || element.src,
  });
}
