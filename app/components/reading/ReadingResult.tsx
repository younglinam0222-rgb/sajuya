'use client'

import { useState, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { sanitizeText } from '@/lib/sajuSanitize'
import { PEAK_GUIDE_LABEL } from '@/lib/sajuContract'
import './results.css'
import './approved-b.css'

export interface ReadingPillar {
  stem?: string; branch?: string; stemKr?: string; branchKr?: string
  stemElement?: string; branchElement?: string; sipsinStem?: string; sipsinBranch?: string
}
export interface ReadingManse {
  yearPillar?: ReadingPillar | null; monthPillar?: ReadingPillar | null
  dayPillar?: ReadingPillar | null; hourPillar?: ReadingPillar | null
  elementCount?: Record<string, number>; animal?: string; hourStr?: string; todayPillar?: ReadingPillar | null
}
export interface ReadingSection {
  id: string; title: string; body?: string; note?: string; content?: ReactNode; core?: boolean; category?: string
}
export interface ReadingTitle { id: string; title: string; content: string; category?: string; teaser?: string }
export interface ReadingLifecycle { age: string; score: number; season: string; desc: string }
export interface ReadingStrategy {
  overview?: string; golden_period?: string; lifecycle?: ReadingLifecycle[]
  peak_guide?: string; warning?: string; final_word?: string
}
const elementTone: Record<string, string> = { '木': 'wood', '火': 'fire', '土': 'earth', '金': 'metal', '水': 'water' }
const characterNames: Record<string, string> = {
  baekhalma: '건물주 백할매', doryeong: '근본도령', gumiho: '구미호 선생', sinryeong: '무등산 신령님',
}
const columns = [
  ['시주', 'hourPillar'], ['일주', 'dayPillar'], ['월주', 'monthPillar'], ['연주', 'yearPillar'],
] as const

export function Pillars({ data }: { data: ReadingManse }) {
  return <section className="rr-pillar rr-origin" aria-label="사주 원국">
    <header><h2>나의 사주 원국</h2><span>만세력</span></header>
    <div className="rr-origin-grid">
      {columns.map(([label, key]) => <div className="rr-origin-label" key={key}>{label}</div>)}
      {(['stem', 'branch'] as const).map(part => columns.map(([label, key]) => {
        const pillar = data[key]
        const element = pillar?.[part === 'stem' ? 'stemElement' : 'branchElement']
        return <div className={`rr-origin-cell rr-element-${elementTone[element ?? ''] ?? 'unknown'}`} key={key + part}>
          {pillar ? <><b>{pillar[part] || '—'}</b><span>{pillar[part === 'stem' ? 'stemKr' : 'branchKr']}</span>
            <small>{element}</small><small>{pillar[part === 'stem' ? 'sipsinStem' : 'sipsinBranch']}</small></>
            : <><b className="rr-unknown-mark">—</b><span>{label === '시주' ? '시간 미입력' : '정보 없음'}</span></>}
        </div>
      }))}
    </div>
    {data.elementCount && <div className="rr-elements">{Object.entries(data.elementCount).map(([key, value]) =>
      <span className={`rr-element-${elementTone[key] ?? 'unknown'}`} key={key}><b>{key}</b><small>{value}개</small></span>)}</div>}
    {data.todayPillar && <p className="rr-time-note">오늘 일진 · {data.todayPillar.stem}{data.todayPillar.branch} {data.todayPillar.stemKr}{data.todayPillar.branchKr}</p>}
    {(data.hourStr || data.animal) && <p className="rr-time-note">{[data.animal ? `${data.animal}띠` : '', data.hourStr ? `출생 시각 · ${data.hourStr}` : ''].filter(Boolean).join(' · ')}</p>}
  </section>
}

export function Lifecycle({ items }: { items: ReadingLifecycle[] }) {
  return <div className="rr-lifecycle">
    <div className="rr-life-chart" role="img" aria-label={items.map(item => `${item.age} ${item.score}점`).join(', ')}>
      {items.map((item, index) => <div key={`${item.age}-${index}`}><span>{item.score}</span>
        <div className="rr-life-track"><i style={{ height: `${Math.max(0, Math.min(100, item.score))}%` }} /></div><b>{item.age}</b></div>)}
    </div>
    {items.map((item, index) => <div className="rr-life-row" key={`${item.age}-${index}`}><b>{item.age}</b><span>{item.season}</span><p>{sanitizeText(item.desc)}</p></div>)}
  </div>
}

export function sajuReadingSections({ titles, strategy, personal, pendingPersonal, finalWordLabel = '마지막 한마디' }: {
  titles: ReadingTitle[]; strategy?: ReadingStrategy | null
  personal?: { question: string; answer: string } | null; pendingPersonal?: ReactNode; finalWordLabel?: string
}): ReadingSection[] {
  const sections: ReadingSection[] = titles.map(item => ({ id: `title-${item.id}`, title: item.title, body: item.content, note: item.teaser, category: item.category, core: true }))
  if (strategy?.overview) sections.push({ id: 'overview', title: '인생의 큰 그림', body: strategy.overview })
  if (strategy?.lifecycle?.length) sections.push({ id: 'lifecycle', title: '나이대별 운의 흐름', content: <Lifecycle items={strategy.lifecycle} /> })
  if (strategy?.golden_period) sections.push({ id: 'golden_period', title: '전성기는 언제?', body: strategy.golden_period })
  if (strategy?.peak_guide) sections.push({ id: 'peak_guide', title: PEAK_GUIDE_LABEL, body: strategy.peak_guide })
  if (strategy?.warning) sections.push({ id: 'warning', title: '조심할 시기', body: strategy.warning })
  if (strategy?.final_word) sections.push({ id: 'final_word', title: finalWordLabel, body: strategy.final_word })
  if (personal?.question.trim()) sections.push({ id: 'personal', title: '나의 질문에 대한 답변', note: personal.question, body: personal.answer, content: personal.answer.trim() ? undefined : pendingPersonal })
  return sections
}

function tone(section: ReadingSection) {
  if (/warning|avoid/.test(section.id) || /조심|주의|피해야/.test(section.title)) return 'warning'
  if (section.id === 'personal') return 'question'
  if (/advice|final_word|peak_guide/.test(section.id) || /조언|한마디/.test(section.title)) return 'advice'
  return 'plain'
}

export default function ReadingResult({ title, subtitle, character = 'baekhalma', characterName, quote, sections,
  scores = [], manse, notice, children, onBack, actionLabel = '입력 화면으로', expectedCoreCount,
  pending = false, onReload, statusLabel = '나의 해석', disclaimer,
}: {
  title: string; subtitle?: string; character?: string; characterName?: string; quote?: string
  sections: ReadingSection[]; scores?: { label: string; value?: number }[]; manse?: ReadingManse | null
  notice?: ReactNode; children?: ReactNode; onBack?: () => void; actionLabel?: string
  expectedCoreCount?: number; pending?: boolean; onReload?: () => void; statusLabel?: string; disclaimer?: string
}) {
  const [large, setLarge] = useState(false)
  const core = sections.filter(section => section.core)
  const other = sections.filter(section => !section.core)
  const targetCount = expectedCoreCount ?? core.length
  const emptyCount = Math.max(0, targetCount - core.length)
  const placeholders: ReadingSection[] = Array.from({ length: emptyCount }, (_, index) => ({
    id: `missing-${index}`, title: `${core.length + index + 1}번째 해석`, core: true,
  }))
  const visible = [...core, ...placeholders, ...other]
  const missing = visible.filter(section => section.core && !section.body && !section.content).length
  const coreCount = core.length + placeholders.length
  const count = coreCount || visible.length
  const label = (section: ReadingSection, index: number) => coreCount && !section.core
    ? section.id === 'personal' ? '선택 질문' : '인생 전략 · 조언'
    : String(index + 1).padStart(2, '0')
  const normalizedCharacter = character.toLowerCase()
  const char = characterNames[normalizedCharacter] ? normalizedCharacter : 'baekhalma'
  const name = characterName || characterNames[char]
  const scoreItems = scores.filter(score => typeof score.value === 'number' && Number.isFinite(score.value))

  return <main className={`rr${large ? ' rr-large' : ''}`}>
    <div className="rr-inner">
      <header className="rr-top"><Link href="/">← 사주궁</Link><span>{statusLabel}</span></header>
      <div className="rr-cover">
        <Image src={`/characters/${char}.png`} alt={name} fill sizes="(max-width: 540px) 50vw, 370px" priority />
        <div className="rr-cover-copy"><p>{name}의 해석</p><h1>{title}</h1>{subtitle && <span>{subtitle}</span>}</div>
      </div>
      <div className="rr-content">
        {notice}
        {quote && <aside className="rr-quote"><span>오늘의 한마디</span><p>{sanitizeText(quote)}</p></aside>}
        {scoreItems.length > 0 && <section className="rr-scores" aria-label="운세 점수">{scoreItems.map(score => <div key={score.label}>
          <span>{score.label}</span><p><b>{score.value}</b><small> / 100</small></p>
          <meter min={0} max={100} value={score.value} aria-label={score.label} />
        </div>)}</section>}
        {manse && <Pillars data={manse} />}
        {missing > 0 && !pending && <aside className="rr-incomplete" role="status"><strong>{count}개 중 {missing}개 해석을 아직 받지 못했어요.</strong>
          <p>누락된 항목은 저장된 결과에서 다시 확인할 수 있어요.</p>{onReload && <button onClick={onReload}>저장된 결과 다시 확인</button>}</aside>}
        <div className="rr-reading-tools"><span>{coreCount ? '기본 해석' : '해석'} {count}편</span>
          <button type="button" aria-pressed={large} onClick={() => setLarge(value => !value)}>글자 {large ? '기본으로' : '크게'} <b>가</b></button></div>
        {visible.length > 0 && <details className="rr-toc"><summary>해석 목차 <span>원하는 이야기로 바로 이동 ↓</span></summary>
          <nav aria-label="해석 목차">{visible.map((section, index) => <a key={section.id} href={`#reading-${section.id}`} onClick={event => {
            event.preventDefault()
            const target = document.getElementById(`reading-${section.id}`)
            target?.scrollIntoView({ behavior: 'instant', block: 'start' })
            target?.focus({ preventScroll: true })
          }}><small>{label(section, index)}</small>{sanitizeText(section.title)}<span>↗</span></a>)}</nav>
        </details>}
        <div className="rr-chapters">{visible.map((section, index) => <div key={section.id}>
          {coreCount > 0 && index === coreCount && <header className="rr-group-heading"><h2>{section.id === 'personal' ? '내가 남긴 질문' : '인생 전략 분석'}</h2><span>흐름과 조언</span></header>}
          <section className={`rr-chapter rr-tone-${tone(section)}`} id={`reading-${section.id}`} tabIndex={-1}>
            <div className="rr-card-meta"><span className="rr-number">{label(section, index)}{(!coreCount || section.core) && ` / ${String(count).padStart(2, '0')}`}</span>
              {section.category && <span className="rr-category">{sanitizeText(section.category)}</span>}</div>
            <h2>{sanitizeText(section.title)}</h2>{section.note && <p className="rr-note">{sanitizeText(section.note)}</p>}
            {section.body && <div className="rr-prose">{sanitizeText(section.body).split(/\n\n+/).map((paragraph, paragraphIndex) => <p key={paragraphIndex}>
              {paragraph.split('\n').map((line, lineIndex, lines) => <span key={lineIndex} className={/^\s*(⚠️?|주의[:：]|조심(?:할\s*것)?[:：])/.test(line) ? 'rr-inline-warning' : undefined}>
                {line}{lineIndex < lines.length - 1 && <br />}</span>)}</p>)}</div>}
            {section.content}
            {section.core && !section.body && !section.content && <div className="rr-missing"><strong>{pending ? '해석을 작성하고 있어요.' : '이 항목을 아직 받지 못했어요.'}</strong>
              <p>{pending ? '도착하는 내용부터 차례로 보여드릴게요.' : '받은 해석은 계속 읽을 수 있어요. 같은 요청을 다시 확인해주세요.'}</p></div>}
          </section>
        </div>)}</div>
        <footer className="rr-footer">
          {children}{onBack && <button type="button" onClick={onBack}>{actionLabel} ↗</button>}
          <Link href="/">다른 이야기 둘러보기 →</Link>
          <small>{disclaimer || '사주명리학을 바탕으로 AI가 작성한 참고용 해석입니다. 실제 투자·의료·법률 등 중요한 결정은 관련 전문가와 확인하세요.'}</small>
        </footer>
      </div>
    </div>
  </main>
}
