# Figma Automation

## Session Factories

Every Figma browser/context must go through
`src/figma/session.ts`. `launchFigmaBrowser` and `newFigmaContext` centralize
the user agent, anti-automation launch flag, viewport, and storage state.
Bypassing them can reintroduce Figma WAF failures.

`classifyStorageState` accepts a path, inline JSON, or base64 JSON and does not
perform I/O. `resolveSessionConfig` reports all missing/invalid settings. Keep
classification pure and verify a base64 value decodes to JSON before treating
it as inline state.

## Resource Cleanup

Browser ownership must be explicit:

- open/validation/login functions close the browser in `finally`;
- `openFigma` closes a partially opened browser before rethrowing;
- callers that receive a successful session close it in their own `finally`;
- best-effort screenshot/close cleanup may suppress only cleanup errors.

Never leak a browser when navigation, WAF, canvas wait, paste, or export fails.

## Paste And Settlement

`src/figma/paste.ts` grants clipboard permission, writes the HTML envelope to
the real clipboard, focuses the scratch canvas, and presses the platform paste
shortcut. Copy-back polls top-level frame names until all expected frames
appear or a bounded timeout expires.

Do not replace settlement with a fixed sleep. Fonts/images import
asynchronously, and the copied-back Kiwi frame list is the readiness signal.

PNG capture retries because Figma's clipboard image can arrive late. Figma
exports at 2x; Tier 2 downsamples by box averaging before comparing with the
DPR-1 browser screenshot.

## Failure Artifacts

A settlement failure writes a full-page screenshot to the run's `figma/`
directory. Successful capture preserves copied-back HTML, PNG, Tier 1 JSON,
Tier 2 JSON, and the diff PNG. Add comparable artifacts before adding a new
live step that can fail; the local operator must be able to diagnose it without
reproducing immediately.

## Credentials And Live Scope

Live Figma operations are local, human-triggered tooling. Keep credentials in
the gitignored environment/session file, use a disposable scratch file, and do
not introduce CI secrets or unattended live runs without a new project
decision. The optional REST token is only for a deliberately enabled pixel
fallback.

