'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { NYANG_PRICE } from '@/lib/pricing'
import { listSalePackages, totalNyang } from '@/lib/chargePackages'

interface YeopjeunShopProps {
  onClose: () => void
  currentBalance?: number
}

export default function YeopjeunShop({ onClose, currentBalance = 0 }: YeopjeunShopProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const packages = listSalePackages()

  const handlePurchase = async () => {
    if (!selected) return
    setLoading(true)
    router.push(`/pay/charge?packageId=${encodeURIComponent(selected)}`)
  }

  const selectedPkg = packages.find(p => p.id === selected)

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center"
      onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl border-t border-gray-800 overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #13111f 0%, #0a0a0f 100%)' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-700 rounded-full" />
        </div>

        <div className="px-5 pt-2 pb-4 border-b border-gray-800/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-black">🪙 엽전 충전</p>
              <p className="text-xs text-gray-500 mt-0.5">현재 보유 <span className="text-yellow-400 font-bold">{currentBalance}냥</span></p>
            </div>
            <button onClick={onClose} className="text-gray-600 text-xl px-2">✕</button>
          </div>

          <div className="mt-3 flex items-center gap-3 p-3 rounded-2xl bg-[#1a1025]/80 border border-purple-900/30">
            <div className="text-center flex-1">
              <p className="text-yellow-400 font-black text-lg">🪙 1냥</p>
              <p className="text-gray-500 text-xs">= {NYANG_PRICE.toLocaleString()}원</p>
            </div>
            <div className="text-gray-700">↔</div>
            <div className="text-center flex-1">
              <p className="text-purple-400 font-black text-lg">🔮 1풀이</p>
              <p className="text-gray-500 text-xs">사주 전체보기 1냥</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 space-y-2.5">
          {packages.map(pkg => {
            const total = totalNyang(pkg)
            const isSelected = selected === pkg.id
            return (
              <button
                key={pkg.id}
                onClick={() => setSelected(pkg.id)}
                className="w-full rounded-2xl p-4 text-left transition-all relative"
                style={{
                  background: isSelected
                    ? pkg.id === 'nyang-5'
                      ? 'linear-gradient(135deg, #2d1b69, #1a0a2e)'
                      : 'linear-gradient(135deg, #1a1025, #13111f)'
                    : '#111118',
                  border: isSelected
                    ? `2px solid ${pkg.id === 'nyang-5' ? '#8B5CF6' : '#6D28D9'}`
                    : '2px solid #1f1f2e',
                }}>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={{ borderColor: isSelected ? '#8B5CF6' : '#374151' }}>
                    {isSelected && (
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#8B5CF6' }} />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{pkg.name}</span>
                      {pkg.id === 'nyang-5' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-black text-black"
                          style={{ background: 'linear-gradient(135deg, #F59E0B, #EC4899)' }}>
                          BEST
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                      결제 {pkg.amountKrw.toLocaleString()}원 · 유상 {pkg.paidNyang}냥
                      {pkg.bonusNyang > 0 ? ` · 보너스 ${pkg.bonusNyang}냥` : ' · 보너스 없음'} · 총 {total}냥
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-black text-white text-sm">{pkg.amountKrw.toLocaleString()}원</p>
                    <p className="text-[10px] text-yellow-400">총 {total}냥</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

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
              ? '결제 화면으로 이동 중...'
              : selected
                ? `${selectedPkg!.amountKrw.toLocaleString()}원 · 총 ${totalNyang(selectedPkg!)}냥 충전`
                : '패키지를 선택하세요'}
          </button>
          <p className="text-center text-gray-700 text-xs mt-3">
            금액·지급량은 서버가 패키지로 확정합니다 · 토스페이먼츠
          </p>
        </div>
      </div>
    </div>
  )
}
