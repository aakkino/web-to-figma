---
"@figit/composed-dom": patch
"@figit/dom-to-figma": minor
---

Add the versioned browser DOM traversal utility and an opt-in `domTraversal`
strategy to the converter. Existing core consumers remain on light DOM, while
the private capture adapter uses open composed DOM consistently for preparation
and conversion.
