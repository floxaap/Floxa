import { addDoc, arrayRemove, arrayUnion, collection, deleteField, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase'; import type { Conv } from './chat';
const un = (s: string) => s.trim().replace(/^@/, '').toLowerCase();
async function resolve(username: string) {
  const d = (await getDoc(doc(db, 'usernames', un(username)))).data(); if (!d) throw new Error('notFound');
  const x = (await getDoc(doc(db, 'users', d.uid))).data(); return { uid: d.uid as string, info: { name: x?.name ?? '', username: x?.username ?? '' } };
}
export async function createGroup(me: string, name: string, usernames: string[]) {
  const ids = new Set<string>([me]), info: Record<string, { name: string; username: string }> = {};
  const mine = (await getDoc(doc(db, 'users', me))).data(); info[me] = { name: mine?.name ?? '', username: mine?.username ?? '' };
  for (const n of usernames) { const r = await resolve(n); ids.add(r.uid); info[r.uid] = r.info; }
  if (ids.size < 2) throw new Error('needMember'); if (ids.size > 50) throw new Error('maxMembers');
  const ref = doc(collection(db, 'conversations')), list = [...ids];
  await setDoc(ref, { isGroup: true, name: name.trim(), ownerId: me, admins: [me], members: list, memberInfo: info, lastAt: serverTimestamp(), unread: Object.fromEntries(list.map(i => [i, 0])) });
  return ref.id;
}
export async function addMember(c: Conv, username: string) {
  if (c.members.length >= 50) throw new Error('maxMembers'); const r = await resolve(username);
  await updateDoc(doc(db, 'conversations', c.id), { members: arrayUnion(r.uid), ['memberInfo.' + r.uid]: r.info });
}
export const removeMember = (cid: string, uid: string) => updateDoc(doc(db, 'conversations', cid), { members: arrayRemove(uid), admins: arrayRemove(uid), ['memberInfo.' + uid]: deleteField() });
export const makeAdmin = (cid: string, uid: string) => updateDoc(doc(db, 'conversations', cid), { admins: arrayUnion(uid) });
export const renameGroup = (cid: string, name: string) => updateDoc(doc(db, 'conversations', cid), { name: name.trim().slice(0, 60) });
export async function leaveGroup(c: Conv, me: string) {
  const rest = c.members.filter(m => m !== me); let admins = (c.admins ?? []).filter(a => a !== me);
  if (admins.length === 0 && rest.length > 0) admins = [rest[0]];
  await updateDoc(doc(db, 'conversations', c.id), { members: rest, admins, ['memberInfo.' + me]: deleteField() });
}
export const reportGroup = (cid: string, me: string) => addDoc(collection(db, 'reports'), { type: 'group', targetId: cid, reporterId: me, createdAt: serverTimestamp() });
