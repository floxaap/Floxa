'use client';
import Link from 'next/link'; import { usePathname } from 'next/navigation'; import { useI18n } from '@/i18n';
const P = (d: string) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
export default function BottomNav() {
  const p = usePathname(), { t } = useI18n();
  const it = (href: string, k: string, d: string) => (<Link href={href} className={p === href ? 'on' : ''}>{P(d)}<span>{t('common.nav.' + k)}</span></Link>);
  return (<nav className="nav">
    {it('/home', 'home', 'M3 11l9-8 9 8v10h-6v-6H9v6H3z')}{it('/explore', 'explore', 'M12 3a9 9 0 100 18 9 9 0 000-18zm3 6l-2 5-5 2 2-5z')}
    <Link href="/create" aria-label={t('common.nav.create')} className="plus">{P('M12 5v14M5 12h14')}</Link>
    {it('/messages', 'messages', 'M4 5h16v11H9l-5 4z')}{it('/profile', 'profile', 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0')}
  </nav>);
}
