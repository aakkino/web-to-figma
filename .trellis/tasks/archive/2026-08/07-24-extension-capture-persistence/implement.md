# 父任务实施与集成计划

## 0. Planning Gate

- [x] Confirm product workflow, image/font semantics, persistence scope, output behavior and upstream decoupling requirements.
- [x] Split the scope into three independently verifiable child tasks.
- [x] Record explicit dependencies and ownership in every child PRD/design/implementation plan.
- [x] User reviews the parent and child planning artifacts and authorizes implementation.

## 1. Resource Pipeline Child

- [x] Start and complete `07-24-staged-resource-pipeline` first.
- [x] Review its project-owned capture contracts before downstream implementation.
- [x] Require proof that staged images are fully prepared/reused and placeholders preserve layout.
- [x] Require upstream default compatibility, abortable transport and fake-bridge state-machine coverage.
- [x] Archive/record the child only after its package/browser gates pass.

## 2. Workspace Child

- [x] Start `07-24-extension-capture-workspace` against the reviewed capture port.
- [x] Verify toolbar action routing and restricted-page feedback before removing the popup production path.
- [x] Verify controller/settings/panel/picker locally with a fake output port.
- [x] Handoff a stable ready/output integration port to the artifact child.
- [x] Archive/record the child after Chromium and Firefox workspace smoke.

## 3. Artifact And Output Child

- [x] Implement/test V1 codec, privacy, checksum and sinks from literal fixtures.
- [x] Integrate fresh capture and opened package through the workspace output port.
- [x] Verify Copy, Save and Copy & Save activation/partial-retry behavior without recapture.
- [x] Verify Blob download without `downloads` permission and HTTP/HTTPS clipboard behavior.
- [x] Add and verify explicit ready/output-to-idle reset, including old artifact release, fresh engine/session creation and preserved draft/default settings.
- [x] Archive/record the child after schema, browser and privacy gates pass.

## Completed Evidence Sync (2026-08-01)

- Resource pipeline: feature commit `4da4c51`, archive commit `5d16e93`, and the archived child plan records adapter/core/extension tests, builds, browser smoke, package-consumer compatibility and clipboard parity as complete.
- Capture workspace: feature commit `f6acba7` and archive commit `f52e8af`; the artifact integration in `e1f134b` consumes the workspace `OutputPort`, proving the ready/output handoff. Toolbar, restricted-page and panel/browser checks remain open below until parent integration verification.
- `.figit` artifact and outputs: feature commit `e1f134b` and archive commit `468a72d`. The archived validation record reports 52 extension tests, extension/root type checks, Chromium MV3 and Firefox builds, Chromium HTTP/HTTPS clipboard plus Blob/open/re-save/tamper/privacy/reset smoke, and user-confirmed Firefox Blob/open/two-capture smoke.
- Task tree: all three linked child task records are archived with `status: completed`; parent-only cross-layer and browser verification remains intentionally unchecked.

## 4. Parent Integration Review

- [x] Search extension/workspace/artifact source for direct `@figit/dom-to-figma` imports and accept only the documented bridge/dependency assembly boundary.
- [x] Run the complete end-to-end verification matrix in `design.md` on built Chromium MV3 and Firefox output.
- [x] Confirm panel DOM is excluded, page remains interactive, session restore works and no capture history leaks into storage.
- [x] Compare fresh and reopened clipboard HTML for exact equality and tamper rejection.
- [x] Verify no selected output causes a second capture/conversion and failed-only retry calls only its sink.
- [x] Complete two page/element captures in one tab without reload; confirm old artifact/output/stale events cannot affect the second session.
- [x] Confirm no requirement was weakened into fake progress, raw-byte-only preload or silent fallback.

## 5. Repository Gates

- [x] Run all affected package tests, type checks and builds.
- [x] Run core oracle/parity gates if the upstream image converter or node geometry changed.
- [x] Run isolated package install/consumer verification for any new public upstream API.
- [x] Run targeted/full lint as repository state permits and always run `git diff --check`.
- [x] Review whether proven cross-layer contracts belong in `.trellis/spec/` before completion.

