'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

const CHARACTERS: Record<string, {
  name: string; title: string; img: string; color: string; bg: string
  tags: string[]; desc: string; backstory: string
  personality: string; specialty: string; quote: string
  sections: string[]
}> = {
  baekhalma: {
    name: '건물주 백할매', title: '부와 운명의 관리자',
    img: '/characters/baekhalma.png', color: '#8B5CF6', bg: '#1a1025',
    tags: ['재물운', '직업운', '팩폭'],
    desc: '수백 년을 살아온 건물주 백할매. 달콤한 말 대신 날카로운 진실을 던진다.',
    backstory: '조선시대 거상의 후손으로 태어나 수백 년간 인간들의 재물 흥망을 지켜본 신령. 지금은 강남 한복판 건물 꼭대기에 좌정하여 돈과 직업에 관한 운명을 관장한다. 비록 말투는 거칠지만, 그 독설 안에는 반드시 핵심 진실이 담겨있다.',
    personality: '츤데레 팩폭 스타일. 독설 뒤에 숨겨진 따뜻함.',
    specialty: '재물운, 직업운, 현실적 조언',
    quote: '"야. 너 올해 돈 못 모아. 이유? 내가 딱 말해준다."',
    sections: ['에너지 상태', '돈 복 분석', '직업·사업 방향', '연애·결혼운', '올해·내년 운세'],
  },
  doRyeong: {
    name: '근본도령', title: '사주의 근본을 꿰뚫는 자',
    img: '/characters/doryeong.png', color: '#3B82F6', bg: '#0f1525',
    tags: ['사주분석', '성격', '종합운세'],
    desc: '조선 최고의 역술가 가문에서 태어난 근본도령. 형처럼 다정하게, 때로는 솔직하게.',
    backstory: '대대로 역술을 업으로 삼아온 가문의 막내. 딱딱한 역술서 대신 사람 냄새 나는 말로 운명을 설명하는 것을 좋아한다. 어려운 한자 대신 요즘 말로, 무서운 예언 대신 따뜻한 위로로 사주를 전달한다.',
    personality: '다정한 형/오빠 스타일. 솔직하고 위로가 되는.',
    specialty: '사주 기본 분석, 성격, 종합 운세',
    quote: '"있잖아, 형이 보니까 지금 인생 방향 자체가 좀 틀렸어. 근데 괜찮아, 지금 알면 돼."',
    sections: ['일간 분석', '성격과 기질', '전체 운의 흐름', '재물·직업운', '연애운'],
  },
  gumiho: {
    name: '구미호 선생', title: '연애와 인연의 지배자',
    img: '/characters/gumiho.png', color: '#EC4899', bg: '#1a0f18',
    tags: ['연애운', '궁합', '인연'],
    desc: '천 년을 살아온 구미호. 수천 번의 인연과 이별을 목격한 그녀는 사랑에 관한 한 모든 것을 안다.',
    backstory: '천 년간 수많은 인간의 사랑을 지켜보고 때로는 직접 체험한 구미호. 달콤한 사랑 이야기보다 냉정한 궁합의 진실을 더 좋아한다. 독설이지만 그 안에 진심 어린 조언이 있다.',
    personality: '요염하고 독설적. 연애에 관해서는 냉정한 현실주의자.',
    specialty: '연애운, 궁합, 결혼운',
    quote: '"어머, 그 사람 아직도 기다려? 호호... 그대 사주에 답 다 나와있는데."',
    sections: ['연애 스타일', '이상형 분석', '결혼운', '궁합 분석', '인연 오는 시기'],
  },
  sinRyeong: {
    name: '무등산 신령님', title: '대운과 생애를 주관하는 자',
    img: '/characters/sinryeong.png', color: '#10B981', bg: '#0a1a14',
    tags: ['대운', '건강', '인생흐름'],
    desc: '무등산 깊은 곳에서 수천 년을 수련한 신령님. 인생의 큰 흐름과 대운을 꿰뚫어본다.',
    backstory: '무등산 정상 바위 아래서 수천 년을 수련한 도인. 짧은 말 한마디에 깊은 진리를 담는 것을 좋아한다. 조용히 앉아 인생의 큰 그림을 그려준다.',
    personality: '묵직하고 진중한 할아버지 스타일. 깊은 통찰.',
    specialty: '대운, 건강운, 인생 전반적 흐름',
    quote: '"허허... 이 사람. 지금 보이는 길이 진짜 길이 아닐 수 있소. 잠시 멈춰야 할 때요."',
    sections: ['인생 큰 그림', '현재 대운', '건강의 기운', '재물·직업 흐름', '전성기 분석'],
  },
}

