# Image Paint Representation Decision

## Verified Mapping

- CSS `fill` uses serialized `STRETCH` with an identity transform.
- Centered `contain` and `cover` use native `FIT` and `FILL` modes.
- Non-centered `contain` / `cover`, `none`, and `scale-down` use serialized
  `STRETCH` plus an affine transform from normalized node coordinates to
  normalized source-image coordinates.
- The transform is derived from the rendered object size and CSS free-space
  offset: `scale = box / rendered`, `translation = -offset / rendered`.
- Processed PNG/JPEG/GIF bytes supply intrinsic dimensions. SVG and other
  browser-decodable inputs retain the existing PNG normalization path, so the
  final PNG header supplies the same metadata without a second decode.

## Evidence

- The local Kiwi schema exposes `FIT`, `FILL`, `STRETCH`, paint transform, and
  original image dimensions without a schema change.
- Figma's official REST property documentation defines image transforms on
  serialized `STRETCH`; the Plugin API exposes the same editable mode as
  `CROP`.
- Unit tests cover all five CSS fits, positive and negative free space,
  percentages, pixels, `calc()`, keyword order, and edge offsets.
- Chromium tests assert final consumer-visible paint fields for rasterized SVG
  inputs, the reported `90 x 46` / `273 x 52` case, and direct/staged reuse.
- The new `img/img-02-object-fit` oracle scene has zero tier-0 findings and the
  full existing parity corpus has no new geometry findings.

## Live Gate Status

The local Figma Desktop bridge connected to the dedicated E2E file, but its
read API omits fill matrices. The browser-driven oracle capture could not run
because `FIGMA_STORAGE_STATE` and `FIGMA_FILE_KEY` are not configured. No Kiwi
schema, bridge contract, node hierarchy, or raster fallback was introduced.
