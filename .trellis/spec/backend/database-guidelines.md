# Database Guidelines

## Current State

This repository has no database, ORM, migration tooling, server-side session,
or persistence layer. `package.json` has no database dependency, and the Pages
route in `functions/chat/completions.js` only forwards the current request.

The browser keeps the API key and detection state in Vue memory only
(`src/App.vue`); the README states that refreshing or closing the page clears
the key. Do not describe client memory as a database or add migrations for
current features.

## Implications

- Preserve the stateless proxy contract in `src/lib/proxy.js`: request body and
  optional `Authorization` are forwarded without storing either value.
- A future persistence proposal needs its own design, data ownership,
  retention, migration, and secret-handling decisions. There is no local
  naming or query convention to extend today.
