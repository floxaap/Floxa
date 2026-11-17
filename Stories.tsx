'use client';
import { useEffect, useRef, useState } from 'react';
import { Story } from '@/lib/feed'; import { useI18n } from '@/i18n';
const DUR = 5000; const SEEN = 'floxaap.seen';
const readSeen = (): string[] => { try { return JSON.parse(localStorage.getItem(SEEN) || '[]'); } catch { return []; } };
export default function Stories({ stories }: { stories: Story[] }) {
  const { t, dir } = useI18n(); const [seen, setSeen] = useState<string[]>([]); const [i, setI] = useState<number | null>(null);
  const [p, setP] = useState(0); const paused = useRef(false);
  useEffect(() => setSeen(readSeen()), []);
  useEffect(() => {
    if (i === null) return; setP(0); const s = stories[i];
    const mark = [...new Set([...readSeen(), s.id])]; try { localStorage.setItem(SEEN, JSON.stringify(mark)); } catch {} setSeen(mark);
    let last = performance.now(), acc = 0, raf = 0;
    const tick = (n: number) => { if (!paused.current) acc += n - last; last = n; setP(Math.min(acc / DUR, 1)); if (acc >= DUR) return next(); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [i]); // eslint-disable-line
  const close = () => setI(null);
  const next = () => setI(x => (x === null ? x : x + 1 < stories.length ? x + 1 : null));
  const prev = () => setI(x => (x === null ? x : Math.max(0, x - 1)));
  // Tap zones follow reading direction: "start" side goes back, "end" side goes forward.
  const tap = (e: React.MouseEvent) => { const r = e.currentTarget.getBoundingClientRect(), startSide = dir === 'rtl' ? e.clientX > r.left + r.width * 0.7 : e.clientX < r.left + r.width * 0.3; const endSide = dir === 'rtl' ? e.clientX < r.left + r.width * 0.3 : e.clientX > r.left + r.width * 0.7; if (startSide) prev(); else if (endSide) next(); else paused.current = !paused.current; };
  const s = i !== null ? stories[i] : null;
  return (<>
    <div className="stories">
      <a className="story" href="/create?type=story"><span className="ring add" style={{ fontSize: 26, color: 'var(--gold-l)' }}>+</span><span>{t('home.addStory')}</span></a>
      {stories.map((x, n) => (<button key={x.id} className="story" onClick={() => setI(n)}><span className={'ring' + (seen.includes(x.id) ? ' seen' : '')}><img src={x.avatar || x.media} alt="" /></span><span dir="auto">{x.username}</span></button>))}
    </div>
    {s && (<div className="viewer" role="dialog" onClick={tap} onPointerDown={() => (paused.current = true)} onPointerUp={() => (paused.current = false)}>
      <img src={s.media} alt="" />
      <div className="bars">{stories.map((_, n) => <div className="bar" key={n}><i style={{ inlineSize: (n < (i as number) ? 1 : n === i ? p : 0) * 100 + '%' }} /></div>)}</div>
      <div className="vhead"><img className="avatar" src={s.avatar || ''} alt="" /><b dir="auto">{s.username}</b><button style={{ marginInlineStart: 'auto', fontSize: 22 }} aria-label={t('common.close')} onClick={e => { e.stopPropagation(); close(); }}>✕</button></div>
      <div className="vfoot" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}><input placeholder={t('home.reply')} dir="auto" onFocus={() => (paused.current = true)} onBlur={() => (paused.current = false)} /><button aria-label={t('home.react')}>♡</button></div>
    </div>)}
  </>);
}
