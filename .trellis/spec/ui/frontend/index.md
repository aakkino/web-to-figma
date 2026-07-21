# Shared UI Guidelines

`internal/ui` is the private React 19 component and Tailwind CSS v4 foundation
consumed by the extension and playground. It wraps Base UI primitives and
exports components by explicit package subpath.

## Guides

| Guide | Focus |
| --- | --- |
| [Component Guidelines](./component-guidelines.md) | Primitive wrappers, props, variants, slots |
| [Styling And Tokens](./styling-and-tokens.md) | Tailwind sources, semantic variables, dark/shadow-root support |
| [Composition And Exports](./composition-and-exports.md) | Compound components, portals, package subpaths |
| [Testing And Quality](./testing-and-quality.md) | Type/lint gates and consumer verification |

## Pre-Development Checklist

1. Read [Repository Conventions](../../guides/repository-conventions.md).
2. Search current extension/playground usage before changing props, slots,
   tokens, or default visuals.
3. Read Styling And Tokens before editing `globals.css` or utility classes.
4. Read Composition And Exports before adding a file or changing a package
   export.
5. Plan consumer builds because this package has no standalone build/test app.

