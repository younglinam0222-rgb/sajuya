import { NYANG_PRICE } from './pricing'

/** 신규 판매 카탈로그 버전. 주문에 스냅샷으로 저장하고, 이후 카탈로그 변경이 기존 주문을 바꾸지 않는다. */
export const CHARGE_PACKAGE_VERSION = 'charge-v3-20260907'

export type ChargePackageId = 'nyang-1' | 'nyang-5' | 'nyang-10'
export type LegacyChargePackageId = 'one' | 'three'

export type ChargePackage = {
  id: string
  name: string
  paidNyang: number
  bonusNyang: number
  amountKrw: number
  currency: 'KRW'
  forSale: boolean
  version: string
}

const SALE: Record<ChargePackageId, ChargePackage> = {
  'nyang-1': {
    id: 'nyang-1',
    name: '1냥',
    paidNyang: 1,
    bonusNyang: 0,
    amountKrw: 1 * NYANG_PRICE,
    currency: 'KRW',
    forSale: true,
    version: CHARGE_PACKAGE_VERSION,
  },
  'nyang-5': {
    id: 'nyang-5',
    name: '5냥',
    paidNyang: 5,
    bonusNyang: 1,
    amountKrw: 5 * NYANG_PRICE,
    currency: 'KRW',
    forSale: true,
    version: CHARGE_PACKAGE_VERSION,
  },
  'nyang-10': {
    id: 'nyang-10',
    name: '10냥',
    paidNyang: 10,
    bonusNyang: 2,
    amountKrw: 10 * NYANG_PRICE,
    currency: 'KRW',
    forSale: true,
    version: CHARGE_PACKAGE_VERSION,
  },
}

/** 신규 판매에서 제외. 과거 주문 조회·취소용으로만 보존. 신규 주문 생성에 쓰지 않는다. */
export const LEGACY_CHARGE_PACKAGES: ChargePackage[] = [
  {
    id: 'one',
    name: '한 냥 (구)',
    paidNyang: 1,
    bonusNyang: 0,
    amountKrw: 1900,
    currency: 'KRW',
    forSale: false,
    version: 'legacy-v1',
  },
  {
    id: 'three',
    name: '3냥 패키지 (구)',
    paidNyang: 3,
    bonusNyang: 0,
    amountKrw: 4900,
    currency: 'KRW',
    forSale: false,
    version: 'legacy-v1',
  },
]

export function listSalePackages(): ChargePackage[] {
  return [SALE['nyang-1'], SALE['nyang-5'], SALE['nyang-10']]
}

export function getSalePackage(id: unknown): ChargePackage | null {
  if (id !== 'nyang-1' && id !== 'nyang-5' && id !== 'nyang-10') return null
  return SALE[id]
}

export function totalNyang(pkg: Pick<ChargePackage, 'paidNyang' | 'bonusNyang'>) {
  return pkg.paidNyang + pkg.bonusNyang
}

export function isUnlockOrderId(orderId: string) {
  return orderId.startsWith('unlock_')
}

export function isChargeOrderId(orderId: string) {
  return orderId.startsWith('yj_')
}
