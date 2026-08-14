// lib/pricing.ts
// 가격을 여기서 한 번만 바꾸면 결제 요청 화면(app/pay/[shareId])과
// 결제 승인 검증(app/api/pay/confirm)에 동시에 반영됩니다.

// 전체 판결문 잠금 해제 가격 (원)
export const UNLOCK_PRICE = 4900

// 무료로 공개되는 판결문 개수 (나머지는 잠금)
export const FREE_TITLE_COUNT = 3
