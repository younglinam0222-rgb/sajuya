'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { sanitizeText } from '@/lib/sajuSanitize'
import { PEAK_GUIDE_LABEL } from '@/lib/sajuContract'
import type { PublicShareView } from '@/lib/readingShare'

const CHARACTER_IMG: Record<string, string> = {
  baekhalma: '/characters/baekhalma.png',
  doRyeong: '/characters/doryeong.png',
  gumiho: '/characters/gumiho.png',
  sinRyeong: '/characters/sinryeong.png',
}
const CHARACTER_COLOR: Record<string, string> = {
  baekhalma: '#8B5CF6',
  doRyeong: '#3B82F6',
  gumiho: '#EC4899',
  sinRyeong: '#10B981',
}
const CHARACTER_NAMES: Record<string, string> = {
  baekhalma: '건물주 백할매',
  doRyeong: '근본도령',
  gumiho: '구미호 선생',
  sinRyeong: '무등산 신령님',
}

export default function PublicSharePage() {
  const params = useParams()
  const token = String(params.token ?? '')
  const [view, setView] = useState<PublicShareView | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await fetch(`/api/share/${encodeURIComponent(token)}`, { cache: 'no-store' })
      if (cancelled) return
      if (!res.ok) {
        setError('공유가 중지되었거나 링크가 더 이상 유효하지 않아요.')
        setLoading(false)
        return
      }
      const data = await res.json()
      setView(data)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [token])

  const startHref = `/saju?from=share`
  const onCta = () => {
    void fetch('/api/share/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'share_cta_start', token }),
    })
  }

  if (loading) {
    return <div className="bg-[#0a0a0a] min-h-screen flex items-center justify-center text-gray-500 text-sm">불러오는 중...</div>
  }
  if (error || !view) {
    return (
      <div className="bg-[#0a0a0a] min-h-screen flex flex-col items-center justify-center text-white px-6 text-center max-w-[430px] mx-auto">
        <div className="text-5xl mb-4">🔒</div>
        <p className="font-black mb-2">볼 수 없는 공유 링크예요</p>
        <p className="text-sm text-gray-500 mb-6">{error}</p>
        <Link href={startHref} onClick={onCta} className="px-6 py-3 rounded-2xl font-bold text-sm" style={{ background: '#7c3aed' }}>내 사주도 무료로 보기</Link>
      </div>
    )
  }

  const charImg = CHARACTER_IMG[view.characterId] ?? CHARACTER_IMG.baekhalma
  const charColor = CHARACTER_COLOR[view.characterId] ?? '#8B5CF6'
  const charName = CHARACTER_NAMES[view.characterId] ?? view.characterId
  const titles = Array.isArray(view.titles) ? view.titles as { id?: string; category?: string; title?: string; teaser?: string; content?: string }[] : []
  const strategy = view.strategy as Record<string, any> | null

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-white max-w-[430px] mx-auto pb-10">
      <div className="px-4 pt-4">
        <Link href={startHref} onClick={onCta} className="block w-full py-3 rounded-2xl font-bold text-sm text-center" style={{ background: '#7c3aed' }}>
          내 사주도 무료로 보기
        </Link>
      </div>

      <div className="relative overflow-hidden px-6 py-8 text-center"
        style={{ background: 'linear-gradient(160deg,#050010,#0f0030,#050010)' }}>
        <div className="w-20 h-20 rounded-full overflow-hidden mx-auto mb-3 border-2" style={{ borderColor: charColor }}>
          <img src={charImg} alt={charName} className="w-full h-full object-cover object-top" />
        </div>
        <div className="text-2xl font-black mb-1">{view.displayName}님의 사주 풀이</div>
        <div className="text-xs text-[#888]">{charName}이 본 결과 · 공유본</div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {titles.map((t, i) => (
          <div key={String(t.id ?? i)} className="rounded-2xl overflow-hidden border p-4" style={{ borderColor: `${charColor}40`, background: '#111' }}>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: `${charColor}25`, color: charColor }}>{i + 1}</span>
              {t.category && <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-gray-800 text-gray-400">{t.category}</span>}
            </div>
            <p className="font-bold text-base">{sanitizeText(t.title)}</p>
            {t.content && (
              <div className="text-gray-300 text-sm leading-relaxed mt-4">
                {sanitizeText(t.content).split('\n').map((line, j) =>
                  line.startsWith('⚠️')
                    ? <p key={j} className="mt-4 text-yellow-300 font-medium">{line}</p>
                    : line === '' ? <div key={j} className="h-4" /> : <p key={j}>{line}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {strategy && (
        <div className="px-4 mt-4 space-y-3">
          <div className="flex items-center gap-2"><span>⚔️</span><span className="font-bold">인생 전략 분석</span></div>
          {strategy.overview && (
            <div className="rounded-2xl p-4 bg-[#111] border border-gray-800">
              <p className="text-gray-300 text-sm leading-relaxed">{sanitizeText(strategy.overview)}</p>
            </div>
          )}
          {strategy.golden_period && (
            <div className="rounded-2xl p-4 bg-[#111] border border-yellow-900/30">
              <p className="text-gray-300 text-sm whitespace-pre-line">{sanitizeText(strategy.golden_period)}</p>
            </div>
          )}
          {strategy.peak_guide && (
            <div className="rounded-2xl p-4 bg-[#111] border border-gray-800">
              <div className="text-sm font-bold text-green-400 mb-2">{PEAK_GUIDE_LABEL}</div>
              <p className="text-gray-300 text-sm whitespace-pre-line">{sanitizeText(strategy.peak_guide)}</p>
            </div>
          )}
          {strategy.final_word && (
            <div className="rounded-2xl p-4 border" style={{ background: `${charColor}14`, borderColor: `${charColor}55` }}>
              <p className="text-gray-200 text-sm">{sanitizeText(strategy.final_word)}</p>
            </div>
          )}
        </div>
      )}

      {view.includePersonal && view.personalAnswer && (
        <div className="px-4 mt-4 rounded-2xl p-4 bg-[#111] border border-gray-800">
          <p className="text-xs text-gray-500 mb-1">족집게 질문</p>
          <p className="font-bold text-sm mb-3">{view.personalAnswer.question}</p>
          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{sanitizeText(view.personalAnswer.answer)}</p>
        </div>
      )}

      <div className="px-4 mt-8">
        <Link href={startHref} onClick={onCta} className="block w-full py-4 rounded-2xl font-black text-base text-center" style={{ background: '#7c3aed' }}>
          내 사주도 무료로 보기
        </Link>
        <p className="text-[11px] text-gray-600 text-center mt-3">이 화면은 친구가 공유한 읽기 전용 결과입니다. 결제 없이 볼 수 있어요.</p>
      </div>
    </div>
  )
}
