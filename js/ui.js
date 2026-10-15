export const icons = {
  home: '<path d="m3 10 9-7 9 7v10H7V12h10v8"/>',
  performances:
    '<path d="M9 18V5l11-2v13M9 8l11-2"/><ellipse cx="5.5" cy="18" rx="3.5" ry="3"/><ellipse cx="16.5" cy="16" rx="3.5" ry="3"/>',
  chat: '<path d="M21 11a8 8 0 0 1-8 8H7l-5 3 1-7a8 8 0 0 1 10-11 8 8 0 0 1 8 7Z"/>',
  profile: '<circle cx="12" cy="8" r="4"/><path d="M3 22a9 9 0 0 1 18 0"/>',
  gear: '<path d="m9 3 6 0 1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1Z"/><circle cx="12" cy="12" r="4"/>',
  plus: '<path d="M12 4v16M4 12h16"/>',
  back: '<path d="m15 4-8 8 8 8"/>',
  close: '<path d="m5 5 14 14M19 5 5 19"/>',
  send: '<circle cx="12" cy="12" r="10"/><path d="M12 18V6m-5 5 5-5 5 5"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  compose: '<path d="M14 4H4v16h16V10M8 15l2-5L18 2l4 4-8 8Z"/>',
  bell: '<path d="M5 17h14l-2-4V8a5 5 0 0 0-10 0v5Zm5 3h4"/>',
  pin: '<path d="m7 3 10 0-1 7 3 4H5l3-4ZM12 14v8"/>',
  photo:
    '<rect x="2" y="3" width="20" height="18" rx="3"/><circle cx="16" cy="8" r="2"/><path d="m3 17 5-5 5 6 3-3 5 5"/>',
  camera: '<path d="M3 6h4l2-3h6l2 3h4v15H3Z"/><circle cx="12" cy="13" r="5"/>',
  file: '<path d="M5 2h9l5 5v15H5ZM14 2v6h5"/>',
  check: '<path d="m4 12 5 5L20 5"/>',
};
const appIcons={
 home:'<path d="m3 10 9-7 9 7v10h-6v-6H9v6H3z"/>',
 performances:'<path d="M4 5h9M4 9h9M4 13h5M18 4v12"/><path d="m18 4 4-1v5l-4 1"/><ellipse cx="15.5" cy="17" rx="2.5" ry="2"/>',
 chat:'<path d="M3 4h13v10H8l-4 3v-3H3z"/><path d="M9 16h7l4 3v-3h1V8h-3"/>',
 profile:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="9" r="3"/><path d="M6 19v-1a6 6 0 0 1 12 0v1"/>',
 settings:'<path d="m9 3-.5 3-2 1.2L4 6l-2 4 2.5 1.8v2.4L2 16l2 4 2.5-1.2 2 1.2.5 3h6l.5-3 2-1.2L20 20l2-4-2.5-1.8v-2.4L22 10l-2-4-2.5 1.2-2-1.2-.5-3z"/><circle cx="12" cy="13" r="3"/>',
 group:'<circle cx="12" cy="8" r="3"/><circle cx="5" cy="10" r="2"/><circle cx="19" cy="10" r="2"/><path d="M7 20v-3a5 5 0 0 1 10 0v3M1 19v-2a4 4 0 0 1 5-4M23 19v-2a4 4 0 0 0-5-4"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>'
};
const cupertinoGlyphs={home:0xf447,performances:0xf726,chat:0xf8bc,profile:0xf419,settings:0xf43c,group:0xf47c};
export function icon(name) {
  if(cupertinoGlyphs[name])return `<span class="cupertino-icon" aria-hidden="true">${String.fromCodePoint(cupertinoGlyphs[name])}</span>`;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${(appIcons[name] || icons[name]) || icons.profile}</svg>`;
}
export const el = (tag, props = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "text") node.textContent = value;
    else if (key === "class") node.className = value;
    else if (key === "html") node.innerHTML = value;
    else if (key.startsWith("on"))
      node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value != null && value !== false)
      node.setAttribute(key, value === true ? "" : String(value));
  }
  for (const c of [children].flat(Infinity))
    if (c != null)
      node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return node;
};
export const button = (text, onClick, kind = "button") =>
  el("button", { type: "button", class: kind, text, onClick });
export const iconButton = (name, label, onClick) =>
  el(
    "button",
    { type: "button", class: "icon-button", "aria-label": label, onClick },
    [el("span", { html: icon(name) })],
  );
export function avatar(account, size = 44) {
  const node = el("span", { class: "avatar", style: `--size:${size}px` });
  let photo = account?.photoBase64 || account?.photo || account?.photoUrl || "";
  let src = "";
  if (/^data:image\/(?:jpeg|png|webp);base64,/i.test(photo)) src = photo;
  else if (/^https:\/\//i.test(photo)) src = photo;
  else { const raw = String(photo).replace(/\s/g, ""); if (/^[A-Za-z0-9+/=_-]+$/.test(raw) && raw.length < 180000) src = `data:${raw.startsWith("iVBOR")?"image/png":"image/jpeg"};base64,${raw}`; }
  if (src) { const image = el("img", {src,alt:""}); image.onerror = () => image.replaceWith(el("span",{class:"avatar-icon",html:icon("profile")}));node.append(image); }
  else node.append(el("span",{class:"avatar-icon",html:icon("profile")}));
  return node;
}
let toastTimer;
export function toast(message) {
  const node = document.querySelector("#toast");
  node.textContent = message;
  node.classList.add("shown");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove("shown"), 4500);
}
const layers = [];
const desktopQuery = matchMedia("(min-width: 960px)");
function syncLayers() {
  for (const layer of layers) {
    const workspace = layer.workspace && desktopQuery.matches;
    layer.panel.setAttribute("role", workspace ? "region" : "dialog");
    if (workspace) layer.panel.removeAttribute("aria-modal");
    else layer.panel.setAttribute("aria-modal", "true");
  }
  document.body.classList.toggle(
    "locked",
    layers.some((layer) => !(layer.workspace && desktopQuery.matches)),
  );
}
desktopQuery.addEventListener("change", syncLayers);
export function closeTop() {
  layers.at(-1)?.close();
}
export function closeAll() {
  for (const layer of [...layers].reverse()) layer.close(true);
}
export function sheet(
  title,
  { full = false, workspace = false, onClose } = {},
) {
  const previous = document.activeElement;
  const overlay = el("div", { class: "overlay" }),
    panel = el("section", {
      class: full ? "panel full" : "panel",
      role: "dialog",
      "aria-modal": "true",
      "aria-label": title,
    }),
    header = el("header", { class: "panel-header" }),
    body = el("div", { class: "panel-body" });
  const layer = {
    overlay,
    workspace,
    panel,
    header,
    body,
    close(immediate = false) {
      if (!layers.includes(layer)) return;
      layers.splice(layers.indexOf(layer), 1);
      onClose?.();
      overlay.classList.add("leaving");
      setTimeout(() => overlay.remove(), immediate ? 0 : 220);
      syncLayers();
      if (previous?.isConnected) previous.focus();
    },
  };
  header.append(
    iconButton(
      full && !(workspace && desktopQuery.matches) ? "back" : "close",
      "Close " + title,
      () => layer.close(),
    ),
    el("h2", { text: title }),
  );
  if (!full)
    panel.append(el("div", { class: "handle", "aria-hidden": "true" }));
  panel.append(header, body);
  overlay.append(panel);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) layer.close();
  });
  overlay.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      layer.close();
    }
    if (e.key === "Tab" && !(workspace && desktopQuery.matches)) {
      const focusable = [
        ...panel.querySelectorAll("button,input,textarea,select,a[href]"),
      ].filter((n) => !n.disabled && n.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0],
        last = focusable.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
  layers.push(layer);
  document.querySelector("#layers").append(overlay);
  syncLayers();
  setTimeout(() => header.querySelector("button").focus(), 50);
  if (!full) dragToClose(panel, header, body, () => layer.close());
  return layer;
}
function dragToClose(panel, header, body, close) {
  let start = null,
    dy = 0,
    lastY = 0,
    lastTime = 0,
    velocity = 0,
    active = false;
  panel.addEventListener(
    "touchstart",
    (e) => {
      if (
        e.touches.length !== 1 ||
        e.target.closest("input,textarea,button,a,select")
      )
        return;
      const handle = header.contains(e.target) || e.target.closest(".handle");
      if (!handle && body.scrollTop > 1) return;
      start = e.touches[0].clientY;
      dy = 0;
      active = false;
      lastY = start;
      lastTime = performance.now();
    },
    { passive: true },
  );
  panel.addEventListener(
    "touchmove",
    (e) => {
      if (start == null || e.touches.length !== 1) return;
      const y = e.touches[0].clientY;
      dy = Math.max(0, y - start);
      if (dy > 5 || active) {
        active = true;
        e.preventDefault();
        const now = performance.now();
        velocity = (y - lastY) / Math.max(1, now - lastTime);
        lastY = y;
        lastTime = now;
        panel.style.transform = `translateY(${dy}px)`;
      }
    },
    { passive: false },
  );
  panel.addEventListener(
    "touchend",
    () => {
      if (start == null) return;
      const fast = performance.now() - lastTime < 120 && velocity > 0.75;
      if (active && (dy > panel.clientHeight * 0.5 || (fast && dy > 25)))
        close();
      else panel.style.transform = "";
      start = null;
    },
    { passive: true },
  );
}
export function field(label, type = "text", value = "") {
  const input = el("input", {
    type,
    value,
    autocomplete: type === "password" ? "current-password" : "off",
  });
  return {
    input,
    node: el("label", { class: "field" }, [el("span", { text: label }), input]),
  };
}
export function failure(error) {
  if (String(error?.code).includes("permission-denied"))
    return "Access is blocked. Check the Firebase member and chat security rules.";
  if (String(error?.code).startsWith("auth/")) {
    if (
      [
        "auth/invalid-credential",
        "auth/wrong-password",
        "auth/user-not-found",
      ].includes(error.code)
    )
      return "The member ID or password is incorrect.";
    if (error.code === "auth/too-many-requests")
      return "Too many attempts. Try again later.";
    if (error.code === "auth/requires-recent-login")
      return "Sign out and sign back in, then try again.";
    return "Sign-in could not complete. Check your connection and Firebase authorized domain.";
  }
  return error?.message || "Something went wrong. Try again.";
}
