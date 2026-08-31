# Frontend Hook Guidelines

## Current State

This is a Vue application, not a React application, and it currently has no
custom Vue composables. Stateful behavior is kept directly in `src/App.vue`
with `ref`, `reactive`, `computed`, and `onBeforeUnmount`; `src/lib/` modules
are stateless functions.

The existing lifecycle cleanup aborts the active detection controller and all
per-probe retry controllers in `onBeforeUnmount` (`src/App.vue`).

## Rules

- Do not add React-style `use*` hooks; there is no React dependency or hook
  convention in `package.json`.
- Keep simple, screen-private reactive state in `App.vue`.
- Extract a Vue composable only when stateful logic must be shared by multiple
  components. Name any future composable `useXxx`, keep it framework-specific,
  and preserve explicit abort/cleanup behavior demonstrated by `App.vue`.
- Keep reusable pure transformations in `src/lib/`, not in a composable.
  `src/lib/detection.js` is the current example.
