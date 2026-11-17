'use client';
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import enC from '@/locales/en/common.json'; import enA from '@/locales/en/auth.json'; import enH from '@/locales/en/home.json';
import enT from '@/locales/en/chat.json'; import arT from '@/locales/ar/chat.json';
import enS from '@/locales/en/social.json'; import arS from '@/locales/ar/social.json';
import enK from '@/locales/en/calls.json'; import arK from '@/locales/ar/calls.json';
import enP from '@/locales/en/profile.json'; import arP from '@/locales/ar/profile.json';
import enG from '@/locales/en/settings.json'; import arG from '@/locales/ar/settings.json';
import arC from '@/locales/ar/common.json'; import arA from '@/locales/ar/auth.json'; import arH from '@/locales/ar/home.json';

export type Lang = 'ar' | 'en';
const dict: Record<Lang, Record<string, any>> = { en: { common: enC, auth: enA, home: enH, chat: enT, social: enS, call: enK, profile: enP, settings: enG }, ar: { common: arC, auth: arA, home: arH, chat: arT, social: arS, call: arK, profile: arP, settings: arG } };
const KEY = 'floxaap.lang';
type Ctx = { lang: Lang; dir: 'rtl' | 'ltr'; setLang: (l: Lang) => void; t: (k: string, p?: Record<string, string | number>) => string; relTime: (d: Date) => string };
const I18n = createContext<Ctx>(null as unknown as Ctx);
const get = (o: any, k: string) => k.split('.').reduce<any>((a, s) => a?.[s], o);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, set] = useState<Lang>('en');
  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(KEY); } catch {}
    const dev = (navigator.language || 'en').toLowerCase().startsWith('ar') ? 'ar' : 'en';
    set(saved === 'ar' || saved === 'en' ? saved : dev);
  }, []);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  useEffect(() => { document.documentElement.lang = lang; document.documentElement.dir = dir; }, [lang, dir]);
  useEffect(() => { try { document.documentElement.dataset.motion = localStorage.getItem('floxaap.motion') === 'reduce' ? 'reduce' : 'full'; } catch {} }, []);
  const setLang = useCallback((l: Lang) => { set(l); try { localStorage.setItem(KEY, l); } catch {} }, []);
  const t = useCallback((k: string, p?: Record<string, string | number>) => {
    const v = get(dict[lang], k) ?? get(dict.en, k) ?? k;
    return typeof v === 'string' && p ? v.replace(/\{(\w+)\}/g, (_, n) => String(p[n] ?? '')) : String(v);
  }, [lang]);
  const relTime = useCallback((d: Date) => {
    const s = Math.round((d.getTime() - Date.now()) / 1000), a = Math.abs(s), f = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
    return a < 3600 ? f.format(Math.round(s / 60), 'minute') : a < 86400 ? f.format(Math.round(s / 3600), 'hour') : f.format(Math.round(s / 86400), 'day');
  }, [lang]);
  return <I18n.Provider value={{ lang, dir, setLang, t, relTime }}>{children}</I18n.Provider>;
}
export const useI18n = () => useContext(I18n);
