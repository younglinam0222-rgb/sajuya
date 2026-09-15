'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { NYANG_PRICE, THREE_NYANG_PRICE } from '@/lib/pricing'

interface Package {
  id: string
  name: string
  tag?: string
  coins: number
  bonus: number
  price: number
  highlight?: boolean
  desc: string
}

// ✅ 리빌딩: 4단계(1/3/5/10냥) → 2단계로 단순화
// 낱개는 부담 없이, 3냥 패키지는 확실히 이득으로 보이게 해서 결제 유도
const PACKAGES: Package[] = [
  {
    id: 'one',
    name: '한 냥',
    coins: 1,
    bonus: 0,
    price: NYANG_PRICE,
    desc: '사주 풀이 1회',
  },
  {
    id: 'three',
    name: '3냥 패키지',
    tag: 'BEST',
    coins: 3,
    bonus: 0,
    price: THREE_NYANG_PRICE,
    highlight: true,
    desc: `사주 풀이 3회 · 낱개보다 ${(NYANG_PRICE * 3 - THREE_NYANG_PRICE).toLocaleString()}원 저렴`,
  },
]

interface YeopjeunShopProps {
  onClose: () => void
  currentBalance?: number
}

export default function YeopjeunShop({ onClose, currentBalance = 0 }: YeopjeunShopProps) {
  const purchasing = useRef(false)
  const requestAbort = useRef<AbortController|null>(null)
  useEffect(() => () => requestAbort.current?.abort(), [])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,setError]=useState('')
  const [agreed,setAgreed]=useState(false)
  const router = useRouter()

  const handlePurchase = async () => {
    if (!selected || !agreed || purchasing.current) return
    const pkg = PACKAGES.find(p => p.id === selected)
    if (!pkg) return

    purchasing.current = true
    setLoading(true)
    setError('')
    const controller = new AbortController()
    requestAbort.current = controller
    try {
      const res = await fetch('/api/pay/ready', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: pkg.id,
          agreed,
        }),
      })
      const data = await res.json()
      if(!res.ok) throw new Error(data.error || '결제 준비 실패')
      if (typeof data.checkoutUrl !== 'string' || !/^\/checkout\/saju_[a-f0-9]+$/.test(data.checkoutUrl)) throw new Error('결제 이동 정보를 확인하지 못했어요.')
      if (!controller.signal.aborted) router.push(data.checkoutUrl)
    } catch (e) {
      if (controller.signal.aborted) return
      setError(e instanceof Error?e.message:'결제를 준비하지 못했습니다.')
    } finally {
      purchasing.current = false
      setLoading(false)
    }
  }

  const selectedPkg = PACKAGES.find(p => p.id === selected)

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center"
      onClick={onClose}>
      <div
        className="w-full max-w-md max-h-[calc(100dvh-16px)] rounded-t-xl border-t border-[#344151] overflow-y-auto overscroll-contain"
        style={{ background: 'linear-gradient(180deg, #17202c 0%, #0c1119 100%)' }}
        onClick={e => e.stopPropagation()}>

        {/* 핸들 */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-[#455365] rounded-full" />
        </div>

        {/* 헤더 */}
        <div className="px-5 pt-2 pb-4 border-b border-[#344151]/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="[font-family:var(--palace-serif)] text-xl font-medium">엽전 충전</p>
              <p className="text-xs text-[#a7b3c3] mt-0.5">현재 보유 <span className="text-[#d4bc92] font-bold">{currentBalance}냥</span></p>
            </div>
            <button type="button" aria-label="엽전 충전 닫기" onClick={onClose} className="text-[#9eabbd] text-xl px-2 min-h-11 min-w-11">✕</button>
          </div>

          {/* 환율 표시 */}
          <div className="mt-3 flex items-center gap-3 p-3 rounded-lg bg-[#222a34]/80 border border-[#c6a66d]/30">
            <div className="text-center flex-1">
              <p className="text-[#d4bc92] font-semibold text-lg">🪙 1냥</p>
              <p className="text-[#a7b3c3] text-xs">= {NYANG_PRICE.toLocaleString()}원</p>
            </div>
            <div className="text-[#a7b3c3]">↔</div>
            <div className="text-center flex-1">
              <p className="text-[#c6a66d] font-semibold text-lg">🔮 1풀이</p>
              <p className="text-[#a7b3c3] text-xs">사주 풀이</p>
            </div>
          </div>
        </div>

        {/* 패키지 목록 */}
        <div className="px-5 py-4 space-y-2.5">
          {PACKAGES.map(pkg => {
            const total = pkg.coins + pkg.bonus
            const isSelected = selected === pkg.id
            return (
              <button
                key={pkg.id}
                onClick={() => setSelected(pkg.id)}
                className="w-full rounded-lg p-4 text-left transition-all relative"
                style={{
                  background: isSelected
                    ? pkg.highlight
                      ? 'linear-gradient(135deg, #34362f, #29313a)'
                      : 'linear-gradient(135deg, #222a34, #17202c)'
                    : '#17202c',
                  border: isSelected
                    ? `2px solid ${pkg.highlight ? '#c6a66d' : '#c6a66d'}`
                    : '2px solid #344151',
                }}>

                {/* (BEST 태그는 이름 옆으로 이동) */}

                <div className="flex items-center gap-3">
                  {/* 선택 라디오 */}
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: isSelected ? '#c6a66d' : '#455365' }}>
                    {isSelected && (
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#c6a66d', color: '#17202c' }} />
                    )}
                  </div>

                  {/* 냥 아이콘 */}
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {Array.from({ length: Math.min(total, 5) }).map((_, i) => (
                      <span key={i} className="text-base">🪙</span>
                    ))}
                    {total > 5 && <span className="text-[#d4bc92] text-xs font-bold">×{total}</span>}
                  </div>

                  {/* 텍스트 */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{pkg.name}</span>
                      {pkg.tag && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold text-black flex-shrink-0"
                          style={{ background: '#c6a66d', color: '#17202c' }}>
                          {pkg.tag}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#a7b3c3] mt-0.5">{pkg.desc}</p>
                  </div>

                  {/* 가격 */}
                  <div className="text-right flex-shrink-0 flex flex-col items-end gap-0.5">
                    <p className="font-semibold text-white text-sm">{pkg.price.toLocaleString()}원</p>
                    {pkg.coins * NYANG_PRICE > pkg.price && (
                      <p className="text-xs text-[#9eabbd] line-through">
                        {(pkg.coins * NYANG_PRICE).toLocaleString()}원
                      </p>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* 구매 버튼 */}
        <div className="px-5 pb-8 pt-2">
          <label className="text-sm leading-7 block mb-3"><input className="accent-[#c6a66d]" type="checkbox" checked={agreed} onChange={e=>setAgreed(e.target.checked)}/> 상품 내용과 <a href="/terms" className="underline">이용·환불 안내</a>를 확인했습니다.</label>
          <p role="alert" className="text-red-300 mb-2">{error}</p>
          <button
            onClick={handlePurchase}
            disabled={!selected || loading || !agreed}
            className="w-full py-4 rounded-lg font-semibold text-base text-white transition-all disabled:opacity-40"
            style={{
              color: selected ? '#17202c' : '#c4cdd8',
              background: selected
                ? '#c6a66d'
                : '#344151',
            }}>
            {loading
              ? '결제 준비 중...'
              : selected
                ? `${selectedPkg!.price.toLocaleString()}원 결제하기 →`
                : '패키지를 선택하세요'}
          </button>
          <p className="text-center text-[#a7b3c3] text-xs mt-3">
            결제 후 엽전이 즉시 지급됩니다 · 토스페이먼츠 안전결제
          </p>
        </div>
      </div>
    </div>
  )
}
