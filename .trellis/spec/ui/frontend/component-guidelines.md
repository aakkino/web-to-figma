# Component Guidelines

## Primitive Wrappers

Prefer an accessible Base UI primitive when one exists. Type the wrapper from
the primitive's `.Props` or `React.ComponentProps`, destructure local defaults,
merge classes, add a stable `data-slot`, and spread remaining props last:

~~~tsx
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      className={cn(baseClasses, className)}
      data-slot="input"
      type={type}
      {...props}
    />
  );
}
~~~

React 19 and Base UI props are used directly; do not add `forwardRef`
ceremony unless a consumer demonstrates a missing ref contract.

## Class Composition

Always combine consumer `className` through `cn` from
`@figit/ui/lib/utils`. It uses clsx plus an extended Tailwind merge rule for
`neu-raised`/`neu-inset`. Manual string concatenation can leave conflicting
utilities active.

Put stable component styling in the component, and expose bounded variants
rather than asking consumers to reconstruct the control. `Button` uses CVA for
`variant` and `size` and exports `buttonVariants` for legitimate composition.

## Variants And State

- Use union-like variant keys with a default.
- Reflect variants/sizes through `data-*` when child styling or compound
  selectors need them.
- Style primitive state through its data attributes
  (`data-open`, `data-closed`, `data-disabled`,
  `data-placeholder`).
- Preserve focus-visible, disabled, and aria-invalid states on form controls.
- Icons come from Lucide in the shared package and should inherit stable sizing
  unless a caller explicitly supplies a size class.

## Compound Components

For Card, Select, Tooltip, and similar families, export named parts rather than
one component with a large configuration object. Each part has its own
`data-slot` and primitive/native prop type. Keep DOM hierarchy required by
Base UI, including Portal -> Positioner -> Popup for floating content.

Reference files:

- `internal/ui/src/components/button.tsx`
- `internal/ui/src/components/select.tsx`
- `internal/ui/src/components/tooltip.tsx`
- `internal/ui/src/components/card.tsx`

