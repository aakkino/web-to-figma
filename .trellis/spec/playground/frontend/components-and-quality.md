# Components And Quality

## Payload Inspector

`PayloadInspector` derives `NodeChange` from
`FigmaClipboard["nodeChanges"][number]` instead of duplicating a wire type. It
groups changes by parent GUID, recursively builds tree nodes, memoizes the
derived tree per document, and keeps expansion local to each row.

When adding a summary:

- narrow on the node discriminator or field presence first;
- return `null` when the field does not apply;
- format only for display and never mutate the document;
- use the stable session/local GUID pair as the React key.

Figma wire order and tree reconstruction rules should be shared from the
owning package only when behavior, not just display, must match.

## UI And Accessibility

Use shared Button/Input/Spinner primitives. Keep icon/loading states inside a
stable button, label numeric inputs, title the iframe, and render interactive
tree rows as buttons. Targeted lint suppressions require an exact browser
reason, as with iframe `onLoad`.

The workbench is a dense three-column tool. Preserve `min-h-0` and explicit
overflow ownership when changing its grid; otherwise editor/preview/inspector
panes will overflow the viewport.

## Verification

There is no playground test script today. Run:

~~~sh
pnpm --filter playground check-types
pnpm --filter playground build
pnpm lint
~~~

Then manually verify the gallery, direct scene URL/not-found route, editor
reload, auto/absolute toggle, dimensions, payload tree, and clipboard action in
a real browser.

This app is private and does not need a changeset. A change in a published
dependency follows that package's release gate.

