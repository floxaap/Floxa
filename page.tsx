'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { collection, getDocs, limit, orderBy, query, QueryDocumentSnapshot, startAfter, where } from 'firebase/firestore';
import AuthGuard, { useUser } from '@/components/AuthGuard'; import BottomNav from '@/components/BottomNav'; import FollowButton from '@/components/FollowButton';
import { db } from '@/lib/firebase'; import { likedByMe, toggleLike, toggleSave } from '@/lib/feed'; import { notify } from '@/lib/social'; import { useI18n } from '@/i18n';
type R = { id: string; authorId: string; username: string; media: string; caption: string; likeCount: number; commentCount: number };
const nf = (l: string, n: number) => new Intl.NumberFormat(l, { notation: 'compact' }).format(n);
function Reel({ p, i, cur, setCur, muted, liked0 }: { p: R; i: number; cur: number; setCur: (i: number) => void; muted: boolean; liked0: boolean }) {
  const { t, lang } = useI18n(); const me = useUser(); const box = useRef<HTMLDivElement>(null), v = useRef<HTMLVideoElement>(null);
  const [prog, setProg] = useState(0), [paused, setPaused] = useState(false), [liked, setLiked] = useState(liked0), [n, setN] = useState(p.likeCount), [saved, setSaved] = useState(false);
  const active = cur === i, near = Math.abs(cur - i) <= 1;
  useEffect(() => { const io = new IntersectionObserver(([e]) => e.intersectionRatio >= 0.7 && setCur(i), { threshold: [0.7] }); io.observe(box.current!); return () => io.disconnect(); }, [i, setCur]);
  useEffect(() => { setPaused(false); }, [active]);
  useEffect(() => { const el = v.current; if (!el) return; if (active && !paused) el.play().catch(() => {}); else { el.pause(); if (!active) el.currentTime = 0; } }, [active, paused, near]);
  async function like() { const was = liked; setLiked(!was); setN(n + (was ? -1 : 1)); try { await toggleLike(p.id, me.uid, was); if (!was) notify(p.authorId, 'like', p.id); } catch { setLiked(was); setN(n); } }
  async function save() { const was = saved; setSaved(!was); try { await toggleSave(p.id, me.uid, was); } catch { setSaved(was); } }
  async function share() { const url = location.origin + '/post/' + p.id; try { navigator.share ? await navigator.share({ url }) : await navigator.clipboard.writeText(url); } catch {} }
  const rail = { display: 'grid', gap: 18, justifyItems: 'center', position: 'absolute' as const, insetInlineEnd: 12, insetBlockEnd: 140, color: '#fff', fontSize: 26 };
  return (<div ref={box} className="reel">
    {near && <video ref={v} src={p.media} loop muted={muted} playsInline preload="auto" onTimeUpdate={e => setProg(e.currentTarget.currentTime / (e.currentTarget.duration || 1))} onClick={() => setPaused(x => !x)} style={{ inlineSize: '100%', blockSize: '100%', objectFit: 'cover' }} />}
    {paused && active && <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 64, pointerEvents: 'none' }}>▶</span>}
    <div style={rail}>
      <button aria-pressed={liked} aria-label={t('home.like')} onClick={like} style={{ color: liked ? 'var(--gold-l)' : '#fff' }}>{liked ? '♥' : '♡'}<div style={{ fontSize: 12 }}>{nf(lang, n)}</div></button>
      <Link href={'/post/' + p.id} aria-label={t('home.comment')} style={{ textAlign: 'center' }}>💬<div style={{ fontSize: 12 }}>{nf(lang, p.commentCount)}</div></Link>
      <button onClick={share} aria-label={t('home.share')}>↗</button>
      <button onClick={save} aria-pressed={saved} aria-label={t('home.save')} style={{ color: saved ? 'var(--gold-l)' : '#fff' }}>{saved ? '▣' : '□'}</button></div>
    <div style={{ position: 'absolute', insetInline: 12, insetBlockEnd: 96, display: 'grid', gap: 8, maxInlineSize: '75%' }}>
      <div className="row"><Link href={'/profile/' + p.authorId} dir="ltr" style={{ fontWeight: 600, unicodeBidi: 'isolate' }}>@{p.username}</Link><FollowButton uid={p.authorId} /></div>
      <p dir="auto" style={{ textAlign: 'start', lineHeight: 1.5 }}>{p.caption}</p></div>
    <div style={{ position: 'absolute', insetInline: 0, insetBlockEnd: 70, blockSize: 3, background: 'rgba(255,255,255,.25)' }}><i style={{ display: 'block', blockSize: '100%', inlineSize: prog * 100 + '%', background: 'var(--gold-l)' }} /></div>
  </div>);
}
function Shorts() {
  const { t } = useI18n(); const me = useUser(); const [items, setItems] = useState<R[]>([]), [liked, setLiked] = useState<Set<string>>(new Set()), [cur, setCur] = useState(0), [muted, setMuted] = useState(true), [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const cursor = useRef<QueryDocumentSnapshot | undefined>(), done = useRef(false), busy = useRef(false);
  const load = useCallback(async () => { if (busy.current || done.current) return; busy.current = true;
    try { const s = await getDocs(query(collection(db, 'posts'), where('mediaType', '==', 'video'), orderBy('createdAt', 'desc'), ...(cursor.current ? [startAfter(cursor.current)] : []), limit(8)));
      cursor.current = s.docs[s.docs.length - 1]; if (s.docs.length < 8) done.current = true;
      const rows = s.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as R[]; const l = await likedByMe(me.uid, rows.map(r => r.id)); setLiked(x => new Set([...x, ...l])); setItems(x => [...x, ...rows]); setState('ok');
    } catch { setState('error'); } finally { busy.current = false; } }, [me.uid]);
  useEffect(() => { load(); }, [load]); useEffect(() => { if (cur >= items.length - 3) load(); }, [cur, items.length, load]);
  return (<div className="reels">
    <header style={{ position: 'fixed', insetInline: 0, insetBlockStart: 0, zIndex: 5, padding: 'calc(12px + env(safe-area-inset-top)) 16px 8px', display: 'flex', justifyContent: 'space-between', color: '#fff', maxInlineSize: 480, marginInline: 'auto' }}>
      <b>{t('social.shorts')}</b><button onClick={() => setMuted(m => !m)} aria-pressed={muted} aria-label={t(muted ? 'social.unmute' : 'social.mute')}>{muted ? '🔇' : '🔊'}</button></header>
    {state === 'loading' && <p className="sub" style={{ padding: 80, textAlign: 'center' }}>{t('common.loading')}</p>}
    {state === 'error' && <p className="err" style={{ padding: 80 }}>{t('auth.errors.generic')}</p>}
    {state === 'ok' && items.length === 0 && <p className="sub" style={{ padding: 80, textAlign: 'center' }}>{t('social.noShorts')}</p>}
    {items.map((p, i) => <Reel key={p.id} p={p} i={i} cur={cur} setCur={setCur} muted={muted} liked0={liked.has(p.id)} />)}
    <BottomNav /></div>);
}
export default function Page() { return <AuthGuard><Shorts /></AuthGuard>; }
