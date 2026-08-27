# Fractional Geometry Conflict

## Goal

Retain useful fractional element/frame geometry without taking upstream text-buffer removal.

## Dependency

This is B4 in `(B1 || B2 || B3 || B4) -> I1 -> G1`. It has no cohort dependency; I1 must wait for B1-B4.

## Requirements

- Preserve measured fractional element and frame dimensions.
- Preserve alignment-aware text width buffer, nowrap sizing, composed traversal, and exact stack text behavior.
- Cover inline, transparent, hairline, and non-Auto Layout geometry cases.

## Acceptance Criteria

- [ ] Fractional frame browser tests pass without changing text buffer behavior.
- [ ] Text, layout, Auto Layout, and border negative regressions pass.
