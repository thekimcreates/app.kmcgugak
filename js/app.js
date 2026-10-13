import {
  el,
  button,
  icon,
  iconButton,
  avatar,
  sheet,
  field,
  toast,
  closeAll,
  failure,
} from "./ui.js";
import {
  location as venue,
  epoch,
  upcoming,
  formatted,
  visiblePractice,
  practiceAddress,
  joinedYear,
  validId,
  safeURL,
} from "./models.js";
import {
  createChat,
  notificationPreferences,
  notificationTest,
} from "./chat.js";
const demo = new URLSearchParams(location.search).get("demo") === "1";
const state = {
  account: null,
  records: [],
  members: [],
  tab: "home",
  loading: true,
  error: "",
  gateway: null,
};
let accountGeneration = 0,
  publicStop = null,
  clock = null,
  frameReady = false,
  pendingPerformance = null;
const main = document.querySelector("#main"),
  frame = document.querySelector("#performance-frame");
const account = () => state.account;
const ctx = {
  account,
  gateway: null,
  members: () => state.members,
  tab: () => state.tab,
  guest,
};
const chat = createChat(ctx);
const key = (name) => `kmc.${name}.${account()?.id || "guest"}`;
function guest(description) {
  return el("div", { class: "guest" }, [
    avatar(null, 80),
    el("h2", { text: "Looks like you’re not signed in." }),
    el("p", { text: description }),
    button("Sign in", login, "primary"),
  ]);
}
function assigned() {
  return account()
    ? state.records.filter((p) => (p.memberIds || []).includes(account().id))
    : state.records;
}
function recents() {
  return assigned()
    .filter((p) => !upcoming(p))
    .sort((a, b) => epoch(b) - epoch(a));
}
function schedule() {
  return assigned()
    .filter((p) => upcoming(p))
    .sort((a, b) => epoch(a) - epoch(b));
}
function section(title, trailing) {
  return el("div", { class: "section-heading" }, [
    el("h2", { text: title }),
    trailing,
  ]);
}
function recentStrip(records, { profile = false } = {}) {
  const strip = el("div", {
    class: "recent-strip",
    "aria-label": "Recent performances",
  });
  for (const p of records.slice(0, 3)) {
    const img = safeURL(p.highlightPhotoUrl);
    strip.append(
      el(
        "button",
        {
          type: "button",
          class: "recent-card",
          onClick: () => openPerformance(p.id),
        },
        [
          img ? el("img", { src: img, alt: "", loading: "lazy" }) : null,
          el("div", { class: "event-copy" }, [
            el("div", { class: "meta", text: formatted(p) }),
            el("strong", { text: venue(p) }),
          ]),
        ],
      ),
    );
  }
  strip.append(
    button(
      "See all →",
      () => openPerformance("", account()?.id || "", !account()),
      "recent-card see-all",
    ),
  );
  return strip;
}
function home() {
  const page = document.querySelector("#home"),
    now = new Date(),
    member = account();
  const display = member?.name || "there",
    parent = member && localStorage.getItem(key("parent")) === "true";
  const greeting = `Good ${now.getHours() < 12 ? "morning" : now.getHours() < 17 ? "afternoon" : "evening"}, ${display}${parent ? "’s parent" : ""}!`;
  const logo = el("img", {
      class: "logo",
      src: "./assets/branding/kmc-gugak-full-logo.png",
      alt: "KMC Gugak",
    }),
    profileButton = el(
      "button",
      {
        class: "icon-button profile-button",
        "aria-label": "Open Profile",
        onClick: () => select("profile"),
      },
      [avatar(member, 42)],
    );
  const content = [
    el("header", { class: "toolbar" }, [logo, profileButton]),
    el("p", {
      class: "muted",
      text: now.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    }),
    el("h1", { text: greeting }),
  ];
  if (state.loading)
    content.push(el("p", { class: "loading", text: "Loading performances…" }));
  if (state.error) content.push(el("p", { class: "error", text: state.error }));
  if (member) {
    const next = schedule().find((p) => epoch(p) - +now <= 3 * 864e5),
      practice = visiblePractice(now);
    if (next || practice) {
      content.push(section("Next Up"));
      if (next) {
        const img = safeURL(next.highlightPhotoUrl);
        content.push(
          el("article", { class: "event-card" }, [
            img ? el("img", { src: img, alt: "", loading: "lazy" }) : null,
            el("div", { class: "event-copy" }, [
              el("div", { class: "meta", text: "Performance" }),
              el("h3", { text: venue(next) }),
              el("div", { class: "meta", text: formatted(next) }),
              el("div", { class: "event-actions" }, [
                button(
                  "View performance",
                  () => openPerformance(next.id),
                  "primary",
                ),
                button(
                  "Directions",
                  () => directions(next.locationAddress || venue(next)),
                  "secondary",
                ),
              ]),
            ]),
          ]),
        );
      }
      if (practice)
        content.push(
          el("article", { class: "event-card" }, [
            el("div", { class: "event-copy" }, [
              el("div", { class: "meta", text: "Practice" }),
              el("h3", {
                text: practice.start.toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                  timeZone: "America/Los_Angeles",
                }),
              }),
              el("div", { class: "meta", text: "2:00–3:30 PM · Pacific time" }),
              el("p", { class: "meta", text: practiceAddress }),
              button(
                "Directions",
                () => directions(practiceAddress),
                "secondary",
              ),
            ]),
          ]),
        );
    }
    const count = recents().length,
      year = joinedYear(member, state.members);
    content.push(
      el("div", { class: "stat" }, [
        "You've done ",
        el("strong", { text: count }),
        ` performance${count === 1 ? "" : "s"}`,
        year ? [" since ", el("strong", { text: year })] : [],
      ]),
    );
  }
  content.push(
    section(member ? "Your Upcoming Performances" : "Upcoming Performances"),
  );
  const upcomingRecords = schedule();
  if (!upcomingRecords.length)
    content.push(
      el("p", {
        class: "empty",
        text: member
          ? "No upcoming performances are assigned to you yet."
          : "No upcoming performances are listed yet.",
      }),
    );
  for (const p of upcomingRecords)
    content.push(
      el(
        "button",
        {
          type: "button",
          class: "schedule-row",
          onClick: () => openPerformance(p.id),
        },
        [
          el("div", {}, [
            el("strong", { text: venue(p) }),
            el("span", { class: "meta", text: formatted(p) }),
          ]),
          el("span", { text: "›" }),
        ],
      ),
    );
  content.push(
    section(member ? "Your Recent Performances" : "Recent Performances"),
    recentStrip(recents()),
  );
  page.replaceChildren(...content);
  const cards = [...page.querySelectorAll(":scope > .event-card")];
  if (cards.length) {
    const group = el("div", { class: "next-up-grid" });
    cards[0].before(group);
    group.append(...cards);
  }
}
function profile() {
  const page = document.querySelector("#profile");
  const toolbar = el("div", { class: "toolbar" }, [
    el("h1", { text: "Profile" }),
    iconButton("gear", "Settings", settings),
  ]);
  if (!account()) {
    page.replaceChildren(
      toolbar,
      guest("Sign in to see your performances and manage your member account."),
    );
    return;
  }
  const member = account(),
    done = recents();
  page.replaceChildren(
    toolbar,
    el("div", { class: "profile-summary" }, [
      avatar(member, 88),
      el("h2", { text: member.name }),
      el("p", { class: "muted", text: "KMC Gugak member" }),
    ]),
    section(
      "Your Performances",
      el("span", { class: "recent-count", text: done.length + " done" }),
    ),
    recentStrip(done, { profile: true }),
  );
}
function drawTabs() {
  document.querySelector("#tabs").replaceChildren(
    ...["home", "performances", "chat", "profile"].map((name) =>
      el(
        "button",
        {
          type: "button",
          "aria-current": state.tab === name ? "page" : null,
          "aria-label":
            name === "performances"
              ? "Performances"
              : name[0].toUpperCase() + name.slice(1),
          onClick: () => select(name),
        },
        [
          el("span", { html: icon(name) }),
          el("span", {
            text:
              name === "performances"
                ? "Performances"
                : name[0].toUpperCase() + name.slice(1),
          }),
        ],
      ),
    ),
  );
}
function select(name, { fromHash = false } = {}) {
  if (!["home", "performances", "chat", "profile"].includes(name)) return;
  const repeated = state.tab === name;
  if (state.tab === "chat" && name !== "chat") chat.closeRooms();
  state.tab = name;
  document.body.dataset.tab = name;
  document
    .querySelectorAll(".page")
    .forEach((page) => (page.hidden = page.id !== name));
  if (!fromHash && location.hash !== "#" + name)
    history.pushState(null, "", "#" + name);
  drawTabs();
  if (name === "home") {
    home();
    if (repeated) window.scrollTo({ top: 0, behavior: "smooth" });
  }
  if (name === "profile") profile();
  if (name === "chat" && state.gateway)
    chat.render(document.querySelector("#chat"));
  if (name === "performances") {
    if (!frame.src) frame.src = frame.dataset.src;
    if (repeated && !fromHash && frameReady)
      frame.contentWindow.KMCMobile?.onTabReselected();
    if (frameReady && pendingPerformance) flushPerformance();
  }
}
function flushPerformance() {
  if (!frameReady || !pendingPerformance) return;
  const { id, member, reset } = pendingPerformance;
  pendingPerformance = null;
  frame.contentWindow.KMCMobile.openRequest(id, member, reset).catch(() =>
    toast("That performance could not open. Try again."),
  );
}
function openPerformance(
  id = "",
  member = "",
  reset = false,
  fromHash = false,
) {
  pendingPerformance = { id, member, reset };
  select("performances", { fromHash: true });
  if (!fromHash)
    history.pushState(
      null,
      "",
      id ? "#performance/" + encodeURIComponent(id) : "#performances",
    );
  flushPerformance();
}
window.addEventListener("message", (event) => {
  if (
    event.origin !== location.origin ||
    event.source !== frame.contentWindow ||
    event.data?.type !== "kmc-performance-ready"
  )
    return;
  frameReady = true;
  syncPerformanceInsets();
  frame.contentWindow.KMCMobile?.setTextScale(
    Number(localStorage.getItem("kmc.textScale") || 1),
  );
  flushPerformance();
});
function syncPerformanceInsets() {
  if (!frameReady) return;
  const desktop = matchMedia("(min-width: 960px)").matches;
  const safeTop = desktop
    ? 0
    : Math.max(
        0,
        parseFloat(
          getComputedStyle(document.querySelector("#home")).paddingTop,
        ) - 24,
      );
  frame.contentWindow.KMCMobile?.setTopInset(safeTop);
  frame.contentWindow.KMCMobile?.setBottomInset(
    desktop
      ? 0
      : window.innerHeight -
          document.querySelector("#tabs").getBoundingClientRect().top +
          16,
  );
}
window.addEventListener("resize", syncPerformanceInsets);
function applyHash() {
  const raw = location.hash.slice(1);
  if (raw.startsWith("performance/")) {
    let id;
    try {
      id = decodeURIComponent(raw.slice(12));
    } catch {
      return;
    }
    if (/^[\w-]{1,150}$/.test(id)) openPerformance(id, "", false, true);
    return;
  }
  select(raw || "home", { fromHash: true });
}
window.addEventListener("hashchange", applyHash);
window.addEventListener("popstate", applyHash);
function directions(address) {
  const ios =
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  window.open(
    ios
      ? "https://maps.apple.com/?daddr=" + encodeURIComponent(address)
      : "https://www.google.com/maps/dir/?api=1&destination=" +
          encodeURIComponent(address),
    "_blank",
    "noopener",
  );
}
function commitAccount(member, error) {
  const previous = state.account?.id;
  state.account = member;
  document.body.dataset.signedIn = member ? "true" : "false";
  if (previous !== member?.id) {
    accountGeneration++;
    chat.reset();
    closeAll();
    document.querySelector("#chat").replaceChildren();
    if (previous)
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k.startsWith("kmc.draft." + previous + "."))
          localStorage.removeItem(k);
      }
    if (previous) select("home");
  }
  home();
  profile();
  if (state.tab === "chat") chat.render(document.querySelector("#chat"));
  if (error) toast(failure(error));
}
function login() {
  const layer = sheet("Member sign-in"),
    member = field("Member ID", "text"),
    password = field("Passcode", "password"),
    error = el("p", { class: "error" });
  member.input.autocomplete = "username";
  member.input.autocapitalize = "none";
  member.input.spellcheck = false;
  member.input.required = true;
  password.input.required = true;
  const submit = el("button", {
      type: "submit",
      class: "primary",
      text: "Sign in",
    }),
    form = el(
      "form",
      {
        class: "form-stack",
        onSubmit: async (event) => {
          event.preventDefault();
          submit.disabled = true;
          error.textContent = "";
          try {
            const gateway = state.gateway || (await ready);
            const result = await gateway.login(
              member.input.value,
              password.input.value,
            );
            commitAccount(result);
            layer.close();
            select("home");
            toast("Signed in as " + result.name);
          } catch (e) {
            error.textContent = failure(e);
          } finally {
            submit.disabled = false;
          }
        },
      },
      [
        el("img", {
          class: "logo",
          src: "./assets/branding/kmc-gugak-full-logo.png",
          alt: "KMC Gugak",
          style: "width:100%;height:90px;object-fit:contain",
        }),
        el("p", {
          class: "muted",
          text: demo
            ? "Preview mode: use 19kimj and any passcode. No live accounts are used."
            : "Use the member ID and passcode provided by your team.",
        }),
        member.node,
        password.node,
        error,
        submit,
      ],
    );
  layer.body.append(form);
}
function settings() {
  const layer = sheet("Settings");
  layer.body.append(el("h2", { text: "Account" }));
  if (account()) {
    layer.body.append(
      button("Change display name", rename, "settings-row"),
      button("Change profile picture", photo, "settings-row"),
      button("Change password", changePassword, "settings-row"),
    );
    const parent = el("input", {
      type: "checkbox",
      checked: localStorage.getItem(key("parent")) === "true",
    });
    parent.onchange = () => {
      localStorage.setItem(key("parent"), parent.checked);
      home();
    };
    layer.body.append(
      el("label", { class: "settings-row" }, [
        parent,
        el("span", { text: "Use parent greeting" }),
      ]),
      button(
        "Sign out",
        async () => {
          try {
            await state.gateway.logout();
            closeAll();
            select("home");
            toast("Signed out.");
          } catch (e) {
            toast(failure(e));
          }
        },
        "settings-row danger",
      ),
    );
  } else layer.body.append(button("Sign in", login, "settings-row"));
  layer.body.append(
    el("h2", { text: "Notifications" }),
    button(
      "Chat notification preferences",
      () => (account() ? notificationPreferences(ctx) : login()),
      "settings-row",
    ),
    button("Test notifications", notificationTest, "settings-row"),
    el("h2", { text: "Appearance" }),
  );
  const size = el("select", { "aria-label": "Text size" }, [
    el("option", { value: "1", text: "Standard text" }),
    el("option", { value: "1.15", text: "Larger text" }),
    el("option", { value: "1.3", text: "Largest text" }),
  ]);
  size.value = localStorage.getItem("kmc.textScale") || "1";
  size.onchange = () => {
    localStorage.setItem("kmc.textScale", size.value);
    document.documentElement.style.setProperty("--scale", size.value);
    if (frameReady) frame.contentWindow.KMCMobile.setTextScale(+size.value);
  };
  layer.body.append(
    size,
    el("h2", { text: "About" }),
    button("Add to Home Screen", installHelp, "settings-row"),
    el("a", {
      href: "./privacy.html",
      text: "Privacy and account removal",
      class: "settings-row",
    }),
    el("p", { class: "muted", text: "KMC Gugak Members · Web app" }),
  );
}
async function saveAction(layer, action) {
  const error = el("p", { class: "error" });
  layer.body.append(error);
  try {
    await action();
    layer.close();
    home();
    profile();
  } catch (e) {
    error.textContent = failure(e);
  }
}
function rename() {
  if (!account()) return;
  const layer = sheet("Display name"),
    name = field("Display name", "text", account().name);
  name.input.maxLength = 80;
  layer.body.append(
    name.node,
    button(
      "Save display name",
      () =>
        saveAction(layer, async () => {
          const result = await state.gateway.rename(name.input.value);
          state.account = result;
          await chat.refreshProfile(result);
          toast("Display name updated.");
        }),
      "primary",
    ),
  );
}
function changePassword() {
  if (!account()) return;
  const layer = sheet("Change password"),
    current = field("Current passcode", "password"),
    next = field("New passcode", "password"),
    confirm = field("Confirm new passcode", "password");
  next.input.autocomplete = confirm.input.autocomplete = "new-password";
  layer.body.append(
    current.node,
    next.node,
    confirm.node,
    button(
      "Save password",
      () =>
        saveAction(layer, async () => {
          if (next.input.value !== confirm.input.value)
            throw Error("The new passcodes do not match.");
          await state.gateway.password(current.input.value, next.input.value);
          toast("Password updated.");
        }),
      "primary",
    ),
  );
}
function photo() {
  if (!account()) return;
  const layer = sheet("Profile picture"),
    input = el("input", {
      type: "file",
      accept: "image/*",
      "aria-label": "Choose profile photo",
    }),
    preview = el("img", {
      alt: "Selected profile photo",
      style:
        "max-width:100%;max-height:240px;border-radius:20px;display:block;margin:20px auto",
    });
  let data = "",
    url = "";
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    try {
      if (file.size > 20 * 1024 * 1024)
        throw Error("Choose a photo under 20 MB.");
      if (url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(file);
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 256;
      const scale = Math.max(
        256 / image.naturalWidth,
        256 / image.naturalHeight,
      );
      canvas
        .getContext("2d")
        .drawImage(
          image,
          (256 - image.naturalWidth * scale) / 2,
          (256 - image.naturalHeight * scale) / 2,
          image.naturalWidth * scale,
          image.naturalHeight * scale,
        );
      for (const quality of [0.85, 0.7, 0.5, 0.35]) {
        data = canvas.toDataURL("image/jpeg", quality).split(",")[1];
        if (data.length <= 150000) break;
      }
      preview.src = "data:image/jpeg;base64," + data;
      save.disabled = false;
    } catch (e) {
      toast("Could not read this photo. Try a JPEG or PNG.");
    }
  };
  const save = button(
    "Save photo",
    () =>
      saveAction(layer, async () => {
        const result = await state.gateway.photo(data);
        state.account = result;
        await chat.refreshProfile(result);
        if (url) URL.revokeObjectURL(url);
        toast("Profile picture updated.");
      }),
    "primary",
  );
  save.disabled = true;
  layer.body.append(
    el("p", {
      class: "muted",
      text: "Choose a photo. It will be cropped to a square and resized for your profile.",
    }),
    input,
    preview,
    save,
  );
  const close = layer.close.bind(layer);
  layer.close = (immediate) => {
    if (url) URL.revokeObjectURL(url);
    close(immediate);
  };
}
let installPrompt;
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
});
function installHelp() {
  const layer = sheet("Add to Home Screen");
  layer.body.append(
    el("p", {
      text: "On iPhone or iPad: open this site in Safari, tap Share, then Add to Home Screen.",
    }),
    el("p", {
      text: "On Android: open the browser menu and choose Install app or Add to Home screen.",
    }),
  );
  if (installPrompt)
    layer.body.append(
      button(
        "Install app",
        async () => {
          await installPrompt.prompt();
          installPrompt = null;
          layer.close();
        },
        "primary",
      ),
    );
}
const ready = (async () => {
  try {
    const gateway = demo
      ? (await import("./demo.js")).demoGateway()
      : await (await import("./firebase.js")).liveGateway();
    state.gateway = ctx.gateway = gateway;
    gateway.onAccount(commitAccount);
    publicStop = gateway.watchPublic(
      (data) => {
        state.records = data.records;
        state.members = data.members;
        state.loading = false;
        state.error = "";
        home();
        profile();
      },
      (error) => {
        state.loading = false;
        state.error =
          "Live performances could not load. Check your connection and Firebase access.";
        home();
      },
    );
    return gateway;
  } catch (error) {
    state.loading = false;
    state.error =
      "Firebase could not connect. Check your internet connection and deployment configuration.";
    home();
    throw error;
  }
})();
ready.catch(() => {});
document.documentElement.style.setProperty(
  "--scale",
  localStorage.getItem("kmc.textScale") || "1",
);
document.querySelector("#status").textContent = demo
  ? "Preview data · changes here do not affect Firebase"
  : "";
home();
profile();
applyHash();
clock = setInterval(() => {
  if (state.tab === "home" && !document.hidden) home();
}, 60000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    home();
    profile();
  }
});
if ("serviceWorker" in navigator)
  navigator.serviceWorker.register("./sw.js").catch(() => {});
