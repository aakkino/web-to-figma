# Schema Tooling

## Input Resolution

`readHtmlInput` applies this precedence:

1. explicit file path;
2. `-` or piped stdin;
3. system `text/html` clipboard.

macOS reads `public.html` through AppKit/JXA and Linux uses xclip. Windows must
use a file or stdin. Preserve a non-interactive path for every platform; do not
fall back to `text/plain` because the Figma payload lives only in the HTML MIME
representation.

## Regeneration Pipeline

`scripts/extract-schema.ts` performs:

~~~text
clipboard HTML -> Figma marker bytes -> fig header -> inflated binary schema
-> kiwi-schema definitions -> local Schema JSON -> src/schema.json
~~~

It validates the prelude, resolves primitive and named type ids, preserves
field ids, and writes pretty JSON with a final newline. The output path is
resolved from `import.meta.dirname` so invocation cwd does not matter.

`src/schema.json` is generated. Never patch a field manually. Run:

~~~sh
pnpm --filter @aakkino/fig-kiwi extract-schema <clipboard.html>
pnpm --filter @aakkino/fig-kiwi test
pnpm --filter @aakkino/fig-kiwi check-types
~~~

Review version, type count, public encode behavior, and the full generated diff.
A schema refresh changes the published encoder and normally needs a changeset.

## Duplication Boundary

The extractor has local header/schema decoding because it must regenerate the
very schema used by the runtime. Shared clipboard acquisition belongs in
`read-clipboard-html.ts`. Do not copy input-selection or path logic into new
clipboard scripts.

