import { addDoc, collection, doc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { db, storage } from './firebase';
export const MAX_BYTES = 50 * 1024 * 1024;
export function uploadMedia(uid: string, file: File, onProgress: (pct: number) => void): Promise<string> {
  return new Promise((res, rej) => {
    const r = ref(storage, `users/${uid}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`);
    const task = uploadBytesResumable(r, file, { contentType: file.type });
    task.on('state_changed', s => onProgress(Math.round((s.bytesTransferred / s.totalBytes) * 100)), rej, async () => res(await getDownloadURL(r)));
  });
}
async function author(uid: string) { const s = await getDoc(doc(db, 'users', uid)); const x = s.data() ?? {}; return { authorId: uid, authorName: x.name ?? '', username: x.username ?? '', avatar: x.avatar ?? null, verified: !!x.verified }; }
/** Document is written only after the upload has fully succeeded. */
export async function publishPost(uid: string, caption: string, mediaUrl?: string, mediaType?: 'image' | 'video') {
  return addDoc(collection(db, 'posts'), { ...(await author(uid)), caption, media: mediaUrl ?? null, mediaType: mediaType ?? null, likeCount: 0, commentCount: 0, createdAt: serverTimestamp() });
}
export async function publishStory(uid: string, mediaUrl: string) {
  const a = await author(uid);
  return addDoc(collection(db, 'stories'), { authorId: uid, username: a.username, avatar: a.avatar, media: mediaUrl, createdAt: serverTimestamp(), expiresAt: Timestamp.fromMillis(Date.now() + 24 * 3600 * 1000) });
}
