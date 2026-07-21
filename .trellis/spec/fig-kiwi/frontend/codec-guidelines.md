# Codec Guidelines

## Envelope Contract

`encodeFigmaData` writes one contiguous envelope in this order:

1. eight-byte `fig-kiwi` prelude;
2. little-endian schema version;
3. little-endian compressed-schema length and schema bytes;
4. little-endian compressed-data length and data bytes.

The encoder currently deflates both chunks. The decoder must remain more
tolerant because current Figma payloads can use deflate for one chunk and zstd
for another. `decodeFigmaData` sniffs zstd magic per chunk and accepts the
`fig-kiwi`, `fig-jam.`, and `fig-deck` preludes.

Do not infer compression solely from schema version, and do not change byte
order or prelude handling without byte-level fixtures.

## Schema-Driven Values

`src/encoder.ts` and `src/decoder.ts` mirror the same Kiwi rules:

- negative datatype ids are primitives;
- enum, struct, and message kinds use numeric schema kind ids;
- byte arrays are a length-prefixed raw block;
- structs serialize every field in contiguous id order with no terminator;
- messages serialize only present fields, each preceded by its id, then zero;
- strings are UTF-8 and null-terminated;
- signed integers use zigzag encoding.

A missing struct field is an error. An unknown enum id decodes to its numeric id
for forward tolerance. An unknown message field is fatal because Kiwi message
data is not self-delimiting.

Keep `KiwiReader` and `KiwiWriter` symmetric. A primitive change must add a
writer byte assertion and a reader/writer round-trip test.

## Embedded Schema

Encoding uses the committed `SCHEMA` from `src/schema.json`. Decoding uses the
schema embedded in the payload, so a newer Figma payload can decode before the
local generated schema is refreshed. Do not make the decoder depend on the
committed encoding schema.

`src/schema.ts` is the only runtime wrapper:

~~~ts
import schemaJson from "./schema.json" with { type: "json" };
export const SCHEMA = schemaJson as unknown as Schema;
~~~

The assertion is localized at the generated-file boundary. Do not spread
schema JSON casts through the codec.

## Public Entry

`src/index.ts` is the deliberate package barrel and must list every supported
runtime export. Internal helpers stay module-private until there is a concrete
consumer contract. Keep runtime exports and `export type` declarations clear so
browser bundlers do not retain type-only dependencies.

Reference files:

- `packages/fig-kiwi/src/encoder.ts`
- `packages/fig-kiwi/src/decoder.ts`
- `packages/fig-kiwi/src/kiwi-reader.ts`
- `packages/fig-kiwi/src/kiwi-writer.ts`

