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
export function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.profile}</svg>`;
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
  const photo = account?.photoBase64 || account?.photo || "";
  if (/^[A-Za-z0-9+/=]+$/.test(photo) && photo.length < 160000) {
    const image = el("img", {
      src: `data:image/jpeg;base64,${photo}`,
      alt: "",
    });
    image.onerror = () =>
      image.replaceWith(el("span", { html: icon("profile") }));
    node.append(image);
  } else node.append(el("span", { html: icon("profile") }));
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
export function closeTop() {
  layers.at(-1)?.close();
}
export function closeAll() {
  for (const layer of [...layers].reverse()) layer.close(true);
}
export function sheet(title, { full = false, onClose } = {}) {
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
    panel,
    header,
    body,
    close(immediate = false) {
      if (!layers.includes(layer)) return;
      layers.splice(layers.indexOf(layer), 1);
      onClose?.();
      overlay.classList.add("leaving");
      setTimeout(() => overlay.remove(), immediate ? 0 : 220);
      document.body.classList.toggle("locked", layers.length > 0);
      if (previous?.isConnected) previous.focus();
    },
  };
  header.append(
    iconButton(full ? "back" : "close", "Close " + title, () => layer.close()),
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
    if (e.key === "Tab") {
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
  document.body.classList.add("locked");
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
