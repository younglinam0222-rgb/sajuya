import { NYANG_PRICE } from './pricing'

/** 신규 판매 카탈로그. 주문 스냅샷이 이후 카탈로그 변경에 영향받지 않는다. */
export const CHARGE_PACKAGE_VERSION = 'charge-v4-discount-20260907'

export type ChargePackageId = 'nyang-1' | 'nyang-5' | 'nyang-10'

export type ChargePackage = {
  id: string
  name: string
  paidNyang: number
  bonusNyang: number
  amountKrw: number
  listPriceKrw: number
  discountKrw: number
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
    amountKrw: NYANG_PRICE,
    listPriceKrw: NYANG_PRICE,
    discountKrw: 0,
    currency: 'KRW',
    forSale: true,
    version: CHARGE_PACKAGE_VERSION,
  },
  'nyang-5': {
    id: 'nyang-5',
    name: '5냥',
    paidNyang: 5,
    bonusNyang: 0,
    amountKrw: 9000,
    listPriceKrw: 5 * NYANG_PRICE,
    discountKrw: 500,
    currency: 'KRW',
    forSale: true,
    version: CHARGE_PACKAGE_VERSION,
  },
  'nyang-10': {
    id: 'nyang-10',
    name: '10냥',
    paidNyang: 10,
    bonusNyang: 0,
    amountKrw: 18000,
    listPriceKrw: 10 * NYANG_PRICE,
    discountKrw: 1000,
    currency: 'KRW',
    forSale: true,
    version: CHARGE_PACKAGE_VERSION,
  },
}

/** 신규 판매 제외. 과거 주문 조회·기존 보너스 잔액 보존용. */
export const LEGACY_CHARGE_PACKAGES: ChargePackage[] = [
  {
    id: 'one',
    name: '한 냥 (구)',
    paidNyang: 1,
    bonusNyang: 0,
    amountKrw: 1900,
    listPriceKrw: 1900,
    discountKrw: 0,
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
    listPriceKrw: 5700,
    discountKrw: 800,
    currency: 'KRW',
    forSale: false,
    version: 'legacy-v1',
  },
  {
    id: 'nyang-5',
    name: '5+1냥 (구 보너스)',
    paidNyang: 5,
    bonusNyang: 1,
    amountKrw: 9500,
    listPriceKrw: 9500,
    discountKrw: 0,
    currency: 'KRW',
    forSale: false,
    version: 'charge-v3-20260907',
  },
  {
    id: 'nyang-10',
    name: '10+2냥 (구 보너스)',
    paidNyang: 10,
    bonusNyang: 2,
    amountKrw: 19000,
    listPriceKrw: 19000,
    discountKrw: 0,
    currency: 'KRW',
    forSale: false,
    version: 'charge-v3-20260907',
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
