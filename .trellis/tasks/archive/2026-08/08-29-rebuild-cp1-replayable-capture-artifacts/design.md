# Design: CP1 replayable capture artifacts

## Boundary And Flow

```text
PreparedCapture + plain CaptureSourceSnapshot
  -> V1 builder/sanitizer/checksum
  -> immutable OutputArtifact
       -> clipboard sink
       -> Blob .figit sink

user-selected .figit -> bounded parser/validator -> same OutputArtifact
```

Codec, checksum, sanitizer, parser, and sinks use browser standards and
project-owned types. They do not import converter internals. The workspace owns
operation tokens, ready/output state, sink status, and new-capture lifecycle.

## V1 Contract

- Top-level fields: format, version, createdAt, producer, source, settings,
  diagnostics, and payload.
- Payload fields: type `figma-clipboard-html`, exact `html`, and SHA-256 over
  `TextEncoder().encode(html)`.
- Unknown fields inside a supported version may be ignored; missing/invalid
  known fields and unknown versions are rejected.
- Source URL persists origin + pathname only. Diagnostics are rebuilt from an
  allow-list of counts, stable codes, and hashed normalized resource identity.
- Package construction and file input share a 268,435,456-byte ceiling.

## Output Contract

`OutputArtifact` contains the validated package, serialized JSON, exact HTML,
safe filename, and origin (`capture` or `opened-file`). It is immutable. Sink
status is mutable controller state beside it.

The output port evolves from current `main` seams to prepare/open an artifact,
execute selected sinks, and retry one named sink. Combined output starts both
selected sink operations inside the explicit user command before awaiting
results, then aggregates with all-settled semantics.

## Lifecycle And Concurrency

- Snapshot source metadata when analysis starts and associate it with the
  capture session.
- Ignore stale preparation/output completions by operation/session identity.
- `New capture` replaces the engine, clears artifact/transient state, and
  preserves draft/default settings and workspace surface.
- LA1 and CP1 never share uncommitted work. CP1 is designed against the pinned
  target, then rebased/rebuilt onto contained LA1 `main` before final check.

## Compatibility And Rollback

- Prefer existing dependencies; if SHA-256 fallback needs a direct dependency,
  add it explicitly without lockfile churn beyond the relevant importer.
- Do not add permissions. Any required permission, schema expansion, storage
  persistence, or converter change returns to planning.
- The CP1 PR is the rollback unit. Clipboard-only current behavior remains the
  fallback if file/replay wiring must be withdrawn.
