# Layout And Parity

## Safe Inference Rule

`createFigmaConverter` defaults to `layout: "auto"`. Auto-layout is an
opportunistic enhancement: `inferAutoLayout(element)` returns a complete stack
description only when measured browser geometry matches Figma's model. A
`null` result means the frame keeps `stackMode: "NONE"` and absolute positions.

Never approximate an unsupported layout merely to emit auto-layout. The
absolute fallback is the correctness baseline.

## Supported Shape

`converter/layout/infer.ts` currently handles verified forms of:

- row/column flex, including reverse directions;
- uniform flex wrapping;
- plain block flow as a vertical stack;
- uniform grids that match greedy wrapped-stack behavior;
- absolute/fixed children as `stackPositioning: "ABSOLUTE"`;
- equal-share grow and verified cross-axis stretch;
- content-driven hug sizing where Typed OM preserves the keyword.

It deliberately bails on cases such as direct non-empty text flow items,
non-zero CSS `order`, floats, non-uniform gaps, unsupported wrap directions,
and geometry outside the 0.6 px inference tolerance.

## Geometry Invariants

- Use measured rectangles as the authority and verify the proposed stack before
  returning it.
- Inside a verified stack, keep exact fractional child sizes. Rounding each
  child accumulates visible drift.
- Fold borders into inferred stack padding because Figma stack padding starts
  at the outer frame edge.
- Mark fill/stretch only when the measured result matches Figma's equal-fill
  or inner-cross-size model. A fixed child with correct geometry is preferable
  to incorrect resize semantics.
- When reverse flow changes emission order, pair it with
  `stackReverseZIndex` so paint order stays correct.
- Root fill can override an otherwise content-driven sizing mode when the
  measured root and paste-template frame disagree.

## Parity Evidence

Behavioral changes must be represented at the lowest useful level:

- inference branch or fallback: `figma.autolayout.browser.test.ts`;
- DOM geometry/positioning: `figma.layout.browser.test.ts` and focused browser
  suites;
- Figma-normalized behavior: oracle fixture in
  `src/__fixtures__/oracle/`, created only after a clean paste round-trip;
- corpus regression: a minimal scene under
  `scripts/oracle-scenes/<domain>/` plus `pnpm oracle:parity`.

Do not widen `GEOMETRY_TOLERANCE` or oracle tolerances to make a fix pass.
Tolerance changes are calibration decisions owned by the oracle harness.

