export const zone = "America/Los_Angeles";
export const practiceAddress = "7655 Trask Ave, Westminster, CA 92683";
export const validId = (id) => /^[a-z0-9_-]{3,100}$/.test(id);
export function parts(date, timeZone = zone) {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value]),
  );
}
export function zoned(date, time = "23:59", timeZone = zone) {
  const [y, m, d] = date.split("-").map(Number),
    [h, min] = time.split(":").map(Number);
  const target = Date.UTC(y, m - 1, d, h || 0, min || 0);
  let guess = target;
  for (let i = 0; i < 4; i++) {
    const p = parts(new Date(guess), timeZone),
      delta =
        target - Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
    guess += delta;
    if (!delta) break;
  }
  return new Date(guess);
}
export const dateKey = (date, timeZone = zone) => {
  const p = parts(date, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
};
export const epoch = (p) =>
  zoned(
    p.date,
    p.timeTbd || !/^\d{1,2}:\d{2}$/.test(p.time || "") ? "23:59" : p.time,
    p.timezone || zone,
  ).getTime();
export const upcoming = (p, now = new Date()) =>
  p.timeTbd || !p.time
    ? p.date >= dateKey(now, p.timezone || zone)
    : epoch(p) >= +now;
export const location = (p) =>
  p.locationTbd
    ? "Location TBD"
    : p.locationName || p.location || "Location TBD";
export function formatted(p, withTime = true) {
  const date = zoned(
    p.date,
    p.timeTbd ? "12:00" : p.time || "12:00",
    p.timezone || zone,
  );
  return (
    new Intl.DateTimeFormat(undefined, {
      timeZone: p.timezone || zone,
      month: "short",
      day: "numeric",
      year: "numeric",
      ...(withTime && !p.timeTbd && p.time
        ? { hour: "numeric", minute: "2-digit" }
        : {}),
    }).format(date) + (withTime && p.timeTbd ? " · Time TBD" : "")
  );
}
export function visiblePractice(now = new Date()) {
  const p = parts(now),
    base = new Date(Date.UTC(+p.year, +p.month - 1, +p.day));
  const offset = (6 - base.getUTCDay() + 7) % 7;
  for (const shift of [-7, 0, 7]) {
    const saturday = new Date(+base + (offset + shift) * 864e5);
    const key = (d) => d.toISOString().slice(0, 10);
    const sat = key(saturday),
      sun = key(new Date(+saturday + 864e5)),
      thu = key(new Date(+saturday - 2 * 864e5));
    const satEnd = zoned(sat, "15:30");
    if (+now >= +zoned(thu, "14:00") && +now < +satEnd)
      return { date: sat, start: zoned(sat, "14:00"), end: satEnd };
    if (+now >= +satEnd && +now < +zoned(sun, "15:30"))
      return {
        date: sun,
        start: zoned(sun, "14:00"),
        end: zoned(sun, "15:30"),
      };
  }
  return null;
}
export function joinedYear(account, roster = []) {
  const member = roster.find((m) => m.id === account?.id);
  const year = String(member?.service || "").match(/^(\d{4})/);
  return year
    ? +year[1]
    : /^\d{2}/.test(account?.id || "")
      ? 2000 + Number(account.id.slice(0, 2))
      : null;
}
export function dmId(a, b) {
  if (a === b) throw Error("Choose another member.");
  return (
    "dm_" +
    btoa(JSON.stringify([a, b].sort()))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replaceAll("=", "")
  );
}
export function participants(self, peers) {
  const result = [...new Set([self, ...peers])].sort();
  if (
    result.length < 3 ||
    result.length > 50 ||
    result.some((id) => !validId(id))
  )
    throw Error("Choose between two and 49 other members.");
  return result;
}
export function threadTitle(thread, self, members) {
  if (thread.id === "team") return "Team Chat";
  if (thread.type === "group" && thread.title) return thread.title;
  return (
    (thread.participants || [])
      .filter((id) => id !== self)
      .map((id) => members.find((m) => m.id === id)?.name || "Member")
      .join(", ") || "Conversation"
  );
}
export const isGroup = (t) =>
  t.id === "team" || t.type === "group" || t.participants?.length > 2;
export const safeURL = (value) => {
  try {
    const url = new URL(
      value,
      globalThis.location?.href || "https://kmcgugak.org/",
    );
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
};
