import { browser, defineBackground } from "#imports";

import { onMessage, sendMessage } from "../shared/messaging";
import { createResourceProxy } from "../shared/resource-proxy";
import {
  isRestrictedUrl,
  RESTRICTED_PAGE_MESSAGE,
} from "../shared/restricted-pages";

/**
 * The bg proxy holds `<all_urls>` host permissions, so any URL it forwards to
 * `fetch` bypasses page-level CORS. A malicious page that gets the user to
 * convert it could embed a request to a private network host (router admin,
 * intranet service, etc.) via `<img src="http://192.168.x/...">` and have
 * those bytes ferried back into the Figma payload. Restrict the proxy to
 * web-public schemes so non-http(s) URLs (`file:`, `chrome:`, custom
 * protocols) can't reach the worker's privileged fetch.
 *
 * `data:` URLs are intentionally not allowed here either — they don't reach
 * the proxy in practice (the direct loader handles inline data without
 * failing) and adding them would just widen the allowed input space.
 */
const resourceProxy = createResourceProxy();

export default defineBackground(() => {
  browser.action.onClicked.addListener((tab) => {
    openWorkspace(tab.id, tab.url).catch(() => undefined);
  });

  // Service-worker fetch proxy. Content scripts inherit the page's CORS
  // posture, so cross-origin images often fail to load when fetched from the
  // page. The service worker has `<all_urls>` host permissions and is allowed
  // to read those bytes regardless of CORS, then ferries them back as base64.
  onMessage("fetchImage", ({ data }) => resourceProxy.fetch(data));
  onMessage("fetchFont", ({ data }) => resourceProxy.fetch(data));
  onMessage("cancelResource", ({ data }) => resourceProxy.cancel(data));
});

async function openWorkspace(
  tabId: number | undefined,
  url: string | undefined
): Promise<void> {
  if (tabId === undefined || isRestrictedUrl(url)) {
    await showActionFeedback(tabId, RESTRICTED_PAGE_MESSAGE);
    return;
  }
  try {
    await sendMessage("openWorkspace", undefined, tabId);
    await clearActionFeedback(tabId);
  } catch {
    await showActionFeedback(
      tabId,
      "The page has not loaded the capture workspace. Reload the page and try again."
    );
  }
}

async function showActionFeedback(
  tabId: number | undefined,
  message: string
): Promise<void> {
  if (tabId === undefined) {
    return;
  }
  await Promise.allSettled([
    browser.action.setBadgeText({ tabId, text: "!" }),
    browser.action.setBadgeBackgroundColor({ tabId, color: "#c2410c" }),
    browser.action.setTitle({ tabId, title: message }),
  ]);
}

async function clearActionFeedback(tabId: number): Promise<void> {
  await Promise.allSettled([
    browser.action.setBadgeText({ tabId, text: "" }),
    browser.action.setTitle({ tabId, title: "Open capture workspace" }),
  ]);
}
