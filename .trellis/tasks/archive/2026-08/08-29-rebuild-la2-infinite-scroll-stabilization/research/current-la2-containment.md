# LA2 current-baseline containment

- Refreshed target: `origin/main@0a311e1078c57af9cbf30a58d41c6f5fa6cbf4d8`.
- Historical evidence: S59
  `db6085e8b0d7946d1c7ad48881e782124d8a2fe0`; it is not an ancestor of the
  target and must not be applied literally.
- Current `lazy-activation.ts` defines a 100 ms ordinary quiet window and a
  500 ms trailing window, uses the trailing window for the last planned
  position, and rearms its timer from every observed mutation.
- Current `lazy-activation.browser.test.ts` includes `keeps the trailing edge
  active across delayed mutations`, with mutations after the ordinary window
  and an assertion that the delayed resource enters inventory.
- This is semantic containment by the independent LA1 rebuild, not commit
  ancestry. Execution should verify the current target and record LA2 as
  represented/superseded unless a focused test exposes a residual gap.
