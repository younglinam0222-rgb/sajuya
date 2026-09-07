import { NYANG_PRICE, FREE_TITLE_COUNT } from './pricing'

export const FREE_CATEGORIES = ['성격', '재물운', '애정운'] as const
export const FREE_TITLE_IDS = ['1', '2', '3'] as const
export const PAID_TITLE_IDS = ['4', '5', '6', '7', '8', '9', '10', '11', '12'] as const

export const FREE_ID_GROUPS = [[1, 2, 3]] as const
export const FREE_CATEGORY_GROUPS = [['성격', '재물운', '애정운']] as const

export const PAID_ID_GROUPS = [
  [4, 5],
  [6, 7],
  [8, 9],
  [10, 11],
  [12],
] as const
export const PAID_CATEGORY_GROUPS = [
  ['직업운', '건강운'],
  ['인간관계', '대운'],
  ['인생흐름', '어울리는 지역'],
  ['올해 총운', '위기관리'],
  ['결혼운'],
] as const

export function isFreeCategory(category: unknown) {
  return typeof category === 'string' && (FREE_CATEGORIES as readonly string[]).includes(category)
}

export function isFreeTitleId(id: unknown) {
  return FREE_TITLE_IDS.includes(String(id) as typeof FREE_TITLE_IDS[number])
}

export function titleIsFreeScope(title: { id?: unknown; category?: unknown; is_free?: unknown }) {
  if (isFreeCategory(title.category) || isFreeTitleId(title.id)) return true
  return false
}

export function keepFreeAiResult(raw: string): string {
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return JSON.stringify({ titles: [] })
    const titles = Array.isArray(parsed.titles) ? parsed.titles : []
    parsed.titles = titles
      .filter((t: { id?: unknown; category?: unknown }) => titleIsFreeScope(t))
      .slice(0, FREE_TITLE_COUNT)
    delete parsed.strategy
    if (parsed.personalAnswer && typeof parsed.personalAnswer === 'object') {
      const q = (parsed.personalAnswer as { question?: unknown }).question
      parsed.personalAnswer = { question: typeof q === 'string' ? q : '', answer: '' }
    }
    return JSON.stringify(parsed)
  } catch {
    return JSON.stringify({ titles: [] })
  }
}

export function assessFreeComplete(titles: { id?: unknown }[], gotDone: boolean) {
  const ids = new Set(titles.map(t => String(t.id)))
  const missing = FREE_TITLE_IDS.filter(id => !ids.has(id))
  return { complete: gotDone && missing.length === 0, missing }
}

export function assessFreeStage(input: {
  titles: { id?: unknown }[]
  receivedGroupIndexes: Iterable<number>
  gotDone: boolean
}) {
  const ids = new Set(input.titles.map(t => String(t.id)))
  const missingIds = FREE_TITLE_IDS.filter(id => !ids.has(id))
  const received = [...new Set(input.receivedGroupIndexes)].filter(g => g === 0)
  const missingGroups = received.includes(0) ? [] : [0]
  return {
    complete: input.gotDone && missingIds.length === 0 && missingGroups.length === 0,
    gotDone: input.gotDone,
    missingIds: [...missingIds],
    missingGroups,
    strategyOk: true,
    personalOk: true,
    receivedGroupIndexes: received,
  }
}

export function mergePaidIntoFree(
  existingRaw: string,
  paid: {
    titles?: unknown[]
    strategy?: unknown
    personalAnswer?: unknown
  },
) {
  let base: Record<string, unknown> = { titles: [] }
  try {
    const parsed = JSON.parse(existingRaw)
    if (parsed && typeof parsed === 'object') base = parsed as Record<string, unknown>
  } catch { /* keep empty */ }
  const byId = new Map<string, unknown>()
  const existingTitles = Array.isArray(base.titles) ? base.titles : []
  for (const t of existingTitles) {
    if (t && typeof t === 'object' && 'id' in t) byId.set(String((t as { id: unknown }).id), t)
  }
  for (const t of paid.titles ?? []) {
    if (t && typeof t === 'object' && 'id' in t) byId.set(String((t as { id: unknown }).id), t)
  }
  const titles = [...byId.values()].sort((a, b) => {
    const ia = Number((a as { id?: unknown }).id)
    const ib = Number((b as { id?: unknown }).id)
    return ia - ib
  })
  if (paid.strategy) base.strategy = paid.strategy
  if (paid.personalAnswer) base.personalAnswer = paid.personalAnswer
  base.titles = titles
  return JSON.stringify(base)
}
