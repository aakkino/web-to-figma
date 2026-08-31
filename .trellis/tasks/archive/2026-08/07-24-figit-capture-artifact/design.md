# 技术设计

## 设计目标

定义一个项目自有、版本化且不依赖转换器内部模型的回放边界。捕获引擎只需交付精确 clipboard HTML；本模块负责把它封装成 `.figit`、验证、输出和重新打开。

## Module Boundary

```text
PreparedCapture + CaptureSourceSnapshot
                 |
                 v
CapturePackageBuilder ----> OutputArtifact ----> Blob download
                                  ^      |
                                  |      v
                              parser + checksum <---- file input
                                  |
                                  v
                         OutputCoordinator ----> clipboard sink
                                           \----> file sink
```

Codec, sanitizer, checksum and sink modules depend only on browser standards and project-owned types. They do not import the adapter's concrete bridge or `@figit/dom-to-figma`. Tests use literal HTML fixtures.

## V1 Schema

The canonical logical shape is:

```ts
type CapturePackageV1 = {
  format: "figit.capture";
  version: 1;
  createdAt: string;
  producer: {
    name: string;
    version: string;
  };
  source: {
    url: string;
    title: string;
    target: { kind: "page" | "element"; label?: string };
  };
  settings: EffectiveCaptureSettingsV1;
  diagnostics: CaptureDiagnosticsV1;
  payload: {
    type: "figma-clipboard-html";
    html: string;
    sha256: string;
  };
};
```

`sha256` is lower-case 64-character hex over `TextEncoder().encode(payload.html)`. JSON formatting, property order and outer whitespace are not part of the checksum. This permits reformatting the JSON while protecting the exact replay payload.

V1 stores no `bytes`, `base64`, DOM node, converter document, cache token or function. The base64 text already present inside the Figma HTML envelope is not copied into a second field.

The JSON writer may pretty-print for inspectability. Serialization uses ordinary `JSON.stringify` and UTF-8 Blob construction; no ZIP/compression layer is introduced.

## Validation

Parsing is a boundary operation and never returns a partly trusted object. Validation order is:

1. reject a file whose declared byte size exceeds the package ceiling;
2. read the file as UTF-8 text and parse JSON;
3. require a plain object and `format === "figit.capture"`;
4. require a supported integer version;
5. validate required V1 objects/scalars and payload type;
6. validate checksum syntax and recompute SHA-256 over exact HTML;
7. return an immutable/readonly validated package suitable for ready state.

Unknown fields are ignored so producers can add non-semantic metadata without breaking V1 readers. Missing/invalid known fields are rejected with stable codes. Unknown versions are never interpreted as V1 even if fields look similar.

Checksum uses Web Crypto where available. Where insecure HTTP content contexts lack `crypto.subtle`, use `@noble/hashes` as an explicit extension runtime dependency and its SHA-256 implementation; do not copy the converter's internal hash helper or rely on a transitive dependency. The two paths share known-vector and non-ASCII UTF-8 tests.

Before `File.text()` or JSON parsing, reject `file.size > 268_435_456` with `file-too-large`. Package construction measures the serialized UTF-8 byte length against the same 256 MiB ceiling before returning a ready artifact. This bound leaves room above the capture pipeline's 128 MiB prepared-image hard limit and its base64 expansion while preventing unbounded untrusted input.

Validation errors are classified as file-too-large, file-read, invalid-json, invalid-structure, unsupported-version, unsupported-payload and checksum-mismatch. Fresh package construction reports artifact-too-large separately. Error messages do not echo the entire payload.

## Privacy Transformation

Package construction receives raw session metadata and produces the persisted shape through an explicit sanitizer:

- source URL is parsed, credentials/search/hash are cleared, then only origin + pathname is retained;
- title, target kind/label, timestamp and effective settings are retained;
- resource entries are reduced to stable error code, status and `resourceId = SHA-256(normalized resolved URL)` where correlation is needed;
- raw image/font URL, request headers, exception stack and DOM references are removed;
- counts and aggregate byte sizes are retained.

The sanitizer is tested against nested diagnostics, not implemented as a fragile top-level key deletion. Prefer constructing the allowed persisted shape field-by-field.

The payload itself remains exact and can contain captured page text or image bytes encoded inside the envelope. UI privacy wording distinguishes “source/diagnostic metadata minimized” from “capture content anonymized”.

## Host Metadata Boundary

When analysis starts, the workspace snapshots `location.href`, `document.title`, and a target descriptor (`page` or `element`, plus the existing derived frame label) into a plain `CaptureSourceSnapshot`. The controller retains that snapshot with the capture session id. It never passes an `Element`, `Node`, document, or live location object to the artifact module.

On engine completion, the controller calls `OutputPort.prepare(preparedCapture, sourceSnapshot)`. Package construction sanitizes the URL and records `createdAt` at this point. Stale preparation results are ignored using the same session/operation discipline as capture events.

## Ready Artifact

The workspace holds an immutable `OutputArtifact`:

```ts
type OutputArtifact = {
  package: Readonly<CapturePackageV1>;
  serializedJson: string;
  clipboardHtml: string;
  suggestedFilename: string;
  origin: "capture" | "opened-file";
};
```

Per-sink pending/success/failure is mutable controller state beside the artifact, not a field inside it. Opening `.figit` returns the same artifact shape as a fresh capture. It never accesses the source URL or invokes the capture engine. A fresh capture builds its package, checksum, canonical JSON and filename before entering ready state so output clicks do not spend activation time on avoidable preprocessing.

The workspace/output contract becomes:

