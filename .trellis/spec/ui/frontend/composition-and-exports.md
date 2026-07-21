# Composition And Exports

## Explicit Subpath API

`internal/ui/package.json` exports:

- `./styles/globals.css`;
- `./components/*` mapped directly to `src/components/*.tsx`;
- `./lib/*` mapped directly to `src/lib/*.ts`.

Consumers import `@figit/ui/components/button`, not a root barrel. Add one file
per public component family and rely on the existing export pattern. Do not add
an `index.ts` that defeats the repository's direct-import convention.

CSS is marked as a side effect so bundlers retain the global entry. TypeScript
and component files should remain side-effect free at import time.

## Compound APIs

Export every part a consumer needs from the owning module, for example
`SelectTrigger`, `SelectContent`, and `SelectItem` from `select.tsx`.
Internal helpers and class constants stay private unless consumers need to
compose them. `buttonVariants` is public because callers may apply the exact
button contract to another primitive.

## Providers And Portals

Base UI floating elements keep their Portal and Positioner wrappers inside the
shared component so consumers cannot accidentally omit positioning
infrastructure. Provider components such as `TooltipProvider` expose primitive
defaults and forward all supported props.

`Toaster` maps Sonner visuals to shared tokens and Lucide icons. Keep caller
props spread last so an application can override placement/theme while
retaining default token integration.

## Consumer Compatibility

Before a breaking prop or DOM/data-slot change, search:

~~~sh
rg "@figit/ui/components|data-slot=<slot>" apps internal packages
~~~

The extension has shadow-root constraints and the playground has dense
overflow constraints; verify both when changing shared layout, portal z-index,
theme selectors, or global CSS.

