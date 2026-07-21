# Testing Guidelines

## Test Projects

`vitest.config.ts` defines two projects:

- `src/**/*.test.ts` runs in Node for pure parsing, encoding, caching, and
  deterministic helpers.
- `src/**/*.browser.test.ts` runs in headless Chromium for computed styles,
  ranges, fonts, canvas, images, clipboard behavior, and layout measurement.

Put a test in the browser project whenever the behavior depends on a real DOM
layout engine. Happy-path mocks are not evidence for geometry.

## Fixture Patterns

- Reuse deterministic fonts and images in `src/__fixtures__/`.
- Browser tests should create the smallest DOM/CSS scene that demonstrates the
  invariant and assert emitted node fields, not implementation-private calls.
- Cache tests must cover concurrent deduplication and retry after rejection.
- Public conversion tests should decode or inspect the produced document so
  they verify the consumer-visible payload.
- Oracle JSON fixtures are derived evidence. Do not hand-edit them to match a
  code change.

## Commands

~~~sh
pnpm --filter @figit/dom-to-figma test
pnpm --filter @figit/dom-to-figma check-types
pnpm --filter @figit/dom-to-figma build
~~~

For converter geometry, paint, text, ordering, or trace changes also run:

~~~sh
pnpm oracle:parity
~~~

The root CI installs Chromium and runs the full workspace test suite. Report a
browser-install or live-oracle limitation explicitly rather than claiming the
suite passed.

## Release Gate

`@figit/dom-to-figma` is published. A user-visible API or behavior change needs
documentation in `packages/dom-to-figma/README.md` when relevant and a
changeset. Internal refactors with no published impact do not need a release
note solely because files moved.

