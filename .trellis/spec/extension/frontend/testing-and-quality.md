# Testing And Quality

The extension currently has no automated test script. Do not imply coverage
that does not exist. The required static/build gates are:

~~~sh
pnpm --filter extension check-types
pnpm --filter extension build
pnpm --filter extension build:firefox
pnpm lint
~~~

WXT generates `.wxt/` during prepare/typecheck. Do not hand-edit generated WXT
files.

## Manual Integration Matrix

For a behavior change, test the affected browser target and context:

- popup opens on a normal page and rejects a restricted page;
- whole-page copy preserves user activation and writes a Figma clipboard item;
- picker ignores its shadow UI, supports mouse and keyboard, and cleans up;
- same-origin iframe handling does not throw; cross-origin iframes are skipped;
- same-origin image/font fetch works directly;
- CORS-blocked public HTTP(S) assets fall back to the background worker;
- non-HTTP(S) background proxy input is rejected;
- theme preference propagates between popup and content UI.

Security-sensitive pure helpers should gain focused tests when a test harness is
introduced. Until then, keep them small and deterministic and verify the built
extension rather than only rendering components in isolation.

This package is private, so extension-only changes do not need a changeset.
Changes to the published converter package still follow its release rules.

