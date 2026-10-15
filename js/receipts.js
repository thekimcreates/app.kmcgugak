// Read receipts use server-issued message timestamps, shared between devices.
export function unseenCount(message,thread,members,readers={}) {
  const ids=new Set(thread.id==='team'?members.map(m=>m.id):thread.participants||[]);
  ids.delete(message.senderId);
  return [...ids].filter(id=>!message.sentAt || Number(readers[id]||0)<+new Date(message.sentAt)).length;
}
