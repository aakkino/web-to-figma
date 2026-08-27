# Border Evolution

## Goal

Rebuild upstream-final border behavior on current fork main without replaying upstream commits.

## Dependency

This is B1 in `(B1 || B2 || B3 || B4) -> I1 -> G1`. It has no cohort dependency; I1 must wait for B1-B4.

## Requirements

- Support double, dotted, dashed/per-side, 3D, rounded dash, outline-offset, and subpixel borders.
- Preserve per-side fallback, unique reserved child indices, Auto Layout, composed order, and ring-shadow precedence.
- Do not import oracle baselines or cherry-pick source commits.

## Acceptance Criteria

- [ ] Focused parser, decomposition, browser, Auto Layout, and composed-order tests pass.
- [ ] Exact upstream files and locally adapted integration paths are separately identified for governance.
