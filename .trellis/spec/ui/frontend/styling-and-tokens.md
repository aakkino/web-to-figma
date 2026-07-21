# Styling And Tokens

## Global CSS Entry

Consumers import `@figit/ui/styles/globals.css`. It loads Tailwind,
`tw-animate-css`, and shadcn CSS, then defines semantic theme variables,
base rules, and local utilities.

Consumer styles must also include the shared source directory so Tailwind sees
classes authored inside this package:

~~~css
@import "@figit/ui/styles/globals.css";
@source "../../../internal/ui/src";
@source ".";
~~~

Use the correct relative path for the consuming entrypoint. Extension content
and popup CSS provide real examples.

## Semantic Tokens

Components use semantic names such as `background`, `foreground`,
`primary`, `muted`, `accent`, `destructive`, `border`, and `ring`. Add or
change the base/primary scales in `globals.css`, then map semantic variables in
both light and dark blocks.

Do not put a one-off literal color into a reusable component when a semantic
token expresses the role. Domain visualizations may use a small explicit
palette when color conveys node type, as the playground inspector does.

## Root And Shadow DOM

Tokens are defined for both `:root` and `:host`. Dark mode supports
`:root.dark` and a `.dark` ancestor inside a host. Preserve both selectors;
the playground renders in the document while extension UI renders in a shadow
root.

## Local Utilities

`neu-raised` and `neu-inset` require the component to set `--neu-base`.
`corner-*` is paired with a progressive `supports-corner` variant. New
utilities must document their required custom properties and degrade to a
usable standard CSS appearance.

Keep scrollbar, cursor, and base border/focus rules in the global layer rather
than duplicating them across every component.

