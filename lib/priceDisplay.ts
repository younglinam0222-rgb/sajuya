import { NYANG_PRICE } from '@/lib/pricing'

/** 신규 판매 표시 환산. 기존 결제 금액·잔액·영수증은 변경하지 않는다. */
export const DISPLAY_NYANG_WON = NYANG_PRICE

export const SERVICE_PRICE_NYANG = {
  saju: 2,
  gunghap: 1,
  daeun: 1,
  taekil: 1,
  yearly: 1,
  daily: 1,
} as const

export type PricedService = keyof typeof SERVICE_PRICE_NYANG

export const SAJU_FULL_VIEW_NYANG = SERVICE_PRICE_NYANG.saju

export function formatNyangWon(nyang: number): string {
  return `${nyang}냥 (${(nyang * DISPLAY_NYANG_WON).toLocaleString('ko-KR')}원)`
}

export function servicePriceBadge(service: PricedService): string {
  if (service === 'daily') return '하루 1회 무료'
  return `${SERVICE_PRICE_NYANG[service]}냥`
}

export function servicePriceLine(service: PricedService): string {
  if (service === 'daily') return `하루 1회 무료 · 추가 ${formatNyangWon(SERVICE_PRICE_NYANG.daily)}`
  return formatNyangWon(SERVICE_PRICE_NYANG[service])
}

export function sajuFullViewButtonLabel(): string {
  return `${SAJU_FULL_VIEW_NYANG}냥으로 전체보기`
}

export function sajuFullViewHint(): string {
  return `${(SAJU_FULL_VIEW_NYANG * DISPLAY_NYANG_WON).toLocaleString('ko-KR')}원 상당 · 나머지 풀이 9개와 족집게 답변 포함`
}
