import { addDoc, collection, doc, getDoc, increment, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
export type NType = 'follow' | 'like' | 'comment' | 'call';
export async function notify(toUid: string, type: NType, postId?: string) {
  const me = auth.currentUser; if (!me || me.uid === toUid) return;
  try { const u = (await getDoc(doc(db, 'users', me.uid))).data();
    await addDoc(collection(db, 'notifications'), { toUid, fromUid: me.uid, fromUsername: u?.username ?? '', type, postId: postId ?? null, read: false, createdAt: serverTimestamp() }); } catch {}
}
export const followId = (me: string, other: string) => `${me}_${other}`;
export async function isFollowing(me: string, other: string) { return (await getDoc(doc(db, 'follows', followId(me, other)))).exists(); }
export async function toggleFollow(me: string, other: string, following: boolean) {
  const f = doc(db, 'follows', followId(me, other));
  await runTransaction(db, async tx => {
    following ? tx.delete(f) : tx.set(f, { followerId: me, followedId: other, createdAt: serverTimestamp() });
    const d = following ? -1 : 1;
    tx.update(doc(db, 'users', other), { followersCount: increment(d) }); tx.update(doc(db, 'users', me), { followingCount: increment(d) });
  });
  if (!following) notify(other, 'follow');
}
