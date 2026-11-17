'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link'; import { useRouter } from 'next/navigation'; import { signOut } from 'firebase/auth';
import { collection, doc, getCountFromServer, getDoc, getDocs, limit, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase'; import { startChat } from '@/lib/chat'; import { uploadMedia } from '@/lib/publish'; import { useI18n } from '@/i18n';
import { useUser } from './AuthGuard'; import FollowButton from './FollowButton'; import BottomNav from './BottomNav';
type UD = { name: string; username: string; bio?: string; website?: string; avatar?: string; cover?: string; verified?: boolean; followersCount?: number; followingCount?: number };
type P = { id: string; media?: string; mediaType?: string; caption: string };
const safeUrl = (w: string) => { const v = w.trim(); if (!v) return ''; try { const x = new URL(/^https?:\/\//i.test(v) ? v : 'https://' + v); return x.protocol.startsWith('http') ? x.href : ''; } catch { return ''; } };
export default function ProfileView({ uid }: { uid: string }) {
  const { t, lang } = useI18n(); const me = useUser(); const r = useRouter(); const mine = uid === me.uid;
  const [u, setU] = useState<UD | null | undefined>(undefined); const [posts, setPosts] = useState<P[]>([]); const [tab, setTab] = useState<'posts' | 'saved'>('posts'); const [count, setCount] = useState(0);
  const [edit, setEdit] = useState(false); const [f, setF] = useState({ name: '', bio: '', website: '' }); const [av, setAv] = useState<File | null>(null); const [cv, setCv] = useState<File | null>(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [copied, setCopied] = useState(false);
  const load = () => getDoc(doc(db, 'users', uid)).then(s => { const d = s.exists() ? (s.data() as UD) : null; setU(d); if (d) setF({ name: d.name, bio: d.bio ?? '', website: d.website ?? '' }); }).catch(() => setU(null));
  useEffect(() => { load(); getCountFromServer(query(collection(db, 'posts'), where('authorId', '==', uid))).then(c => setCount(c.data().count)).catch(() => {}); }, [uid]); // eslint-disable-line
  useEffect(() => { setPosts([]);
    if (tab === 'posts') getDocs(query(collection(db, 'posts'), where('authorId', '==', uid), orderBy('createdAt', 'desc'), limit(30))).then(s => setPosts(s.docs.map(d => ({ id: d.id, ...(d.data() as any) })))).catch(() => {});
    else getDocs(query(collection(db, 'users', uid, 'saved'), limit(30))).then(s => Promise.all(s.docs.map(d => getDoc(doc(db, 'posts', d.id))))).then(a => setPosts(a.filter(x => x.exists()).map(x => ({ id: x.id, ...(x.data() as any) })))).catch(() => {}); }, [uid, tab]);
  async function save() {
    setErr(''); if ((av && !av.type.startsWith('image/')) || (cv && !cv.type.startsWith('image/'))) return setErr(t('profile.badImage')); if (!f.name.trim()) return setErr(t('auth.errors.required'));
    setBusy(true);
    try { const up: Record<string, string> = { name: f.name.trim(), bio: f.bio.trim().slice(0, 160), website: safeUrl(f.website) };
      if (av) up.avatar = await uploadMedia(me.uid, av, () => {}); if (cv) up.cover = await uploadMedia(me.uid, cv, () => {});
      await updateDoc(doc(db, 'users', me.uid), up); setAv(null); setCv(null); setEdit(false); await load();
    } catch { setErr(t('profile.saveFail')); } finally { setBusy(false); } }
  async function share() { const url = location.origin + '/profile/' + uid; try { if (navigator.share) await navigator.share({ url }); else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } } catch {} }
  if (u === undefined) return <p className="sub" style={{ padding: 24 }}>{t('common.loading')}</p>;
  if (u === null) return <p className="err" style={{ padding: 24 }}>{t('profile.notFound')}</p>;
  const nf = (n: number) => new Intl.NumberFormat(lang, { notation: 'compact' }).format(n); const site = safeUrl(u.website ?? '');
  const stat = (n: number, k: string) => <div style={{ textAlign: 'center' }}><b>{nf(n)}</b><div className="sub">{t('profile.' + k)}</div></div>;
  const inp = { background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, padding: 10, textAlign: 'start' as const, inlineSize: '100%' };
  return (<div className="shell">
    <div style={{ blockSize: 140, background: u.cover ? `center/cover url(${u.cover})` : 'linear-gradient(135deg,var(--em),#050505)' }} />
    <div style={{ padding: '0 16px', marginBlockStart: -44 }}>
      {u.avatar ? <img className="avatar" src={u.avatar} alt="" style={{ inlineSize: 88, blockSize: 88, border: '3px solid var(--gold)' }} /> : <span className="avatar" style={{ inlineSize: 88, blockSize: 88, display: 'grid', placeItems: 'center', fontSize: '2rem', color: 'var(--gold-l)', border: '3px solid var(--gold)' }}>{(u.name || '?').slice(0, 1)}</span>}
      <h1 dir="auto" style={{ fontSize: '1.3rem', marginBlockStart: 8 }}>{u.name}{u.verified && <span title={t('profile.verified')} style={{ color: '#4da3ff' }}> ✔</span>}</h1>
      <p className="sub" dir="ltr" style={{ unicodeBidi: 'isolate', textAlign: 'start' }}>@{u.username}</p>
      {u.bio && <p dir="auto" style={{ textAlign: 'start', lineHeight: 1.6, marginBlock: 8 }}>{u.bio}</p>}
      {site && <a href={site} target="_blank" rel="noopener noreferrer nofollow" dir="ltr" style={{ color: 'var(--gold-l)', unicodeBidi: 'isolate' }}>{site.replace(/^https?:\/\//, '')}</a>}
      <div className="row" style={{ justifyContent: 'space-around', marginBlock: 14 }}>{stat(count, 'posts')}{stat(u.followersCount ?? 0, 'followers')}{stat(u.followingCount ?? 0, 'following')}</div>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        {mine ? <button className="gold-btn" style={{ inlineSize: 'auto', flex: 1 }} onClick={() => setEdit(!edit)}>{t('profile.edit')}</button> : <><FollowButton uid={uid} /><button className="act" style={{ border: '1px solid var(--line)', borderRadius: 99, padding: '6px 14px' }} onClick={() => startChat(me.uid, u.username).then(id => r.push('/messages/' + id)).catch(() => {})}>{t('profile.message')}</button></>}
        <button className="act" style={{ border: '1px solid var(--line)', borderRadius: 99, padding: '6px 14px' }} onClick={share}>{copied ? t('profile.copied') : t('profile.share')}</button></div>
      {edit && mine && <div style={{ marginBlock: 12, display: 'grid', gap: 10 }}>
        <label className="field"><span className="sub">{t('profile.name')}</span><input style={inp} dir="auto" value={f.name} maxLength={50} onChange={e => setF({ ...f, name: e.target.value })} /></label>
        <label className="field"><span className="sub">{t('profile.bio')}</span><input style={inp} dir="auto" value={f.bio} maxLength={160} onChange={e => setF({ ...f, bio: e.target.value })} /></label>
        <label className="field"><span className="sub">{t('profile.website')}</span><input style={{ ...inp, direction: 'ltr' }} value={f.website} onChange={e => setF({ ...f, website: e.target.value })} /></label>
        <label className="field"><span className="sub">{t('profile.avatar')}</span><input type="file" accept="image/*" onChange={e => setAv(e.target.files?.[0] ?? null)} /></label>
        <label className="field"><span className="sub">{t('profile.cover')}</span><input type="file" accept="image/*" onChange={e => setCv(e.target.files?.[0] ?? null)} /></label>
        {err && <p className="err" role="alert">{err}</p>}
        <div className="row"><button className="gold-btn" disabled={busy} onClick={save}>{busy ? t('common.loading') : t('profile.save')}</button><button className="ghost" onClick={() => setEdit(false)}>{t('profile.cancel')}</button></div></div>}
      {mine && <div className="row" style={{ marginBlockStart: 8 }}><Link href="/settings" className="ghost">{t('settings.title')}</Link><button className="ghost" onClick={() => signOut(auth).then(() => r.replace('/auth'))}>{t('profile.signOut')}</button></div>}
    </div>
    {mine && <div className="row" style={{ padding: '12px 16px 4px' }}>{(['posts', 'saved'] as const).map(k => <button key={k} className={'act' + (tab === k ? ' on' : '')} aria-pressed={tab === k} onClick={() => setTab(k)}>{t('profile.' + k)}</button>)}</div>}
    {posts.length === 0 && <p className="sub" style={{ padding: 16 }}>{t(tab === 'saved' ? 'profile.noSaved' : 'profile.noPosts')}</p>}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2, padding: '8px 2px 0' }}>{posts.map(p => <Link key={p.id} href={'/post/' + p.id} style={{ aspectRatio: '1', background: 'var(--elev)', display: 'grid', placeItems: 'center', overflow: 'hidden', fontSize: '.75rem', padding: 6 }}>
      {p.media ? (p.mediaType === 'video' ? <video src={p.media} muted preload="metadata" style={{ inlineSize: '100%', blockSize: '100%', objectFit: 'cover' }} /> : <img src={p.media} alt="" loading="lazy" style={{ inlineSize: '100%', blockSize: '100%', objectFit: 'cover' }} />) : <span dir="auto">{p.caption.slice(0, 60)}</span>}</Link>)}</div>
    <BottomNav /></div>);
}
