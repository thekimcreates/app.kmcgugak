import { dateKey, dmId, participants } from "./models.js";
export function demoGateway() {
  let account = null;
  const privateProfiles=new Map();
  const receipts=new Map(), readWatchers=new Map();
  const callbacks = new Set(),
    inboxes = new Set(),
    listeners = new Map(),
    threadMap = new Map([
      [
        "team",
        {
          id: "team",
          type: "team",
          title: "Team Chat",
          participants: [],
          lastMessage: "Welcome to the preview",
          lastSenderId: "21kiml",
          lastMessageId: "welcome",
          updatedAt: new Date(),
        },
      ],
    ]),
    messages = new Map([
      [
        "team",
        [
          {
            id: "welcome",
            senderId: "21kiml",
            senderName: "Lena",
            text: "Welcome! This is preview data, not the live Team Chat.",
            preview: "Welcome to the preview",
            sentAt: new Date(),
            attachments: [],
            reactions: {},
          },
        ],
      ],
    ]);
  const members = [
    { id: "19kimj", name: "Joshua", service: "2019–2026" },
    { id: "21kiml", name: "Lena", service: "2021–2026" },
    { id: "22kangp", name: "Phillip", service: "2022–2026" },
  ];
  const records = [-35, -20, -8, 1, 10].map((days, index) => ({
    id: "preview-" + index,
    date: dateKey(new Date(Date.now() + days * 864e5)),
    time: "14:15",
    timezone: "America/Los_Angeles",
    locationName: [
      "Garden Festival",
      "Community Concert",
      "Korean Cultural Day",
      "Autumn Festival",
      "Community Celebration",
    ][index],
    locationAddress: "7655 Trask Ave, Westminster, CA 92683",
    memberIds: ["19kimj", "21kiml"],
    highlightPhotoUrl: "./assets/branding/kmc-gugak-full-logo.png",
  }));
  const emitInbox = () => {
    for (const cb of inboxes)
      cb({
        profiles: members,
        threads: [...threadMap.values()].filter(
          (t) => t.id === "team" || t.participants.includes(account?.id),
        ),
      });
  };
  const emit = (id) => {
    listeners
      .get(id)
      ?.forEach((cb) => cb([...(messages.get(id) || [])].reverse()));
    emitInbox();
  };
  return {
    async confirmPassword(){if(!account)throw Error('Sign in first.');},
    async memberSettings(action,data={}){
      if(!account)throw Error('Sign in first.');
      const p=privateProfiles.get(account.id)||{preferences:{},available:{email:false,sms:false}};
      if(action==='get')return structuredClone(p);
      if(action==='checklist')return {};
      else if(action==='preferences')p.preferences={...data.preferences};
      else throw Error('Preview only. No email or text is sent.');
      privateProfiles.set(account.id,p);return {};
    },
    watchReaders(id,cb){const watchers=readWatchers.get(id)||new Set();watchers.add(cb);readWatchers.set(id,watchers);queueMicrotask(()=>cb(receipts.get(id)||{}));return ()=>watchers.delete(cb);},
    async markRead(id,memberId,through){const rows={...(receipts.get(id)||{}),[memberId]:+through};receipts.set(id,rows);for(const cb of readWatchers.get(id)||[])cb(rows);},
    onAccount(cb) {
      callbacks.add(cb);
      queueMicrotask(() => cb(account));
      return () => callbacks.delete(cb);
    },
    async login(id, password) {
      if (!password) throw Error("Enter a preview passcode.");
      const member = members.find((m) => m.id === id.trim().toLowerCase());
      if (!member) throw Error("Preview member IDs: 19kimj, 21kiml, 22kangp.");
      account = { ...member, admin: member.id === "19kimj", photoBase64: "" };
      callbacks.forEach((cb) => cb(account));
      return account;
    },
    async logout() {
      account = null;
      callbacks.forEach((cb) => cb(null));
    },
    async rename(name) {
      account = { ...account, name };
      callbacks.forEach((cb) => cb(account));
      return account;
    },
    async password() {},
    async photo(photoBase64) {
      account = { ...account, photoBase64 };
      callbacks.forEach((cb) => cb(account));
      return account;
    },
    watchPublic(cb) {
      queueMicrotask(() => cb({ records, members }));
      return () => {};
    },
    async prepare() {},
    watchInbox(member, cb) {
      inboxes.add(cb);
      queueMicrotask(emitInbox);
      return () => inboxes.delete(cb);
    },
    async create(member, peers, title) {
      const id =
        peers.length === 1
          ? dmId(member.id, peers[0])
          : "group_" + crypto.randomUUID();
      if (!threadMap.has(id))
        threadMap.set(id, {
          id,
          type: peers.length === 1 ? "dm" : "group",
          title,
          participants:
            peers.length === 1
              ? [member.id, ...peers]
              : participants(member.id, peers),
          lastMessage: "",
          updatedAt: new Date(),
        });
      emitInbox();
      return threadMap.get(id);
    },
    watchMessages(id, limit, cb) {
      if (!listeners.has(id)) listeners.set(id, new Set());
      listeners.get(id).add(cb);
      queueMicrotask(() => cb([...(messages.get(id) || [])].reverse()));
      return () => listeners.get(id)?.delete(cb);
    },
    messageId: () => crypto.randomUUID(),
    async send(thread, id, member, text, attachments, reply) {
      if (!messages.has(thread)) messages.set(thread, []);
      messages
        .get(thread)
        .push({
          id,
          senderId: member.id,
          senderName: member.name,
          text,
          preview: text,
          admin: member.admin,
          attachments,
          reply,
          sentAt: new Date(),
          reactions: {},
        });
      Object.assign(threadMap.get(thread), {
        lastMessage: text,
        lastSenderId: member.id,
        lastMessageId: id,
        updatedAt: new Date(),
      });
      emit(thread);
    },
    async react(thread, id, uid, emoji, remove) {
      const message = messages.get(thread).find((m) => m.id === id);
      if (remove) delete message.reactions[uid];
      else message.reactions[uid] = emoji;
      emit(thread);
    },
    async remove(thread, message) {
      Object.assign(message, {
        deleted: true,
        text: "",
        attachments: [],
        reactions: {},
        reply: null,
      });
      emit(thread);
    },
    async report() {},
    async preference() {},
    async upload(thread, id, uid, index, file, progress) {
      progress(1);
      return {
        path: "preview/" + crypto.randomUUID(),
        name: file.name,
        mime: file.type,
        size: file.size,
        _blob: file,
      };
    },
    async download(a) {
      return a._blob || new Blob(["Preview file"]);
    },
  };
}
