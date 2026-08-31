# 实施计划

## 0. Contract Fixtures

- [x] Confirm the resource child delivers exact `clipboardHtml`, effective settings and project diagnostics without upstream types.
- [x] Define `CaptureSourceSnapshot` at the extension host boundary and snapshot URL/title/target metadata when analysis starts without retaining DOM references.
- [x] Freeze a small real clipboard envelope fixture and a sanitized diagnostic fixture for round-trip tests.
- [x] Define project-owned V1/`OutputArtifact` types, stable validation/output error codes and the revised `prepare/open/execute/retry` `OutputPort` contract.

## 1. Schema, Checksum And Sanitization

- [x] Implement `CapturePackageV1` construction with `format`, integer version, producer/source/settings/diagnostics and one HTML payload.
- [x] Add `@noble/hashes` as a direct extension dependency and implement UTF-8 SHA-256 with Web Crypto plus the noble fallback; verify both against standard and non-ASCII vectors.
- [x] Build source URL and diagnostic sanitizers by allow-list construction, including hashed normalized resource IDs.
- [x] Implement safe suggested filenames and UTF-8 JSON serialization.
- [x] Enforce the 256 MiB UTF-8 package ceiling before returning an artifact.
- [x] Test that serialized JSON contains exactly one clipboard envelope and no raw bytes/base64 duplicate fields or raw resource URLs.

## 2. Parser And Validation

- [x] Reject `File.size > 256 MiB` before reading, then implement ordered JSON/format/version/shape/payload/checksum validation without executing or trusting input fields.
- [x] Ignore unknown fields within supported V1 while rejecting missing/wrong required fields and unknown versions.
- [x] Return immutable validated artifacts and concise stable errors without echoing payload content.
- [x] Cover malformed JSON, arrays/null, type confusion, checksum syntax/mismatch, unsupported payload and large representative payload round trips.

## 3. Clipboard And File Sinks

- [x] Implement exact `text/html` ClipboardItem creation and clipboard capability/error mapping.
- [x] Implement `.figit` Blob download with MIME, temporary anchor, safe filename and object URL cleanup.
- [x] Keep file output independent of WebExtension `downloads` and assert the manifest does not gain that permission.
- [x] Add sink unit tests with fake browser APIs, including cleanup on throw.

## 4. Output Coordinator

- [x] Implement selected-sink validation, immutable `OutputArtifact`, and separate mutable per-sink controller status.
- [x] Start all selected sinks synchronously inside one command before awaiting results, then aggregate with all-settled semantics.
- [x] Implement success, partial success and all-failed results with per-sink error codes.
- [x] Implement named sink retry and prove it does not rebuild/revalidate an artifact or invoke the capture engine.
- [x] Cover duplicate clicks/in-flight guards and preserve prior sink successes.

## 5. Open And Replay

- [x] Implement the file input adapter with accept hints, same-file reselection and cancel-safe behavior.
- [x] Parse/validate selected files before entering ready state; never touch clipboard on invalid input.
- [x] Convert valid opened packages to the same `OutputArtifact` used by new captures without source-page access, preserving original logical metadata on re-save.
- [x] Wire preparation after engine completion plus Open `.figit`, Copy, Save and Copy & Save through the revised workspace `OutputPort`.
- [x] Add UI states for artifact preparation/validation, ready, oversized/corrupt/unsupported file and per-sink partial failure without destroying the artifact.

## 6. Repeat Capture Reset

- [x] Add a guarded `WorkspaceController.startNewCapture()` transition for ready/output terminal states; keep capture/preparation/output-running states non-resettable.
- [x] On reset, detach and clear the old engine, replace it through `engineFactory`, and atomically clear artifact/source/capture/output/font/transient state while preserving surface and draft/default settings.
- [x] Add a secondary `New capture` command to ready, output-success, partial and failed views; do not auto-reset after a successful sink run.
- [x] Require discard confirmation when no sink has succeeded or any selected sink remains failed; reset directly after all selected sinks succeed, without coupling the policy to engine or artifact modules.
- [x] Test ready-before-output, all-success, partial, all-failed and output-running guards, including two consecutive captures with distinct sessions and payloads.
- [x] Test that stale old-engine/preparation/output completions cannot restore the discarded artifact or mutate the next capture, and that output retry after reset is impossible.

