'use client'
import Link from 'next/link'

export default function GunghapPage() {
  return (
    <div className="bg-[#0a0a0a] min-h-screen text-white max-w-[430px] mx-auto pb-8">
      <div className="px-4 py-6">
        <Link href="/" className="text-xs text-[#555] mb-6 block">← 홈으로</Link>
      </div>
      <div className="flex flex-col items-center justify-center px-8 pt-8">
        <div className="text-7xl mb-6">💕</div>
        <div className="text-2xl font-black mb-2 text-center">궁합 해설</div>
        <div className="text-sm text-[#555] text-center leading-relaxed mb-8">
          구미호 선생이 두 사람의 사주를<br />낱낱이 꿰뚫어봐줘요<br /><br />
          <span className="text-[#444]">곧 오픈 예정이에요!</span>
        </div>
        <div className="px-5 py-2.5 rounded-full text-xs font-bold mb-10"
          style={{ background: 'rgba(244,114,182,.1)', color: '#f472b6', border: '1px solid rgba(244,114,182,.25)' }}>
          🚧 준비 중
        </div>
        <div className="w-full rounded-2xl p-4" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
          <div className="text-xs font-bold text-[#444] mb-2">지금은 이걸 먼저 해봐요</div>
          <Link href="/saju"
            className="flex items-center gap-3 py-3 px-3 rounded-xl"
            style={{ background: 'rgba(124,58,237,.08)', border: '1px solid rgba(124,58,237,.15)' }}>
            <span className="text-2xl">🏔️</span>
            <div>
              <div className="text-sm font-bold text-white">사주 풀이</div>
              <div className="text-xs text-[#555]">백할매가 팩폭으로 알려줌 · 990원</div>
            </div>
            <span className="ml-auto text-[#555] text-xs">›</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
