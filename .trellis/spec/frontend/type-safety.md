# Frontend Type Safety

## Current State

The project uses plain ESM JavaScript, not TypeScript. `package.json`, source
files, and Vitest configuration use `.js`; there is no TypeScript compiler or
schema-validation dependency.

Runtime validation is explicit and local:

- `normalizeEndpoint` and `normalizeProxyBase` in `src/lib/api.js` parse URLs,
  require HTTP(S), reject embedded credentials, and normalize route paths.
- `createChatRequest` validates a non-empty model before producing the
  OpenAI-compatible request body.
- `extractResponseText` verifies the expected response shape and throws an
  `ApiRequestError` for missing text.
- `compactForComparison` coerces input to a string before NFC normalization and
  Unicode-whitespace removal in `src/lib/detection.js`.

## Rules

- Prefer guarded property access and `typeof` checks for external API payloads,
  following `extractResponseText` and SSE delta parsing in `src/lib/api.js`.
- Keep stable data shapes explicit through constructors/builders and tests.
  `PROBES` is frozen in `src/data/probes.js`, and `createChatRequest` is
  asserted in `src/lib/api.test.js`.
- Do not add TypeScript types or a validation library to a narrow change just
  to compensate for missing static types; that would establish a new project
  architecture rather than follow the current one.
