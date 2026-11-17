'use client';
import { useEffect, useState } from 'react';
import { useI18n } from '@/i18n'; import { isFollowing, toggleFollow } from '@/lib/social'; import { useUser } from './AuthGuard';
export default function FollowButton({ uid }: { uid: string }) {
  const { t } = useI18n(); const me = useUser(); const [on, setOn] = useState<boolean | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { isFollowing(me.uid, uid).then(setOn).catch(() => setOn(false)); }, [me.uid, uid]);
  if (uid === me.uid || on === null) return null;
  async function tap() { if (busy) return; setBusy(true); const was = on!; setOn(!was); try { await toggleFollow(me.uid, uid, was); } catch { setOn(was); } finally { setBusy(false); } }
  return <button className={'act' + (on ? ' on' : '')} style={{ border: '1px solid var(--line)', borderRadius: 99, padding: '6px 14px' }} aria-pressed={on} onClick={tap}>{t(on ? 'social.following' : 'social.follow')}</button>;
}
