import schemaJson from "./schema.json" with { type: "json" };
import type { Schema } from "./types";

/**
 * The Figma Kiwi schema. Generated from a Figma clipboard payload — do NOT
 * edit by hand. Regenerate via `pnpm extract-schema` (see README).
 *
 * The two-step `as unknown as Schema` cast is the standard escape hatch for
 * generated JSON: TS infers a hyper-precise literal type from the file content
 * (each `TypeDef` carries the exact field-id set it has), which doesn't unify
 * with `Record<string, Field>` once `noUncheckedIndexedAccess` is on. The
 * runtime shape is enforced by `scripts/extract-schema.ts`, not the type system.
 */
export const SCHEMA = schemaJson as unknown as Schema;
