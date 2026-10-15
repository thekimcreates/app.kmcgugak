const tabs = new Set(["home", "performances", "chat", "profile", "settings"]);
export const tabPath = (tab) => tab === "home" ? "/" : "/" + tab;
export function routeURL(tab, search = "", id = "") {
  return tabPath(tab) + search + (tab === "performances" && id ? "#" + encodeURIComponent(id) : "");
}
export function readRoute({ pathname, hash = "" }) {
  const path = pathname.replace(/\/index\.html$/, "/").replace(/\/$/, "");
  let raw;
  try { raw = decodeURIComponent(hash.replace(/^#/, "")); } catch { return null; }
  // Migrate older shared links without adding a browser-history entry.
  if (!path && raw.startsWith("performance/")) {
    const id = raw.slice(12);
    return /^[\w-]{1,150}$/.test(id) ? { tab: "performances", id } : null;
  }
  if (!path && tabs.has(raw)) return { tab: raw, id: "" };
  const tab = path ? path.slice(1) : "home";
  if (!tabs.has(tab)) return null;
  if (tab === "performances" && raw && !/^[\w-]{1,150}$/.test(raw)) return null;
  return { tab, id: tab === "performances" ? raw : "" };
}
