# Oracle Tooling

## Capture

`oracle-capture.ts` validates the requested capture path stays under
`oracle/inbox`. It writes the raw HTML envelope before decoding so a failing
codec still leaves the original bytes for diagnosis. Keep that order.

Binary values are summarized only in the human-readable JSON; the adjacent raw
HTML remains the source of truth.

## Diff

`oracle-diff.ts` is an I/O wrapper around runtime
`diffFigmaTrees`. Keep tree/default/tolerance logic in `src/diff.ts` and
`src/stack-fields.ts` so the internal oracle harness sees the same behavior.
The script:

- discovers and sorts outbox scenes;
- decodes sent and captured envelopes;
- reports every mismatch;
- exits non-zero when any scene fails.

Do not add a second structural comparator in `scripts/`.

## Distill

`oracle-distill.ts` converts a clean Figma paste round-trip into a committed
fixture under `packages/dom-to-figma/src/__fixtures__/oracle`. Run it only
after `oracle:diff` reports the batch clean. It records rounded geometry and
non-default tracked stack fields; it is derived evidence, not a hand-authored
expected file.

The shared re-export in `oracle-shared.ts` keeps stack defaults and tree order
identical to the runtime.

## CLI Script Pattern

Current scripts are small ESM entrypoints with a local `main()`:

- parse `process.argv` at the edge;
- print human progress to stderr;
- throw or exit non-zero on invalid input;
- resolve repository paths from `import.meta.dirname`;
- keep reusable transformations in importable `src/` modules.

