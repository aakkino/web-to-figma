/**
 * Tag of the custom element that hosts the shadow-root UI. The conversion's
 * classify hook skips it so the extension's own DOM never bleeds into the
 * Figma payload.
 */
export const SHADOW_HOST_NAME = "figit-copy-figma-ui";
