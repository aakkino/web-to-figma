# Backend Logging Guidelines

## Current State

There is no logging framework or `console` logging in the backend path:
`functions/chat/completions.js`, `vite-dev-proxy.js`, and `src/lib/proxy.js`.
The project instead returns explicit HTTP responses and lets the browser render
the relevant failure message through `src/lib/api.js` and `src/App.vue`.

## Rules

- Do not introduce routine request logging without a separate operational
  requirement. There is no established log format, sink, retention policy, or
  log-level convention.
- Never log the forwarded `Authorization` header, API key, request body, or
  streamed model response. The proxy accepts all of these values in
  `src/lib/proxy.js`, and the UI intentionally keeps the key only in memory.
- If logging is later required, define redaction and deployment retention
  alongside it; do not derive them from this stateless implementation.