export default function CharacterDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  const c = CHARACTERS[id]

  if (!c) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-white px-4">
        <p className="text-4xl mb-4">🔍</p>
        <p className="text-lg font-bold mb-2">신령을 찾을 수 없어요</p>
        <Link href="/characters" className="text-gray-400 text-sm mt-4">← 목록으로</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pb-24">
      <div className="max-w-md mx-auto">

        {/* 뒤로가기 헤더 */}
        <div className="flex items-center gap-3 px-4 pt-6 mb-4">
          <button onClick={() => router.back()} className="text-gray-400 text-xl">←</button>
          <h1 className="text-xl font-bold">{c.name}</h1>
        </div>

        {/* 캐릭터 이미지 헤더 — 풀샷 */}
        <div className="relative mx-4 rounded-3xl overflow-hidden mb-4" style={{ border: `1px solid ${c.color}40` }}>
          <div className="h-80 relative" style={{ background: `linear-gradient(135deg, ${c.bg}, #0a0a0f)` }}>
            <img
              src={c.img}
              alt={c.name}
              className="w-full h-full object-cover object-top"
              onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }}
            />
            {/* 하단 그라데이션 */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(10,10,15,0.95) 100%)' }} />
            {/* 텍스트 오버레이 */}
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <p className="text-xs font-medium mb-1" style={{ color: c.color }}>{c.title}</p>
              <h2 className="text-2xl font-black mb-2">{c.name}</h2>
              <div className="flex gap-2 flex-wrap">
                {c.tags.map(t => (
                  <span key={t} className="text-xs px-2.5 py-1 rounded-full"
                    style={{ background: `${c.color}25`, color: c.color }}>
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-4">
          {/* 대표 멘트 */}
          <div className="rounded-2xl p-4 mb-3 bg-[#111118] border border-gray-800">
            <p className="text-xs mb-2" style={{ color: c.color }}>💬 대표 멘트</p>
            <p className="text-gray-200 text-sm italic leading-relaxed">{c.quote}</p>
          </div>

          {/* 뒷이야기 */}
          <div className="rounded-2xl p-4 mb-3 bg-[#111118] border border-gray-800">
            <p className="text-xs text-gray-500 mb-2">📖 뒷이야기</p>
            <p className="text-gray-300 text-sm leading-relaxed">{c.backstory}</p>
          </div>

          {/* 성격 + 전문분야 */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="rounded-2xl p-3 bg-[#111118] border border-gray-800">
              <p className="text-xs text-gray-500 mb-1">성격</p>
              <p className="text-xs text-gray-300 leading-relaxed">{c.personality}</p>
            </div>
            <div className="rounded-2xl p-3 bg-[#111118] border border-gray-800">
              <p className="text-xs text-gray-500 mb-1">전문분야</p>
              <p className="text-xs text-gray-300 leading-relaxed">{c.specialty}</p>
            </div>
          </div>

          {/* 이 신령이 알려주는 것들 */}
          <div className="rounded-2xl p-4 mb-4 bg-[#111118] border border-gray-800">
            <p className="text-xs text-gray-500 mb-2">🔮 이 신령이 알려주는 것들</p>
            <div className="space-y-1.5">
              {c.sections.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
                  <span className="text-sm text-gray-300">{s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <Link href="/saju"
            className="block w-full py-4 rounded-2xl text-center font-bold text-base text-white mb-3"
            style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}99)` }}>
            {c.name}에게 사주 물어보기 →
          </Link>

          <Link href="/characters" className="block text-center text-gray-500 text-sm pb-4">
            ← 다른 신령 보기
          </Link>
        </div>
      </div>
    </div>
  )
}
