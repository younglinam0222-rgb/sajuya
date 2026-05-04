'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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

const PACKAGES: Package[] = [
  {
    id: 'one',
    name: '한 냥',
    coins: 1,
    bonus: 0,
    price: 990,
    desc: '사주 풀이 1회',
  },
  {
    id: 'three',
    name: '세 냥',
    coins: 3,
    bonus: 1,
    price: 2970,
    desc: '3냥 + 1냥 보너스',
  },
  {
    id: 'five',
    name: '다섯 냥',
    coins: 5,
    bonus: 2,
    price: 4950,
    desc: '5냥 + 2냥 보너스',
  },
  {
    id: 'ten',
    name: '열 냥',
    tag: 'BEST',
    coins: 10,
    bonus: 4,
    price: 9900,
    highlight: true,
    desc: '10냥 + 4냥 보너스',
  },
]

interface YeopjeunShopProps {
  onClose: () => void
  currentBalance?: number
}

export default function YeopjeunShop({ onClose, currentBalance = 0 }: YeopjeunShopProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handlePurchase = async () => {
    if (!selected) return
    const pkg = PACKAGES.find(p => p.id === selected)
    if (!pkg) return

    setLoading(true)
    try {
      const orderId = `yeopjeun_${Date.now()}`
      const res = await fetch('/api/pay/ready', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          amount: pkg.price,
          orderName: `사주야 엽전 ${pkg.coins + pkg.bonus}냥`,
          packageId: pkg.id,
        }),
      })
      const data = await res.json()
      if (data.checkoutUrl) {
        router.push(data.checkoutUrl)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const selectedPkg = PACKAGES.find(p => p.id === selected)

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center"
      onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl border-t border-gray-800 overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #13111f 0%, #0a0a0f 100%)' }}
        onClick={e => e.stopPropagation()}>

        {/* 핸들 */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-700 rounded-full" />
        </div>

        {/* 헤더 */}
        <div className="px-5 pt-2 pb-4 border-b border-gray-800/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-black">🪙 엽전 충전</p>
              <p className="text-xs text-gray-500 mt-0.5">현재 보유 <span className="text-yellow-400 font-bold">{currentBalance}냥</span></p>
            </div>
            <button onClick={onClose} className="text-gray-600 text-xl px-2">✕</button>
          </div>

          {/* 환율 표시 */}
          <div className="mt-3 flex items-center gap-3 p-3 rounded-2xl bg-[#1a1025]/80 border border-purple-900/30">
            <div className="text-center flex-1">
              <p className="text-yellow-400 font-black text-lg">🪙 1냥</p>
              <p className="text-gray-500 text-xs">= 990원</p>
            </div>
            <div className="text-gray-700">↔</div>
            <div className="text-center flex-1">
              <p className="text-purple-400 font-black text-lg">🔮 1풀이</p>
              <p className="text-gray-500 text-xs">사주·궁합</p>
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
                className="w-full rounded-2xl p-4 text-left transition-all relative"
                style={{
                  background: isSelected
                    ? pkg.highlight
                      ? 'linear-gradient(135deg, #2d1b69, #1a0a2e)'
                      : 'linear-gradient(135deg, #1a1025, #13111f)'
                    : '#111118',
                  border: isSelected
                    ? `2px solid ${pkg.highlight ? '#8B5CF6' : '#6D28D9'}`
                    : '2px solid #1f1f2e',
                }}>

                {/* BEST 태그 */}
                {pkg.tag && (
                  <span className="absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full font-black text-black"
                    style={{ background: 'linear-gradient(135deg, #F59E0B, #EC4899)' }}>
                    {pkg.tag}
                  </span>
                )}

                <div className="flex items-center gap-3">
                  {/* 선택 라디오 */}
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: isSelected ? '#8B5CF6' : '#374151' }}>
                    {isSelected && (
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#8B5CF6' }} />
                    )}
                  </div>

                  {/* 냥 아이콘 */}
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {Array.from({ length: Math.min(total, 5) }).map((_, i) => (
                      <span key={i} className="text-base">🪙</span>
                    ))}
                    {total > 5 && <span className="text-yellow-400 text-xs font-bold">×{total}</span>}
                  </div>

                  {/* 텍스트 */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{pkg.name}</span>
                      {pkg.bonus > 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full text-green-400 font-medium"
                          style={{ background: '#10B98120' }}>
                          +{pkg.bonus}냥 보너스
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{pkg.desc}</p>
                  </div>

                  {/* 가격 */}
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-white text-sm">{pkg.price.toLocaleString()}원</p>
                    {pkg.bonus > 0 && (
                      <p className="text-xs text-gray-600 line-through">
                        {(total * 990).toLocaleString()}원
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
          <button
            onClick={handlePurchase}
            disabled={!selected || loading}
            className="w-full py-4 rounded-2xl font-black text-base text-white transition-all disabled:opacity-40"
            style={{
              background: selected
                ? 'linear-gradient(135deg, #8B5CF6, #EC4899)'
                : '#1f1f2e',
            }}>
            {loading
              ? '결제 준비 중...'
              : selected
                ? `${selectedPkg!.price.toLocaleString()}원 결제하기 →`
                : '패키지를 선택하세요'}
          </button>
          <p className="text-center text-gray-700 text-xs mt-3">
            결제 후 엽전이 즉시 지급됩니다 · 토스페이먼츠 안전결제
          </p>
        </div>
      </div>
    </div>
  )
}
