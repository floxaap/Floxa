'use client';
import { useEffect, useState, ReactNode, createContext, useContext } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth, configured } from '@/lib/firebase';
import { useI18n } from '@/i18n';
const U = createContext<User | null>(null);
export const useUser = () => useContext(U)!;
export default function AuthGuard({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null); const [ready, setReady] = useState(false);
  const r = useRouter(); const { t } = useI18n();
  useEffect(() => { if (!configured) { setReady(true); return; } return onAuthStateChanged(auth, u => { setUser(u); setReady(true); if (!u) r.replace('/auth'); }); }, [r]);
  if (!configured) return <p className="err" style={{ padding: 24 }}>{t('auth.errors.config')}</p>;
  if (!ready || !user) return <p className="sub" style={{ padding: 24 }}>{t('common.loading')}</p>;
  return <U.Provider value={user}>{children}</U.Provider>;
}
