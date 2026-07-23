# Architecture

## Runtime Entrypoints

- `entrypoints/popup/` is the 320 px action UI. It finds the active tab and
  injects a synchronous trigger into that tab.
- `entrypoints/content/` mounts a WXT shadow-root overlay, receives triggers,
  picks DOM elements, runs `@figit/dom-to-figma`, and writes to the clipboard.
- `entrypoints/background.ts` is a service worker with privileged host access.
  It fetches public image/font bytes when page-context fetch is blocked by CORS.
- `shared/` contains the contracts used by more than one context: messaging,
  trigger names, theme storage, binary transport, errors, and loaders.

Do not import popup/content DOM code into the service worker. Put a value in
`shared/` only when its runtime dependencies are valid in every context that
imports it.

## Trigger And Conversion Flow

The current whole-page flow is:

~~~text
popup click
  -> browser.scripting.executeScript
  -> synchronous CustomEvent in the tab
  -> content listener
  -> browser capture adapter
  -> dom-to-figma conversion and cleanup
  -> navigator.clipboard.write
~~~

Element picking uses the same event to activate `Picker` first, then converts
the confirmed element.

The synchronous injected event is load-bearing: it carries the popup's user
activation into the isolated content world so clipboard write remains allowed.
Do not insert an asynchronous message hop between the injected function and
the initial content listener without re-verifying clipboard permissions in
Chrome, Edge, Firefox, and Safari-equivalent WebExtension behavior.

## Shadow UI

`entrypoints/content/index.tsx` mounts through `createShadowRootUi` with
`cssInjectionMode: "ui"`. The host tag is the shared
`SHADOW_HOST_NAME`, and the converter classifier skips that host so extension
chrome never appears in the Figma payload.

Content CSS imports shared tokens and scans both `internal/ui/src` and the local
entrypoint via Tailwind `@source`. The shadow host owns fixed positioning and
defaults to `pointer-events: none`; interactive picker behavior is handled by
document capture listeners.

Reference files:

- `apps/extension/entrypoints/popup/app.tsx`
- `apps/extension/entrypoints/content/index.tsx`
- `apps/extension/entrypoints/content/convert.ts`
- `apps/extension/shared/triggers.ts`
