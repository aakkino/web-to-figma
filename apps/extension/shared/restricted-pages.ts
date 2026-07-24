export const RESTRICTED_URL_PREFIXES = [
  "chrome://",
  "chrome-extension://",
  "edge://",
  "about:",
  "moz-extension://",
  "https://chromewebstore.google.com",
  "https://chrome.google.com/webstore",
] as const;

export const RESTRICTED_PAGE_MESSAGE =
  "This page cannot host the capture workspace. Open a normal web page and try again.";

export function isRestrictedUrl(url: string | undefined): boolean {
  if (!url) {
    return false;
  }
  return RESTRICTED_URL_PREFIXES.some((prefix) => url.startsWith(prefix));
}
