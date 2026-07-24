# Messaging And Security

## Typed Protocol

`shared/messaging.ts` is the source of truth for runtime messages:

~~~ts
export type ProtocolMap = {
  fetchImage(src: string): FetchUrlResult;
  fetchFont(url: string): FetchUrlResult;
};
~~~

Add a request/response shape there first and use the generated
`sendMessage`/`onMessage` pair on both ends. Browser runtime messages are JSON
serialized, so binary data travels as chunked base64 through
`shared/base64.ts`. Do not pass `ArrayBuffer` and assume cross-browser
preservation.

## Privileged Fetch Boundary

The background worker has `<all_urls>` and therefore a stronger network
position than the page. `fetchAsBase64` must:

- parse the URL before fetching;
- allow only `http:` and `https:`;
- omit credentials;
- reject non-success responses;
- return bytes plus a MIME fallback.

Do not broaden schemes or add credentials/cookies without an explicit threat
review. A converted page controls image/font URLs and could otherwise turn the
extension into a private-network fetch proxy.

The image loader tries page fetch first and uses the privileged worker only on
failure. Keep this least-privileged order.

## Restricted Pages

The popup rejects browser-internal pages and extension stores before injection.
Update `RESTRICTED_URL_PREFIXES` when adding a browser target and test the
corresponding platform restriction manually.

## Trigger Contract

`TRIGGER_EVENT_NAME` and `TriggerAction` are shared by popup and content.
Injected `dispatchTriggerEvent` cannot close over imports; all required values
must arrive through serializable arguments.

`onTriggerEvent` should return an unsubscribe function and accept an optional
AbortSignal. Content-script subscriptions should normally use `ctx.signal` so
extension reload/disable tears them down.

## Scenario: Abortable Resource Requests

### 1. Scope / Trigger

- Trigger: staged capture must cancel a privileged image/font fetch without
  accepting a late response from an older capture.
- Scope: `apps/extension/shared/messaging.ts`, the background service worker,
  and content-side resource loaders.

### 2. Signatures

~~~ts
type ResourceRequest = {
  sessionId: string;
  requestId: string;
  url: string;
};

type ResourceCancelRequest = {
  sessionId: string;
  requestId: string;
};

type ProtocolMap = {
  fetchImage(request: ResourceRequest): FetchUrlResult;
  fetchFont(request: ResourceRequest): FetchUrlResult;
  cancelResource(request: ResourceCancelRequest): ResourceCancelResult;
};
~~~

### 3. Contracts

- Content creates a session id per loader and a unique request id per
  privileged request. The background indexes controllers by the pair.
- Background parses the URL, permits only `http:` and `https:`, fetches with
  `credentials: "omit"`, and removes the controller in `finally`.
- Abort sends an idempotent `cancelResource` message and locally rejects the
  pending content promise. A response is accepted only while the matching
  session/request signal is live.
- `data:` and `blob:` image sources remain on the page side and never enter
  the privileged protocol. Raw URLs are internal message data only; public
  diagnostics use stable codes without URLs.

### 4. Validation & Error Matrix

| Condition | Required behavior | Forbidden behavior |
| --- | --- | --- |
| Invalid URL or non-HTTP(S) scheme | Reject before privileged fetch | Expand proxy schemes |
| HTTP error | Reject as transport failure | Return an error body as bytes |
| Explicit cancel | Abort the worker fetch when active | Start queued work or keep controller entries |
| Duplicate cancel/completed request | Return `{ canceled: false }` | Throw or affect a new request |
| Late response after local abort | Suppress it | Update the current capture |
| Successful fetch | Return base64 bytes and MIME | Send credentials/cookies |

### 5. Good / Base / Bad Cases

- Good: page fetch handles a same-origin resource; the background is used only
  after a direct failure and receives a typed HTTP(S) request.
- Base: a background request completes before cancellation and its controller
  is removed by `finally`.
- Bad: content forwards arbitrary `data:`/`file:` URLs to the privileged worker,
  or accepts a late payload after the session signal was aborted.

### 6. Tests Required

- Protocol tests assert request/session identity, invalid/refused URL behavior,
  non-2xx handling, credential omission, abort, duplicate cancel, and map
  cleanup.
- Loader tests assert page-first behavior, signal propagation, local stale
  response suppression, and no privileged request for `data:` or `blob:`.
- Chromium MV3 and Firefox builds remain required after protocol changes.

### 7. Wrong vs Correct

#### Wrong

~~~ts
sendMessage("fetchImage", { url });
~~~

#### Correct

~~~ts
const request = { sessionId, requestId, url };
const pending = sendMessage("fetchImage", request);
signal.addEventListener("abort", () => {
  void sendMessage("cancelResource", {
    sessionId,
    requestId,
  }).catch(() => undefined);
});
~~~

The typed identity is part of the cancellation contract, not optional metadata.
