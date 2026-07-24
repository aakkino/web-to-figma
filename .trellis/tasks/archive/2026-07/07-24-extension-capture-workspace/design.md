# 技术设计

## 设计目标

用一个页面内、非模态的捕获工作区替代 browser-action popup。工作区负责用户交互和会话呈现，但不实现资源算法、转换器细节或文件格式。

## Runtime Flow

```text
toolbar action click
      |
      v
background action router
  - validate active tab / restricted page
  - send openWorkspace(tabId)
      |
      v
content script ShadowRoot
  WorkspaceController (one per tab/document)
      | commands              ^ capture events
      v                       |
  CaptureEngine port ---------+
      |
      +--> OutputPort (wired by .figit child)
```

The content script remains declared for `<all_urls>` at `document_idle` and mounts a Shadow host. The workspace surface starts hidden. The toolbar message changes visibility/focus only; it never selects a target or starts analysis.

Removing the popup requires an explicit manifest `action` declaration so Chromium and Firefox still expose a toolbar button. Background uses the WXT/browser compatibility layer and a typed message. It catches missing receivers and restricted-page failures.

## Restricted Pages

Browser-internal pages and extension stores cannot host the content script. The deterministic fallback is an extension-owned error surface that explains capture is unavailable without requesting more permissions. Browser smoke decides whether action badge/title feedback is sufficiently visible; otherwise background opens one small extension-owned error page. Failures are always caught and never logged as an unhandled message rejection.

## Controller Architecture

`WorkspaceController` is a framework-independent store/reducer with injected ports:

- `CaptureEnginePort`: analyze and legal recovery/cancel commands, plus event subscription;
- `SettingsRepository`: load and explicitly save global defaults;
- `OutputPort`: open package and execute selected sinks after the artifact child lands;
- `Clock`/id factory for deterministic tests.

The controller owns one `tabSession` for the life of the content document. React subscribes to immutable snapshots and dispatches commands. Components never hold the authoritative capture Promise or resource counters.

Each async operation is tagged with session id and operation id. The controller ignores events whose id no longer matches. Buttons that issue an async command disable until the corresponding transition/event, preventing double starts while still allowing explicit cancellation.

## Workspace View States

The view model is derived from controller state rather than duplicating the engine state machine:

- `closed` / `idle`;
- `picking`;
- `analyzing` / `review`;
- image progress, image failure review, soft/hard budget review;
- font progress and strict-font review;
- settle/convert progress;
- `ready-to-output`;
- output progress, partial result, completed;
- canceled or recoverable/fatal error.

Opening the toolbar while closed restores the last non-picker state. Opening while minimized restores the panel. Opening while already visible focuses the panel's meaningful heading or first command and does not toggle it off.

Closing hides the surface but retains the session. Cancel is available only for an active capture and sends engine cancellation. A new target after a terminal session starts a new session and releases the old prepared result.

## Panel Structure And Interaction

The Shadow host remains fixed full viewport with `pointer-events: none`; only the panel, progress button, picker controls and file input surface enable pointer events.

```text
right/top 16px
width: min(380px, calc(100vw - 32px))
max-height: calc(100vh - 32px)
internal overflow: auto

running minimized button:
right/bottom 16px
stable icon/progress dimensions
```

The panel is an unframed operational surface with restrained sections, not cards nested inside cards. Header controls use the existing icon library for minimize and close, with accessible labels/tooltips. Stage progress uses a native/accessible progress representation plus exact counts; content changes cannot resize the outer toolbar controls.

No drag/resize gesture is registered. Narrow viewports retain 16px margins and wrap labels rather than shrinking typography with viewport width. The panel uses the existing extension/UI design tokens and automatic page theme behavior.

## Entry Actions And Picker

Idle shows three direct commands: capture whole page, pick element and open `.figit`. Whole page passes `document.body` with derived metadata to analysis. Pick element minimizes the panel and activates existing document-level capture listeners.

Picker behavior is retained and adjusted:

- events whose composed path includes the Shadow host are excluded;
- selected zero-size elements return a recoverable selection error before analysis;
- confirm returns the element to controller analysis rather than copying immediately;
- Escape/cancel restores the state that launched picker;
- listeners and cursor changes are bound to a local controller chained to WXT `ctx.signal`.

The capture classifier continues to exclude the extension host through the adapter bridge so panel DOM never appears in the payload.

## Settings Model

Settings use a project-owned, versioned record:

```text
version
image.mode: process | skip
font.mode: compatible | fast-local | strict
outputs.clipboard: boolean
outputs.file: boolean
advanced.layout: auto | absolute
advanced.motion: freeze | live
advanced.lineBreaks: auto | off
advanced.settleTimeoutMs: bounded integer
```

The repository is backed by WXT/browser `storage.local`. On load it validates and migrates known older shapes, fills missing fields from defaults and discards invalid values safely. At least one output is enforced in the domain validator, not only disabled in JSX.

UI edits update `draftSettings` in memory. Starting analysis/capture snapshots `effectiveSettings`. Only `setAsDefault()` validates and writes the global value. The ready artifact records effective settings, so changing the draft later cannot rewrite what was captured.

No tab session, URL, resource list, artifact or failure is written to storage. Navigation/refresh naturally destroys the content document and its session.

## Engine Event Presentation

The controller maps engine events to compact factual UI:

- review: image nodes, unique resources and unsupported CSS references;
- image progress: completed/total, failures, elapsed, MiB;
- image recovery: retry failed, continue with placeholders, cancel;
- soft budget: continue, placeholder remaining, cancel;
- hard budget: placeholder remaining, cancel;
- font progress: completed/total and current mode;
- strict failure: retry, switch compatible, cancel;
- settle/convert: named stage and elapsed, no ETA;
- ready: selected output command only, with settings/diagnostic summary available without feature-tour copy.

Only valid commands for the current decision token are rendered. A stale click after a transition is rejected by the controller even if a browser queued it.

## Output Integration Port

The workspace defines an upstream-independent `OutputPort` contract:

- consume an immutable prepared capture and selected destinations;
- emit per-sink pending/success/failure results;
- retry a named failed sink without invoking capture;
- open a user-selected package and return a validated prepared capture.

This task can test the ready/output state with a fake port. The `.figit` child owns the concrete schema, file input, clipboard and download implementations and then wires them through this port.

## Testing Strategy

- Pure controller tests cover state/event/command behavior, stale ids, double clicks, minimize/restore, settings snapshots and output retries.
- Storage tests cover defaults, explicit save, invalid/migrated data and zero-output rejection.
- Component tests cover action availability, accessible names, focus restore, responsive class/style contracts and progress text.
- Picker browser tests cover page interaction, UI exclusion, cancel/confirm and listener cleanup.
- Extension smoke covers toolbar action, restricted page fallback, whole-page/element flows, page refresh reset and Chromium/Firefox builds.

## Rollout And Rollback

Land controller/settings and an inactive panel shell first. Remove the popup and switch action routing only after toolbar-to-content smoke passes. Keep the old conversion entrypoint callable until the resource child port is integrated, but do not expose both popup and workspace as simultaneous primary flows.

If action routing is unreliable in one browser, roll back the manifest/popup switch while retaining controller tests and panel code. Do not compensate with broader host or notification permissions without a new review.
