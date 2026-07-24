# 实施计划

## 0. Dependency And Baseline

- [x] Confirm the reviewed resource-pipeline port/events contain no upstream types and freeze the version consumed by the workspace.
- [x] Capture current popup, picker, Shadow host, theme and toolbar manifest behavior in focused tests/smoke notes.
- [x] Define the framework-independent controller ports and fake capture/output implementations.

## 1. Settings Domain And Persistence

- [x] Add versioned capture settings, defaults, validation and bounded settle timeout.
- [x] Enforce at least one output in domain code and default to clipboard only.
- [x] Implement WXT/browser `storage.local` repository with safe migration/fallback.
- [x] Keep draft/effective settings in the tab controller and write only on explicit “Set as default”.
- [x] Test first load, invalid data, partial old data, explicit save, new-tab restore and zero-output rejection.

## 2. Workspace Controller

- [x] Implement controller snapshots, commands and subscriptions independently of React.
- [x] Integrate capture engine analysis/start/recovery/cancel and gate every event by session/sequence.
- [x] Implement visible, closed, minimized and picker transitions without destroying active work.
- [x] Implement ready/output state through a fake `OutputPort`, including per-sink retry without recapture.
- [ ] Cover every state and illegal/double/stale command in deterministic unit tests.

## 3. Toolbar Action Routing

- [x] Add an explicit manifest action and remove the default popup entrypoint from the production path.
- [x] Register `action.onClicked` in background and send a typed open/restore command only to the clicked active tab.
- [x] Handle missing receiver, restricted URL and extension invalidation with caught, user-visible fallback behavior.
- [ ] Verify repeated clicks restore/focus and never toggle close or auto-start analysis.
- [x] Delete popup-only trigger/event code after the new route passes Chromium and Firefox smoke; retain shared constants only where still consumed.

## 4. Panel And Picker UI

- [x] Build the fixed right-side workspace in the existing ShadowRoot using current UI tokens and icon library.
- [x] Add idle actions, settings controls, advanced disclosure, analysis review, real stage progress and all recovery states.
- [x] Add header minimize/close controls and stable bottom-right running progress button with labels/tooltips/focus behavior.
- [x] Refactor picker confirmation to return a target for analysis instead of immediately copying; auto-minimize and restore correctly.
- [x] Ensure only UI surfaces accept pointers, page interaction remains available and extension DOM stays excluded from conversion.
- [ ] Validate desktop, narrow viewport, long localized/error text and internal scroll with screenshots or browser inspection.

## 5. Capture And Output Port Integration

- [x] Replace direct `copyWholePage` / `copyElement` Promise orchestration with controller commands against the resource engine.
- [x] Map image/font/budget decision buttons one-to-one to engine decision tokens.
- [x] Preserve immutable `PreparedCapture` in ready state and never auto-write clipboard/download at stage completion.
- [x] Expose the concrete integration point for `.figit` open and output sinks without importing its codec into controller domain code.
- [x] Remove toast-only “Copying” as the authoritative long-running state; retain concise terminal notifications only where they add value.

## 6. Validation

- [ ] Add/run controller, settings and component tests.
- [x] Run extension types, Chromium build and Firefox build.
- [ ] Load the built extension and verify toolbar open/restore, close/minimize, refresh reset and restricted-page feedback.
- [ ] Exercise whole page and picker on a normal page plus an open Shadow DOM fixture; confirm progress and panel are not captured.
- [ ] Verify storage contains only explicit global defaults and no URL, resource plan, diagnostics or payload.

## Validation Commands

```powershell
pnpm --filter extension check-types
pnpm --filter extension test
pnpm --filter extension build
pnpm --filter extension build:firefox
pnpm --filter @figit/browser-capture-adapter test
pnpm check-types
git diff --check
```

If `extension test` does not yet exist, add a focused Vitest configuration/script as part of this task rather than placing controller tests in another package.

## Review Gates

1. Port gate: controller tests run with fake capture/output ports and no upstream import.
2. Action gate: toolbar direct-open and restricted-page behavior pass in Chromium and Firefox before popup removal is finalized.
3. State gate: minimize/restore, stale events and every decision path are deterministic.
4. UI gate: responsive geometry, page pointer access, focus/accessibility and capture exclusion are manually verified.
5. Integration gate: ready state is stable for the `.figit` child and never auto-executes an output.

## Rollback Points

- If toolbar action routing fails browser smoke, restore the popup manifest path and keep the workspace hidden until corrected.
- If panel state becomes coupled to React component lifetime, stop integration and restore the controller as source of truth before adding more views.
- If picker changes break page interaction, roll back picker integration independently; do not make the whole Shadow host pointer-interactive.
- If storage migration is uncertain, fall back to validated defaults and preserve the unrecognized record rather than deleting unrelated extension storage.
