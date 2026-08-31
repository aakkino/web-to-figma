# 图片管线与表现语义设计

## Capability Split

| Concern | Target owner | Upstream candidate |
| --- | --- | --- |
| CSS `object-fit`/`object-position` mapping | converter core | yes, independent correctness patch |
| image decoding/format normalization | converter loader | yes, only where generally required |
| capture preflight and concurrency | browser adapter | no |
| memory budget and user skip policy | browser adapter | no |
| placeholder reason diagnostics | browser adapter | no |
| prepared-resource lookup hook | adapter first | only if upstream requests a generic optional hook |

This split prevents a product scheduler from becoming permanent core surface area while retaining generic visual fixes.

## Presentation Patch

Keep presentation calculation as a deterministic function of CSS fit, CSS position, rendered box, and intrinsic dimensions. The result is a Figma scale mode plus transform. Fast paths for centered `contain` and `cover` may use native Figma modes; all other cases must produce a finite transform with defined behavior for invalid dimensions.

Test categories:

- all five fit values;
- horizontal/vertical keywords and reversed order;
- percentages, pixels, `calc()`, and edge offsets;
- portrait/landscape intrinsic ratios;
- zero or invalid box/intrinsic sizes;
- integration with actual image nodes and emitted transforms.

## Resource Preparation Boundary

After the adapter fallback exists, the normal compatibility path is:

```text
adapter scheduler -> adapter preparation store -> converter imageLoader -> core image processing
```

The converter does not need to know the product's budgets or placeholder reasons. If a minimal hook remains necessary to prevent late loads, define it in terms of resolving an optional prepared image, not scheduler state. It must be optional so vanilla callers retain direct loading.

## Cache And Cancellation Contract

- A prepared key resolves to exactly one immutable image or placeholder decision for a capture generation.
- Concurrent requests share work.
- Abort prevents late cache publication.
- Clearing increments generation and empties both prepared and processed caches.
- Conversion cannot silently fetch after the scheduler has made a terminal skip decision.

## Contribution Units

1. CSS image presentation and focused tests.
2. Any independently justified generic loader correctness changes.
3. Optional prepared-resource hook only if it remains necessary and is acceptable upstream.

Adapter staging relocation is fork architecture work, not part of an upstream PR. Do not combine these units into a large capture-pipeline contribution.

## Rollback

Keep the current core preparation path available until adapter fallback passes the full image and parity suites. If equivalence fails, do not delete the core path; record the missing semantic contract and revise the fallback.
