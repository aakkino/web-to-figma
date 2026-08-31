# Design: Rebuild FD1 font diagnostics

## Boundary

FD1 remains inside the extension content-script presentation layer. The
existing `WorkspaceController` continues to own `state.capture.fontDiagnostics`;
React only summarizes and renders that state.

Expected file boundary:

- add `apps/extension/entrypoints/content/font-recovery-diagnostics.tsx`;
- add its focused `font-recovery-diagnostics.test.tsx`;
- replace the aggregate count in `app.tsx` with the new component;
- register the focused test in `apps/extension/vitest.config.ts` if the current
  target still uses an explicit unit-test list.

No adapter, converter, messaging, storage, release, package, or lockfile change
is authorized.

## Data Flow

```text
WorkspaceController font diagnostics
  -> pure status summary
  -> exact requests summarized
  -> fallback/failed requests rendered
  -> sanitized optional technical details
```

The component consumes the existing adapter `FontDiagnostic` type. Missing
optional resolved fields must produce readable fallback labels rather than
throwing or inventing metadata.

## Privacy Contract

Diagnostic output is allowlisted presentation data. Attempts containing URLs,
code-point notation, control characters, or otherwise unsafe raw details are
discarded or mapped to stable human-readable reasons. This UI must not expose
source text or broaden the diagnostic contract.

## Target And Isolation

Create a dedicated branch/worktree from
`main@dd91f18346d7326ab71c1a77769bfe7aed310af3` only after confirming the ref
still resolves to that SHA. Snapshot root ref/index/staged state, the five
tracked dirty paths from the assessment, and worktree occupancy before and
after execution. Do not modify the dirty sync checkout.

## Rollback

FD1 is one review/commit/PR unit. Failure removes only the isolated FD1
worktree/branch changes; it does not reset, clean, stash, or normalize the root
checkout. Any target drift, scope expansion, or privacy uncertainty stops the
task and returns it to planning.
