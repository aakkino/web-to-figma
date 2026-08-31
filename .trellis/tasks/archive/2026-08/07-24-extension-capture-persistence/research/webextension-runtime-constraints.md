# WebExtension Runtime Constraints

## Toolbar action

- Chrome does not emit `action.onClicked` when the action has a popup. The
  existing WXT popup entrypoint therefore has to stop being the manifest
  `default_popup` before a background action handler can open the in-page
  workspace.
- The background action handler should address only the clicked tab and ask its
  content controller to open or restore the panel. Restricted URLs need an
  explicit action-level failure signal because no content UI can be injected.

Source: [Chrome action API](https://developer.chrome.com/docs/extensions/reference/api/action)

## Content-script API boundary

- Chrome content scripts directly expose only a limited set of extension APIs,
  including storage and runtime messaging. They do not directly expose the
  downloads API; privileged download orchestration would require a background
  message.
- The standard DOM File API and a file input can open `.figit` files from the
  in-page panel without a new extension permission.
- A Blob download initiated by the panel's final user action is the preferred
  low-permission path for V1. The downloads API remains a fallback only if
  browser verification proves the DOM download path unreliable.
- Adding the downloads API requires the `downloads` permission and presents a
  “Manage your downloads” permission warning in Chrome, so it should not be
  added without evidence.

Sources:

- [Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [Chrome downloads API](https://developer.chrome.com/docs/extensions/reference/api/downloads)
- [MDN working with files](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Working_with_files)

## Clipboard

- The Web Clipboard API normally evaluates transient user activation or a
  granted write-without-gesture permission. The existing extension already
  declares `clipboardWrite`.
- MDN documents that `clipboardWrite` removes the transient-activation
  requirement for Chrome and Firefox extension contexts and content scripts,
  but Safari limits this permission to extension contexts. It also notes that
  `navigator.clipboard` is unavailable to a content script on insecure HTTP
  pages.
- Keeping a final explicit output command remains useful even where permission
  allows automatic writes: it is deterministic, matches the chosen sinks, and
  gives a focused place to retry partial output failures. Browser checks must
  cover HTTPS and the supported HTTP behavior rather than assuming one engine's
  permission semantics.

Sources:

- [W3C Clipboard API](https://www.w3.org/TR/clipboard-apis/)
- [MDN WebExtension clipboard guidance](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Interact_with_the_clipboard)

## Implications for implementation

1. Replace the default popup with a background `action.onClicked` entry path.
2. Keep the panel and session controller in the content script.
3. Use runtime messaging only for privileged operations such as cross-origin
   fetch and explicit cancellation.
4. Prefer Blob + DOM download for `.figit`; add `downloads` permission only if
   Chrome/Firefox build-and-manual verification requires it.
5. Keep clipboard and file sinks independent and retryable.
6. Test clipboard behavior on HTTPS and HTTP separately in Chrome and Firefox.
