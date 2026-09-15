/** 실제 잔액 차감·충전 연결 여부. 기본 비활성. 결제 API/Toss 금액은 건드리지 않는다. */
export function isPaymentsEnabled(): boolean {
  return process.env.PAYMENTS_ENABLED === 'true'
}
