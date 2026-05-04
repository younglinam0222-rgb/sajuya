'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function DailyPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')

  const getDaily = async () => {
    setLoading(true)
    try {
      const today = new Date().toLocaleDateString('ko-KR')
      const res = await fetch('/api/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today }),
      })
      const data = await res.json()
      setResult(data.result)
    } catch {
      setResult('오류가 발생했어요. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-white max-w-[430px] mx-auto pb-8">
      <div className="px-4 py-6">
        <Link href="/" className="text-xs text-[#555] mb-6 block">← 홈으로</Link>
        <div className="text-3xl mb-1">⭐</div>
        <div className="text-2xl font-black mb-1">일일 운세</div>
        <div className="text-sm text-[#666] mb-6">오늘 하루 기운을 무료로 확인해요</div>

        {!result ? (
          <button
            onClick={getDaily}
            disabled={loading}
            className="w-full py-4 rounded-2xl font-black text-base transition-opacity"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#a78bfa)', color: '#fff', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? '🔮 운세 보는 중...' : '오늘 운세 보기 (무료)'}
          </button>
        ) : (
          <div>
            <div className="rounded-2xl p-5 mb-4" style={{ background: '#111', border: '1px solid #222' }}>
              <div className="text-xs font-bold text-purple-400 mb-3">
                {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} 운세
              </div>
              <p className="text-sm leading-[1.95] text-[#ccc] whitespace-pre-line">{result}</p>
            </div>
            <button
              onClick={() => { setResult(''); }}
              className="w-full py-3 rounded-2xl text-xs font-bold"
              style={{ background: '#111', border: '1px solid #222', color: '#555' }}
            >
              다시 보기
            </button>
          </div>
        )}

        <div className="mt-6 px-3 py-3 rounded-xl" style={{ background: '#0a0a0a', border: '0.5px solid #111' }}>
          <p className="text-[9px] leading-relaxed" style={{ color: '#3a3a3a' }}>
            본 서비스는 참고용 엔터테인먼트 콘텐츠입니다. © 사주야
          </p>
        </div>
      </div>
    </div>
  )
}
