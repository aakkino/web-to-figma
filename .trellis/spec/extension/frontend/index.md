# Browser Extension Guidelines

`apps/extension` is a WXT + React browser extension with three execution
contexts: popup, content script, and background service worker. Correctness
depends on keeping their permissions, message contracts, and user-activation
flow explicit.

## Guides

| Guide | Focus |
| --- | --- |
| [Architecture](./architecture.md) | Entrypoints and popup-to-content conversion flow |
| [Messaging And Security](./messaging-and-security.md) | Typed messages, privileged fetch, user activation |
| [Loaders And Conversion](./loaders-and-conversion.md) | Converter lifetime, page fonts/images, DOM cleanup |
| [Components And State](./components-and-state.md) | React state, effects, picker, theme |
| [Testing And Quality](./testing-and-quality.md) | Type/build gates and manual extension checks |

## Pre-Development Checklist

1. Read [Repository Conventions](../../guides/repository-conventions.md).
2. Identify the runtime context for each edit. APIs available in popup,
   content, and background are not interchangeable.
3. Read Messaging And Security before changing host permissions, fetch,
   events, clipboard timing, or `ProtocolMap`.
4. Read the `dom-to-figma` package specs before changing converter
   configuration or loader contracts.
5. Read Components And State before adding document/window listeners.

