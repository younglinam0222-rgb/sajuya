'use client'
import Link from 'next/link'

export default function Page() {
  return (
    <div className="bg-[#0a0a0a] min-h-screen text-white max-w-[430px] mx-auto pb-8">
      <div className="bg-[#111] px-4 py-3 flex items-center gap-3 border-b border-[#1a1a1a]">
        <Link href="/" className="text-lg text-[#888]">←</Link>
        <span className="font-black text-purple-400">사주야</span>
      </div>
      <div className="flex flex-col items-center justify-center px-8 pt-16">
        <div className="text-7xl mb-6">📆</div>
        <div className="text-2xl font-black mb-2 text-center">연도별 운세</div>
        <div className="text-sm text-[#555] text-center leading-relaxed mb-8">
          특정 연도 운세를\n집중 분석해드려요<br /><br />
          <span className="text-[#444]">곧 오픈 예정이에요!</span>
        </div>
        <div className="px-5 py-2.5 rounded-full text-xs font-bold mb-10"
          style={{ background: 'rgba(96,165,250,.1)', color: '#60a5fa', border: '1px solid rgba(96,165,250,.25)' }}>
          🚧 준비 중
        </div>
        <div className="w-full rounded-2xl p-4" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
          <div className="text-xs font-bold text-[#444] mb-2">지금은 이걸 먼저 해봐요</div>
          <Link href="/saju" className="flex items-center gap-3 py-3 px-3 rounded-xl"
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