```ts
type OutputPort = {
  prepare(
    capture: PreparedCapture,
    source: CaptureSourceSnapshot
  ): Promise<OutputArtifact>;
  open(): Promise<OutputArtifact | null>;
  execute(
    artifact: OutputArtifact,
    outputs: CaptureSettings["outputs"]
  ): Promise<OutputRunResult>;
  retry(
    artifact: OutputArtifact,
    sink: CaptureOutput
  ): Promise<OutputSinkResult>;
};
```

The controller adds an artifact-preparing state between engine completion and ready-to-output. An opened artifact retains its original package fields and checksum when saved again; opening time does not replace `createdAt`. Canonical reserialization is allowed, but logical package content must be unchanged.

Suggested filenames use a filesystem-safe base plus `.figit`; invalid Windows/macOS characters, trailing dots/spaces and excessive length are removed. A timestamp fallback guarantees a non-empty name.

## Repeat Capture Lifecycle

The ready artifact remains available after output so Copy, Save and failed-sink retry stay repeatable. It is released only through an explicit controller command:

```text
ready-to-output | output success | output partial | output failed
                           |
                           | New capture
                           v
                         idle
                           |
                           | Capture page / Pick element
                           v
                fresh engine + fresh session -> analyzing
```

`WorkspaceController.startNewCapture()` is a domain transition, not a page reload and not an implicit whole-page capture. It is legal only while an artifact is ready and neither artifact preparation nor output is running. The command:

- detaches the old engine subscription and replaces the engine through the existing `engineFactory` using current draft settings;
- atomically sets the engine snapshot/view to idle and clears the artifact, source snapshot, output results, font-spec state and transient message;
- preserves the visible/minimized surface choice, draft settings and persisted global defaults;
- invalidates any preparation/output operation token so a late completion cannot restore the discarded artifact.

The old engine is terminal before this transition. Its bridge cache is cleared before the controller drops the engine reference; the replacement gets a new converter, capture runtime and session id. The module-level cache for immutable bundled fallback-font files may remain shared because it is not target, session or artifact state.

The UI renders `New capture` as a secondary command in every ready/output terminal view and disables it during output. Successful output never triggers this transition automatically. The UI command guard requires discard confirmation when no sink has succeeded or any selected sink remains failed; after every selected sink succeeds it resets directly. Cancelling confirmation leaves the controller and artifact unchanged. This policy does not change controller reset semantics.

## Output Sinks

### Clipboard

The clipboard sink constructs a `ClipboardItem` with `text/html` Blob containing the exact stored HTML and calls `navigator.clipboard.write`. It reports unsupported API, permission/activation denial and write failure separately. It does not regenerate the envelope.

### Local File

The file sink constructs a Blob from `artifact.serializedJson` with `application/vnd.figit.capture+json`, creates an object URL, attaches/clicks a temporary anchor with `download`, removes it and revokes the URL after the browser has consumed the click. Cleanup runs even when anchor dispatch throws.

No `downloads` API or permission is introduced in V1. Browser smoke must prove this path in Chromium and Firefox before acceptance; otherwise permission escalation returns to planning.

### Multi-Sink Coordination

On `Copy & Save`, both selected sink functions are invoked synchronously within the same user click handler before awaiting either promise. The coordinator then uses all-settled semantics to record each result independently.

```text
user click
  -> invoke clipboard write (obtain promise)
  -> trigger Blob download (obtain promise/result)
  -> await both outcomes
  -> success | partial | failed
```

This preserves fresh activation and prevents a slow/failing first sink from suppressing the second. The immutable artifact remains in memory. `retrySink("clipboard")` or `retrySink("file")` invokes only that sink and keeps prior successes.

## File Open Flow

The UI uses an explicit file input with `.figit` and MIME accept hints. The input click originates in the Open command. On selection, the module reads and validates the first file, then returns an artifact to ready state. Cancel is not a capture failure and leaves the prior idle/ready artifact unchanged. The input value is reset after handling so the same file can be chosen again.

Modern `cancel` events are used where available; a focus-return fallback may be used only to clear a pending UI indicator, never to infer a selected file.

## Compatibility And Evolution

- `version` is an integer format version, independent of extension/npm semantic versions.
- Producer version is informational and never controls parsing.
- A future V2 gets a separate parser/migrator and cannot silently reinterpret V1 checksum semantics.
- Unknown V1 fields are ignored; unknown versions are rejected.
- The schema is owned by extension/project code and remains usable if the conversion engine changes, provided it yields a valid clipboard HTML envelope.
- The 2026-07-29 upstream audit found no commit beyond the pinned `cc8d4864`; both stable `0.2.1` and pinned-main adapter consumers pass, so `.figit` must not take a direct converter dependency or bundle an upstream intake into this task.

## Testing Strategy

- Unit: schema guards, known SHA-256 vectors, tamper detection, URL/diagnostic sanitization, filename safety and round trip.
- Sink: fake Clipboard API, Blob/object URL/anchor cleanup, simultaneous invocation ordering and all partial-failure combinations.
- Controller integration: engine completion waits for artifact preparation; capture/open artifacts enter the same ready state; stale preparation is ignored; retry never calls capture or rebuilds the package; explicit new-capture reset drops the old artifact and starts the next analysis on a fresh engine/session while preserving draft settings.
- Browser smoke: HTTPS and HTTP clipboard, Chromium/Firefox download, same-file reopen, corrupt/unknown version rejection, Copy & Save and two consecutive page/element captures without reload.

## Rollout And Rollback

Land codec/sanitizer/checksum with fixtures first, then sink coordinator, then workspace integration. Until browser download smoke passes, the file checkbox remains unavailable in production wiring even though codec tests exist.

If a browser requires `downloads` permission, do not add it as a silent fix. Keep clipboard output working, report file output unavailable for that browser build and return the permission decision to planning.
