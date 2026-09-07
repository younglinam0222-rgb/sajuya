// lib/pricing.ts
// 가격을 여기서 한 번만 바꾸면 화면 전체(엽전샵, 결제 요청, 결제 승인 검증)에 동시에 반영됩니다.

// 엽전 1냥 개별가 (원) — 신규 판매 표시 환산. 기존 결제 금액은 변경하지 않는다.
export const NYANG_PRICE = 1900

// 3냥 패키지 특가 = 전체 판결문 잠금 해제 가격 (원)
// 개별가 기준 3냥 = 5,700원인데 4,900원으로 묶어팔아 결제 유도
export const UNLOCK_PRICE = 4900

// 무료로 공개되는 사주 판결문 개수 (성격·재물운·애정운)
export const FREE_TITLE_COUNT = 3

/** 사주 전체보기 차감 엽전. 표시 금액은 NYANG_PRICE * 이 값. */
export const SAJU_UNLOCK_NYANG = 2
