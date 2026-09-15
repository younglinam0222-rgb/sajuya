'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSession, signIn } from 'next-auth/react';
import { v4 as uuid } from 'uuid';
import { CHAT_GROUPS, CHAT_GUIDES, CHAT_TOPICS, chatQuestions, readChatAnswer, type ChatAnswer, type ChatInput } from '@/lib/chat-flow';
import { formatHeldNyang, formatNyang } from '@/lib/nyangDisplay';
import './consultation.css';
type RecordItem = {
    id: string;
    topicId: string;
    characterId: string;
    answers: string[];
    note?: string;
    createdAt: string;
    result: ChatAnswer;
};
type Config = {
    enabled: boolean;
    cost: number | null;
    balance: number;
    remaining: number;
    profiles: {
        id: string;
        label: string;
    }[];
    records: RecordItem[];
};
type InitialSelection = { initialGuide?: string; initialSource?: string };
export default function Consultation(selection: InitialSelection) {
    const { data: session, status } = useSession();
    if (status === 'loading') return <main className="cs-page"><p role="status">로그인 정보를 확인하고 있어요.</p></main>;
    const account = (session?.user as { id?: string; email?: string } | undefined);
    const key = JSON.stringify([account?.id ?? account?.email ?? status, selection.initialGuide, selection.initialSource]);
    return <ConsultationSession key={key} {...selection} authenticated={status === 'authenticated'} />;
}
function ConsultationSession({ initialGuide, initialSource, authenticated }: InitialSelection & { authenticated: boolean }) {
    const [config, setConfig] = useState<Config | null>(null), [tab, setTab] = useState<'chat' | 'history'>('chat');
    const [guide, setGuide] = useState<string>(() => CHAT_GUIDES.find(g => g.id === initialGuide?.toLowerCase())?.id ?? 'baekhalma');
    const [group, setGroup] = useState<string>('연애·인연'), [topicId, setTopicId] = useState('');
    const [sourceId, setSourceId] = useState(() => initialSource && /^[\w-]{1,80}$/.test(initialSource) ? initialSource : '');
    const [step, setStep] = useState(0), [answers, setAnswers] = useState<string[]>([]), [note, setNote] = useState(''), [consent, setConsent] = useState(false);
    const [busy, setBusy] = useState(false), [elapsed, setElapsed] = useState(0), [error, setError] = useState(''), [loading, setLoading] = useState(authenticated), [result, setResult] = useState<ChatAnswer | null>(null);
    const request = useRef(uuid()), lock = useRef(false), heading = useRef<HTMLHeadingElement>(null), topic = CHAT_TOPICS.find(t => t.id === topicId), character = CHAT_GUIDES.find(g => g.id === guide) || CHAT_GUIDES[0];
    const mounted = useRef(true), refreshVersion = useRef(0), refreshController = useRef<AbortController | null>(null);
    const questions = topic ? chatQuestions(topic, answers) : [], question = questions[step - 1];
    const refresh = useCallback((): Promise<void> => {
        if (!authenticated || !mounted.current) return Promise.resolve();
        const version = ++refreshVersion.current;
        refreshController.current?.abort();
        const controller = new AbortController();
        refreshController.current = controller;
        return fetch('/api/chat', { signal: controller.signal, cache: 'no-store' })
            .then(async response => {
                const body = await response.json();
                if (!response.ok) throw Error(body.error || '상담 정보를 불러오지 못했어요.');
                return body as Config;
            })
            .then(latest => {
                if (!mounted.current || version !== refreshVersion.current) return;
                setConfig(latest);
                setSourceId(old => latest.profiles.some(p => p.id === old) ? old : latest.profiles[0]?.id || '');
            })
            .catch(e => {
                if (mounted.current && version === refreshVersion.current && !controller.signal.aborted)
                    setError(e instanceof Error ? e.message : '상담 정보를 불러오지 못했어요.');
            })
            .finally(() => {
                if (mounted.current && version === refreshVersion.current && !controller.signal.aborted) setLoading(false);
            });
    }, [authenticated]);
    function reload() { setLoading(true); return refresh(); }
    useEffect(() => { mounted.current = true; return () => { mounted.current = false; refreshController.current?.abort(); }; }, []);
    useEffect(() => { if (authenticated) void refresh(); }, [authenticated, refresh]);
    useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [step, tab]);
    useEffect(() => { if (!busy) return; const id = setInterval(() => setElapsed(s => s + 1), 1000); return () => clearInterval(id); }, [busy]);
    function change() { request.current = uuid(); setConsent(false); setError(''); setResult(null); }
    function restart() { change(); setStep(0); setAnswers([]); setTopicId(''); setNote(''); setTab('chat'); }
    function previous() { if (busy)
        return; change(); setStep(s => Math.max(0, s - 1)); }
    async function submit() {
        if (!authenticated || loading || lock.current || !topic || answers.length !== 3 || !consent || !config?.enabled || config.remaining <= 0)
            return;
        lock.current = true;
        setElapsed(0);
        setBusy(true);
        setError('');
        try {
            const input: ChatInput = { topicId, answers, characterId: guide, sourceId, note: note.trim(), requestId: request.current, consent };
            const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
            if (!mounted.current) return;
            if (!r.ok) {
                const e = await r.json();
                throw Error(e.error || '답변을 받지 못했어요.');
            }
            const wire = await r.text();
            if (!mounted.current) return;
            let text = '', done = false;
            for (const line of wire.split('\n'))
                if (line.startsWith('data: ')) {
                    const raw = line.slice(6).trim();
                    if (raw === '[DONE]') {
                        done = true;
                        continue;
                    }
                    const event = JSON.parse(raw);
                    if (event.type === 'error')
                        throw Error('답변 생성에 실패했어요.');
                    if (typeof event.text === 'string')
                        text += event.text;
                }
            if (!done)
                throw Error('연결이 끊겼어요. 같은 요청으로 다시 확인해주세요.');
            setResult(readChatAnswer(text));
            setStep(4);
            void reload();
        }
        catch (e) {
            if (mounted.current) setError(e instanceof Error ? e.message : '답변을 불러오지 못했어요.');
        }
        finally {
            lock.current = false;
            if (mounted.current) setBusy(false);
        }
    }
    function openRecord(r: RecordItem) { setGuide(r.characterId); setTopicId(r.topicId); setAnswers(r.answers); setNote(r.note || ''); setResult(r.result); setTab('chat'); setStep(4); setError(''); }
    const canContinue = step === 0 ? !!topic && !!sourceId && authenticated : !!answers[step - 1];
    return <main className="cs-page"><header className="cs-top"><Link href="/" aria-label="사주궁 홈으로">← 사주궁</Link><span>一對一 · 마음을 묻는 방</span></header>
 <div className="cs-guide"><img src={'/characters/' + guide + '.png'} alt={character.name}/><div><span>당신의 이야기를 듣는</span><h1>{character.name}</h1><p>{character.intro}</p></div></div>
 <div className="cs-tabs" role="group" aria-label="상담 화면"><button aria-pressed={tab === 'chat'} onClick={() => setTab('chat')}>주제 선택 상담</button><button disabled={busy} aria-pressed={tab === 'history'} onClick={() => { setTab('history'); void reload(); }}>내 상담 기록 {config?.records.length ? `(${config.records.length})` : ''}</button></div>
 <div className="cs-body">
 {!authenticated && <section className="cs-auth"><h2>내 사주로 이야기를 이어가요.</h2><p>{'로그인하면 저장된 사주를 선택해 상담하고, 답변을 다시 읽을 수 있어요.'}</p>{<div className="cs-actions"><button onClick={() => signIn('kakao', {callbackUrl: window.location.pathname + window.location.search})}>카카오로 로그인</button><button onClick={() => signIn('naver', {callbackUrl: window.location.pathname + window.location.search})}>네이버로 로그인</button></div>}</section>}
 {loading && !config && <p role="status">내 상담 정보를 불러오고 있어요.</p>}
 {config && !config.enabled && <aside className="cs-alert">상담 이용 설정을 준비 중입니다. 저장된 상담은 다시 볼 수 있어요.</aside>}
 {config && !config.profiles.length && <aside className="cs-alert">연결할 사주가 아직 없어요. <Link href="/daily">일일운세</Link> 또는 <Link href="/saju">사주 풀이</Link>를 먼저 받아주세요.</aside>}
 {tab === 'history' ? <section><h2 className="cs-title" ref={heading} tabIndex={-1}>나에게 남겨진 이야기</h2><p className="cs-muted">{'내 계정에 저장된 최근 상담입니다.'} 다시 읽어도 엽전을 사용하지 않아요.</p>{config?.records.length ? <div className="cs-history">{config.records.map(r => <button key={r.id} onClick={() => openRecord(r)}><span>{CHAT_GUIDES.find(g => g.id === r.characterId)?.short} · {new Date(r.createdAt).toLocaleDateString('ko-KR')}</span><b>{CHAT_TOPICS.find(t => t.id === r.topicId)?.title || '나의 상담'}</b><p>{r.result.summary}</p><small>상담 다시 읽기 →</small></button>)}</div> : <div className="cs-empty"><p>아직 나눈 이야기가 없어요.</p><button className="cs-primary" onClick={() => setTab('chat')}>첫 상담 시작하기</button></div>}</section> : <>
 <ol className="cs-progress" aria-label="상담 진행 단계">{['주제', '상황', '관심', '시점', '답변'].map((s, i) => <li key={s} aria-current={step === i ? 'step' : undefined} className={i < step ? 'done' : ''}><span>{i < step ? '✓' : i + 1}</span>{s}</li>)}</ol>
 {step === 0 && <><div className="cs-section-title"><span>01 / 05</span><h2 className="cs-title" ref={heading} tabIndex={-1}>어떤 이야기를 나눌까요?</h2><p>마음에 걸리는 주제 하나를 골라주세요.</p></div><fieldset className="cs-characters"><legend>이야기를 나눌 안내자</legend>{CHAT_GUIDES.map(g => <button key={g.id} aria-pressed={g.id === guide} onClick={() => { setGuide(g.id); change(); }}><img src={'/characters/' + g.id + '.png'} alt=""/><span>{g.short}</span></button>)}</fieldset>{config?.profiles.length ? <label className="cs-label">상담에 사용할 사주<select value={sourceId} onChange={e => { setSourceId(e.target.value); change(); }}>{config.profiles.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label> : null}
 <div className="cs-groups" role="group" aria-label="상담 주제 분류">{CHAT_GROUPS.map(g => <button key={g} aria-pressed={group === g} onClick={() => setGroup(g)}>{g}</button>)}</div><div className="cs-topics" role="group" aria-label="상담 주제">{CHAT_TOPICS.filter(t => t.group === group).map(t => <button key={t.id} aria-pressed={topicId === t.id} onClick={() => { setTopicId(t.id); setAnswers([]); change(); }}><span>{t.title}</span><span aria-hidden="true">{t.id === topicId ? '✓' : '↗'}</span></button>)}</div><p className="cs-muted">6가지 분야 · 24개 주제 · 선택을 마치면 답변을 드려요.</p>{topic && <p className="cs-selection">선택한 이야기 · <b>{topic.title}</b></p>}</>}
 {step > 0 && step < 4 && topic && <><div className="cs-context"><span>{topic.title}</span>{answers.slice(0, step - 1).map((a, i) => <p key={i}>{a}</p>)}</div><div className="cs-section-title"><span>0{step + 1} / 05</span><h2 className="cs-title" ref={heading} tabIndex={-1}>{question.text}</h2><p>가장 가까운 답을 하나 골라주세요.</p></div><div className="cs-options" role="group" aria-label={question.text}>{question.options.map((a, i) => <button disabled={busy} aria-pressed={answers[step - 1] === a} key={a} onClick={() => { setAnswers(old => [...old.slice(0, step - 1), a]); change(); }}><span className="cs-option-index">0{i + 1}</span><span>{a}</span><span aria-hidden="true">{answers[step - 1] === a ? '✓' : '+'}</span></button>)}</div>{step === 3 && <div className="cs-confirm"><label className="cs-label">조금 더 들려주고 싶은 말 <span>(선택)</span><textarea disabled={busy} value={note} maxLength={300} placeholder="지금 고민을 짧게 적어주세요. 연락처 등은 적지 않아도 돼요." onChange={e => { setNote(e.target.value); change(); }}/><small>{note.length} / 300자</small></label><div className="cs-receipt"><span>상담 결과 1건</span><b>{config?.cost ? formatNyang(config.cost) : '이용 설정 준비 중'}</b><small>선택 수정은 무료 · 결과 다시보기 무료</small></div><label className="cs-consent"><input disabled={busy} type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}/><span>{`답변 생성에 ${config?.cost != null ? formatNyang(config.cost) : '안내된 수량'}을 사용하며, AI 해석 제공 및 이용약관의 환불 기준을 확인했어요.`} {<Link href="/terms#refund">환불 기준</Link>}</span></label></div>}</>}
 {busy && <div className="cs-wait" role="status"><img src={'/characters/' + guide + '.png'} alt=""/><div><b>{elapsed < 15 ? '선택한 이야기를 살펴보고 있어요.' : '당신의 사주와 고민을 함께 읽고 있어요.'}</b><p>{elapsed < 40 ? '상담 답변을 준비 중입니다.' : '조금 더 걸리고 있어요. 완료된 답변은 상담 기록에 저장됩니다.'}</p><span>{elapsed}초 경과</span></div></div>}
 {step === 4 && result && <section className="cs-result"><span className="cs-result-label">{topic?.title} · 상담 답변{''}</span><h2 className="cs-title" ref={heading} tabIndex={-1}>지금 당신에게 전하는 말</h2><blockquote>{result.summary}</blockquote><details className="cs-picked"><summary>내가 나눈 이야기</summary>{answers.map(a => <p key={a}>{a}</p>)}{note && <p>{note}</p>}</details>{[['해석', result.interpretation, 'reading'], ['지금 해볼 일', result.action, 'action'], ['마음에 두면 좋은 것', result.caution, 'caution']].map(([title, body, tone]) => <article key={tone} className={'cs-answer cs-' + tone}><h3>{title}</h3>{body.split('\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}</article>)}<aside className="cs-reflect"><span>나에게 남기는 질문</span><p>{result.nextQuestion}</p></aside><p className="cs-muted">사주 해석은 자신을 돌아보는 참고 이야기입니다. 건강·금전 문제의 진단이나 확정적인 예측을 제공하지 않습니다.</p><div className="cs-actions"><button className="cs-primary" onClick={restart}>다른 고민 상담하기</button><button onClick={() => setTab('history')}>내 상담 기록</button></div></section>}
 {step < 4 && !busy && <div className="cs-bottom"><div className="cs-actions">{step > 0 && <button onClick={previous}>이전 선택</button>}{step < 3 ? <button className="cs-primary" disabled={!canContinue} onClick={() => { setStep(s => s + 1); setError(''); }}>다음 질문 →</button> : <button className="cs-primary" disabled={!canContinue || loading || !consent || !config?.enabled || config.remaining <= 0} onClick={submit}>{error ? '같은 요청으로 다시 확인' : '상담 답변 받기'}</button>}</div>{config && <p>{formatHeldNyang(config.balance)} · 오늘 남은 상담 {config.remaining}회{config.remaining <= 0 ? ' · 다음 날 다시 이용해주세요.' : ''}</p>}</div>}
 </>}
 {error && <div className="cs-error" role="alert"><b>확인이 필요해요.</b><p>{error}</p><p>완료된 답변은 기록에서 먼저 확인하세요. 같은 요청의 중복 차감을 막습니다.</p><button onClick={() => { void reload(); setTab('history'); }}>상담 기록 확인</button></div>}

 </div><footer className="cs-footer">사주궁 · {'내 상담은 내 계정에서만 확인합니다.'}</footer></main>;
}
