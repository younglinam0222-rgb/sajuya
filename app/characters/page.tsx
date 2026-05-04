'use client'

import { useState } from 'react'
import Link from 'next/link'

const CHARACTERS = [
  {
    id: 'baekhalma',
    name: '건물주 백할매',
    title: '부와 운명의 관리자',
    emoji: '👵',
    color: '#8B5CF6',
    bg: '#1a1025',
    tags: ['재물운', '직업운', '팩폭'],
    price: '590원',
    desc: '수백 년을 살아온 건물주 백할매. 서울 한복판 빌딩 꼭대기에서 인간들의 운명을 내려다보며, 달콤한 말 대신 날카로운 진실을 던진다.',
    backstory: '조선시대 거상의 후손으로 태어나 수백 년간 인간들의 재물 흥망을 지켜본 신령. 지금은 강남 한복판 건물 꼭대기에 좌정하여 돈과 직업에 관한 운명을 관장한다. 비록 말투는 거칠지만, 그 독설 안에는 반드시 핵심 진실이 담겨있다.',
    personality: '츤데레 팩폭 스타일. 독설 뒤에 숨겨진 따뜻함.',
    specialty: '재물운, 직업운, 현실적 조언',
    quote: '"인간아, 네 사주가 말해주는 걸 솔직히 들어봐라. 쯧쯧..."',
  },
  {
    id: 'doRyeong',
    name: '근본도령',
    title: '사주의 근본을 꿰뚫는 자',
    emoji: '🧑',
    color: '#3B82F6',
    bg: '#0f1525',
    tags: ['사주분석', '성격', '종합운세'],
    price: '590원',
    desc: '조선 최고의 역술가 가문에서 태어난 근본도령. 형처럼 다정하게, 때로는 오빠처럼 솔직하게. 복잡한 사주를 쉽고 친근하게 풀어준다.',
    backstory: '대대로 역술을 업으로 삼아온 가문의 막내. 딱딱한 역술서 대신 사람 냄새 나는 말로 운명을 설명하는 것을 좋아한다. 어려운 한자 대신 요즘 말로, 무서운 예언 대신 따뜻한 위로로 사주를 전달한다.',
    personality: '다정한 형/오빠 스타일. 솔직하고 위로가 되는.',
    specialty: '사주 기본 분석, 성격, 종합 운세',
    quote: '"야, 솔직히 말해줄게. 네 사주 진짜 특이한데..."',
  },
  {
    id: 'gumiho',
    name: '구미호 선생',
    title: '연애와 인연의 지배자',
    emoji: '🦊',
    color: '#EC4899',
    bg: '#1a0f18',
    tags: ['연애운', '궁합', '인연'],
    price: '590원',
    desc: '천 년을 살아온 구미호. 수천 번의 인연과 이별을 목격한 그녀는 사랑에 관한 한 모든 것을 안다. 요염한 미소 뒤에 숨겨진 날카로운 연애 조언.',
    backstory: '천 년간 수많은 인간의 사랑을 지켜보고 때로는 직접 체험한 구미호. 달콤한 사랑 이야기보다 냉정한 궁합의 진실을 더 좋아한다. 독설이지만 그 안에 진심 어린 조언이 있다.',
    personality: '요염하고 독설적. 연애에 관해서는 냉정한 현실주의자.',
    specialty: '연애운, 궁합, 결혼운',
    quote: '"어머~ 이 사주는... 흠흠~ 연애복이 참 기구하네요."',
  },
  {
    id: 'sinRyeong',
    name: '무등산 신령님',
    title: '대운과 생애를 주관하는 자',
    emoji: '🧙',
    color: '#10B981',
    bg: '#0a1a14',
    tags: ['대운', '건강', '인생흐름'],
    price: '590원',
    desc: '무등산 깊은 곳에서 수천 년을 수련한 신령님. 인생의 큰 흐름과 대운을 꿰뚫어보며, 깊고 묵직한 말씀으로 인생의 방향을 제시한다.',
    backstory: '무등산 정상 바위 아래서 수천 년을 수련한 도인. 짧은 말 한마디에 깊은 진리를 담는 것을 좋아한다. 젊은 신령들의 요란한 예언과 달리, 조용히 앉아 인생의 큰 그림을 그려준다.',
    personality: '묵직하고 진중한 할아버지 스타일. 깊은 통찰.',
    specialty: '대운, 건강운, 인생 전반적 흐름',
    quote: '"허허... 이 대운이 끝나면 새로운 봄이 오리니..."',
  },
]

export default function CharactersPage() {
  const [open, setOpen] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
      <div className="max-w-md mx-auto px-4 pt-6">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/" className="text-gray-400 text-xl hover:text-white">←</Link>
          <h1 className="text-xl font-bold">👁 운명을 보는 자들</h1>
        </div>
        <p className="text-gray-500 text-sm mb-6 ml-8">신령들의 이야기와 전문 분야</p>

        <div className="space-y-3">
          {CHARACTERS.map(c => (
            <div key={c.id}
              className="rounded-2xl overflow-hidden transition-all duration-300"
              style={{ border: `1px solid ${open === c.id ? c.color : '#1e1e2e'}`, background: '#111118' }}>

              <button
                className="w-full flex items-center gap-4 p-4 text-left"
                onClick={() => setOpen(open === c.id ? null : c.id)}>
                <div className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
                  style={{ background: c.bg }}>
                  {c.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-base">{c.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: c.color + '25', color: c.color }}>{c.price}</span>
                  </div>
                  <p className="text-gray-400 text-xs">{c.title}</p>
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {c.tags.map(t => (
                      <span key={t} className="text-xs px-1.5 py-0.5 bg-gray-800 rounded-full text-gray-400">#{t}</span>
                    ))}
                  </div>
                </div>
                <span className="text-gray-600 text-sm flex-shrink-0">{open === c.id ? '▲' : '▼'}</span>
              </button>

              {open === c.id && (
                <div className="px-4 pb-4 border-t border-gray-800/50">
                  <p className="text-gray-300 text-sm mt-3 leading-relaxed">{c.desc}</p>

                  <div className="mt-3 p-3 rounded-xl" style={{ background: c.bg }}>
                    <p className="text-xs mb-2" style={{ color: c.color }}>💬 대표 멘트</p>
                    <p className="text-gray-200 text-sm italic leading-relaxed">{c.quote}</p>
                  </div>

                  <div className="mt-3 p-3 rounded-xl bg-gray-900">
                    <p className="text-xs text-gray-500 mb-1.5">📖 뒷이야기</p>
                    <p className="text-gray-300 text-sm leading-relaxed">{c.backstory}</p>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-xl bg-gray-900">
                      <p className="text-xs text-gray-500 mb-1">성격</p>
                      <p className="text-xs text-gray-300 leading-relaxed">{c.personality}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-gray-900">
                      <p className="text-xs text-gray-500 mb-1">전문분야</p>
                      <p className="text-xs text-gray-300 leading-relaxed">{c.specialty}</p>
                    </div>
                  </div>

                  <Link href="/saju"
                    className="block mt-3 text-center py-3 rounded-xl text-sm font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}cc)` }}>
                    이 신령에게 사주 물어보기 →
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
