# Testing Guidelines

All runtime tests under `src/**/*.test.ts` run in Vitest's Node environment.
Node 20+ supplies the web-compatible primitives used by the package.

## Required Test Shapes

- Primitive changes: exact byte assertions in `kiwi-writer.test.ts` and
  reader/writer round trips in `decoder.test.ts`.
- Envelope changes: prelude, length, compression, base64, and full
  encode/decode round trips.
- Clipboard changes: raw and entity-encoded marker fixtures, optional metadata,
  and missing-marker failure.
- Tree/diff changes: stable frame pairing, sibling order, defaults,
  tolerances, node-count differences, and fill/stretch normalization.
- Decoder compatibility: retain fixtures for both deflate and zstd chunks and
  all accepted Figma preludes.

Tests may use `@ts-expect-error` only to exercise a runtime guard that the type
system otherwise prevents, as in `kiwi-writer.test.ts`.

## Commands

~~~sh
pnpm --filter @aakkino/fig-kiwi test
pnpm --filter @aakkino/fig-kiwi check-types
pnpm --filter @aakkino/fig-kiwi build
~~~

Because this is a published package, a user-visible codec, clipboard, schema,
or export change requires a changeset.

