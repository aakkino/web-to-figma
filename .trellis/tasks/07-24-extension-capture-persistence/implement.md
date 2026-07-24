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
- [ ] Verify toolbar action routing and restricted-page feedback before removing the popup production path.
- [ ] Verify controller/settings/panel/picker locally with a fake output port.
- [ ] Handoff a stable ready/output integration port to the artifact child.
- [ ] Archive/record the child after Chromium and Firefox workspace smoke.

## 3. Artifact And Output Child

- [ ] Implement/test V1 codec, privacy, checksum and sinks from literal fixtures.
- [ ] Integrate fresh capture and opened package through the workspace output port.
- [ ] Verify Copy, Save and Copy & Save activation/partial-retry behavior without recapture.
- [ ] Verify Blob download without `downloads` permission and HTTP/HTTPS clipboard behavior.
- [ ] Archive/record the child after schema, browser and privacy gates pass.

## 4. Parent Integration Review

- [ ] Search extension/workspace/artifact source for direct `@figit/dom-to-figma` imports and accept only the documented bridge/dependency assembly boundary.
- [ ] Run the complete end-to-end verification matrix in `design.md` on built Chromium MV3 and Firefox output.
- [ ] Confirm panel DOM is excluded, page remains interactive, session restore works and no capture history leaks into storage.
- [ ] Compare fresh and reopened clipboard HTML for exact equality and tamper rejection.
- [ ] Verify no selected output causes a second capture/conversion and failed-only retry calls only its sink.
- [ ] Confirm no requirement was weakened into fake progress, raw-byte-only preload or silent fallback.

## 5. Repository Gates

- [ ] Run all affected package tests, type checks and builds.
- [ ] Run core oracle/parity gates if the upstream image converter or node geometry changed.
- [ ] Run isolated package install/consumer verification for any new public upstream API.
- [ ] Run targeted/full lint as repository state permits and always run `git diff --check`.
- [ ] Review whether proven cross-layer contracts belong in `.trellis/spec/` before completion.

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
