// lib/pricing.ts
// 가격을 여기서 한 번만 바꾸면 화면 전체(엽전샵, 결제 요청, 결제 승인 검증)에 동시에 반영됩니다.

// 엽전 1냥 개별가 (원)
export const NYANG_PRICE = 1900

// 신규 사주 전체보기: 현금 결제가 아니라 엽전 1냥 차감
export const SAJU_UNLOCK_NYANG = 1

// 구 현금 잠금해제 주문(unlock_…) 승인 검증용. 신규 주문 생성에 쓰지 않는다.
export const LEGACY_UNLOCK_PRICE = 4900

/** @deprecated 신규 잠금해제는 SAJU_UNLOCK_NYANG. 구 주문 confirm만 LEGACY_UNLOCK_PRICE. */
export const UNLOCK_PRICE = LEGACY_UNLOCK_PRICE

// 미결제 시 본문을 보여주는 판결문 수 (is_free가 없을 때)
export const FREE_TITLE_COUNT = 3
