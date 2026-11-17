import { collection, doc, getDocs, getDoc, orderBy, query, runTransaction, serverTimestamp, Timestamp, increment, limit } from 'firebase/firestore';
import { db } from './firebase'; import { notify } from './social';
export type Comment = { id: string; authorId: string; username: string; text: string; parentId: string | null; createdAt: Date };
export async function fetchComments(postId: string): Promise<Comment[]> {
  const s = await getDocs(query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'asc'), limit(200)));
  return s.docs.map(d => { const x = d.data(); return { ...(x as any), id: d.id, createdAt: (x.createdAt as Timestamp)?.toDate() ?? new Date() }; });
}
export async function addComment(postId: string, uid: string, text: string, parentId: string | null) {
  const u = (await getDoc(doc(db, 'users', uid))).data() ?? {};
  const cr = doc(collection(db, 'posts', postId, 'comments'));
  await runTransaction(db, async tx => { tx.set(cr, { authorId: uid, username: u.username ?? '', text: text.trim().slice(0, 1000), parentId, createdAt: serverTimestamp() }); tx.update(doc(db, 'posts', postId), { commentCount: increment(1) }); });
  const a = (await getDoc(doc(db, 'posts', postId))).data()?.authorId; if (a) notify(a, 'comment', postId);
}
