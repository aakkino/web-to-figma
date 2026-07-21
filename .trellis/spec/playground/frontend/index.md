# Playground Guidelines

`apps/playground` is a browser-only TanStack Start SPA used to edit HTML
scenes, render them in an iframe, inspect the Figma payload, and copy it. It is
an engineering workbench, not a server-rendered product surface.

## Guides

| Guide | Focus |
| --- | --- |
| [Architecture](./architecture.md) | SPA runtime, directories, shared UI |
| [Routes And Corpus](./routes-and-corpus.md) | File routes, generated tree, HTML scene discovery |
| [Conversion And State](./conversion-and-state.md) | Iframe lifecycle, debouncing, converter cache |
| [Components And Quality](./components-and-quality.md) | Inspector patterns, accessibility, verification |

## Pre-Development Checklist

1. Read [Repository Conventions](../../guides/repository-conventions.md).
2. Read Routes And Corpus before adding routes or scenes.
3. Read Conversion And State before changing iframe, editor, dimensions,
   clipboard, or converter behavior.
4. Read `dom-to-figma` specs for payload/layout changes and `ui` specs for
   shared components/tokens.

