import type {
  ImageBlobInfo,
  ImageFile,
  ImageLoader,
  ImageRequest,
} from "./nodes/image/loader";
import { processImageFile } from "./nodes/image/loader";

export type ImagePlaceholderReason =
  | "user-skipped"
  | "load-failed"
  | "budget-skipped"
  | "unplanned-late";

export type PreparedImage = ImageBlobInfo & {
  /** Final Figma-ready byte count used by the capture memory budget. */
  byteLength: number;
};

export type ImageResolution =
  | { kind: "image"; image: PreparedImage }
  | { kind: "placeholder"; reason: ImagePlaceholderReason };

export type ImagePreparation = {
  /** Prepare one resolved image source before DOM conversion. */
  prepare(
    request: ImageRequest,
    signal?: AbortSignal
  ): Promise<ImageResolution>;
  /** Resolve a source during conversion without starting new work. */
  resolve(request: ImageRequest): ImageResolution;
  /** Mark a source as a deliberate conversion-time placeholder. */
  setPlaceholder(
    request: Pick<ImageRequest, "src"> & Partial<Pick<ImageRequest, "element">>,
    reason: ImagePlaceholderReason
  ): void;
  clear(): void;
};

/**
 * Build the optional preparation capability used by staged consumers.
 *
 * The capability owns both processing and the conversion-time lookup. This is
 * important because caching the raw loader response alone cannot prove that
 * format conversion and Figma hashing happened before the conversion walk.
 */
export function createImagePreparation(
  imageLoader: ImageLoader
): ImagePreparation {
  const resolutions = new Map<string, ImageResolution>();
  const inFlight = new Map<string, Promise<ImageResolution>>();
  const elementSources = new WeakMap<HTMLImageElement, string>();

  return {
    prepare(request, signal) {
      const key = imageKey(request);
      elementSources.set(request.element, key);
      const cached = resolutions.get(key);
      if (cached) {
        return Promise.resolve(cached);
      }

      const existing = inFlight.get(key);
      if (existing) {
        return existing;
      }

      const pending = imageLoader({ ...request, signal })
        .then((file: ImageFile) => processImageFile(file, signal))
        .then((info) => {
          throwIfAborted(signal);
          const prepared: ImageResolution = {
            kind: "image",
            image: {
              ...info,
              byteLength: info.bytes.length,
            },
          };
          resolutions.set(key, prepared);
          return prepared;
        })
        .finally(() => {
          if (inFlight.get(key) === pending) {
            inFlight.delete(key);
          }
        });

      inFlight.set(key, pending);
      return pending;
    },

    resolve(request) {
      const key = elementSources.get(request.element) ?? imageKey(request);
      return (
        resolutions.get(key) ?? {
          kind: "placeholder",
          reason: "unplanned-late",
        }
      );
    },

    setPlaceholder(request, reason) {
      const key = imageKey(request);
      if (request.element) {
        elementSources.set(request.element, key);
      }
      resolutions.set(key, { kind: "placeholder", reason });
    },

    clear() {
      resolutions.clear();
      inFlight.clear();
    },
  };
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new Error("Image preparation aborted");
  }
}

function imageKey(request: Pick<ImageRequest, "src">): string {
  return request.src;
}
