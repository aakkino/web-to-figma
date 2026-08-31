# Rebuild CP1 replayable capture artifacts

## Goal

Rebuild a validated, replayable `.figit` capture artifact and independent
clipboard/file output flow against current `main`, so one prepared capture can
be copied, saved, reopened, and retried without recapturing the page.

## Background

- The planning target is `origin/main@1c26bc2a48dbe9a7dd642aeca6b546c3bd52ffec`,
  verified against the remote on 2026-08-29 and subject to re-pinning before
  implementation.
- Historical candidate S52, commit `e1f134b0d022e13a530ad15e139e24373789c1cb`,
  is evidence only. Literal cherry-pick, replay, or transplant is prohibited.
- Current `main` already has workspace `ready-to-output`, opening, per-sink
  result, retry, and `engineFactory` seams, but file opening is unavailable and
  `capture-artifact.ts` / `capture-output.ts` do not exist.
- LA1 and CP1 are approved for parallel planning/development in isolated
  worktrees. LA1 merges first; CP1 must then synchronize the contained LA1
  target and rerun its full validation before merge.

## Requirements

- Define a project-owned `.figit` V1 using UTF-8 JSON, extension `.figit`, MIME
  `application/vnd.figit.capture+json`, `format: "figit.capture"`, integer
  version, capture metadata, settings, sanitized diagnostics, and one exact
  `figma-clipboard-html` payload.
- Store the clipboard HTML exactly once and protect its UTF-8 bytes with a
  lower-case SHA-256. Do not duplicate Kiwi bytes/base64 or import converter
  internal types into the codec or sinks.
- Snapshot source URL/title and target kind/label as plain data at analysis
  time. Persist only origin + pathname; strip credentials, query, and fragment.
  Persist aggregate/stable diagnostics without raw image/font URLs or page text.
- Treat the exact clipboard payload as user-selected capture content, not as
  anonymized data; UI/error wording must not claim otherwise.
- Reject files larger than 256 MiB before `File.text()`/JSON parsing. Apply the
  same serialized UTF-8 ceiling to newly built artifacts.
- Validate in order: size, JSON, format, version, required shape, payload type,
  checksum. Invalid input must never touch clipboard or output sinks.
- Produce one immutable `OutputArtifact` for fresh capture or opened file.
  Clipboard and Blob-download sinks consume that same artifact, run
  independently, preserve partial success, and allow retry of only a failed
  sink without capture or package reconstruction.
- Use explicit user commands for Copy, Save, Copy & Save, and Open. Blob
  download must clean up object URLs and must not add `downloads` permission.
- Preserve original logical package metadata and checksum when reopening and
  saving; opening never revisits the source page or performs DOM conversion.
- Provide explicit `New capture` from ready/output terminal states. It clears
  artifact/session/output state, preserves surface and draft/default settings,
  and replaces the engine/session. Discard confirmation is required when no
  sink succeeded or a selected sink remains failed.
- Invalidate stale preparation/output completions so discarded artifacts cannot
  mutate a new capture. Do not allow reset while capture, preparation, or output
  is running.
- Keep extension storage free of payloads, automatic history, and source
  metadata. CP2 persistence/UI reconciliation remains a separate dependent
  cohort and is not pre-authorized here.
- Implement in an isolated branch/worktree without modifying, staging, stashing,
  cleaning, or normalizing the dirty `sync/upstream-20260726` root.

## Acceptance Criteria

- [ ] V1 serialization/parsing round-trips the exact HTML and checksum while
      storing no duplicate payload representation.
- [ ] Tampering, malformed JSON, wrong format/version/type/shape, checksum
      mismatch, and oversize input produce stable errors and zero sink calls.
- [ ] Source metadata is a DOM-free snapshot; persisted URL and diagnostics
      satisfy the privacy allow-list and retain useful stable correlations.
- [ ] Fresh and reopened artifacts enter one ready/output path and yield
      byte-identical clipboard HTML.
- [ ] Clipboard-only, file-only, and combined output each run once from the same
      artifact; one sink failure preserves the other success and retry invokes
      neither capture nor package rebuild.
- [ ] Blob download has safe filename/MIME and object URL cleanup without a
      `downloads` permission change.
- [ ] Reopen/re-save preserves original logical metadata and checksum, while
      canceling file selection preserves the prior idle/ready state.
- [ ] `New capture` guards active work, applies discard confirmation correctly,
      clears old artifact/results, preserves settings/surface, and starts the
      next analysis with a fresh engine/session immune to stale completions.
- [ ] Extension tests, type check, Chrome MV3/Firefox MV2 builds, targeted
      Biome, workspace gates, and `git diff --check` pass or record only
      independently reproduced pre-existing failures.
- [ ] Browser smoke covers HTTP/HTTPS clipboard capability, Chromium/Firefox
      download/open, corrupt/checksum rejection, partial failure, and two
      consecutive same-tab captures.
- [ ] The result is one independently reversible CP1 PR. After LA1 merges, CP1
      synchronizes contained `main` and reruns all gates before its own merge.
- [ ] Refreshed `origin/main` contains CP1 reviewed head and merge commit before
      CP2 planning can be requested.

## Out Of Scope

- CP2 capture persistence integration, automatic history, storage of payloads,
  recent files, cloud sync, compression, encryption, or public interchange.
- Generating or parsing a real `.fig` file, background auto-save, or adding
  browser download permissions.
- Changes to conversion semantics, resource activation, or LA1 behavior.
- Whole-branch integration or literal application of historical commits.

## Key Decisions

- V1 is inspectable JSON with one exact HTML payload and checksum, not a ZIP or
  converter-owned format.
- Output sinks are independent and explicitly user-triggered; artifact creation
  completes before ready state.
- LA1 and CP1 may be implemented concurrently, but CP1 merges second after
  syncing LA1 containment and completing full revalidation.
- No blocking product or scope questions remain. Implementation still requires
  a separate final-plan approval.
