import { createRatingProvider, type CacheEntry, type RatingCache } from "./provider";
import { validLookup } from "./model";

const cache: RatingCache = {
  async get(key) { const values = await chrome.storage.local.get<Record<string, CacheEntry>>(key); return values[key]; },
  async set(key, entry) {
    const values = await chrome.storage.local.get<Record<string, CacheEntry>>(null);
    const cached = Object.entries(values).filter(([name]) => name.startsWith("rmp:v1:"));
    const expired = cached.filter(([, value]) => value.expiresAt <= Date.now()).map(([name]) => name);
    const oldest = cached.filter(([name]) => !expired.includes(name)).sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    const remove = [...expired, ...oldest.slice(0, Math.max(0, oldest.length - 499)).map(([name]) => name)];
    if (remove.length) await chrome.storage.local.remove(remove);
    await chrome.storage.local.set({ [key]: entry });
  },
};
const lookup = createRatingProvider(cache);

chrome.action.onClicked.addListener(() => { void chrome.runtime.openOptionsPage(); });

chrome.runtime.onMessage.addListener((message: unknown, sender, reply) => {
  if (sender.id !== chrome.runtime.id || !sender.url) return;
  const url = new URL(sender.url);
  if (url.origin !== "https://myplan.uw.edu" && url.protocol !== "chrome-extension:") return;
  const msg = message as { type?: unknown; name?: unknown; campus?: unknown } | null;
  if (msg?.type === "open-options") { void chrome.runtime.openOptionsPage(); return; }
  if (msg?.type !== "lookup" || !validLookup(msg)) return;
  void (async () => {
    const settings = await chrome.storage.local.get("liveRatingsEnabled");
    const permitted = await chrome.permissions.contains({ origins: ["https://www.ratemyprofessors.com/*"] });
    if (!settings.liveRatingsEnabled || !permitted) return reply({ status: "disabled", source: "rmp", candidates: [] });
    reply(await lookup(msg.name, msg.campus));
  })().catch(() => reply({ status: "unavailable", source: "rmp", candidates: [] }));
  return true;
});
