# Upstream PR Drafts

These drafts are local only. Do not push a branch or submit either PR without
separate user approval.

## Draft 1: Preserve CSS Object Fit And Position In Image Paints

Local branch: `draft/upstream-image-presentation`

Verified stable-based commit: `f7eec539fd86c565f8407c9a6a45dbab393407e6`

### Title

`fix: preserve image object-fit and object-position`

### Summary

- derive Figma image scale mode and transform from rendered box, intrinsic
  dimensions, CSS `object-fit`, and CSS `object-position`;
- use native `FIT` / `FILL` for centered contain/cover and a deterministic
  `STRETCH` transform for other presentations;
- read intrinsic PNG, GIF, and JPEG dimensions from the final Figma-ready
  bytes; and
- return a finite identity transform for zero, negative, `NaN`, or infinite
  dimensions.

### Semantic Basis

The calculation follows CSS Images Level 3 concrete object size and object
position semantics: all five fit values select a rendered object size, then
position resolves against the positive or negative free space in each axis.
Edge offsets, percentages, pixel lengths, and simple computed `calc()` values
are preserved.

### Tests

- table-driven pure tests for `fill`, `contain`, `cover`, `none`, `scale-down`,
  keyword order, percentages, pixels, edge offsets, `calc()`, aspect ratios,
  and invalid sizes;
- browser assertions for emitted scale modes, transforms, intrinsic fields,
  and per-node presentation with a deduplicated source; and
- local oracle scene `img-02-object-fit.html`.

### Scope Exclusions

No capture scheduler, budget, placeholder reason, extension transport, or
prepared-resource API is included.

## Draft 2: Make Image Fetch And Decode Abortable

Local branch: `draft/upstream-image-loader-cancellation`

Verified stable-based commit: `3986425a7bb14a43a146c31c5413125cde298029`

### Title

`fix: propagate cancellation through image loading`

### Summary

- add an optional `AbortSignal` to `ImageRequest`;
- pass it to direct `fetch`;
- stop before/after format normalization when aborted;
- detach image event handlers on settle or abort; and
- always revoke temporary object URLs.

### Tests

- an already-aborted processing request rejects before hashing;
- the direct loader forwards the exact signal to `fetch`; and
- adapter cancellation/clear tests prove late work cannot publish into a
  prepared capture generation.

### Scope Exclusions

This PR does not include staged preparation, caching policy, concurrency,
budgets, placeholders, or diagnostics.
