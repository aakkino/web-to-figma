# 集成设计

## 目标

本父任务定义完整用户流程、跨子任务协议和最终验收，不复制三个子任务的内部设计。核心架构目标是让页面工作区、持久化文件和输出 sink 不因 `@figit/dom-to-figma` 升级或替换而变化。

## End-To-End Flow

```text
toolbar click
  -> in-page workspace idle
  -> choose page / pick element
  -> no-network analysis
  -> show image node + unique resource + unsupported CSS counts
  -> user confirms process/skip and settings
  -> revalidate and lock plan
  -> image stage
       -> success OR retry/placeholders/cancel OR memory decision
  -> font stage
       -> success OR strict retry/compatible/cancel
  -> settle + DOM conversion
  -> PreparedCapture (clipboardHtml + effective settings + diagnostics)
  -> ready-to-output
  -> Copy / Save .figit / Copy & Save
       -> per-sink success/failure and retry
  -> explicit New capture
       -> release current artifact/session state
       -> same in-page workspace idle (no page reload)

Open .figit
  -> parse + version + checksum validation
  -> same ready-to-output state
  -> Copy / Save
```

There is no automatic clipboard write or file download after long-running work. Ready state deliberately creates a new explicit user action.

## Child Ownership

| Child | Owns | Must Not Own |
| --- | --- | --- |
| `07-24-staged-resource-pipeline` | capture contracts, analysis, locked plan, resource stages, bridge, normalized prepared result | React workspace, settings persistence, `.figit` schema, output buttons |
| `07-24-extension-capture-workspace` | toolbar routing, controller, panel/picker, global defaults, tab session, stage presentation | resource algorithms, upstream types, file format/checksum |
| `07-24-figit-capture-artifact` | V1 codec/privacy/checksum, file open/replay, clipboard/download sinks, partial retry | DOM analysis/conversion, resource scheduling, upstream imports |
| parent | source requirements, dependency order, integration contracts, final browser acceptance | normal feature implementation already assignable to a child |

## Cross-Layer Contracts

### Capture Engine Port

Consumed by the workspace:

- project-owned settings and target input;
- command/event state machine with session id and monotonic sequence;
- exact counts/progress/decision tokens;
- terminal `PreparedCapture` or stable failure/cancel.

No upstream configuration, loader, cache token, Figma document or `ConvertResult` crosses this port.

### Prepared Capture

Consumed by the artifact/output layer:

- exact Figma clipboard HTML envelope;
- effective settings snapshot;
- sanitized-capable project diagnostics;
- source/target metadata supplied by the host.

This is an in-memory result, not the persisted `.figit` schema. The artifact child versions and validates the persisted representation.

### Output Port

Consumed by the workspace controller:

- build/open a validated immutable artifact;
- execute one or both selected sinks from an explicit user command;
- return per-sink outcomes;
- retry only a failed sink.

The controller does not know Blob/object URL/checksum details. The output layer does not know how capture stages ran.

### Repeat Capture Reset

The workspace owns an explicit ready/output-to-idle transition. It drops the current `OutputArtifact` and per-sink status, invalidates stale async operation tokens, replaces the capture engine through its factory and preserves only the workspace surface plus draft/persisted settings. The next page/element choice therefore creates a new capture session without remounting the content script or refreshing the host page.

The artifact layer remains passive: it exposes immutable artifacts and stateless sink operations, and it does not retain a capture history. Successful output does not auto-reset because the user may still retry, copy again or save the same artifact.

The workspace UI confirms discard before reset when no sink has succeeded or any selected sink remains failed. Once every selected sink succeeds, `New capture` resets directly; cancelling confirmation leaves the artifact and sink results untouched.

## Dependency Order

1. Resource pipeline finalizes its project contracts and fake-engine tests.
2. If necessary, the minimal upstream image capability lands with compatibility gates.
3. Resource pipeline completes the real bridge and abortable transport.
4. Workspace implements controller/panel against the stable engine port.
5. `.figit` codec and sinks may be implemented independently from literal fixtures, then integrate through the stable output port after workspace ready state exists.
6. Parent performs cross-layer and browser acceptance; only integration fixes without a clear child owner stay in the parent.

Tree relationships do not imply these dependencies; each child PRD and implementation plan records them explicitly.

## Compatibility And Security

- Upstream conversion defaults and existing public consumers remain compatible when the optional staged-image capability is unused.
- Background privileged fetch remains HTTP(S)-only, credentialless and abortable; UI/persisted diagnostics never receive raw resource URLs.
- The panel's Shadow DOM is excluded from composed-tree capture and does not block the surrounding page.
- Global storage contains only explicitly saved defaults; capture plans/results are tab-memory or user-downloaded `.figit` files.
- `.figit` replay validates format/version/checksum before clipboard access and never reopens the source URL.
- No `downloads` permission is added unless the Blob path fails documented browser acceptance and the user re-approves scope.

## Integrated Failure Model

Failures remain owned by their stage:

- target/plan change -> analysis review;
- image fetch/process/timeout -> image recovery;
- memory threshold -> budget review;
- strict font mismatch -> font recovery;
- conversion/cleanup -> capture failure;
- package validation -> open-file error;
- clipboard/download -> per-sink output failure.

An upstream or transport exception is mapped once to a stable project error at its boundary. A downstream component must not infer failure semantics by parsing exception message strings.

## Final Verification Matrix

| Scenario | Expected |
| --- | --- |
| No images | review shows 0/0, image stage skips immediately, fonts/conversion proceed |
| Repeated/currentSrc images | node and unique counts differ, each unique resource prepared once |
| User skips images | no capture-initiated image fetch; transparent placeholders preserve layout |
| Partial image failure | pause, retry only failures or continue placeholders |
| 64/128 MiB | correct soft/hard choices and no uncontrolled allocation |
| Strict font failure | no conversion until retry, compatible switch or cancel |
| Minimize/restore | same tab session and progress |
| Copy & Save partial failure | one conversion, independent sink outcomes, failed-only retry |
| New capture after ready/output | idle without reload, old artifact released, settings preserved, next capture gets a fresh session |
| Reopen valid `.figit` | no source fetch/conversion; exact HTML copied |
| Corrupt/unknown `.figit` | rejected before clipboard |
| Restricted browser page | explicit extension feedback, no unhandled failure |

## Rollout And Rollback

Each child lands as an independently checked change. The primary user flow changes only after the resource port, workspace controller and output codec all pass their local gates.

Rollback preserves boundaries: disable the new workspace route without reverting package codec tests; disable file output without affecting clipboard; remove the optional upstream hook if default parity changes. Do not restore the old opaque long-running path under a new progress UI and call it staged processing.
