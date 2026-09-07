import type { ElementCount } from './sajuCalc'

const KO_NUM: Record<string, number> = {
  없: 0, 전무: 0, 제로: 0, 하나: 1, 한: 1, 둘: 2, 두: 2, 셋: 3, 넷: 4, 네: 4, 다섯: 5, 여섯: 6, 일곱: 7, 여덟: 8,
}

const EL_ALIASES: Record<string, keyof ElementCount> = {
  목: '木', 나무: '木', 화: '火', 불: '火', 토: '土', 땅: '土', 금: '金', 금속: '金', 수: '水', 물: '水',
}

export type CitationMismatch = {
  element: keyof ElementCount
  cited: number
  expected: number
  snippet: string
}

function toCount(raw: string): number | null {
  if (/^\d+$/.test(raw)) return Number(raw)
  if (raw in KO_NUM) return KO_NUM[raw]
  return null
}

/**
 * 명시적으로 "오행 + 개수"를 인용한 경우만 검출한다.
 * "불같은 성격", "물 흐르듯" 같은 비유는 잡지 못한다.
 */
export function findElementCountMismatches(text: string, expected: ElementCount): CitationMismatch[] {
  const mismatches: CitationMismatch[] = []
  const seen = new Set<string>()
  const patterns = [
    /(목|화|토|금|수|나무|불|땅|금속|물)\s*(기운)?\s*(이|은|는)?\s*(딱\s*)?(없|전무|제로|하나|한|둘|두|셋|넷|네|다섯|여섯|일곱|여덟|\d+)\s*(개|가지)?/g,
  ]
  for (const re of patterns) {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      const el = EL_ALIASES[m[1]]
      const cited = toCount(m[5])
      if (!el || cited == null) continue
      const key = `${el}:${m[0]}`
      if (seen.has(key)) continue
      seen.add(key)
      if (cited !== expected[el]) {
        mismatches.push({ element: el, cited, expected: expected[el], snippet: m[0].slice(0, 40) })
      }
    }
  }
  return mismatches
}

export function assertNoElementCitationMismatch(text: string, expected: ElementCount) {
  const bad = findElementCountMismatches(text, expected)
  if (bad.length) {
    throw new Error(`오행 수치 불일치: ${bad.map(b => `${b.snippet}(계산 ${b.expected})`).join(', ')}`)
  }
}
