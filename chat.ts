import { arrayUnion, collection, doc, getDoc, increment, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
export type Msg = { senderName?: string; id: string; senderId: string; text: string; replyTo: { id: string; text: string } | null; createdAt: Date; editedAt?: unknown; deleted: boolean; deliveredTo: string[]; readBy: string[]; pending: boolean };
export type Conv = { isGroup?: boolean; name?: string; admins?: string[]; ownerId?: string; id: string; members: string[]; memberInfo: Record<string, { name: string; username: string }>; lastMessage?: { id: string; text: string; senderId: string }; lastAt?: Date; unread?: Record<string, number> };
export const convId = (a: string, b: string) => [a, b].sort().join('_');
export const otherOf = (c: Conv, me: string) => c.members.find(m => m !== me)!;

export async function startChat(me: string, rawUsername: string) {
  const un = (await getDoc(doc(db, 'usernames', rawUsername.trim().replace(/^@/, '').toLowerCase()))).data();
  if (!un) throw new Error('notFound'); if (un.uid === me) throw new Error('self');
  const id = convId(me, un.uid), ref = doc(db, 'conversations', id);
  if (!(await getDoc(ref)).exists()) {
    const [a, b] = await Promise.all([getDoc(doc(db, 'users', me)), getDoc(doc(db, 'users', un.uid))]);
    const info = (s: typeof a) => ({ name: s.data()?.name ?? '', username: s.data()?.username ?? '' });
    await setDoc(ref, { members: [me, un.uid].sort(), memberInfo: { [me]: info(a), [un.uid]: info(b) }, lastAt: serverTimestamp(), unread: { [me]: 0, [un.uid]: 0 } });
  }
  return id;
}
export async function sendMessage(cid: string, me: string, others: string[], text: string, replyTo: Msg['replyTo'], senderName = '') {
  const m = doc(collection(db, 'conversations', cid, 'messages')), b = writeBatch(db);
  b.set(m, { senderId: me, senderName, text, replyTo, createdAt: serverTimestamp(), deleted: false, deliveredTo: [], readBy: [me] });
  b.update(doc(db, 'conversations', cid), { lastMessage: { id: m.id, text: text.slice(0, 120), senderId: me }, lastAt: serverTimestamp(), ...Object.fromEntries(others.map(o => ['unread.' + o, increment(1)])) });
  await b.commit();
}
export const editMessage = (cid: string, id: string, text: string) => updateDoc(doc(db, 'conversations', cid, 'messages', id), { text, editedAt: serverTimestamp() });
export const deleteMessage = (cid: string, id: string) => updateDoc(doc(db, 'conversations', cid, 'messages', id), { text: '', deleted: true });
export async function markRead(cid: string, me: string, ids: string[]) {
  const b = writeBatch(db);
  ids.forEach(id => b.update(doc(db, 'conversations', cid, 'messages', id), { readBy: arrayUnion(me), deliveredTo: arrayUnion(me) }));
  b.update(doc(db, 'conversations', cid), { ['unread.' + me]: 0 }); await b.commit();
}
export const markDelivered = (cid: string, id: string, me: string) => updateDoc(doc(db, 'conversations', cid, 'messages', id), { deliveredTo: arrayUnion(me) });
export function status(m: Msg, me: string, other: string): 'sending' | 'sent' | 'delivered' | 'read' {
  if (m.pending) return 'sending'; if (m.readBy.includes(other)) return 'read'; if (m.deliveredTo.includes(other)) return 'delivered'; return 'sent';
}
