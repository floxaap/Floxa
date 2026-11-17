'use client';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, Timestamp, updateDoc, where } from 'firebase/firestore';
import { auth, configured, db } from '@/lib/firebase'; import { notify } from '@/lib/social'; import { useI18n } from '@/i18n';

type Kind = 'voice' | 'video'; type Phase = 'calling' | 'connecting' | 'connected' | 'reconnecting';
type Incoming = { id: string; callerName: string; type: Kind; offer: RTCSessionDescriptionInit };
type Active = { id: string; type: Kind; peerName: string; phase: Phase; muted: boolean; camOff: boolean; secs: number };
const Ctx = createContext<{ start: (uid: string, name: string, type: Kind) => void }>({ start: () => {} });
export const useCall = () => useContext(Ctx);
const ICE: RTCIceServer[] = [{ urls: process.env.NEXT_PUBLIC_STUN_URL || 'stun:stun.l.google.com:19302' },
  ...(process.env.NEXT_PUBLIC_TURN_URL ? [{ urls: process.env.NEXT_PUBLIC_TURN_URL, username: process.env.NEXT_PUBLIC_TURN_USER, credential: process.env.NEXT_PUBLIC_TURN_PASS }] : [])];
const RING_MS = 45000;

export default function CallHost({ children }: { children: ReactNode }) {
  const { t, lang } = useI18n(); const [me, setMe] = useState<User | null>(null);
  const [inc, setInc] = useState<Incoming | null>(null); const [act, setAct] = useState<Active | null>(null); const [err, setErr] = useState('');
  const pc = useRef<RTCPeerConnection | null>(null), local = useRef<MediaStream | null>(null), remote = useRef<MediaStream | null>(null);
  const unsubs = useRef<(() => void)[]>([]), timers = useRef<number[]>([]), pending = useRef<RTCIceCandidateInit[]>([]), timerOn = useRef(false), actRef = useRef<Active | null>(null);
  const rv = useRef<HTMLVideoElement>(null), lv = useRef<HTMLVideoElement>(null); actRef.current = act;
  useEffect(() => (configured ? onAuthStateChanged(auth, setMe) : undefined), []);
  useEffect(() => { if (!me) return; return onSnapshot(query(collection(db, 'calls'), where('calleeId', '==', me.uid), where('status', '==', 'ringing')), s => {
    const d: any = s.docs.map(x => ({ id: x.id, ...x.data({ serverTimestamps: 'estimate' }) })).find((x: any) => x.offer && Date.now() - (x.createdAt as Timestamp).toMillis() < 60000);
    setInc(d && !actRef.current ? { id: d.id, callerName: d.callerName, type: d.type, offer: d.offer } : null); }, () => {}); }, [me]);
  useEffect(() => { if (rv.current) rv.current.srcObject = remote.current; if (lv.current) lv.current.srcObject = local.current; });

  const cleanup = useCallback(() => { unsubs.current.forEach(f => f()); unsubs.current = []; timers.current.forEach(clearInterval); timers.current = []; timerOn.current = false;
    pc.current?.close(); pc.current = null; local.current?.getTracks().forEach(x => x.stop()); local.current = null; remote.current = null; pending.current = []; setAct(null); }, []);
  const hangup = useCallback(() => { const a = actRef.current; if (a) updateDoc(doc(db, 'calls', a.id), { status: 'ended', endedAt: serverTimestamp() }).catch(() => {}); cleanup(); }, [cleanup]);
  const fail = (e: any) => setErr(t(e?.name === 'NotAllowedError' ? 'call.permission' : 'call.failed'));
  const media = async (type: Kind) => { if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported'); const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' ? { facingMode: 'user' } : false }); local.current = s; return s; };
  function setup(stream: MediaStream, send: (c: RTCIceCandidateInit) => void) {
    const p = new RTCPeerConnection({ iceServers: ICE }); pc.current = p; stream.getTracks().forEach(tr => p.addTrack(tr, stream));
    p.ontrack = e => { remote.current = e.streams[0]; if (rv.current) rv.current.srcObject = remote.current; };
    p.onicecandidate = e => e.candidate && send(e.candidate.toJSON());
    p.onconnectionstatechange = () => { const s = p.connectionState;
      if (s === 'connected') { setAct(a => a && { ...a, phase: 'connected' }); if (!timerOn.current) { timerOn.current = true; timers.current.push(window.setInterval(() => setAct(a => a && { ...a, secs: a.secs + 1 }), 1000)); } }
      else if (s === 'disconnected') setAct(a => a && { ...a, phase: 'reconnecting' }); else if (s === 'failed') { setErr(t('call.failed')); hangup(); } };
    return p; }
  const addCand = (c: RTCIceCandidateInit) => { if (pc.current?.remoteDescription) pc.current.addIceCandidate(c).catch(() => {}); else pending.current.push(c); };
  const flush = () => { pending.current.forEach(addCand); pending.current = []; };
  const listen = (id: string, sub: string) => onSnapshot(collection(db, 'calls', id, sub), s => s.docChanges().forEach(c => c.type === 'added' && addCand(c.doc.data())));

  const start = useCallback(async (uid: string, name: string, type: Kind) => {
    if (!me || actRef.current) return; setErr(''); const ref = doc(collection(db, 'calls')); let ready = false; const queue: RTCIceCandidateInit[] = [];
    const send = (c: RTCIceCandidateInit) => { if (ready) addDoc(collection(db, 'calls', ref.id, 'callerCandidates'), c).catch(() => {}); else queue.push(c); };
    try {
      const s = await media(type); setAct({ id: ref.id, type, peerName: name, phase: 'calling', muted: false, camOff: false, secs: 0 });
      const p = setup(s, send), o = await p.createOffer(); await p.setLocalDescription(o);
      const mine = (await getDoc(doc(db, 'users', me.uid))).data();
      await setDoc(ref, { callerId: me.uid, calleeId: uid, callerName: mine?.name ?? '', calleeName: name, type, status: 'ringing', offer: { type: o.type, sdp: o.sdp }, createdAt: serverTimestamp() });
      ready = true; queue.forEach(send);
      unsubs.current.push(onSnapshot(ref, async snap => { const d = snap.data(); if (!d) return;
        if (d.answer && p.signalingState === 'have-local-offer') { await p.setRemoteDescription(d.answer); flush(); setAct(a => a && { ...a, phase: 'connecting' }); }
        if (['declined', 'ended', 'missed'].includes(d.status)) { if (d.status === 'declined') setErr(t('call.declined')); cleanup(); } }));
      unsubs.current.push(listen(ref.id, 'calleeCandidates'));
      timers.current.push(window.setTimeout(() => { if (actRef.current?.phase === 'calling') { updateDoc(ref, { status: 'missed' }).catch(() => {}); notify(uid, 'call'); cleanup(); } }, RING_MS));
    } catch (e) { fail(e); cleanup(); }
  }, [me]); // eslint-disable-line

  async function accept() {
    const c = inc; if (!c) return; setInc(null); setErr(''); const ref = doc(db, 'calls', c.id);
    try {
      const s = await media(c.type); setAct({ id: c.id, type: c.type, peerName: c.callerName, phase: 'connecting', muted: false, camOff: false, secs: 0 });
      const p = setup(s, x => { addDoc(collection(db, 'calls', c.id, 'calleeCandidates'), x).catch(() => {}); });
      await p.setRemoteDescription(c.offer); flush(); const a = await p.createAnswer(); await p.setLocalDescription(a);
      await updateDoc(ref, { answer: { type: a.type, sdp: a.sdp }, status: 'accepted', answeredAt: serverTimestamp() });
      unsubs.current.push(listen(c.id, 'callerCandidates'));
      unsubs.current.push(onSnapshot(ref, snap => { if (snap.data()?.status === 'ended') cleanup(); }));
    } catch (e) { updateDoc(ref, { status: 'declined' }).catch(() => {}); fail(e); cleanup(); }
  }
  const decline = () => { if (inc) updateDoc(doc(db, 'calls', inc.id), { status: 'declined' }).catch(() => {}); setInc(null); };
  const mute = () => { const m = !actRef.current!.muted; local.current?.getAudioTracks().forEach(x => (x.enabled = !m)); setAct(a => a && { ...a, muted: m }); };
  const cam = () => { const off = !actRef.current!.camOff; local.current?.getVideoTracks().forEach(x => (x.enabled = !off)); setAct(a => a && { ...a, camOff: off }); };
  async function flip() { const cur = local.current?.getVideoTracks()[0]; if (!cur) return; const mode = cur.getSettings().facingMode === 'environment' ? 'user' : 'environment';
    try { const nt = (await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } })).getVideoTracks()[0]; await pc.current?.getSenders().find(s => s.track?.kind === 'video')?.replaceTrack(nt);
      local.current?.removeTrack(cur); cur.stop(); local.current?.addTrack(nt); if (lv.current) lv.current.srcObject = local.current; } catch {} }

  const nf = new Intl.NumberFormat(lang, { minimumIntegerDigits: 2 });
  const clock = (n: number) => `${nf.format(Math.floor(n / 60))}:${nf.format(n % 60)}`;
  const status = act ? t(act.phase === 'calling' ? 'call.calling' : act.phase === 'connecting' ? 'call.connecting' : act.phase === 'reconnecting' ? 'call.reconnecting' : 'call.connected') : '';
  const avatar = (n: string) => <span className="callav">{(n || '?').slice(0, 1)}</span>;
  return (<Ctx.Provider value={{ start }}>{children}
    {err && !act && !inc && <div className="callerr" role="alert">{err}<button onClick={() => setErr('')} aria-label={t('common.close')}>✕</button></div>}
    {inc && <div className="callov" role="dialog">{avatar(inc.callerName)}<h2 dir="auto">{inc.callerName}</h2><p className="sub">{t(inc.type === 'video' ? 'call.incomingVideo' : 'call.incoming')}</p>
      <div className="callrow"><button className="cbtn red" onClick={decline} aria-label={t('call.decline')}>✕</button><button className="cbtn green" onClick={accept} aria-label={t('call.accept')}>✓</button></div></div>}
    {act && <div className="callov">
      <video ref={rv} autoPlay playsInline style={act.type === 'video' ? { position: 'absolute', inset: 0, inlineSize: '100%', blockSize: '100%', objectFit: 'cover' } : { position: 'absolute', opacity: 0, inlineSize: 1, blockSize: 1 }} />
      {act.type === 'video' && <video ref={lv} autoPlay playsInline muted style={{ position: 'absolute', insetBlockStart: 'calc(16px + env(safe-area-inset-top))', insetInlineEnd: 16, inlineSize: 96, blockSize: 140, objectFit: 'cover', borderRadius: 12, border: '1px solid var(--gold)' }} />}
      <div style={{ position: 'relative', display: 'grid', justifyItems: 'center', gap: 8 }}>{act.type === 'voice' && avatar(act.peerName)}<h2 dir="auto">{act.peerName}</h2>
        <p className="sub">{status}</p>{act.phase === 'connected' && <p dir="ltr">{clock(act.secs)}</p>}
        {act.type === 'voice' && act.phase === 'connected' && <div className="wave" aria-hidden>{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ animationDelay: (i % 8) * 0.11 + 's' }} />)}</div>}</div>
      <div className="callrow" style={{ position: 'absolute', insetBlockEnd: 'calc(32px + env(safe-area-inset-bottom))' }}>
        <button className="cbtn" onClick={mute} aria-pressed={act.muted} aria-label={t(act.muted ? 'call.unmute' : 'call.mute')}>{act.muted ? '🔇' : '🎙'}</button>
        <button className="cbtn red" onClick={hangup} aria-label={t('call.end')}>✕</button>
        {act.type === 'video' && <><button className="cbtn" onClick={cam} aria-pressed={act.camOff} aria-label={t(act.camOff ? 'call.camOn' : 'call.camOff')}>{act.camOff ? '🚫' : '📹'}</button><button className="cbtn" onClick={flip} aria-label={t('call.flip')}>🔄</button></>}</div></div>}
  </Ctx.Provider>);
}
