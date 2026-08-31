# 文本与字体正确性设计

## Contribution A: Glyph-Aware Font Contract

Extend the existing loader request with an optional, sorted, unique `codePoints` field. This is a capability hint, not product policy. Existing loaders remain source-compatible because they may ignore it.

The core is responsible for:

- collecting code points from the transformed text run;
- passing them through the cache key and loader request;
- parsing the returned bytes;
- emitting the actual resolved family, weight, italic state, style, and PostScript metadata consistently.

The adapter is responsible for:

- selecting catalog, page, bundled, or fallback sources;
- checking glyph coverage;
- deciding fallback order and failure policy;
- producing user-facing diagnostics.

## Cache Identity

Font cache identity must include enough glyph-demand information to avoid reusing a Latin-only resolution for a later CJK run. Use a deterministic representation of sorted code points or an equivalent coverage key. Do not store source text in cache keys or diagnostics.

## Contribution B: Single-Line Sizing

Derive auto-resize from observable DOM and CSS state:

```text
single rendered line
AND white-space is nowrap or pre
AND no explicit line separator
AND text-overflow is not ellipsis
  -> WIDTH_AND_HEIGHT
otherwise
  -> preserve measured fixed box
```

When the parent is inferred Figma auto-layout, use the appropriate child alignment so width and height remain hug-sized. The parent auto-layout signal must be carried through the conversion context rather than rediscovered inconsistently.

## Document Ownership

Use `node.ownerDocument.createRange()` and `element.ownerDocument.defaultView` instead of ambient global document/window access. This makes iframe and test-document behavior correct and is independently justifiable in upstream review.

## Test Matrix

Font tests cover Latin-only, CJK-only, mixed scripts, repeated characters, whitespace, non-BMP characters, family substitution, weight/style substitution, cache separation, and loader compatibility without `codePoints` handling.

Text tests cover nowrap, pre, normal wrapping, explicit line separators, ellipsis, auto-layout parent, non-auto-layout parent, transformed text, and iframe-owned nodes.

## Commit Boundaries

Prepare at least two commits/PR drafts:

1. glyph-aware loader contract and resolved metadata correctness;
2. single-line sizing and auto-layout child behavior.

Document-owner fixes may be a small prerequisite commit if upstream review is clearer that way. Do not combine adapter fallback policy with the core font contract.
