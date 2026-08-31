# CP2 current-baseline gap

- Refreshed target: `origin/main@0a311e1078c57af9cbf30a58d41c6f5fa6cbf4d8`.
- Historical evidence: S55 `2361077a2ab5c7aa004007d597e20ba5a9ea2314`
  and S56 `e281719bb1aba2e9f626fbdfd492748f6618bf8c`; neither is an
  ancestor of the target and neither may be applied literally.
- S55 is a one-line label correction in `app.tsx`: `Copy and save` becomes
  `Copy & Save`. Current `origin/main` still has the former label.
- S56 documents the in-page workspace, immutable artifact, independent sinks,
  explicit defaults, memory-only capture state, reset behavior, and browser
  checks. Those substantive contracts are already represented by CP1 and the
  current README/Trellis guidance.
- The remaining planned product change is therefore the label only. Any wider
  persistence, codec, storage, permission, controller, or lockfile edit is a
  scope expansion and must return to planning.
