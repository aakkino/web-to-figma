# @figit/dom-to-figma Browser Runtime Guidelines

This directory covers the published browser conversion library in
`packages/dom-to-figma`. It is not a React frontend. Its core contract is a
measured DOM-to-Figma conversion with a browser clipboard result.

## Guides

| Guide | Focus |
| --- | --- |
| [Architecture](./architecture.md) | Public API, conversion lifetime, module ownership |
| [Converter Guidelines](./converter-guidelines.md) | Walking, classification, node converters, loaders |
| [Layout And Parity](./layout-and-parity.md) | Auto-layout inference, fallback rules, geometry evidence |
| [Type Safety](./type-safety.md) | Figma data types, unions, public boundaries |
| [Testing](./testing-guidelines.md) | Unit, browser, oracle, and release checks |

## Pre-Development Checklist

1. Read [Repository Conventions](../../guides/repository-conventions.md).
2. Read Architecture and Converter Guidelines for every source change.
3. Read Layout And Parity before changing geometry, sizing, ordering, text
   measurement, transforms, or stack fields.
4. Read Type Safety before changing `figma.ts` exports or
   `converter/types/`.
5. Read Testing before implementation so the test environment matches the API
   being exercised.

