import { firebaseConfig } from "./config.js";
import { dmId, participants, validId } from "./models.js";
export async function liveGateway() {
  const base = "https://www.gstatic.com/firebasejs/13.0.0/";
  const [a, h, f, s] = await Promise.all(
    ["app", "auth", "firestore", "storage"].map(
      (name) => import(base + `firebase-${name}.js`),
    ),
  );
  const app = a.initializeApp(firebaseConfig, "kmc-members-web"),
    auth = h.getAuth(app),
    db = f.getFirestore(app),
    storage = s.getStorage(app);
  await h.setPersistence(auth, h.browserLocalPersistence);
  const ref = (path) => f.doc(db, path),
    teamRef = ref("chats/team");
  let epoch = 0;
  const account = async (user) => {
    if (!user) return null;
    const token = await user.getIdTokenResult();
    if (token.claims.memberId !== user.uid || !validId(user.uid)) return null;
    let photo = "";
    try {
      photo =
        (await f.getDoc(ref(`memberProfiles/${user.uid}`))).data()
          ?.photoBase64 || "";
    } catch {}
    let admin = token.claims.chatAdmin === true || token.claims.admin === true;
    try {
      if (!admin)
        admin =
          (await f.getDoc(ref(`admins/${user.uid}`))).data()?.active === true;
    } catch {}
    return {
      id: user.uid,
      name: user.displayName?.trim() || user.uid,
      photoBase64: photo,
      admin,
    };
  };
  const own = (uid) => {
    if (auth.currentUser?.uid !== uid) throw Error("Please sign in again.");
  };
  const parseThread = (d) => ({
    id: d.id,
    ...d.data(),
    updatedAt: d.data()?.updatedAt?.toDate(),
  });
  const gateway = {
    onAccount(callback) {
      return h.onIdTokenChanged(auth, async (user) => {
        const generation = ++epoch;
        try {
          const result = await account(user);
          if (generation !== epoch) return;
          if (user && !result) {
            await h.signOut(auth);
            return;
          }
          callback(result);
        } catch (error) {
          if (generation === epoch) callback(null, error);
        }
      });
    },
    async login(id, password) {
      id = id.trim().toLowerCase();
      if (!validId(id)) throw Error("Enter a valid member ID.");
      const credential = await h.signInWithEmailAndPassword(
        auth,
        `${id}@members.kmcgugak.org`,
        password,
      );
      await credential.user.getIdToken(true);
      const result = await account(credential.user);
      if (!result) {
        await h.signOut(auth);
        throw Error("This account is not linked to a member.");
      }
      return result;
    },
    logout: () => h.signOut(auth),
    async rename(name) {
      name = name.trim();
      if (!name || name.length > 80)
        throw Error("Use a display name of 1–80 characters.");
      await h.updateProfile(auth.currentUser, { displayName: name });
      return account(auth.currentUser);
    },
    async password(current, next) {
      if (next.length < 8)
        throw Error("Use a password of at least eight characters.");
      await h.reauthenticateWithCredential(
        auth.currentUser,
        h.EmailAuthProvider.credential(auth.currentUser.email, current),
      );
      await h.updatePassword(auth.currentUser, next);
    },
    async photo(bytes) {
      if (bytes.length > 150000) throw Error("This photo is too large.");
      await f.setDoc(ref(`memberProfiles/${auth.currentUser.uid}`), {
        photoBase64: bytes,
      });
      return account(auth.currentUser);
    },
    watchPublic(callback, error) {
      let records = [],
        members = [];
      const emit = () => callback({ records, members });
      const stops = [
        f.onSnapshot(
          f.collection(db, "performances"),
          (snap) => {
            records = snap.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .filter(
                (p) => !p.hidden && /^\d{4}-\d{2}-\d{2}$/.test(p.date || ""),
              );
            emit();
          },
          error,
        ),
        f.onSnapshot(
          ref("siteContent/team"),
          (snap) => {
            members = (snap.data()?.members || []).filter(
              (m) => validId(m.id) && m.name,
            );
            emit();
          },
          error,
        ),
      ];
      return () => stops.forEach((stop) => stop());
    },
    async prepare(member) {
      own(member.id);
      await f.setDoc(ref(`chatMembers/${member.id}`), {
        displayName: member.name,
        photoBase64: member.photoBase64 || "",
        admin: member.admin,
      });
      await f.runTransaction(db, async (tx) => {
        if (!(await tx.get(teamRef)).exists())
          tx.set(teamRef, {
            type: "team",
            title: "Team Chat",
            participants: [],
            lastMessage: "",
            lastSenderId: "",
            lastMessageId: "",
            updatedAt: f.serverTimestamp(),
          });
      });
    },
    watchInbox(member, callback, error) {
      own(member.id);
      let profiles = [],
        team = { id: "team", participants: [] },
        privateThreads = [];
      const emit = () =>
        callback({
          profiles,
          threads: [
            team,
            ...privateThreads.sort(
              (a, b) => (+b.updatedAt || 0) - (+a.updatedAt || 0),
            ),
          ],
        });
      const stops = [
        f.onSnapshot(
          f.collection(db, "chatMembers"),
          (snap) => {
            profiles = snap.docs.map((d) => ({
              id: d.id,
              name: d.data().displayName,
              photoBase64: d.data().photoBase64,
              admin: d.data().admin,
            }));
            emit();
          },
          error,
        ),
        f.onSnapshot(
          teamRef,
          (snap) => {
            team = parseThread(snap);
            emit();
          },
          error,
        ),
        f.onSnapshot(
          f.query(
            f.collection(db, "chats"),
            f.where("participants", "array-contains", member.id),
          ),
          (snap) => {
            privateThreads = snap.docs.map(parseThread);
            emit();
          },
          error,
        ),
      ];
      return () => stops.forEach((stop) => stop());
    },
    async create(member, peers, title) {
      own(member.id);
      if (peers.length === 1) {
        const id = dmId(member.id, peers[0]),
          r = ref("chats/" + id);
        const thread = {
          type: "dm",
          title: "",
          participants: [member.id, peers[0]].sort(),
          lastMessage: "",
          lastSenderId: "",
          lastMessageId: "",
          updatedAt: f.serverTimestamp(),
        };
        await f.runTransaction(db, async (tx) => {
          if (!(await tx.get(r)).exists()) tx.set(r, thread);
        });
        return { id, ...thread };
      }
      const ids = participants(member.id, peers);
      title = title.trim();
      if (title.length > 80)
        throw Error("Use a group name of up to 80 characters.");
      const r = ref("chats/group_" + f.doc(f.collection(db, "chats")).id),
        thread = {
          type: "group",
          title,
          participants: ids,
          lastMessage: "",
          lastSenderId: "",
          lastMessageId: "",
          updatedAt: f.serverTimestamp(),
        };
      await f.setDoc(r, thread);
      return { id: r.id, ...thread };
    },
    watchMessages(id, limit, callback, error) {
      return f.onSnapshot(
        f.query(
          f.collection(db, `chats/${id}/messages`),
          f.orderBy("sentAt", "desc"),
          f.limit(limit),
        ),
        (snap) =>
          callback(
            snap.docs.map((d) => ({
              id: d.id,
              ...d.data(),
              sentAt: d.data().sentAt?.toDate(),
              pending: d.metadata.hasPendingWrites,
            })),
          ),
        error,
      );
    },
    messageId: (id) => f.doc(f.collection(db, `chats/${id}/messages`)).id,
    async send(thread, id, member, text, attachments, reply) {
      own(member.id);
      text = text.trim();
      if (
        text.length > 4000 ||
        attachments.length > 4 ||
        (!text && !attachments.length)
      )
        throw Error("Use up to 4,000 characters and four attachments.");
      const preview = (text || attachments.map((a) => a.name).join(", ")).slice(
        0,
        160,
      );
      const msg = ref(`chats/${thread}/messages/${id}`);
      await f.runTransaction(db, async (tx) => {
        if ((await tx.get(msg)).exists()) return;
        tx.set(msg, {
          senderId: member.id,
          senderName: member.name,
          text,
          preview,
          admin: member.admin,
          deleted: false,
          sentAt: f.serverTimestamp(),
          attachments,
          reactions: {},
          reply: reply || null,
        });
        tx.update(ref("chats/" + thread), {
          lastMessage: preview,
          lastSenderId: member.id,
          lastMessageId: id,
          updatedAt: f.serverTimestamp(),
        });
      });
    },
    react: (thread, message, uid, emoji, remove) =>
      f.updateDoc(ref(`chats/${thread}/messages/${message}`), {
        ["reactions." + uid]: remove ? f.deleteField() : emoji,
      }),
    async remove(thread, message) {
      await f.runTransaction(db, async (tx) => {
        const root = ref("chats/" + thread),
          data = await tx.get(root);
        tx.update(ref(`chats/${thread}/messages/${message.id}`), {
          deleted: true,
          text: "",
          preview: "Message removed",
          attachments: [],
          reactions: {},
          reply: null,
        });
        if (data.data().lastMessageId === message.id)
          tx.update(root, {
            lastMessage: "Message removed",
            updatedAt: f.serverTimestamp(),
          });
      });
    },
    report: (thread, message, uid, reason) =>
      f.addDoc(f.collection(db, "chatReports"), {
        chatId: thread,
        messageId: message.id,
        reporterId: uid,
        reason,
        createdAt: f.serverTimestamp(),
      }),
    preference: (uid, device, mode, permission) =>
      f.setDoc(ref(`chatSettings/${uid}/devices/${device}`), {
        mode,
        permissionGranted: permission,
        updatedAt: f.serverTimestamp(),
      }),
    async upload(thread, id, uid, index, file, progress) {
      own(uid);
      if (!file.size || file.size > 10485760)
        throw Error("Choose nonempty files under 10 MB.");
      const path = `chatAttachments/${thread}/${uid}/${id}/${index}`,
        r = s.ref(storage, path);
      const data = {
        path,
        name: file.name.slice(0, 255),
        mime: file.type || "application/octet-stream",
        size: file.size,
      };
      try {
        if ((await s.getMetadata(r)).size === file.size) return data;
      } catch {}
      await new Promise((resolve, reject) => {
        const task = s.uploadBytesResumable(r, file, {
          contentType: data.mime,
        });
        task.on(
          "state_changed",
          (snapshot) =>
            progress(
              snapshot.bytesTransferred / Math.max(1, snapshot.totalBytes),
            ),
          reject,
          resolve,
        );
      });
      own(uid);
      return data;
    },
    async download(attachment, uid) {
      own(uid);
      const blob = await s.getBlob(s.ref(storage, attachment.path), 10485760);
      own(uid);
      return blob;
    },
  };
  return gateway;
}
