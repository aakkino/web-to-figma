import type { Position } from "../../dom";
import type { ImageCache } from "../../image-cache";
import { parseBorderFromComputedStyle } from "../../styles/border";
import { parseOpacity } from "../../styles/opacity";
import { cssBoxShadowToFigmaEffects } from "../../styles/shadow";
import type {
  FigmaBlob,
  FigmaGuid,
  FigmaNodeChange,
  FigmaRoundedRectangleNodeChange,
} from "../../types";
import { resolveImagePresentation } from "./presentation";

type Params = {
  guid: FigmaGuid;
  parentGuid: FigmaGuid;
  childIndex: number;
  position: Position;
  registerBlob: (blob: FigmaBlob) => number;
  imageCache: ImageCache;
};

export async function elementToImageNodeChange(
  element: HTMLImageElement,
  options: Params
): Promise<FigmaRoundedRectangleNodeChange> {
  const { guid, parentGuid, childIndex, position, registerBlob, imageCache } =
    options;

  const rect = element.getBoundingClientRect();
  const view = element.ownerDocument.defaultView;
  if (!view) {
    throw new Error("Image element has no owning window");
  }
  const computedStyle = view.getComputedStyle(element);

  const width = Math.ceil(rect.width);
  const height = Math.ceil(rect.height);

  const boxShadow = computedStyle.boxShadow;
  const effects = cssBoxShadowToFigmaEffects(boxShadow);
  const opacity = parseOpacity(computedStyle.opacity);

  // Parse border information (includes border radius)
  const borderProperties = parseBorderFromComputedStyle(computedStyle, {
    width,
    height,
  });

  const image = await imageCache.get(element);
  const blobIndex = registerBlob({ bytes: image.bytes });
  const intrinsicWidth = image.width ?? element.naturalWidth;
  const intrinsicHeight = image.height ?? element.naturalHeight;
  const presentation = resolveImagePresentation({
    fit: computedStyle.objectFit,
    position: computedStyle.objectPosition,
    box: { width, height },
    intrinsic: {
      width: intrinsicWidth,
      height: intrinsicHeight,
    },
  });

  const nodeChange: FigmaNodeChange = {
    /* General Info */
    guid,
    phase: "CREATED",
    parentIndex: {
      guid: parentGuid,
      position: childIndex.toString(),
    },
    type: "ROUNDED_RECTANGLE",
    name: "Image",
    visible: true,
    opacity,

    /* Size and Position */
    size: {
      x: width,
      y: height,
    },
    transform: {
      m00: 1.0,
      m01: 0.0,
      m02: position.x,
      m10: 0.0,
      m11: 1.0,
      m12: position.y,
    },

    /* Stroke and Corner Radius */
    strokeAlign: "INSIDE",
    strokeJoin: "MITER",
    ...borderProperties,

    /* Fill */
    fillPaints: [
      {
        type: "IMAGE" as const,
        opacity: 1.0,
        visible: true,
        blendMode: "NORMAL" as const,
        transform: presentation.transform,
        image: {
          hash: image.hash,
          dataBlob: blobIndex,
        },
        imageScaleMode: presentation.imageScaleMode,
        originalImageWidth: intrinsicWidth || undefined,
        originalImageHeight: intrinsicHeight || undefined,
      },
    ],

    /* Effects */
    effects,

    /* Aspect Ratio */
    targetAspectRatio: {
      value: {
        x: width,
        y: height,
      },
    },
  };

  return nodeChange;
}
