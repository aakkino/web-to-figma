# Backend Directory Structure

## Current Layout

```text
functions/chat/completions.js  Cloudflare Pages route: /chat/completions
vite-dev-proxy.js              Vite development adapter for that route
src/lib/proxy.js               Shared forwarding and CORS behavior
```

`functions/chat/completions.js` exports Pages Functions handlers and performs
only request adaptation. `vite-dev-proxy.js` does the equivalent work for the
Node development server. Both delegate the transport policy to
`src/lib/proxy.js`; that module is the single source of truth for request
forwarding, timeout, upstream status/body, and CORS behavior. The adapters own
environment-specific response translation: the Pages route returns the shared
`Response`, while the Vite adapter writes its status and `Content-Type` to a
Node response and pipes the body.

## Placement Rules

- Put reusable, runtime-neutral proxy logic in `src/lib/` and export named
  functions/constants, as `proxyChatCompletions` and `PROXY_CORS_HEADERS` do
  in `src/lib/proxy.js`.
- Put production route adapters under `functions/`, with the pathname encoded
  by the file path. The current `functions/chat/completions.js` serves
  `/chat/completions`.
- Keep Vite-specific request/response and Node stream handling in
  `vite-dev-proxy.js`; do not import Node-only modules into the Pages Function
  or shared proxy module.

## Avoid

- Do not duplicate request-forwarding headers, timeout policy, or shared error
  response rules in both adapters. They intentionally reuse
  `src/lib/proxy.js`; `vite-dev-proxy.js` separately maps the returned status,
  `Content-Type`, CORS headers, and body to Node's response API.
- Do not add `pages_build_output_dir` to `wrangler.toml`; the deployment notes
  in that file and `README.md` record that Pages auto-build uses `functions/`.
