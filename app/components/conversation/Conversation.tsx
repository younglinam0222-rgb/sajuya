'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSession, signIn } from 'next-auth/react';
import { v4 as uuid } from 'uuid';
import { CHAT_GUIDES } from '@/lib/chat-flow';
import { conversationRoom, readConversation, type ConversationInput, type ConversationTurn } from '@/lib/conversation';
import YeopjeunShop from '@/app/components/YeopjeunShop';
import './conversation.css';
type State = {
    enabled: boolean;
    freeAvailable: boolean;
    cost: number | null;
    balance: number;
    remaining: number;
    profiles: {
        id: string;
        label: string;
    }[];
    turns: ConversationTurn[];
};
type InitialSelection = { initialGuide?: string; initialSource?: string };
export default function Conversation(selection: InitialSelection) {
    const { data: session, status } = useSession();
    if (status === 'loading') return <main className="cn-page"><p role="status">로그인 정보를 확인하고 있어요.</p></main>;
    const account = (session?.user as { id?: string; email?: string } | undefined);
    const key = JSON.stringify([account?.id ?? account?.email ?? status, selection.initialGuide, selection.initialSource]);
    return <ConversationSession key={key} {...selection} authenticated={status === 'authenticated'} />;
}
function ConversationSession({ initialGuide, initialSource, authenticated }: InitialSelection & { authenticated: boolean }) {
    const selectedGuide = CHAT_GUIDES.find(g => g.id === initialGuide?.toLowerCase());
    const [shop, setShop] = useState(false);
    const refreshVersion = useRef(0), refreshController = useRef<AbortController | null>(null);
    const [data, setData] = useState<State | null>(null);
    const [source, setSource] = useState(() => initialSource && /^[\w-]{1,80}$/.test(initialSource) ? initialSource : '');
    const [guide, setGuide] = useState<string>(selectedGuide?.id ?? 'baekhalma');
    const [open, setOpen] = useState(!!selectedGuide), [draft, setDraft] = useState(''), [busy, setBusy] = useState(false);
    const [error, setError] = useState(''), [waiting, setWaiting] = useState(0), [pendingText, setPendingText] = useState('');
    const [modal, setModal] = useState(false), [consent, setConsent] = useState(false), [loading, setLoading] = useState(authenticated);
    const end = useRef<HTMLDivElement>(null), pay = useRef<HTMLDialogElement>(null), pending = useRef<ConversationInput | null>(null), sending = useRef(false), input = useRef<HTMLTextAreaElement>(null), mounted = useRef(true);
    const character = CHAT_GUIDES.find(g => g.id === guide)!, roomId = conversationRoom(source, guide), turns = data?.turns.filter(t => t.roomId === roomId) || [];
    const refresh = useCallback((): Promise<State | null> => {
        if (!authenticated || !mounted.current) return Promise.resolve(null);
        const version = ++refreshVersion.current;
        refreshController.current?.abort();
        const controller = new AbortController();
        refreshController.current = controller;
        let sourceChanged = false;
        return fetch('/api/conversation' + (source ? '?sourceId=' + encodeURIComponent(source) + '&characterId=' + guide : ''), { signal: controller.signal, cache: 'no-store' })
            .then(async response => {
                const body = await response.json();
                if (!response.ok) throw Error(body.error || '대화를 불러오지 못했어요.');
                return body as State;
            })
            .then(latest => {
                if (!mounted.current || version !== refreshVersion.current) return null;
                const nextSource = latest.profiles.some(p => p.id === source) ? source : latest.profiles[0]?.id || '';
                sourceChanged = nextSource !== source;
                setData(latest);
                if (sourceChanged) { setLoading(true); setSource(nextSource); }
                return latest;
            })
            .catch(e => {
                if (mounted.current && version === refreshVersion.current && !controller.signal.aborted)
                    setError(e instanceof Error ? e.message : '대화를 불러오지 못했어요.');
                return null;
            })
            .finally(() => {
                if (mounted.current && version === refreshVersion.current && !controller.signal.aborted && !sourceChanged) setLoading(false);
            });
    }, [authenticated, source, guide]);
    function reload() { setLoading(true); return refresh(); }
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; refreshController.current?.abort(); }; }, []);
    useEffect(() => { if (authenticated) void refresh(); }, [authenticated, refresh]);
    useEffect(() => { if (modal) pay.current?.showModal(); else pay.current?.close(); }, [modal]);
    useEffect(() => { if (!busy) return; const t = setInterval(() => setWaiting(n => n + 1), 1000); return () => clearInterval(t); }, [busy]);
    useEffect(() => { end.current?.scrollIntoView({ block: 'end', behavior: 'auto' }); }, [turns.length, open, pendingText, error]);
    function changeSource(nextSource: string) {
        if (nextSource !== source) { ++refreshVersion.current; refreshController.current?.abort(); setLoading(authenticated); setSource(nextSource); }
        pending.current = null;
    }
    function enter(g: string) {
        if (g !== guide) { ++refreshVersion.current; refreshController.current?.abort(); setLoading(authenticated); setGuide(g); }
        setOpen(true); setDraft(''); setError(''); pending.current = null;
    }
    function closePay() { setModal(false); setConsent(false); input.current?.focus(); }
    async function send(maxCoins: 0 | 1) {
        if (!authenticated || loading || sending.current || !draft.trim() || !source || !data?.enabled || data.remaining <= 0) return;
        sending.current = true;
        setWaiting(0);
        setBusy(true);
        setPendingText(draft.trim());
        setError('');
        setModal(false);
        const request = pending.current || { sourceId: source, characterId: guide, message: draft.trim(), previousId: turns.at(-1)?.id || null, requestId: uuid(), maxCoins, consent: true };
        pending.current = request;
        try {
            const r = await fetch('/api/conversation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request) });
            if (!mounted.current) return;
            if (!r.ok) {
                const j = await r.json();
                if (r.status === 402 || (r.status === 409 && j.code !== 'GENERATION_PENDING')) { pending.current = null; await reload(); }
                throw Error(j.error || '답변을 받지 못했어요.');
            }
            const wire = await r.text();
            if (!mounted.current) return;
            let text = '', done = false;
            for (const line of wire.split('\n')) if (line.startsWith('data: ')) {
                const v = line.slice(6).trim();
                if (v === '[DONE]') { done = true; continue; }
                const item = JSON.parse(v);
                if (item.type === 'error') throw Error('답변 생성에 실패했어요.');
                if (typeof item.text === 'string') text += item.text;
            }
            if (!done) throw Error('연결이 끊겼어요. 같은 질문으로 다시 확인해주세요.');
            readConversation(text);
            const latest = await reload();
            if (!mounted.current) return;
            if (!latest) throw Error('답변은 처리됐지만 대화 기록을 불러오지 못했어요. 같은 요청으로 다시 확인해주세요.');
            setDraft(''); pending.current = null; setPendingText('');
        } catch (e) {
            if (mounted.current) { setError(e instanceof Error ? e.message : '대화를 이어가지 못했어요.'); setPendingText(''); }
        } finally {
            sending.current = false;
            if (mounted.current) { setBusy(false); setConsent(false); }
        }
    }
    function requestSend() {
        if (!authenticated || loading || !data?.enabled || !draft.trim() || busy) return;
        if (pending.current) { void send(pending.current.maxCoins); return; }
        if (data.freeAvailable) void send(0);
        else { setConsent(false); setModal(true); }
    }
    const suggestions = turns.at(-1)?.answer.suggestions || ['지금 하는 일을 더 키워도 될까?', '요즘 마음이 복잡한데 무엇부터 정리할까?'];
    const login = <section className="cn-login"><h2>내 사주를 아는 대화</h2><p>{'로그인하고 저장된 사주를 연결하면, 궁금한 것을 바로 물어볼 수 있어요.'}</p>{<div><button onClick={() => signIn('kakao', {callbackUrl: window.location.pathname + window.location.search})}>카카오로 시작하기</button><button onClick={() => signIn('naver', {callbackUrl: window.location.pathname + window.location.search})}>네이버로 시작하기</button></div>}</section>;
    return <main className={'cn-page' + (open ? ' cn-room' : '')}>
 {!open ? <><header className="cn-top"><Link href="/">← 사주궁</Link><span>1:1 대화</span></header><div className="cn-lobby"><p className="cn-eyebrow">말을 건네면, 이야기가 시작돼요.</p><h1>누구와 1:1 대화할까요?</h1><p className="cn-lead">정해진 질문 없이, 지금 마음에 걸리는 것을 물어보세요.</p>{!authenticated ? login : <><aside className="cn-ticket"><span>첫 대화 이용권</span><b>{!data ? '이용 정보를 확인하고 있어요' : data.freeAvailable ? '답변 1회 무료' : '첫 무료 답변을 사용했어요'}</b><p>계정당 최초 1회 · 네 캐릭터 공통</p></aside>{data?.profiles.length ? <label className="cn-profile">대화에 연결할 사주<select value={source} onChange={e => changeSource(e.target.value)}>{data.profiles.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label> : <p className="cn-notice">{loading ? '내 사주를 확인하고 있어요.' : <>먼저 <Link href="/daily">일일운세</Link> 또는 <Link href="/saju">사주 풀이</Link>를 받아주세요.</>}</p>}</>}
 <div className="cn-guides">{CHAT_GUIDES.map(g => { const last = data?.turns.filter(t => t.sourceId === source && t.characterId === g.id).at(-1); return <button key={g.id} onClick={() => enter(g.id)}><img src={'/characters/' + g.id + '.png'} alt=""/><div><h2>{g.name}</h2><p>{last?.answer.memo || g.intro}</p><span>{last ? '이어서 대화하기' : '새로운 이야기 시작'}</span></div><span aria-hidden="true">›</span></button>; })}</div><Link className="cn-guided-link" href="/consultation"><span>무엇을 물어볼지 막막하다면</span><b>24개 주제에서 골라 상담하기 →</b></Link>{error && <p className="cn-error" role="alert">{error}<button onClick={() => void reload()}>다시 불러오기</button></p>}</div></> : <>
 <header className="cn-room-head"><button disabled={busy} onClick={() => { setOpen(false); setError(''); }} aria-label="대화방 목록으로">‹</button><img src={'/characters/' + guide + '.png'} alt=""/><div><h1>{character.name}</h1><span>사주를 바탕으로 함께 생각하는 가상 안내자</span></div></header>
 <div className="cn-balance"><span>첫 무료 <b>{!data ? '—' : data.freeAvailable ? '1' : '0'}/1</b></span><span>{'보유 엽전'} <b>{data?.balance || 0}냥</b></span><button disabled={busy || loading} onClick={() => void reload()} aria-label="대화 새로 불러오기">↻</button></div>
 <div className="cn-messages" role="log" aria-label="상담 대화" aria-live="polite" aria-relevant="additions text">

 {!authenticated ? login : <><p className="cn-date">{new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}</p><div className="cn-assistant"><img src={'/characters/' + guide + '.png'} alt=""/><div><p className="cn-bubble">{character.intro}<br />지금 가장 궁금한 건 뭐예요?</p></div></div>{!data && <p className="cn-notice" role="status">이용 정보를 확인하고 있어요.</p>}{data && !data.profiles.length && <p className="cn-notice">대화에 연결할 사주가 없어요. <Link href="/daily">일일운세 받기</Link> 또는 <Link href="/saju">사주 풀이 받기</Link>에서 먼저 사주를 저장해주세요.</p>}{data && !turns.length && <div className="cn-first-free">{data?.freeAvailable ? '첫 질문의 답변은 무료예요. 그다음 답변은 전송 전에 이용 조건을 확인해요.' : '다른 안내자와 첫 무료 대화를 나눴어요. 이 방의 다음 답변도 전송 전에 이용 조건을 확인해요.'}</div>}
 {turns.map((t, i) => <section className="cn-turn" key={t.id}><div className="cn-user"><p>{t.message}</p><time>{new Date(t.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</time></div><div className="cn-assistant"><img src={'/characters/' + guide + '.png'} alt={character.short}/><div className="cn-reply"><aside className="cn-memo"><span>{character.short}의 메모{''}</span><strong>{t.answer.memo}</strong><small>{'저장된 사주 원국과 최근 대화를 참고했어요.'}</small></aside>{t.answer.paragraphs.map((p, n) => <p key={n} className="cn-bubble">{p}</p>)}{t.answer.recommendation === 'saju' && i === turns.length - 1 && <Link className="cn-product" href="/saju"><span>더 넓게 돌아보고 싶다면</span><b>사주 전체 해석 →</b><small>12개 해석 · 인생 전략 · 새 풀이 유료</small></Link>}<span className="cn-turn-status">{t.free ? '첫 무료 답변' : '유료 답변'}{''} · 저장됨</span></div></div></section>)}
 {pendingText && <div className="cn-user"><p>{pendingText}</p></div>}{busy && <div className="cn-typing" role="status"><span>•••</span><p>{waiting < 35 ? `${character.short}가 답변을 준비하고 있어요.` : '조금 더 걸리고 있어요. 완료한 답변은 대화에 저장돼요.'}<small>{waiting}초 경과</small></p></div>}
 {error && <div className="cn-error" role="alert"><b>대화를 이어가지 못했어요.</b><p>{error}</p><button disabled={busy} onClick={requestSend}>같은 질문으로 다시 확인</button><button disabled={busy} onClick={() => void reload()}>저장된 대화 확인</button></div>}
 {!data?.enabled && data && <p className="cn-notice">실제 대화 연결을 준비 중입니다. 저장된 대화는 다시 볼 수 있어요.</p>}
 <div ref={end}/></>}
 </div>
 <footer className="cn-composer"><div className="cn-suggestions" aria-label="이어서 물어볼 질문">{suggestions.map(s => <button disabled={busy} key={s} onClick={() => { setDraft(s); pending.current = null; setError(''); input.current?.focus(); }}>{s}<span>↗</span></button>)}</div><span className="cn-connected">{data?.profiles.find(p => p.id === source)?.label || '연결할 사주를 선택해주세요'}</span><form onSubmit={e => { e.preventDefault(); requestSend(); }}><textarea ref={input} value={draft} disabled={busy} maxLength={800} rows={2} placeholder="궁금한 것을 편하게 물어보세요" aria-label="대화 질문" onChange={e => { setDraft(e.target.value); pending.current = null; setError(''); }}/><button type="submit" disabled={!draft.trim() || busy || loading || !authenticated || !source || !data?.enabled || data.remaining <= 0} aria-label="질문 보내기">↑</button></form><div className="cn-composer-meta"><span>{!data ? '이용 정보 확인 후 질문을 보낼 수 있어요.' : data.remaining === 0 ? '오늘 대화 한도에 도달했어요.' : data?.freeAvailable ? '첫 답변 무료' : `다음 답변 ${data?.cost ?? '—'}냥 · 전송 전 확인`}</span><span>{draft.length}/800</span></div></footer>
 </>}
 <dialog ref={pay} className="cn-pay" onCancel={closePay} aria-labelledby="cn-pay-title"><button className="cn-close" onClick={closePay} aria-label="이용 확인 닫기">×</button><span>이야기를 이어가기 전에</span><h2 id="cn-pay-title">다음 답변은 유료예요.</h2><p>첫 무료 답변을 사용했어요. 질문 1개에 대한 답변 1건을 받습니다.</p><div className="cn-pay-price"><span>답변 1건</span><b>{`${data?.cost ?? '—'}냥`}</b></div><p className="cn-pay-small">{'저장된 대화 다시보기는 무료입니다. 실패한 생성의 예약 엽전은 복구합니다.'}</p>{(data?.balance || 0) < 1 ? <>{<button className="cn-primary" onClick={() => { closePay(); setShop(true); }}>엽전 충전하기</button>}</> : <><label><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}/><span>{'1냥 사용 및 AI 답변 제공, 이용약관의 환불 기준을 확인했어요.'} {<Link href="/terms#refund">환불 기준</Link>}</span></label><button className="cn-primary" disabled={!consent || busy} onClick={() => void send(1)}>1냥으로 답변 받기{''}</button></>}<button className="cn-cancel" onClick={closePay}>지금은 그만하기</button></dialog>

 {shop && <YeopjeunShop currentBalance={data?.balance || 0} onClose={() => { setShop(false); void reload(); }}/>}</main>;
}
