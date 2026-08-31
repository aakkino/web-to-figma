# Frontend State Management

## Current State Model

No global store or server-state library is installed (`package.json`). State is
local to `src/App.vue`:

- `ref` stores scalar configuration, run state, timestamps, controller
  references, and the result array.
- `reactive(new Set())` tracks retrying probe indices.
- `computed` derives progress, summaries, busy state, duration, and labels
  from the source state.
- The immutable probe catalog comes from `src/data/probes.js`; a fresh result
  list is created with `PROBES.map(createIdleResult)` for each run.

## Update Rules

`updateResult` replaces one array entry with a shallow merged object. This is
the established way to update an individual result while preserving Vue
reactivity. `executeProbe` first resets transient fields, then applies either
a completed evaluation or a formatted failure.

Requests are deliberately sequential: `runQueue` awaits each `executeProbe`.
Retry state is separate from the main run and protected by `isBusy`, which
prevents conflicting work. Do not introduce concurrent queue processing unless
the detection and UI contracts are redesigned and tested.

## Avoid

- Do not add Pinia, Vuex, local storage, or persistence for the present
  one-screen workflow without a product requirement.
- Do not classify `error` or `cancelled` results as fingerprint hits.
  `summarizeResults` in `src/lib/detection.js` explicitly excludes them.
