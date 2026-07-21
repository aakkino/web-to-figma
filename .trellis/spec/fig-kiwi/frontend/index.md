# @figit/fig-kiwi Runtime Guidelines

The Trellis `frontend` route is retained for the published, browser-capable
runtime in `packages/fig-kiwi/src`. This package is a Kiwi binary codec and
clipboard utility, not a React UI.

## Guides

| Guide | Focus |
| --- | --- |
| [Codec Guidelines](./codec-guidelines.md) | Binary envelope, schema-driven encode/decode, reader/writer symmetry |
| [Clipboard And Tree](./clipboard-and-tree.md) | HTML markers, tree ordering, Figma copy-back diff |
| [Type Safety](./type-safety.md) | Unknown data, schema types, validation boundaries |
| [Testing](./testing-guidelines.md) | Byte, round-trip, compatibility, and release tests |

## Pre-Development Checklist

1. Read [Repository Conventions](../../guides/repository-conventions.md).
2. Read Codec Guidelines for any binary, compression, schema, or primitive
   change.
3. Read Clipboard And Tree for clipboard HTML, node ordering, stack defaults,
   or diff behavior.
4. Read the backend index before changing `scripts/` or generated
   `src/schema.json`.
5. Treat changes to exports in `src/index.ts` as published API changes.

