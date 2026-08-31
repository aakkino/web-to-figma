# Frontend Directory Structure

## Current Layout

```text
.impeccable.md          Product design context and interaction principles
src/main.js             Vue bootstrap and global stylesheet import
src/App.vue             The application screen and UI orchestration
src/style.css           Global styles, tokens, layout, and responsive rules
src/data/probes.js      Immutable probe catalog and prompt builder
src/lib/api.js          Endpoint normalization, request transport, SSE parsing
src/lib/detection.js    Pure response evaluation and result summaries
src/lib/proxy.js        Runtime-neutral forwarding used by backend adapters
src/**/*.test.js        Vitest tests colocated with the source they cover
e2e/app.spec.js         End-to-end browser workflow tests
```

## Placement Rules

- Treat `.impeccable.md` as the source of truth for product design direction;
  component-level implementation rules derived from it live in
  `component-guidelines.md`.
- Add screen-level orchestration to `src/App.vue` while the application has a
  single screen. `src/main.js` should stay a small bootstrap module.
- Put immutable domain data and small builders in `src/data/`, following
  `PROBES` and `buildPrompt` in `src/data/probes.js`.
- Put reusable non-UI logic in `src/lib/` as named exports. Keep pure
  transformations in `detection.js`; place HTTP transport, endpoint
  normalization, and SSE parsing in `api.js`. Both modules are independently
  unit-tested, but `api.js` has side effects when `requestProbe` invokes
  `fetch`.
- Keep application-wide CSS in `src/style.css`; it is imported once from
  `src/main.js`, not injected from the component.
- Co-locate Vitest files beside their source (`src/lib/api.test.js`) and place
  browser workflows under `e2e/`.

## Naming

Use lowercase kebab-free JavaScript filenames for data/lib modules and the
corresponding `.test.js` file name. Vue components use PascalCase filenames:
the current root component is `App.vue`.
