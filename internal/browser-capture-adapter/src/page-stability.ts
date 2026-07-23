import { getComposedChildNodes } from "@figit/dom-to-figma";
import type { PageSettleDiagnostics, PageSettleOptions } from "./types";

const DEFAULT_TIMEOUT_MS = 5000;

export async function waitForPageToSettle(
  root: Element,
  options: PageSettleOptions = {}
): Promise<PageSettleDiagnostics> {
  const timeoutMs = Math.max(0, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  if (timeoutMs === 0) {
    return {
      timeoutMs,
      timedOut: false,
      phase: "skipped",
      pendingFonts: false,
      pendingImages: 0,
      waitedForImages: 0,
      frameCount: 0,
      errors: [],
    };
  }

  const document = root.ownerDocument;
  const view = document.defaultView;
  const images = collectImages(root);
  const errors: Array<string> = [];
  const controller = new AbortController();
  let timedOut = false;
  let phase: PageSettleDiagnostics["phase"] = "fonts";
  let fontsSettled = !document.fonts?.ready;
  let waitedForImages = 0;
  let frameCount = 0;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<"timeout">((resolve) => {
    timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
      resolve("timeout");
    }, timeoutMs);
  });

  const resourcesPromise = Promise.all([
    waitForFonts(
      document,
      controller.signal,
      () => {
        fontsSettled = true;
      },
      errors
    ),
    waitForImages(images, controller.signal, errors).then((count) => {
      waitedForImages = count;
    }),
  ]).then(() => "complete" as const);

  try {
    const resources = await Promise.race([resourcesPromise, timeoutPromise]);
    if (resources === "timeout") {
      if (!fontsSettled) {
        phase = "fonts";
      } else if (images.some((image) => !image.complete)) {
        phase = "images";
      } else {
        phase = "layout";
      }
      await Promise.allSettled([resourcesPromise]);
    } else {
      phase = "layout";
      for (let index = 0; index < 2; index += 1) {
        const completed = await waitForFrame(view, controller.signal);
        if (!completed) {
          timedOut = true;
          phase = "layout";
          break;
        }
        frameCount += 1;
      }
    }
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    controller.abort();
  }

  const pendingImages = images.filter((image) => !image.complete).length;
  if (!timedOut && phase === "layout") {
    phase = "complete";
  }

  return {
    timeoutMs,
    timedOut,
    phase,
    pendingFonts: !fontsSettled,
    pendingImages,
    waitedForImages,
    frameCount,
    errors,
  };
}

function collectImages(root: Element): Array<HTMLImageElement> {
  const images: Array<HTMLImageElement> = [];
  const visit = (element: Element) => {
    if (element.localName.toLowerCase() === "img") {
      images.push(element as HTMLImageElement);
      return;
    }
    for (const node of getComposedChildNodes(element)) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        visit(node as Element);
      }
    }
  };

  visit(root);
  return [...new Set(images)];
}

async function waitForFonts(
  document: Document,
  signal: AbortSignal,
  onSettled: () => void,
  errors: Array<string>
): Promise<void> {
  const ready = document.fonts?.ready;
  if (!ready) {
    onSettled();
    return;
  }

  await Promise.race([
    ready.catch((error: unknown) => {
      errors.push(`document.fonts.ready: ${toErrorMessage(error)}`);
    }),
    waitForAbort(signal),
  ]);
  if (!signal.aborted) {
    onSettled();
  }
}

async function waitForImages(
  images: ReadonlyArray<HTMLImageElement>,
  signal: AbortSignal,
  errors: Array<string>
): Promise<number> {
  let completed = 0;
  await Promise.all(
    images.map(async (image) => {
      const outcome = await waitForImage(image, signal);
      if (outcome === "complete") {
        completed += 1;
      }
      if (outcome === "error") {
        completed += 1;
        errors.push(`image failed to load: ${image.currentSrc || image.src}`);
      }
    })
  );
  return completed;
}

function waitForImage(
  image: HTMLImageElement,
  signal: AbortSignal
): Promise<"complete" | "error" | "aborted"> {
  if (image.complete) {
    return Promise.resolve(image.naturalWidth === 0 ? "error" : "complete");
  }
  if (signal.aborted) {
    return Promise.resolve("aborted");
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (outcome: "complete" | "error" | "aborted") => {
      if (settled) {
        return;
      }
      settled = true;
      image.removeEventListener("load", onLoad);
      image.removeEventListener("error", onError);
      signal.removeEventListener("abort", onAbort);
      resolve(outcome);
    };
    const onLoad = () => finish("complete");
    const onError = () => finish("error");
    const onAbort = () => finish("aborted");

    image.addEventListener("load", onLoad, { once: true });
    image.addEventListener("error", onError, { once: true });
    signal.addEventListener("abort", onAbort, { once: true });

    if (image.complete) {
      finish(image.naturalWidth === 0 ? "error" : "complete");
    }
  });
}

function waitForFrame(
  view: Window | null,
  signal: AbortSignal
): Promise<boolean> {
  if (signal.aborted) {
    return Promise.resolve(false);
  }
  if (!view) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    let settled = false;
    let frameId: number | undefined;
    const finish = (completed: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      if (frameId !== undefined) {
        view.cancelAnimationFrame(frameId);
      }
      signal.removeEventListener("abort", onAbort);
      resolve(completed);
    };
    const onAbort = () => finish(false);
    signal.addEventListener("abort", onAbort, { once: true });
    frameId = view.requestAnimationFrame(() => finish(true));
  });
}

function waitForAbort(signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    signal.addEventListener("abort", () => resolve(), { once: true });
  });
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
