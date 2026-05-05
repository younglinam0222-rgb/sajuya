'use client'

import { useState } from 'react'
import Link from 'next/link'

const CHARACTERS = [
  {
    id: 'baekhalma',
    name: '건물주 백할매',
    title: '부와 운명의 관리자',
    img: '/characters/baekhalma.png',
    color: '#8B5CF6',
    bg: 'linear-gradient(135deg, #1a1025, #2d1b69)',
    tags: ['재물운', '직업운', '팩폭'],
    price: '990원',
    desc: '수백 년을 살아온 건물주 백할매. 달콤한 말 대신 날카로운 진실을 던진다.',
    backstory: '조선시대 거상의 후손으로 태어나 수백 년간 인간들의 재물 흥망을 지켜본 신령. 지금은 강남 한복판 건물 꼭대기에 좌정하여 돈과 직업에 관한 운명을 관장한다.',
    personality: '츤데레 팩폭 스타일. 독설 뒤에 숨겨진 따뜻함.',
    specialty: '재물운, 직업운, 현실적 조언',
    quote: '"야. 너 올해 돈 못 모아. 이유? 내가 딱 말해준다."',
  },
  {
    id: 'doRyeong',
    name: '근본도령',
    title: '사주의 근본을 꿰뚫는 자',
    img: '/characters/doryeong.png',
    color: '#3B82F6',
    bg: 'linear-gradient(135deg, #0f1525, #1e3a8a)',
    tags: ['사주분석', '성격', '종합운세'],
    price: '990원',
    desc: '조선 최고의 역술가 가문에서 태어난 근본도령. 형처럼 다정하게, 솔직하게.',
    backstory: '대대로 역술을 업으로 삼아온 가문의 막내. 딱딱한 역술서 대신 사람 냄새 나는 말로 운명을 설명하는 것을 좋아한다.',
    personality: '다정한 형/오빠 스타일. 솔직하고 위로가 되는.',
    specialty: '사주 기본 분석, 성격, 종합 운세',
    quote: '"있잖아, 형이 보니까 네 방향 자체가 좀 틀렸어. 근데 괜찮아, 지금 알면 돼."',
  },
  {
    id: 'gumiho',
    name: '구미호 선생',
    title: '연애와 인연의 지배자',
    img: '/characters/gumiho.png',
    color: '#EC4899',
    bg: 'linear-gradient(135deg, #1a0f18, #831843)',
    tags: ['연애운', '궁합', '인연'],
    price: '990원',
    desc: '천 년을 살아온 구미호. 사랑에 관한 한 모든 것을 안다.',
    backstory: '천 년간 수많은 인간의 사랑을 지켜보고 때로는 직접 체험한 구미호. 달콤한 사랑 이야기보다 냉정한 궁합의 진실을 더 좋아한다.',
    personality: '요염하고 독설적. 연애에 관해서는 냉정한 현실주의자.',
    specialty: '연애운, 궁합, 결혼운',
    quote: '"어머, 그 사람 아직도 기다려? 호호... 그대 사주에 답 다 나와있는데."',
  },
  {
    id: 'sinRyeong',
    name: '무등산 신령님',
    title: '대운과 생애를 주관하는 자',
    img: '/characters/sinryeong.png',
    color: '#10B981',
    bg: 'linear-gradient(135deg, #0a1a14, #065f46)',
    tags: ['대운', '건강', '인생흐름'],
    price: '990원',
    desc: '무등산 깊은 곳에서 수천 년을 수련한 신령님. 인생의 큰 흐름을 꿰뚫어본다.',
    backstory: '무등산 정상 바위 아래서 수천 년을 수련한 도인. 짧은 말 한마디에 깊은 진리를 담는 것을 좋아한다.',
    personality: '묵직하고 진중한 할아버지 스타일. 깊은 통찰.',
    specialty: '대운, 건강운, 인생 전반적 흐름',
    quote: '"허허... 이 사람. 지금 보이는 길이 진짜 길이 아닐 수 있소."',
  },
]

export default function CharactersPage() {
  const [open, setOpen] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
      <div className="max-w-md mx-auto px-4 pt-6">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/" className="text-gray-400 text-xl">←</Link>
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

                {/* 실제 캐릭터 이미지 */}
                <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0"
                  style={{ background: c.bg }}>
                  <img src={c.img} alt={c.name}
                    className="w-full h-full object-cover object-top"
                    onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }} />
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
                <div className="border-t border-gray-800/50">
                  {/* 캐릭터 큰 이미지 */}
                  <div className="h-48 relative overflow-hidden" style={{ background: c.bg }}>
                    <img src={c.img} alt={c.name}
                      className="w-full h-full object-cover object-top"
                      onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }} />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 50%, #111118 100%)' }} />
                  </div>

                  <div className="px-4 pb-4">
                    <p className="text-gray-300 text-sm leading-relaxed mb-3">{c.desc}</p>

                    <div className="p-3 rounded-xl mb-3" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${c.color}30` }}>
                      <p className="text-xs mb-2" style={{ color: c.color }}>💬 대표 멘트</p>
                      <p className="text-gray-200 text-sm italic leading-relaxed">{c.quote}</p>
                    </div>

                    <div className="p-3 rounded-xl bg-gray-900 mb-3">
                      <p className="text-xs text-gray-500 mb-1.5">📖 뒷이야기</p>
                      <p className="text-gray-300 text-sm leading-relaxed">{c.backstory}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="p-2.5 rounded-xl bg-gray-900">
                        <p className="text-xs text-gray-500 mb-1">성격</p>
                        <p className="text-xs text-gray-300">{c.personality}</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-gray-900">
                        <p className="text-xs text-gray-500 mb-1">전문분야</p>
                        <p className="text-xs text-gray-300">{c.specialty}</p>
                      </div>
                    </div>

                    <Link href="/saju"
                      className="block text-center py-3 rounded-xl text-sm font-bold text-white"
                      style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}cc)` }}>
                      {c.name}에게 사주 물어보기 →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
