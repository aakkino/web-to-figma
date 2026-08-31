# Frontend Quality Guidelines

## Required Checks

- Run `pnpm test` for unit/component changes. Vitest uses jsdom and includes
  `src/**/*.test.js` as configured in `vite.config.js`.
- Run `pnpm test:e2e` for browser user-flow and responsive layout changes.
  `e2e/app.spec.js` uses a local mocked direct API and needs no real key.
  Add focused coverage before relying on it for a new proxy or timing contract.
- Run `pnpm build` for production readiness. `package.json` defines these
  scripts and `pnpm test:all` combines them.

## Testing Patterns

- Test pure data/detection modules directly with Vitest. Test API transport and
  proxy behavior by injecting `fetchImpl`: `src/lib/api.test.js` covers
  endpoint/proxy URL construction, request bodies, errors, and SSE parsing;
  `src/lib/proxy.test.js` covers shared proxy forwarding and CORS.
- Mount the root component using `@vue/test-utils` and mock global `fetch` for
  component behavior, as `src/App.test.js` does.
- Test user-visible browser workflows through Playwright. The existing suite
  verifies completion with one distinct message per probe, candidate display,
  retry, cancellation display, theme changes, mobile overflow, the direct API
  warning, and that the key is absent from request bodies.

## Current Coverage Gaps

`e2e/app.spec.js` checks the number and distinctness of captured requests but
does not prove request start/completion ordering. The sequential queue is
implemented in `runQueue` in `src/App.vue`, but no current unit, component, or
end-to-end test records a timing/order trace.

Playwright also does not fill `proxyBase` or route through `/chat/completions`.
The configured proxy URL is covered at the `requestProbe` unit level in
`src/lib/api.test.js`, and shared forwarding is unit-tested in
`src/lib/proxy.test.js`; neither Pages handler nor Vite middleware adapter has
its own automated test. Add the appropriate test before claiming end-to-end
proxy routing or adapter coverage.

## Review Rules

- Preserve one independent user message per probe, sequential requests, and
  the `stream: true` / `reasoning_effort: 'none'` request contract in
  `src/lib/api.js`.
- Preserve cancellation cleanup in `onBeforeUnmount` and ensure request errors
  do not become fingerprint results.
- Maintain accessible labels, alert roles, keyboard-native controls, and the
  skip link already present in `src/App.vue`.
- Check the 390px mobile workflow after layout changes; `e2e/app.spec.js`
  asserts that document width does not overflow the viewport.
- Preserve the restrained and traceable diagnostic UI defined in
  `.impeccable.md`: cautious conclusions, visible key/CORS warning,
  color-independent statuses, keyboard/focus behavior, and reduced-motion
  handling. Confirm the relevant `src/App.vue` and `src/style.css` behavior
  whenever that surface changes.
