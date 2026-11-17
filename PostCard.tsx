'use client';
import { useState } from 'react';
import Link from 'next/link';
import { notify } from '@/lib/social'; import FollowButton from './FollowButton'; import { Post, toggleLike, toggleSave } from '@/lib/feed'; import { useI18n } from '@/i18n'; import { useUser } from './AuthGuard';
const nf = (lang: string, n: number) => new Intl.NumberFormat(lang, { notation: 'compact' }).format(n);
export default function PostCard({ post, liked0 }: { post: Post; liked0: boolean }) {
  const { t, lang, relTime } = useI18n(); const u = useUser();
  const [liked, setLiked] = useState(liked0); const [n, setN] = useState(post.likeCount); const [saved, setSaved] = useState(false); const [bad, setBad] = useState(false);
  async function like() { const was = liked; setLiked(!was); setN(n + (was ? -1 : 1)); try { await toggleLike(post.id, u.uid, was); if (!was) notify(post.authorId, 'like', post.id); } catch { setLiked(was); setN(n); setBad(true); } }
  async function save() { const was = saved; setSaved(!was); try { await toggleSave(post.id, u.uid, was); } catch { setSaved(was); setBad(true); } }
  async function share() { const url = location.origin + '/post/' + post.id; try { navigator.share ? await navigator.share({ url }) : await navigator.clipboard.writeText(url); } catch {} }
  return (
    <article className="card">
      <header className="row" style={{ padding: 12 }}>
        <Link href={`/profile/${post.authorId}`} className="row" style={{ textDecoration: 'none', color: 'inherit' }}><img className="avatar" src={post.avatar || ''} alt="" />
        <div><b dir="auto">{post.authorName}</b>{post.verified && <span title={t('home.verified')} style={{ color: '#4da3ff' }}> ✔</span>}<div className="sub"><span dir="ltr" style={{ unicodeBidi: 'isolate' }}>@{post.username}</span> · {relTime(post.createdAt)}</div></div></Link>
        <span style={{ marginInlineStart: 'auto' }}><FollowButton uid={post.authorId} /></span>
      </header>
      {post.media && (post.mediaType === 'video' ? <video className="post-media" src={post.media} controls playsInline preload="metadata" /> : <img className="post-media" src={post.media} alt="" loading="lazy" decoding="async" />)}
      <div className="actions">
        <button className={'act' + (liked ? ' on' : '')} aria-pressed={liked} onClick={like}>{liked ? '♥' : '♡'} {nf(lang, n)}</button>
        <Link className="act" href={`/post/${post.id}`} aria-label={t('home.comment')}>💬 {nf(lang, post.commentCount)}</Link>
        <button className="act" onClick={share} aria-label={t('home.share')}>↗</button>
        <button className={'act end' + (saved ? ' on' : '')} aria-pressed={saved} aria-label={t('home.save')} onClick={save}>{saved ? '▣' : '□'}</button>
      </div>
      <p className="cap" dir="auto">{post.caption}</p>{bad && <p className="err" style={{ padding: '0 14px' }}>{t('auth.errors.generic')}</p>}
    </article>
  );
}
