# Type Safety

## Untrusted Shapes

Public encoding accepts `unknown` because the concrete Figma Message shape is
generated and large. Narrow at the schema dispatcher:

- reject non-object struct/message values;
- require arrays at array fields;
- validate byte arrays as `Uint8Array`, `ArrayBuffer`, or
  `Array<number>`;
- fail on missing schema types or impossible kind ids.

Decoded messages remain `Record<string, unknown>`. A consumer should define the
smallest local projection it reads, as `OracleNode` and the oracle harness's
`PayloadNode` do, rather than cast the entire payload to an unverified model.

## Schema Types

`Field`, `TypeDef`, and `Schema` mirror generated JSON. Keep numeric ids and
`Record<string, Field>` because field keys arrive from the binary schema. Do
not replace them with enums or positional arrays unless the generator and both
codec directions change together.

## Binary Limits

Reader/writer integers are JavaScript numbers. The implementation supports
values within the safe integer range; do not claim arbitrary 64-bit precision.
Validate negative inputs for unsigned writes and buffer bounds for every read.

Use `Uint8Array` for portable runtime bytes. Convert to Node `Buffer` only at a
Node I/O edge, such as a script or PNG tool.

