'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link'; import { collection, limit, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase'; import { useUser } from './AuthGuard'; import { useI18n } from '@/i18n';
export default function NotifBell() {
  const u = useUser(), { t } = useI18n(); const [dot, setDot] = useState(false);
  useEffect(() => onSnapshot(query(collection(db, 'notifications'), where('toUid', '==', u.uid), where('read', '==', false), limit(1)), s => setDot(!s.empty), () => {}), [u.uid]);
  return (<span className="row" style={{ gap: 16, fontSize: 20 }}>
    <Link href="/shorts" aria-label={t('social.shorts')}>🎬</Link>
    <Link href="/explore" aria-label={t('social.explore')}>🔍</Link>
    <Link href="/notifications" aria-label={t('social.notifications')} style={{ position: 'relative' }}>🔔{dot && <i style={{ position: 'absolute', insetBlockStart: 0, insetInlineEnd: -2, inlineSize: 9, blockSize: 9, borderRadius: 9, background: 'var(--gold-l)' }} />}</Link></span>);
}
