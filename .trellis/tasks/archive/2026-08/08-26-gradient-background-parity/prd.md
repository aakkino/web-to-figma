# Gradient And Background Parity

## Goal

Adapt radial, angled, explicit-stop, conic, and repeating gradients to current fork main.

## Dependency

This is B2 in `(B1 || B2 || B3 || B4) -> I1 -> G1`. It has no cohort dependency; I1 must wait for B1-B4.

## Requirements

- Preserve gradient paint order and text clipping integration.
- Exclude the mixed object-fit slice and local CSS raster background product work.
- Regress the fork's complete object-fit/object-position behavior.

## Acceptance Criteria

- [ ] Gradient unit and browser payload tests pass.
- [ ] Image presentation tests remain green.
