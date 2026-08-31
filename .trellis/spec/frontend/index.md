# Frontend Development Guidelines

The application is a Vue 3, JavaScript, Vite single-page tool. Its primary UI
is one `App.vue` screen backed by immutable probe data, pure detection helpers,
and an API transport module. `src/lib/api.js` performs URL normalization, HTTP
requests, and stream reading, so it is not a pure module. The runtime-neutral
proxy module also lives under `src/lib/`, but Pages and Vite backend adapters
consume it rather than `App.vue`.

## Pre-Development Checklist

- Read [Directory Structure](./directory-structure.md) before adding UI or a
  client module.
- Read [Component Guidelines](./component-guidelines.md) before editing
  `App.vue`.
- Read [State Management](./state-management.md) for reactive flow changes.
- Read [Type Safety](./type-safety.md) before adding validation or data shapes.
- Read [Quality Guidelines](./quality-guidelines.md) before finishing UI work.

## Guides

| Guide | Scope |
| --- | --- |
| [Directory Structure](./directory-structure.md) | Design context, Vue entrypoint, UI, data, utilities, and styles |
| [Component Guidelines](./component-guidelines.md) | Single-file component, product design, and accessibility conventions |
| [Hook Guidelines](./hook-guidelines.md) | Current absence of composables/hooks |
| [State Management](./state-management.md) | Composition API local state and derived state |
| [Type Safety](./type-safety.md) | JavaScript runtime validation and data contracts |
| [Quality Guidelines](./quality-guidelines.md) | Vitest, Playwright coverage boundaries, responsive, and a11y checks |
