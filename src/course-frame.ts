// MyPlan shows the 华大课友 course page in an iframe. UW NetID sign-in goes through
// Microsoft, which refuses to load in frames, so sign-in links open in a new tab.
const SIGN_IN_PATH = /^\/(?:(?:sign-in|sign-up)(?:\/|$)|api\/auth\/)/;

export function signInUrl(href: string, origin: string): string | null {
  let url: URL;
  try { url = new URL(href, origin); } catch { return null; }
  return url.origin === origin && SIGN_IN_PATH.test(url.pathname) ? url.href : null;
}

if (typeof window !== "undefined" && window.top !== window) {
  // Capture on window runs before the site's own (Next.js) link handlers.
  window.addEventListener("click", (event) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = event.composedPath().find((node): node is HTMLAnchorElement => node instanceof HTMLAnchorElement);
    const url = link && signInUrl(link.href, location.origin);
    if (!url) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const tab = document.createElement("a");
    tab.href = url; tab.target = "_blank"; tab.rel = "noopener";
    tab.click();
  }, true);
}
