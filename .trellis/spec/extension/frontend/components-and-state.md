# Components And State

## State Placement

Use local React state for short-lived UI:

- popup `error` and `busy`;
- content `pickerActive`;
- picker highlight rectangle.

The only cross-context persisted UI state is the theme preference, stored by
WXT `storage.defineItem` in `shared/theme.ts`. Do not add global state
infrastructure for state owned by one entrypoint.

## Effects And Cleanup

Every observer or global listener must have an explicit cleanup path.

- Theme hooks return the storage watcher/subscription cleanup.
- Page theme observation disconnects MutationObserver and media listeners.
- Picker listeners share one AbortController, chain to `ctx.signal`, cancel a
  pending animation frame, and restore the previous page cursor.
- Trigger helpers return an unsubscribe function.

Use a ref for mutable event data that should not rebind effects. `Picker` keeps
the hovered target in `targetRef` and stores only the renderable rectangle in
state.

## Picker Interaction

Document listeners run in capture phase so page handlers cannot steal the
selection. Events originating in the extension shadow UI are ignored through
`event.composedPath()`. Confirm/cancel actions prevent and stop the page event.
Scroll and resize measurements are coalesced through one animation frame.

Preserve keyboard navigation, Escape cancellation, Enter confirmation, and
the document cursor cleanup when extending the picker.

## Shared UI

Import primitives through explicit `@figit/ui/components/*` subpaths. Pass
accessible state through semantic HTML/ARIA:

- theme selector is a radiogroup with radio buttons;
- errors use `role="alert"`;
- picker hint uses `role="status"`;
- icon-only controls have labels.

Use local components only when the interaction is extension-specific; reusable
primitives belong in `internal/ui`.