## Validation Commands

```powershell
pnpm --filter @figit/browser-capture-adapter check-types
pnpm --filter @figit/browser-capture-adapter test
pnpm --filter @figit/browser-capture-adapter build
pnpm --filter @figit/dom-to-figma check-types
pnpm --filter @figit/dom-to-figma test
pnpm --filter @figit/dom-to-figma build
pnpm --filter extension test
pnpm --filter extension check-types
pnpm --filter extension build
pnpm --filter extension build:firefox
pnpm check-types
pnpm test
pnpm oracle:parity
git diff --check
```

`extension test` is an intended child deliverable if it does not exist at implementation start. Full-repository lint findings unrelated to touched files must be reported, not mass-formatted.

## Parent Integration Validation Record (2026-08-01)

- Static boundaries: extension product source has no direct `@figit/dom-to-figma` import; the only source import is `internal/browser-capture-adapter/src/bridges/dom-to-figma.ts`. Built Chrome/Firefox manifests have an action title, no default popup and no `downloads` permission.
- Package gates: extension 9 files/52 tests, adapter 14 files/77 tests and core 28 files/226 tests passed. Package and repository type checks/builds passed; Chrome MV3 and Firefox MV2 production builds passed.
- Repository gates: full `pnpm test`, `pnpm check-types`, `pnpm build`, 52-scene `pnpm oracle:parity`, governance/stable/main core-delta checks, and isolated stable/upstream-main adapter consumers passed. `git diff --check` passed.
- Chromium MV3 loaded-extension smoke: direct typed open/restore, no auto-capture, picker-to-review, panel minimize/restore, page pointer interaction, 380px desktop and 328px narrow geometry, explicit settings persistence, HTTP Copy & Save partial result, failed-only retry without a second download, guarded reset, page capture after element capture without reload, distinct second payload, valid `.figit` reopen/re-save equality, checksum rejection, and storage privacy all passed.
- Visual evidence: `screenshot/capture-persistence-desktop.png` and `screenshot/capture-persistence-narrow.png` show no overflow, overlap or text clipping.
- Firefox evidence: the current Firefox MV2 build passed. The archived artifact record and the later `07-31-browser-capture-lazy-activation-preflight` verification record contain user-confirmed Firefox loaded-extension Blob/open/two-capture and current workspace smoke.
- Integration fix: the combined output command was aligned with the approved `Copy & Save` label; the changed file passes directed Biome, extension tests, type-check and both browser builds.
- Lint limitation: repository `pnpm lint` is still blocked by nested root configs under `.tmp/lint-validation-20260726` and `.tmp/upstream-image-loader-cancellation`. A directed three-package scan also reports existing historical/CRLF diagnostics; the only changed application source file passes directed Biome.
- User-confirmed live check: the actual toolbar action on a browser-restricted page produced the expected explicit feedback, completing the final browser matrix item.

## Final Review Gates

1. Requirements: all parent acceptance criteria map to a child test or explicit browser check.
2. Decoupling: UI/storage/package code has no upstream types; bridge is replaceable by a fake/alternate engine.
3. Staging: image work truly completes before later phases and is not repeated during conversion.
4. Persistence: `.figit` is exact, versioned, checksummed and privacy-minimized at the metadata boundary.
5. UX: toolbar-to-panel flow is direct, progress is factual, recovery actions are clear and final output remains explicit.

## Parent Rollback Points

- Any child that fails its contract gate remains unintegrated; do not start dependent child implementation against unstable types.
- An upstream hook that changes existing output rolls back independently of workspace/artifact work.
- File output can remain disabled while clipboard and workspace ship only if the parent scope is explicitly re-reviewed; it cannot be silently omitted.
- The old popup may be temporarily restored only as a browser-routing rollback, not as a second permanent primary workflow.
