# Reconcile LA2 infinite-scroll stabilization

## Goal

Determine whether contained LA1 already satisfies the LA2 delayed
infinite-scroll stabilization contract, and close the historical candidate
without creating a redundant patch when current-baseline evidence passes.

## Background

- The planning target is
  `origin/main@0a311e1078c57af9cbf30a58d41c6f5fa6cbf4d8`, refreshed on
  2026-08-29 after LA1 and CP1 containment.
- Historical S59 commit `db6085e8b0d7946d1c7ad48881e782124d8a2fe0`
  is evidence only and is not an ancestor of current `main`.
- LA1 rebuilt the activation engine with a 500 ms trailing window, quiet time
  measured from the latest mutation, shared deadline/cancellation, bounded
  passes/containers/steps, scroll restoration, and a browser test covering
  delayed mutations at the trailing edge.

## Requirements

- Do not cherry-pick, replay, or transplant historical S59.
- Compare the historical failure contract against current LA1 source, browser
  tests, and the staged-resource specification.
- Run the focused lazy-activation browser suite and adapter type/build gates on
  the refreshed target.
- Classify LA2 as represented/superseded when the current implementation and
  tests prove delayed edge mutations reset the bounded quiet window and enter
  the frozen inventory.
- Return to planning before any product edit if verification exposes a real
  behavioral gap; any resulting patch must remain one independent LA2 rollback
  unit and preserve LA1 budgets, cancellation, restoration, and generic scope.

## Acceptance Criteria

- [x] Current source uses a distinct trailing window and rearms the quiet timer
      on observed mutations.
- [x] Current browser coverage includes delayed trailing-edge mutations and
      verifies the discovered resource enters inventory.
- [ ] Focused browser tests and adapter type/build checks pass on the refreshed
      target.
- [ ] The final record explicitly classifies S59 as represented/superseded or
      identifies a concrete residual gap with evidence.
- [ ] No product commit is created when the represented/superseded conclusion
      is confirmed.

## Out Of Scope

- Unbounded infinite-scroll feeds, host-specific loader hooks, new activation
  settings, or changes to image scheduling and conversion.
- Reopening LA1 architecture or modifying CP1/CP2 artifact behavior.

## Key Decision

LA2 is planned as a lightweight verification task. Current evidence indicates
no implementation is needed; a product patch is authorized only after a newly
observed current-baseline failure returns through planning.
