# Frontend Component Guidelines

## Current Component Pattern

`src/App.vue` is a Vue Single File Component using `<script setup>`. Imports,
local state, computed values, and event handlers appear before one semantic
`<template>`. The component currently owns the whole one-screen workflow;
there are no reusable child components or component props to imitate yet.

```vue
<script setup>
import { computed, ref } from 'vue'

const isRunning = ref(false)
const summary = computed(() => summarizeResults(results.value))
</script>
```

## Rules

- Use Vue Composition API primitives imported from `vue`, as in `src/App.vue`.
- Keep template event bindings declarative (`@submit.prevent`, `@click`, and
  `v-model`) and keep operational code in named script functions.
- Render all model response text with interpolation inside `<pre>`; do not add
  `v-html` for API-provided text. The current result details in `App.vue` use
  `{{ result.responseText }}`.
- Use native semantic elements and labels. `App.vue` pairs every form control
  with a `<label>`, uses `role="alert"` for validation errors, and gives
  controls accessible names.
- Preserve disabled/busy states for controls that would conflict with an
  active detection run.

## Styling

Use the existing classes and CSS custom properties in `src/style.css`. Theme
selection is expressed on the root as `:data-theme="theme"`; responsive and
focus styles belong in the shared stylesheet rather than inline style blocks.

## Product Design Contract

Follow the design context in `.impeccable.md`: this is a restrained, direct,
trustworthy, high-density diagnostic tool, not a marketing-oriented AI product.
Avoid generic AI-dashboard treatments, blue/purple neon, glowing gradients,
glass effects, decorative metrics, and nested cards. Keep the layout compact
without crowding controls or evidence.

- Make configuration, run state, and conclusion immediately distinguishable.
  `src/App.vue` uses the configuration aside, result overview, progress, and
  evidence list to establish that hierarchy.
- Use cautious heuristic language such as "possible family" and "fingerprint
  hit", never a claim of certain model identity. `overallTitle`,
  `overallDescription`, and `resultSummary` in `src/App.vue` provide the
  current wording.
- Keep every conclusion traceable to a probe and its raw response. The
  `result-row` renders the token, result label, family, duration, and expandable
  response/error detail together in `src/App.vue`.
- Keep the in-memory API-key and direct-browser/CORS warning visible in the
  configuration area. The `trust-note` in `src/App.vue` implements the warning
  described in `.impeccable.md`.
- Preserve desktop side-by-side configuration/results browsing and responsive
  mobile reflow in `src/style.css`.

## Accessible Interaction

`.impeccable.md` requires WCAG AA contrast, complete keyboard operation, clear
focus, color-independent status, and reduced motion. The current UI provides
text status labels plus symbols in `.status-badge`, native controls and a skip
link in `src/App.vue`, visible focus styles in `src/style.css`, and a
`prefers-reduced-motion: reduce` rule there. Keep these signals when changing
states, colors, motion, or controls; color must not become the only status
indicator.
