# Stabilize lazy activation at infinite-scroll edge

## Goal

Prevent infinite-scroll content from being appended after the lazy-activation
inventory has already been frozen, so delayed images are prepared instead of
becoming late placeholders during conversion.

## Confirmed Facts

- `archives.design` appends a page of items through jQuery Infinite Scroll after
  reaching the document edge, then delays and fades those items into view.
- Lazy activation currently waits two animation frames plus a fixed 100 ms
  timer after each scroll step.
- The mutation observer used by that wait does not currently extend the quiet
  window when DOM mutations occur.
- A final edge request can therefore complete after inventory analysis; those
  images are classified as unplanned late resources and rendered as
  placeholders.

## Requirements

- Give the document/container edge enough bounded dwell time for delayed
  infinite-scroll work to begin.
- Treat the quiet window as time since the latest observed mutation, rather
  than time since the observer was installed.
- Preserve the existing activation deadline, cancellation behavior, scroll
  restoration, pass limit, and total scroll-step budget.
- Keep the behavior generic; do not add host-specific detection for
  `archives.design` or jQuery Infinite Scroll.

## Acceptance Criteria

- [x] A browser test with an edge-triggered append delayed beyond 100 ms finds
  the appended image before activation returns.
- [x] Mutations extend the bounded quiet window until the DOM has remained
  quiet for the configured interval.
- [x] Existing lazy-activation browser tests continue to pass.
- [x] The browser capture adapter passes type checking and lint for the changed
  files.

## Out Of Scope

- Changing image preparation concurrency, memory budgets, or fetch timeouts.
- Adding new user-facing capture settings.
- Loading every page of an unbounded infinite-scroll feed.

## Notes

- This is a lightweight, PRD-only task as requested.
