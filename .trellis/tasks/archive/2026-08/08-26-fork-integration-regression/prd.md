# Fork Integration And Regression

## Goal

Integrate the four verified cohorts and protect all six existing fork capabilities.

## Dependency

This is I1 in `(B1 || B2 || B3 || B4) -> I1 -> G1`. B1, B2, B3, and B4 are mandatory inputs; G1 must wait for I1.

## Requirements

- Preserve responsive Shadow DOM, composed traversal, glyph fallback, image presentation, image cancellation, and nowrap sizing.
- Translate upstream test-only intent into current focused tests without baseline/snapshot intake.
- Add one core patch changeset.

## Acceptance Criteria

- [ ] Package test/type/build and workspace gates pass.
- [ ] Oracle parity passes without baseline or tolerance changes.
