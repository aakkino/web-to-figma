# Backend Quality Guidelines

## Required Checks

- Run `pnpm test` after changes to `src/lib/proxy.js`; its unit tests inject
  `fetchImpl` and cover missing targets, forwarding, failures, and CORS in
  `src/lib/proxy.test.js`.
- Run `pnpm build` after production route or Vite configuration changes. The
  Vite config registers the development proxy plugin in `vite.config.js`.
- Run `pnpm test:e2e` for browser user-flow changes. Playwright starts the Vite
  server using `playwright.config.js`, but its current direct-API mocks do not
  exercise configured proxy-base routing or either adapter.

## Review Rules

- Maintain one forwarding implementation in `src/lib/proxy.js`; environment
  adapters may only translate their native request/response APIs.
- Preserve streaming. The Vite adapter uses `Readable.fromWeb(response.body)`
  and pipes it rather than buffering an upstream response.
- Keep the shared CORS contract compatible with `POST` and `OPTIONS`, including
  `Authorization` and `Content-Type`. `src/lib/proxy.test.js` asserts the
  exported headers and forwarded responses; it does not exercise either
  adapter's `OPTIONS` handler.
- Do not persist or expose API credentials. The browser sends authorization to
  the selected target or proxy for the current request only.
- Treat adapter-level verification as a current gap. `src/lib/proxy.test.js`
  tests the shared forwarding implementation, while
  `functions/chat/completions.js` and `vite-dev-proxy.js` have no dedicated
  automated tests. Add focused handler/middleware coverage before relying on
  an adapter-specific change.
