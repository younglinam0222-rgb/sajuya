// lib/pricing.ts
// 가격을 여기서 한 번만 바꾸면 화면 전체(엽전샵, 결제 요청, 결제 승인 검증)에 동시에 반영됩니다.

// 엽전 1냥 개별가 (원) — 사주 풀이 1회 기준
export const NYANG_PRICE = 1900

// 3냥 패키지 특가 = 전체 판결문 잠금 해제 가격 (원)
// 개별가 기준 3냥 = 5,700원인데 4,900원으로 묶어팔아 결제 유도
export const UNLOCK_PRICE = 4900

// 무료로 공개되는 판결문 개수 (나머지는 잠금) — 현재는 로그인 게이트로 대체되어 미사용
export const FREE_TITLE_COUNT = 3
