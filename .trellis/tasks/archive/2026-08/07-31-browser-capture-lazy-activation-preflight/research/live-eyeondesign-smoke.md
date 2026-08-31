# Live Eye On Design Smoke

Date: 2026-07-31

## Procedure

- Loaded the live page in headless Chromium at a 1440 x 1100 viewport and
  waited for its initial DOM content.
- Reset the page to `(0, 0)`, analyzed `document.body`, then ran one default
  `lazyActivation: "auto"` capture through the browser adapter.
- Decoded the resulting fig-kiwi clipboard payload and retained aggregate
  counts only. No resource URLs or page text were recorded.

## Result

- Phase order included `review -> activating -> preparing-images ->
  preparing-fonts -> settling -> converting -> completed`.
- Initial and post-activation plans both contained 41 total image resources.
  The existing lazy/CSS source resolver had already inventoried the off-screen
  sources before scrolling.
- Activation used page scope, two passes, one scroll context, and 13 scroll
  steps. It discovered 54 additional DOM nodes and no additional canonical
  image sources.
- Activation stopped with `budget-exhausted` plus a late resource-set-change
  diagnostic, then continued with the bounded final inventory as designed.
- The initial and final page scroll positions were both `(0, 0)` and
  `restored` was `true`.
- The clipboard envelope was valid `fig-kiwi` and decoded to 568 node changes,
  47 IMAGE nodes, 47 IMAGE paints, and 300 blobs.
- The page emitted one unrelated 404 console error. Capture completed without
  adapter failure.

## Conclusion

The live gate confirms bounded activation, scroll restoration, phase ordering,
staging-before-conversion, and a real editable IMAGE payload. The budget status
is non-fatal and remains visible in activation diagnostics rather than being
reported as an image-fetch failure.
