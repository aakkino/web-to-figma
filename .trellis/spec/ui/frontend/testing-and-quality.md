# Testing And Quality

`@figit/ui` currently has typecheck and lint scripts but no component test or
standalone build script:

~~~sh
pnpm --filter @figit/ui check-types
pnpm --filter @figit/ui lint
pnpm --filter extension build
pnpm --filter playground build
~~~

Run `pnpm lint` after token or utility changes so consumer files are included.

## Review Checklist

- Primitive semantics, keyboard behavior, focus-visible, disabled, and invalid
  states remain intact.
- Icon-only controls can receive an accessible label; Spinner itself exposes a
  loading status.
- Consumer `className` merges after base/variant classes.
- Every public part has a stable `data-slot`.
- Light and dark tokens work in document and shadow-root consumers.
- Tailwind emits shared component classes through each consumer's `@source`.
- Portals have a deliberate stacking context and remain themed.
- Package subpath imports resolve without a new barrel.

Use `components.json` as the shadcn/Base UI generation configuration, but treat
generated component output as a starting point. Reconcile it with local
`cn`, token, slot, export, and primitive patterns before committing.

This package is private and does not need a changeset. A shared UI change still
requires both current consumer builds because that is the available integration
gate.

