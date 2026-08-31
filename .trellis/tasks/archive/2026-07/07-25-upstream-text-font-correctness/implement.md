# 文本与字体正确性实施计划

## Dependencies

- Blocking: `07-25-upstream-core-delta-governance`.
- Independent after that gate: DOM traversal work may proceed in parallel.

## Step 1: Reconstruct The Deltas

- [x] Map `ea9956a` and `ab0f56e` to current core, adapter, extension, fixture, and documentation changes.
- [x] Separate generic core contracts from adapter-owned source selection and diagnostics.
- [x] Register font and single-line capabilities independently.

## Step 2: Isolate Glyph-Aware Loading

- [x] Normalize Unicode code point collection and cache identity.
- [x] Verify optional request compatibility with simple legacy loaders.
- [x] Ensure resolved font metadata matches the actual bytes used for metrics and glyphs.
- [x] Add focused unit/browser cases for CJK, mixed scripts, non-BMP characters, fallback, and cache reuse.
- [x] Prepare an atomic upstream commit and PR draft.

## Step 3: Isolate Single-Line Sizing

- [x] Encode the DOM/CSS predicate for safe `WIDTH_AND_HEIGHT` output.
- [x] Carry the parent auto-layout state through the existing conversion context.
- [x] Verify nowrap/pre, wrapping, explicit breaks, ellipsis, and both parent layout modes.
- [x] Prepare a separate upstream commit and PR draft.

## Step 4: Verify Product Integration

- [x] Run adapter font resolver and capture tests.
- [x] Run converter text browser tests and extension integration tests.
- [x] Run workspace lint, types, build, tests, and oracle parity. Workspace lint remains blocked by the pre-existing CRLF checkout baseline; scoped task lint passes.
- [x] Compare payload font metadata and node sizing with the recorded baseline.

## Step 5: Handoff

- [x] Record exact upstream base, test evidence, API compatibility notes, and draft PR text for each contribution.
- [x] Stop before push or PR creation pending explicit user approval.

## Exit Condition

Both generic fixes are independently upstream-ready, product fallback policy remains outside the core, and all current CJK and single-line behavior remains intact.
