# Effects Evolution

## Goal

Adapt text/drop shadows, color matrices, and CSS-sigma-to-Figma blur/backdrop-filter parity.

## Dependency

This is B3 in `(B1 || B2 || B3 || B4) -> I1 -> G1`. It has no cohort dependency; I1 must wait for B1-B4.

## Requirements

- Preserve composed-tree visual-leaf gating and frame/text contracts.
- Keep pure-ring shadow precedence and avoid duplicate promoted effects.
- Map CSS blur sigma to a Figma radius of `2x`.

## Acceptance Criteria

- [ ] Effect unit/browser and composed traversal regressions pass.
- [ ] No filter is baked into a non-leaf composed subtree.
