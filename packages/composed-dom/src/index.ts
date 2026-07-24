// biome-ignore lint/performance/noBarrelFile: this file is the package's deliberate public API boundary.
export { lightDomTree } from "./light-dom";
export { openComposedDomTree } from "./open-composed-dom";
export type { DomTreeChild, DomTreeStrategy, DomTreeVisit } from "./types";
