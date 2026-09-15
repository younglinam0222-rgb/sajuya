/** Display-only Korean nyang labels. Ledger, balances, and payments stay numeric. */

const NATIVE_ONES = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉']
const NATIVE_TENS = ['', '열', '스물', '서른', '마흔', '쉰', '예순', '일흔', '여든', '아흔']
const SINO_ONES = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구']

function nativeUnderHundred(n: number): string {
  if (n <= 0) return ''
  if (n === 20) return '스무'
  const tens = Math.floor(n / 10)
  const ones = n % 10
  if (tens === 0) return NATIVE_ONES[ones]
  if (tens === 1) return ones ? `열${NATIVE_ONES[ones]}` : '열'
  return `${NATIVE_TENS[tens]}${ones ? NATIVE_ONES[ones] : ''}`
}

function sinoUnit(count: number, unit: '백' | '천' | '만'): string {
  if (count <= 0) return ''
  if (count === 1) return unit
  if (count < 10) return `${SINO_ONES[count]}${unit}`
  return `${nativeKoreanCount(count)}${unit}`
}

export function nativeKoreanCount(n: number): string {
  if (!Number.isFinite(n)) return ''
  const value = Math.trunc(n)
  if (value < 0) return String(value)
  if (value === 0) return '영'
  if (value >= 100_000_000) return value.toLocaleString('ko-KR')
  const man = Math.floor(value / 10_000)
  const rest = value % 10_000
  const thousand = Math.floor(rest / 1000)
  const hundred = Math.floor((rest % 1000) / 100)
  const under = rest % 100
  return `${man ? sinoUnit(man, '만') : ''}${thousand ? sinoUnit(thousand, '천') : ''}${hundred ? sinoUnit(hundred, '백') : ''}${nativeUnderHundred(under)}`
}

export function formatNyang(n: number): string {
  if (!Number.isFinite(n)) return ''
  const value = Math.trunc(n)
  if (value < 0) return `${value}냥`
  return `${nativeKoreanCount(value)}냥`
}

export function formatHeldNyang(n: number): string {
  if (!Number.isFinite(n) || Math.trunc(n) <= 0) return '보유 엽전 없음'
  return `보유 엽전: ${formatNyang(n)}`
}

export function formatNyangCost(n: number): string {
  return `${formatNyang(n)}으로`
}