## 7. Browser And Privacy Validation

- [x] Verify clipboard output from fresh capture and reopened `.figit` is byte-for-byte identical.
- [x] Verify HTTPS and HTTP page behavior in Chromium, recording any API/permission difference as a sink result.
- [x] Verify Chromium MV3 and Firefox Blob downloads, filenames, MIME, reopening and object URL cleanup.
- [x] Inspect extension storage to confirm no payload/history/source metadata was persisted.
- [x] Inspect a saved file to confirm URL/query/resource privacy rules and honest UI wording.
- [x] In both Chromium MV3 and Firefox, complete two page/element captures in one tab without reload and verify the second capture uses current page state and preserved draft settings.

## Validation Commands

```powershell
pnpm --filter extension test
pnpm --filter extension check-types
pnpm --filter extension build
pnpm --filter extension build:firefox
pnpm check-types
git diff --check
```

Run targeted Biome checks for all new schema/sink/test files if the repository-wide lint remains blocked by unrelated pre-existing formatting findings.

## Review Gates

1. Schema gate: V1 fixture, checksum vectors, tamper rejection and single-payload invariant are approved.
2. Privacy gate: allow-listed persisted diagnostics contain no raw resource URLs and source URL is minimized.
3. Activation gate: Copy & Save starts both sinks before the first await and partial failures preserve the artifact.
4. Resource gate: package/file size is bounded before ready/parse and both SHA-256 paths produce identical UTF-8 results.
5. Browser gate: Blob download works without `downloads` permission in Chromium and Firefox; HTTP/HTTPS clipboard behavior is documented.
6. Repeat-capture gate: explicit reset releases the old artifact, preserves settings, creates a fresh engine/session and completes a second capture without reload or stale-state leakage.
7. Integration gate: fresh and opened artifacts share one ready/output path and no retry recaptures the page or rebuilds the package.

## Rollback Points

- If checksum differs between browser paths, disable file creation/opening until UTF-8 hashing parity is fixed; do not accept unchecked packages.
- If diagnostic sanitization cannot prove an allow-list, omit the questionable detail and retain only aggregate counts/stable codes.
- If one file download path is unreliable, keep clipboard output independent and return any permission expansion to planning.
- If multi-sink sequencing loses activation, keep separate Copy and Save commands available while correcting the coordinator; never auto-output at capture completion.
- If reset cannot reliably invalidate stale async results, keep `New capture` disabled rather than reintroducing page refresh as a hidden reset mechanism.

## Validation Record (2026-08-01)

- `pnpm --filter extension test`: 9 files, 52 tests passed.
- `pnpm --filter extension check-types`, `pnpm check-types`, targeted Biome, and scoped `git diff --check`: passed.
- Repository-wide `pnpm lint` is blocked before file scanning by pre-existing nested root Biome configurations under `.tmp/lint-validation-20260726` and `.tmp/upstream-image-loader-cancellation`; no unrelated temporary directory was changed.
- Chromium MV3 and Firefox MV2 production builds: passed; neither manifest contains the `downloads` permission.
- Automated Chromium MV3 smoke: HTTP clipboard returned an independent failed sink while Blob download remained successful; HTTPS clipboard succeeded. The browser normalized HTML when reading it back from the OS clipboard, while fresh and reopened artifacts produced identical readback and the sink unit test verified the exact `text/html` Blob input.
- Automated Chromium MV3 smoke also passed page/element captures in one tab, changed-page payload isolation, `.figit` download/open/re-save, checksum rejection, discard confirmation/direct reset, and storage privacy checks.
- User-confirmed Firefox live smoke passed: Blob download/open, filename/MIME behavior, and two same-tab captures were manually verified.
