import { unseenCount } from "./receipts.js";
import {
  el,
  button,
  icon,
  iconButton,
  avatar,
  sheet,
  toast,
  failure,
} from "./ui.js";
import { threadTitle, isGroup } from "./models.js";
const local = {
  get: (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {}
  },
};
const device = () => {
  let id = local.get("kmc.web.device");
  if (!id) {
    id = crypto.randomUUID().replaceAll("-", "");
    local.set("kmc.web.device", id);
  }
  return id;
};
export function notificationPreferences(ctx, host) {
  const member = ctx.account();
  if (!member || !host) return;
  const current = local.get("kmc.notify."+member.id);
  const selected = current === "admins" ? "admins" : "all";
  if(current !== selected) local.set("kmc.notify."+member.id,selected);
  const select = el("select", {"aria-label":"Chat notifications",class:"notification-menu"},[
    el("option",{value:"all",text:"All members"}),el("option",{value:"admins",text:"Admins only"})]);
  select.value=selected;
  select.onchange=async()=>{
    const mode=select.value;local.set("kmc.notify."+member.id,mode);
    let permission=false;
    if("Notification" in window){try{permission=(await Notification.requestPermission())==="granted";}catch{}}
    try{await ctx.gateway.preference(member.id,device(),mode,permission);}catch{toast("Choice saved on this device.");}
  };
  host.append(el("label",{class:"settings-row notification-setting"},[el("strong",{text:"Chat notifications"}),select]));
}
export function notificationTest() {
  const layer = sheet("Test notifications"),
    list = el("ol", { class: "checklist" }),
    run = button(
      "Send test notification",
      async () => {
        run.disabled = true;
        list.replaceChildren();
        const stage = (text) => list.append(el("li", { text }));
        try {
          stage("Checking browser support…");
          if (!("Notification" in window))
            throw Error(
              "Notifications are unavailable here. On iPhone, add this app to the Home Screen and open it there.",
            );
          stage("Requesting permission…");
          const permission = await Notification.requestPermission();
          if (permission !== "granted")
            throw Error(
              "Permission was not granted. Check this app’s browser or device notification settings.",
            );
          stage("Permission granted.");
          if ("serviceWorker" in navigator) {
            const registration = await navigator.serviceWorker.ready;
            await registration.showNotification("KMC Gugak", {
              body: "This is a local notification test.",
              icon: "./assets/branding/kmc-gugak-circlelogo.png",
              tag: "kmc-test",
            });
          } else
            new Notification("KMC Gugak", {
              body: "This is a local notification test.",
            });
          stage("Notification submitted to the browser.");
          stage(
            "Delivery cannot be confirmed automatically. Check your notification center.",
          );
        } catch (error) {
          stage(failure(error));
        } finally {
          run.disabled = false;
        }
      },
      "primary",
    );
  layer.body.append(
    el("p", {
      class: "muted",
      text: "This tests a notification sent by this browser. It does not enable automatic chat notifications.",
    }),
    run,
    list,
  );
}
export function createChat(ctx) {
  let profiles = [],
    threads = [],
    stopInbox = null,
    prepared = null,
    generation = 0,
    container = null;
  const rooms = new Set();
  const members = () => [
    ...new Map([...ctx.members(), ...profiles].map((m) => [m.id, m])).values(),
  ];
  function closeRooms() {
    for (const room of [...rooms]) room.close(true);
  }
  function reset() {
    generation++;
    stopInbox?.();
    stopInbox = null;
    prepared = null;
    profiles = [];
    threads = [];
    for (const room of rooms) room.close();
    rooms.clear();
  }
  async function render(target) {
    container = target;
    const account = ctx.account();
    if (!account) {
      target.replaceChildren(
        ctx.guest("Sign in to join Team Chat and message other members."),
      );
      return;
    }
    target.replaceChildren(
      el("p", { class: "loading", text: "Connecting to Chat…" }),
    );
    const myGeneration = generation;
    if (prepared !== account.id) {
      try {
        await ctx.gateway.prepare(account);
        if (myGeneration !== generation || ctx.account()?.id !== account.id)
          return;
        prepared = account.id;
        stopInbox?.();
        stopInbox = ctx.gateway.watchInbox(
          account,
          (data) => {
            if (ctx.account()?.id !== account.id) return;
            profiles = data.profiles;
            threads = data.threads;
            draw();
          },
          (error) => {
            if (ctx.account()?.id === account.id) showError(error);
          },
        );
      } catch (error) {
        showError(error);
        return;
      }
    }
    draw();
    if (!["all","admins"].includes(local.get("kmc.notify."+account.id))) {local.set("kmc.notify."+account.id,"all");try{await ctx.gateway.preference(account.id,device(),"all",("Notification" in window)&&Notification.permission==="granted");}catch{}}
  }
  function showError(error) {
    container.replaceChildren(
      el("h1", { text: "Chat" }),
      el("p", { class: "error", text: failure(error) }),
      button(
        "Retry",
        () => {
          prepared = null;
          render(container);
        },
        "primary",
      ),
    );
  }
  function draw() {
    if (!container || !ctx.account()) return;
    const account = ctx.account(),
      list = el("div");
    const toolbar = el("div", { class: "toolbar" }, [
      el("h1", { text: "Chat" }),
      iconButton("compose", "New message", compose),
    ]);
    function rows() {
      list.replaceChildren();
      for (const thread of threads.filter(t=>t.id==="team" || t.lastMessageId)) {
        const peer = members().find(
          (m) =>
            m.id ===
            (thread.participants || []).find((id) => id !== account.id),
        );
        const unread =
          thread.lastMessageId &&
          thread.lastSenderId !== account.id &&
          (+thread.updatedAt || 0) >
            Number(local.get(`kmc.read.${account.id}.${thread.id}`) || 0);
        const title = el("div", { class: "inbox-title" }, [
          el("strong", { text: threadTitle(thread, account.id, members()) }),
          thread.id === "team"
            ? el("span", { class: "pin", html: icon("pin") })
            : null,
          unread
            ? el("span", { class: "dot", "aria-label": "Unread messages" })
            : null,
        ]);
        const image = isGroup(thread)
          ? el("span", { class: "avatar chat-group-avatar", style:"--size:54px", html: `<span class="avatar-icon">${icon("group")}</span>` })
          : avatar(peer, 54);
        list.append(
          el(
            "button",
            {
              class: "inbox-row",
              type: "button",
              "aria-current": [...rooms].some(
                (room) => room.threadId === thread.id,
              )
                ? "true"
                : null,
              onClick: () => open(thread),
            },
            [
              image,
              el("div", { class: "row-copy" }, [
                title,
                el("div", {
                  class: "meta",
                  text: thread.lastMessage === "Message removed" ? "" : thread.lastMessage || "Say hello",
                }),
              ]),
            ],
          ),
        );
      }
      if (!list.children.length)
        list.append(
          el("p", {
            class: "empty",
            text: "No conversations yet.",
          }),
        );
    }
    container.replaceChildren(toolbar, list);
    container.append(
      el("div", {
        class: "chat-idle",
        "aria-hidden": "true",
        html: icon("chat"),
      }),
    );
    rows();
    if (threads.length <= 1)
      container.append(
        el("p", {
          class: "empty",
          text: "Have a question for someone? Tap compose to find a member or start a group.",
        }),
      );
  }
  function compose() {
    const member = ctx.account();
    if (!member) return;
    const layer = sheet("New message"),
      selected = new Set(),
      chips = el("div", { class: "selected-members" }),
      search = el("input", {
        class: "search",
        type: "search",
        placeholder: "Find members by name",
        "aria-label": "Find members by name",
      }),
      groupName = el("input", {
        placeholder: "Group name (optional)",
        maxlength: "80",
        "aria-label": "Group name",
      }),
      list = el("div"),
      error = el("p", { class: "error" }),
      start = button(
        "Start chat",
        async () => {
          start.disabled = true;
          error.textContent = "";
          try {
            const thread = await ctx.gateway.create(
              member,
              [...selected],
              groupName.value,
            );
            if (ctx.account()?.id !== member.id) return;
            layer.close();
            open(thread);
          } catch (e) {
            error.textContent = failure(e);
            start.disabled = false;
          }
        },
        "primary",
      );
    start.disabled = true;
    groupName.hidden = true;
    function redraw() {
      chips.replaceChildren(
        ...[...selected].map((id) =>
          button(
            (members().find((m) => m.id === id)?.name || "Member") + " ×",
            () => {
              selected.delete(id);
              redraw();
            },
            "chip",
          ),
        ),
      );
      start.disabled = !selected.size;
      groupName.hidden = selected.size < 2;
      list.replaceChildren();
      for (const person of members().filter(
        (m) =>
          m.id !== member.id &&
          m.name.toLowerCase().includes(search.value.toLowerCase()),
      )) {
        const toggle = () => {
          selected.has(person.id)
            ? selected.delete(person.id)
            : selected.add(person.id);
          redraw();
        };
        list.append(
          el(
            "div",
            {
              class: "member-row",
              "aria-pressed": selected.has(person.id),
              "data-member": person.id,
              onClick: toggle,
            },
            [
              avatar(person, 42),
              el("span", { class: "row-copy", text: person.name }),
              selected.has(person.id)
                ? el("span", { html: icon("check") })
                : null,
            ],
          ),
        );
      }
    }
    search.oninput = redraw;
    layer.body.append(
      el("p", {
        class: "muted",
        text: "Choose one member for a direct message, or several for a group.",
      }),
      search,
      chips,
      groupName,
      error,
      start,
      list,
    );
    redraw();
  }
  function open(thread) {
    closeRooms();
    const member = ctx.account();
    if (!member) return;
    let stop = null,
      limit = 60,
      data = [],
      busy = false,
      files = [],
      reply = null,
      id = null,
      searchTerm = "",
      draftTimer = null;
    let readers = {}, stopReaders = null, readTimer = null, lastSharedRead = 0;
    const media = new Map();
    const valid = () => ctx.account()?.id === member.id && rooms.has(layer);
    const key = `kmc.draft.${member.id}.${thread.id}`;
    const layer = sheet(threadTitle(thread, member.id, members()), {
      full: true,
      workspace: true,
      onClose: () => {
        stop?.();stopReaders?.();clearInterval(readTimer);
        mobileQuery.removeEventListener("change",syncClose);
        clearTimeout(draftTimer);
        local.set(key, input.value);
        for (const item of media.values())
          if (item.url) URL.revokeObjectURL(item.url);
        rooms.delete(layer);
        draw();
      },
    });
    rooms.add(layer);
    layer.panel.classList.add("conversation");
    layer.overlay.classList.add("conversation-layer");
    layer.threadId = thread.id;
    const closeControl=layer.header.querySelector('button');
    const syncClose=()=>{closeControl.hidden=matchMedia("(min-width: 960px)").matches;if(!closeControl.hidden)closeControl.innerHTML=icon("back");};syncClose();
    const mobileQuery=matchMedia("(max-width: 959px)");mobileQuery.addEventListener("change",syncClose);
    layer.overlay.addEventListener("pointerdown",e=>{
      if(!mobileQuery.matches || e.clientX>innerWidth/2 || e.target.closest("textarea,input,button,a"))return;
      const x=e.clientX,y=e.clientY;let offset=0,locked=false;
      const move=event=>{const dx=event.clientX-x,dy=event.clientY-y;if(!locked && dx>12 && dx>Math.abs(dy)*1.3)locked=true;if(locked){event.preventDefault();offset=Math.max(0,dx);layer.panel.style.transform=`translateX(${offset}px)`;}};
      const end=event=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",end);window.removeEventListener("pointercancel",cancel);if(locked && offset>innerWidth*.25){layer.close();}else{layer.panel.style.transform="";}};
      const cancel=()=>{layer.panel.style.transform="";window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",end);window.removeEventListener("pointercancel",cancel);};
      window.addEventListener("pointermove",move,{passive:false});window.addEventListener("pointerup",end,{once:true});window.addEventListener("pointercancel",cancel,{once:true});
    });
    draw();
    const input = el("textarea", {
      rows: "1",
      maxlength: "4000",
      placeholder: "Message",
      "aria-label": "Message",
    });
    input.value = local.get(key) || "";
    const list = el("div", { class: "messages", "aria-label": "Messages" }),
      error = el("p", { class: "error" }),
      replyBox = el("div", { class: "compose-reply" }),
      fileBox = el("div", { class: "draft-files" }),
      progress = el("progress", { max: "1", value: "0", hidden: true }),
      send = iconButton("send", "Send message", submit),
      add = iconButton("plus", "Add photos or files", attachments);
    send.addEventListener("pointerdown",event=>event.preventDefault());
    send.addEventListener("click",()=>input.focus({preventScroll:true}));
    send.classList.add("send-button");
    const update = () => {
      send.disabled = busy || (!input.value.trim() && !files.length);
      input.readOnly = false;
      add.disabled = busy;
    };
    input.oninput = () => {
      if(!busy) id = null;
      update();
      input.style.height = "auto";
      input.style.height = Math.min(130, input.scrollHeight) + "px";
      clearTimeout(draftTimer);
      draftTimer = setTimeout(() => local.set(key, input.value), 300);
    };
    const search = el("input", {
      class: "search",
      type: "search",
      placeholder: "Search loaded messages",
      "aria-label": "Search loaded messages",
      hidden: true,
    });
    search.oninput = () => {
      searchTerm = search.value.toLowerCase();
      renderMessages();
    };
    layer.header.append(
      iconButton("more", "Conversation details", details),
    );
    layer.body.append(
      search,
      error,
      list,
      progress,
      replyBox,
      fileBox,
      el("div", { class: "composer" }, [add, input, send]),
    );
    update();
    function listen() {
      stop?.();
      stop = ctx.gateway.watchMessages(
        thread.id,
        limit,
        (messages) => {
          if (!valid()) return;
          data = messages;
          renderMessages();
          markVisible();
        },
        (e) => {
          if (valid()) error.textContent = failure(e);
        },
      );
    }
    function markVisible(){
      const latest=data.find(m=>!m.deleted)?.sentAt;
      const overlays=[...document.querySelector("#layers").children].filter(n=>!n.classList.contains("leaving"));
      if(!latest || !valid() || document.hidden || overlays.at(-1)!==layer.overlay || +latest<=lastSharedRead)return;
      lastSharedRead=+latest;
      local.set(`kmc.read.${member.id}.${thread.id}`,+latest);
      ctx.gateway.markRead?.(thread.id,member.id,latest)?.catch(()=>{lastSharedRead=0;});
    }
    readTimer=setInterval(markVisible,1000);
    stopReaders=ctx.gateway.watchReaders?.(thread.id,value=>{readers=value;if(valid())renderMessages();},()=>{});
    listen();
    async function blobFor(attachment) {
      let cached = media.get(attachment.path);
      if (!cached) {
        cached = { promise: ctx.gateway.download(attachment, member.id) };
        media.set(attachment.path, cached);
        try {
          const blob = await cached.promise;
          if (!valid()) throw Error("Conversation closed.");
          cached.url = URL.createObjectURL(blob);
        } catch (error) {
          media.delete(attachment.path);
          throw error;
        }
      } else if (!cached.url) {
        await cached.promise;
      }
      return cached.url;
    }
    function renderMessages() {
      const nearBottom =
        list.scrollHeight - list.scrollTop - list.clientHeight < 100;
      list.replaceChildren();
      if (data.length >= limit)
        list.append(
          button(
            "Load earlier messages",
            () => {
              limit += 60;
              listen();
            },
            "text-button",
          ),
        );
      let previousDate = null;
      for (const message of [...data]
        .reverse()
        .filter(
          (m) =>
            !m.deleted && (!searchTerm ||
            String(m.text).toLowerCase().includes(searchTerm) ||
            m.senderName.toLowerCase().includes(searchTerm)),
        )) {
        const own = message.senderId === member.id,
          date = message.sentAt ? new Date(message.sentAt) : new Date(),
          dateText = date.toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
          }) + " " + date.toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"});
        if (!previousDate || date - previousDate >= 15 * 60000)
          list.append(el("div", { class: "day-label", text: dateText }));
        previousDate=date;
        const node = el("article", { class: own ? "message own" : "message" }),
          bubble = el("div", {
            class: "bubble",
            tabindex: "0",
            "aria-label": "Message from " + message.senderName,
          });
        if (isGroup(thread) && !own)
          node.append(
            el("div", {
              class: "sender",
              text: message.senderName + (message.admin ? " · Admin" : ""),
            }),
          );
        if (message.deleted)
          bubble.append(el("i", { text: "Message removed" }));
        else {
          if (message.reply)
            bubble.append(
              el("div", {
                class: "reply-preview",
                text: message.reply.name + "\n" + message.reply.text,
              }),
            );
          for (const attachment of message.attachments || []) {
            if (attachment.mime.startsWith("image/")) {
              const image = el("img", {
                  alt: attachment.name,
                  loading: "lazy",
                }),
                wrap = el(
                  "button",
                  {
                    class: "text-button",
                    "aria-label": "Open " + attachment.name,
                    onClick: async (e) => {
                      e.stopPropagation();
                      try {
                        const url = await blobFor(attachment);
                        if (!valid()) return;
                        const view = sheet(attachment.name, { full: true });
                        view.body.classList.add("media-view");
                        view.body.append(
                          el("img", { src: url, alt: attachment.name }),
                        );
                      } catch (error) {
                        toast(failure(error));
                      }
                    },
                  },
                  [image],
                );
              bubble.append(wrap);
              blobFor(attachment)
                .then((url) => {
                  if (valid() && image.isConnected) image.src = url;
                })
                .catch(() => {
                  image.remove();
                  wrap.textContent = "Retry photo";
                });
            } else
              bubble.append(
                button(
                  attachment.name,
                  async (e) => {
                    e.stopPropagation();
                    try {
                      const url = await blobFor(attachment);
                      if (!valid()) return;
                      const link = el("a", {
                        href: url,
                        download: attachment.name,
                      });
                      link.click();
                    } catch (error) {
                      toast(failure(error));
                    }
                  },
                  "secondary",
                ),
              );
          }
          if (message.text) bubble.append(el("span", { text: message.text }));
          bubble.oncontextmenu = (e) => {
            e.preventDefault();
            options(message);
          };
          bubble.onkeydown = (e) => {
            if (e.key === "Enter" && e.target === bubble) options(message);
          };
        }
        node.append(bubble);
        const reactions = el("div", { class: "reactions" }),
          counts = {};
        for (const emoji of Object.values(message.reactions || {}))
          counts[emoji] = (counts[emoji] || 0) + 1;
        for (const [emoji, count] of Object.entries(counts))
          reactions.append(
            button(
              `${emoji} ${count}`,
              () =>
                ctx.gateway
                  .react(
                    thread.id,
                    message.id,
                    member.id,
                    emoji,
                    message.reactions?.[member.id] === emoji,
                  )
                  .catch((e) => toast(failure(e))),
              "reaction",
            ),
          );
        node.append(
          reactions,
          el("div", { class: "message-time" }, [
            unseenCount(message,thread,members(),readers)>0 ? el("span", {
              text: unseenCount(message, thread, members(), readers) || "",
              "aria-label": unseenCount(message, thread, members(), readers) + " members have not seen this message",
            }) : null,
            message.deleted
              ? null
              : iconButton("more", "Message actions", () => options(message)),
          ]),
        );
        list.append(node);
      }
      if (!data.length)
        list.append(
          el("p", {
            class: "empty",
            text: "Start the conversation. Say hello!",
          }),
        );
      if (nearBottom || data.length === 1)
        requestAnimationFrame(() => (list.scrollTop = list.scrollHeight));
    }
    async function submit() {
      if (busy || !valid()) return;
      id ||= ctx.gateway.messageId(thread.id);
      const sendingId=id, composed=input.value;
      const text = composed.trim(),
        picked = [...files],
        snapshot = reply;
      busy = true;
      error.textContent = "";
      update();
      progress.hidden = !picked.length;
      try {
        const uploaded = [];
        for (let i = 0; i < picked.length; i++) {
          if (!valid()) return;
          uploaded.push(
            await ctx.gateway.upload(
              thread.id,
              sendingId,
              member.id,
              i,
              picked[i],
              (p) => (progress.value = (i + p) / picked.length),
            ),
          );
        }
        if (!valid()) return;
        await ctx.gateway.send(
          thread.id,
          sendingId,
          ctx.account(),
          text,
          uploaded,
          snapshot,
        );
        if (!valid()) return;
        if(input.value===composed)input.value="";else if(input.value.startsWith(composed))input.value=input.value.slice(composed.length).trimStart();
        files = [];
        reply = null;
        id = null;
        local.set(key, input.value);
        showFiles();
        showReply();
        input.style.height = "auto";
        requestAnimationFrame(() => (list.scrollTop = list.scrollHeight));
      } catch (e) {
        if (valid())
          error.textContent = failure(e) + " Your text draft is saved.";
        local.set(key, input.value);
      } finally {
        busy = false;
        if (valid()) {
          progress.hidden = true;
          update();
          input.focus();
        }
      }
    }
    function showFiles() {
      fileBox.replaceChildren(
        ...files.map((file) =>
          el("div", { class: "file-chip" }, [
            el("span", { text: file.name }),
            iconButton("close", "Remove " + file.name, () => {
              files = files.filter((f) => f !== file);
              id = null;
              showFiles();
              update();
            }),
          ]),
        ),
      );
    }
    function showReply() {
      replyBox.replaceChildren();
      if (reply)
        replyBox.append(
          el("span", { text: "Replying to " + reply.name + ": " + reply.text }),
          iconButton("close", "Cancel reply", () => {
            reply = null;
            showReply();
          }),
        );
    }
    function attachments() {
      const picker=el("input",{type:"file",multiple:true,hidden:true});document.body.append(picker);
      picker.onchange=()=>{const picked=[...picker.files];picker.remove();if(!valid())return;if(files.length+picked.length>4){toast("Choose up to four attachments.");return;}if(picked.some(f=>!f.size||f.size>10485760)){toast("Choose nonempty files under 10 MB.");return;}files.push(...picked);id=null;showFiles();update();input.focus({preventScroll:true});};
      picker.addEventListener("cancel",()=>picker.remove(),{once:true});picker.click();
    }
    function options(message) {
      const choice = sheet("Message actions");
      const reactions = el("div", { class: "links" });
      for (const emoji of ["❤️", "👍", "👏", "🎉"])
        reactions.append(
          button(
            emoji,
            async () => {
              choice.close();
              try {
                await ctx.gateway.react(
                  thread.id,
                  message.id,
                  member.id,
                  emoji,
                  message.reactions?.[member.id] === emoji,
                );
              } catch (e) {
                toast(failure(e));
              }
            },
            "secondary",
          ),
        );
      choice.body.append(
        reactions,
        button(
          "Reply",
          () => {
            reply = {
              id: message.id,
              name: message.senderName,
              text: (
                message.text ||
                message.attachments?.map((a) => a.name).join(", ") ||
                ""
              ).slice(0, 160),
            };
            showReply();
            choice.close();
            input.focus();
          },
          "settings-row",
        ),
      );
      if (message.text)
        choice.body.append(
          button(
            "Copy",
            async () => {
              try {
                await navigator.clipboard.writeText(message.text);
                toast("Copied.");
                choice.close();
              } catch {
                toast("Your browser could not copy this text.");
              }
            },
            "settings-row",
          ),
        );
      if (message.senderId !== member.id)
        choice.body.append(
          button(
            "Report to admins",
            () => {
              choice.close();
              const report = sheet("Report message"),
                reason = el("textarea", {
                  maxlength: "500",
                  placeholder: "What should admins know?",
                  "aria-label": "Report reason",
                });
              report.body.append(
                reason,
                button(
                  "Send report",
                  async () => {
                    if (!reason.value.trim()) return;
                    try {
                      await ctx.gateway.report(
                        thread.id,
                        message.id,
                        member.id,
                        reason.value.trim(),
                      );
                      report.close();
                      toast("Report saved for team admins.");
                    } catch (e) {
                      toast(failure(e));
                    }
                  },
                  "primary",
                ),
              );
            },
            "settings-row",
          ),
        );
      if (message.senderId === member.id || member.admin)
        choice.body.append(
          button(
            "Remove message",
            async () => {
              if (
                !confirm(
                  "Remove this message for everyone in this conversation?",
                )
              )
                return;
              try {
                await ctx.gateway.remove(thread.id, message);
                choice.close();
              } catch (e) {
                toast(failure(e));
              }
            },
            "settings-row danger",
          ),
        );
    }
    function details() {
      const details = sheet(threadTitle(thread, member.id, members()));
      const selected = members().filter(
        (m) => thread.id === "team" || thread.participants?.includes(m.id),
      );
      details.body.append(el("p",{class:"muted",text:selected.length+" members"}));
      for (const person of selected)
        details.body.append(
          el(
            "div",
            {
              class: "member-row",

            },
            [
              avatar(person, 44),
              el("div", { class: "row-copy" }, [
                el("strong", { text: person.name }),
                el("span", {
                  class: "meta",
                  text:
                    person.id === member.id
                      ? "You"
                      : person.admin
                        ? "Admin"
                        : "Member",
                }),
              ]),
            ],
          ),
        );
    }
  }
  return {
    render,
    closeRooms,
    reset,
    open,
    refreshProfile: async (member) => {
      if (prepared === member.id) await ctx.gateway.prepare(member);
    },
  };
}
