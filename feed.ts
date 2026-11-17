import { collection, doc, getDocs, limit, orderBy, query, runTransaction, startAfter, where, Timestamp, QueryDocumentSnapshot, increment } from 'firebase/firestore';
import { db } from './firebase';
export type Post = { id: string; authorId: string; authorName: string; username: string; avatar?: string; verified?: boolean; media?: string; mediaType?: 'image' | 'video'; caption: string; likeCount: number; commentCount: number; createdAt: Date };
export type Story = { id: string; authorId: string; username: string; avatar?: string; media: string; createdAt: Date };
const PAGE = 10;
const toPost = (d: QueryDocumentSnapshot): Post => { const x = d.data(); return { ...(x as any), id: d.id, createdAt: (x.createdAt as Timestamp)?.toDate() ?? new Date() }; };
export async function fetchPosts(cursor?: QueryDocumentSnapshot) {
  const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), ...(cursor ? [startAfter(cursor)] : []), limit(PAGE));
  const s = await getDocs(q);
  return { posts: s.docs.map(toPost), cursor: s.docs.length === PAGE ? s.docs[s.docs.length - 1] : undefined };
}
export async function fetchStories(): Promise<Story[]> {
  const s = await getDocs(query(collection(db, 'stories'), where('expiresAt', '>', Timestamp.now()), orderBy('expiresAt', 'desc'), limit(30)));
  return s.docs.map(d => { const x = d.data(); return { ...(x as any), id: d.id, createdAt: (x.createdAt as Timestamp)?.toDate() ?? new Date() }; });
}
export async function likedByMe(uid: string, ids: string[]) {
  const out = new Set<string>();
  await Promise.all(ids.map(async id => { const r = await getDocs(query(collection(db, 'posts', id, 'likes'), where('uid', '==', uid), limit(1))); if (!r.empty) out.add(id); }));
  return out;
}
export async function toggleLike(postId: string, uid: string, liked: boolean) {
  const pr = doc(db, 'posts', postId), lr = doc(db, 'posts', postId, 'likes', uid);
  await runTransaction(db, async tx => { liked ? tx.delete(lr) : tx.set(lr, { uid, createdAt: Timestamp.now() }); tx.update(pr, { likeCount: increment(liked ? -1 : 1) }); });
}
export async function toggleSave(postId: string, uid: string, saved: boolean) {
  const r = doc(db, 'users', uid, 'saved', postId);
  await runTransaction(db, async tx => { saved ? tx.delete(r) : tx.set(r, { createdAt: Timestamp.now() }); });
}
