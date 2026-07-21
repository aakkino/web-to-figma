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

