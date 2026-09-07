// 화면 표시용. 결제·잔액·Toss 금액(lib/pricing.ts)은 건드리지 않는다.
export const DISPLAY_NYANG_WON = 990

export const SERVICE_PRICE_NYANG = {
  saju: 2,
  gunghap: 2,
  daeun: 2,
  taekil: 1,
  daily: 1,
} as const

export type PricedService = keyof typeof SERVICE_PRICE_NYANG

export function formatNyangWon(nyang: number): string {
  return `${nyang}냥 (${(nyang * DISPLAY_NYANG_WON).toLocaleString('ko-KR')}원)`
}

export function servicePriceBadge(service: PricedService): string {
  return `${SERVICE_PRICE_NYANG[service]}냥`
}

export function servicePriceLine(service: PricedService): string {
  return formatNyangWon(SERVICE_PRICE_NYANG[service])
}
