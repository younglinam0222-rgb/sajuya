export const GROUP_IDS = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
  [10, 11, 12],
] as const

export const REQUIRED_TITLE_IDS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] as const

export const REQUIRED_GROUP_INDEXES = [0, 1, 2, 3] as const

export type SajuTitleLike = {
  id?: unknown
  title?: unknown
  content?: unknown
}

export type SajuStrategyLike = {
  overview?: unknown
  golden_period?: unknown
  lifecycle?: unknown
  peak_guide?: unknown
  warning?: unknown
  final_word?: unknown
}

export function groupIndexForId(id: string | number): number | null {
  const n = Number(id)
  if (!Number.isInteger(n) || n < 1 || n > 12) return null
  return Math.floor((n - 1) / 3)
}

export function isValidTitle(item: unknown): item is SajuTitleLike {
  if (!item || typeof item !== 'object') return false
  const t = item as SajuTitleLike
  const id = String(t.id ?? '')
  if (!REQUIRED_TITLE_IDS.includes(id as typeof REQUIRED_TITLE_IDS[number])) return false
  return typeof t.title === 'string' && t.title.trim().length > 0
    && typeof t.content === 'string' && t.content.trim().length >= 50
}

export function isValidStrategy(strategy: unknown): strategy is SajuStrategyLike {
  if (!strategy || typeof strategy !== 'object') return false
  const s = strategy as SajuStrategyLike
  const textOk = (v: unknown, min: number) => typeof v === 'string' && v.trim().length >= min
  return textOk(s.overview, 10)
    && textOk(s.golden_period, 20)
    && textOk(s.peak_guide, 20)
    && textOk(s.warning, 10)
    && textOk(s.final_word, 20)
    && Array.isArray(s.lifecycle) && s.lifecycle.length >= 3
}

export function isValidPersonal(personal: unknown): boolean {
  if (!personal || typeof personal !== 'object') return false
  const p = personal as { question?: unknown; answer?: unknown }
  return typeof p.question === 'string' && p.question.trim().length > 0
    && typeof p.answer === 'string' && p.answer.trim().length >= 50
}

export function sortTitlesById<T extends { id: string | number }>(titles: T[]): T[] {
  return [...titles].sort((a, b) => Number(a.id) - Number(b.id))
}

export type CompletionReport = {
  complete: boolean
  gotDone: boolean
  missingIds: string[]
  missingGroups: number[]
  strategyOk: boolean
  personalOk: boolean
  receivedGroupIndexes: number[]
}

export function assessCompletion(input: {
  titles: unknown[]
  strategy: unknown
  personal: unknown
  requestedPersonal: boolean
  receivedGroupIndexes: Iterable<number>
  gotDone: boolean
}): CompletionReport {
  const byId = new Map<string, unknown>()
  for (const item of input.titles) {
    if (item && typeof item === 'object' && 'id' in item) {
      byId.set(String((item as { id: unknown }).id), item)
    }
  }
  const missingIds = REQUIRED_TITLE_IDS.filter(id => !isValidTitle(byId.get(id)))
  const received = [...new Set(input.receivedGroupIndexes)].filter(g => g >= 0 && g <= 3).sort((a, b) => a - b)
  const missingGroups = REQUIRED_GROUP_INDEXES.filter(g => !received.includes(g))
  const strategyOk = isValidStrategy(input.strategy)
  const personalOk = !input.requestedPersonal || isValidPersonal(input.personal)
  return {
    complete: input.gotDone && missingIds.length === 0 && missingGroups.length === 0 && strategyOk && personalOk,
    gotDone: input.gotDone,
    missingIds,
    missingGroups,
    strategyOk,
    personalOk,
    receivedGroupIndexes: received,
  }
}
