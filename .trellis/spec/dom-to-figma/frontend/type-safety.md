# Type Safety

## Closed Domain Types

Use string unions for protocol values and conversion modes:
`ElementKind`, `ConverterLayout`, paint/effect unions, and stack enum values are
the local pattern. Exhaustive switches should fail compilation when a new
variant is not handled.

`FigmaNodeChange` is a discriminated union of emitted node shapes. Prefer a
specific node type in a converter and widen only at the append boundary. Do not
replace these types with `Record<string, unknown>` to avoid modeling a field.

## Public API Types

- Keep configuration, input, and result types in `src/figma.ts` when callers
  need them.
- Keep wire-node types under `converter/types/` and re-export only intentional
  public contracts.
- Separate type imports from runtime imports.
- Preserve the `SingleFrameInput | CanvasInput` discrimination by the
  `frames` property; do not add overlapping optional fields that make the
  branch ambiguous.

## External Boundaries

Binary encoder input crosses into `@figit/fig-kiwi` as an object assembled from
typed node changes. DOM APIs still require runtime narrowing:

- use `isTextNode` / `isElementNode` before node-specific access;
- check cross-realm browser constructors against the element's own realm when
  needed;
- keep loader results typed and validate network responses before returning.

Localized assertions are acceptable when a closed dispatcher already proves
the shape, such as casting an element after `ElementKind` dispatch. Avoid
unrelated casts at UI or package boundaries.

