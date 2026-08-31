# Backend Error Handling

## Response Contract

The shared proxy returns JSON errors shaped as
`{ error: { message } }`. `src/lib/proxy.js` uses this shape for a missing
`target` (400) and an upstream forwarding failure (502), then adds the same
CORS headers used on successful responses.

```js
if (!target) return withCors(jsonError(400, '...'))

try {
  return withCors(await fetchImpl(target, options))
} catch {
  return withCors(jsonError(502, '...'))
}
```

The Pages adapter passes the `Response` through unchanged
(`functions/chat/completions.js`). The Vite adapter catches failures while
reading the incoming Node request or piping a response stream; before headers
are sent it emits the same 502 JSON shape, and after headers are sent it
destroys the connection (`vite-dev-proxy.js`).

## Rules

- Handle expected proxy failures at the shared boundary and return a response;
  do not let an upstream `fetch` rejection escape and crash the development
  middleware.
- Include `PROXY_CORS_HEADERS` on preflight, success, and error responses.
- Preserve upstream status and streaming body on a successful forward.
  `withCors` copies all upstream headers before adding CORS headers, so the
  Pages adapter preserves them. `vite-dev-proxy.js` currently maps only
  `Content-Type` plus CORS headers to the Node response; do not claim full
  response-header parity between the two adapters.
- Keep user-facing error wording in the browser module `src/lib/api.js`.
  Backend messages stay short and transport-oriented.

## Tests

`src/lib/proxy.test.js` asserts the 400 and 502 shapes, CORS headers, and
Authorization/body forwarding. Update it whenever this contract changes.
