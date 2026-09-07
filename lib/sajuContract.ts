export const GROUP_IDS = [
  [1, 2],
  [3, 4],
  [5, 6],
  [7, 8],
  [9, 10],
  [11, 12],
] as const

export const FREE_TITLE_IDS = ['1', '2', '3'] as const
export const PAID_TITLE_IDS = ['4', '5', '6', '7', '8', '9', '10', '11', '12'] as const

export const PAID_TITLE_SLOTS = [
  { id: '4', category: '직업운' },
  { id: '5', category: '건강운' },
  { id: '6', category: '인간관계' },
  { id: '7', category: '대운' },
  { id: '8', category: '인생흐름' },
  { id: '9', category: '어울리는 지역' },
  { id: '10', category: '올해 총운' },
  { id: '11', category: '위기관리' },
  { id: '12', category: '결혼운' },
] as const

export const SAMPLE_JUDGMENT_GROUPS = [
  { ids: [1, 2], categories: ['성격', '재물운'] },
  { ids: [3], categories: ['애정운'] },
] as const

export const PAID_JUDGMENT_GROUPS = [
  { ids: [4], categories: ['직업운'] },
  { ids: [5, 6], categories: ['건강운', '인간관계'] },
  { ids: [7, 8], categories: ['대운', '인생흐름'] },
  { ids: [9, 10], categories: ['어울리는 지역', '올해 총운'] },
  { ids: [11, 12], categories: ['위기관리', '결혼운'] },
] as const

export const REQUIRED_TITLE_IDS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'] as const

export const REQUIRED_GROUP_INDEXES = [0, 1, 2, 3, 4, 5] as const
export const LAST_GROUP_INDEX = 5
export const SAMPLE_LAST_GROUP_INDEX = SAMPLE_JUDGMENT_GROUPS.length - 1
export const PAID_LAST_GROUP_INDEX = PAID_JUDGMENT_GROUPS.length - 1

export function groupIndexForId(id: string | number): number | null {
  const n = Number(id)
  if (!Number.isInteger(n) || n < 1 || n > 12) return null
  return Math.floor((n - 1) / 2)
}

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

export const PEAK_GUIDE_LABEL = '전성기 활용법'

export type PersonalAnswer = { question: string; answer: string }

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

export function extractPersonalQuestion(payload: unknown, fallbackQuestion = ''): string {
  const fallback = fallbackQuestion.trim()
  if (typeof payload === 'string') return fallback
  const o = asRecord(payload)
  if (!o) return fallback
  const data = asRecord(o.data)
  const nested = asRecord(o.personalAnswer)
  const questionRaw = [o.question, data?.question, nested?.question, fallback]
    .find(v => typeof v === 'string' && v.trim())
  return typeof questionRaw === 'string' ? questionRaw.trim() : ''
}

export function readingPersonalView(aiResult: unknown, sajuData: unknown): {
  requested: boolean
  question: string
  answer: string
} {
  const root = asRecord(sajuData)
  const form = asRecord(root?.form)
  const fallback = typeof form?.personalQuestion === 'string' ? form.personalQuestion.trim() : ''
  const question = extractPersonalQuestion(aiResult, fallback)
  const personal = extractPersonalAnswer(aiResult, question || fallback)
  const resolvedQuestion = (personal?.question || question || fallback).trim()
  return {
    requested: resolvedQuestion.length > 0,
    question: resolvedQuestion,
    answer: personal?.answer ?? '',
  }
}

/** SSE `personal` 이벤트와 저장 JSON 양쪽 계약을 하나의 { question, answer }로 맞춘다. */
export function normalizePersonalAnswer(source: unknown, fallbackQuestion = ''): PersonalAnswer | null {
  if (typeof source === 'string' && source.trim()) {
    return { question: fallbackQuestion.trim(), answer: source.trim() }
  }
  if (!source || typeof source !== 'object') return null
  const o = source as Record<string, unknown>
  const data = o.data && typeof o.data === 'object' && !Array.isArray(o.data)
    ? o.data as Record<string, unknown>
    : null
  const nested = o.personalAnswer && typeof o.personalAnswer === 'object'
    ? o.personalAnswer as Record<string, unknown>
    : null

  const questionRaw = [o.question, data?.question, nested?.question, fallbackQuestion]
    .find(v => typeof v === 'string' && v.trim())
  const answerRaw = [o.answer, data?.answer, nested?.answer]
    .find(v => typeof v === 'string' && v.trim())

  if (typeof answerRaw !== 'string' || !answerRaw.trim()) return null
  return {
    question: typeof questionRaw === 'string' ? questionRaw.trim() : '',
    answer: answerRaw.trim(),
  }
}

export function extractPersonalAnswer(payload: unknown, fallbackQuestion = ''): PersonalAnswer | null {
  if (!payload || typeof payload !== 'object') return null
  const o = payload as Record<string, unknown>
  return normalizePersonalAnswer(o.personalAnswer ?? o.personal ?? payload, fallbackQuestion)
}

export function isValidPersonal(personal: unknown): boolean {
  const parsed = normalizePersonalAnswer(personal)
  return !!parsed && parsed.question.length > 0 && parsed.answer.length >= 50
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

export function assessSampleCompletion(input: {
  titles: unknown[]
  receivedGroupIndexes: Iterable<number>
  gotDone: boolean
}): CompletionReport {
  const byId = new Map<string, unknown>()
  for (const item of input.titles) {
    if (item && typeof item === 'object' && 'id' in item) {
      byId.set(String((item as { id: unknown }).id), item)
    }
  }
  const missingIds = FREE_TITLE_IDS.filter(id => !isValidTitle(byId.get(id)))
  const received = [...new Set(input.receivedGroupIndexes)].filter(g => g >= 0 && g <= 1).sort((a, b) => a - b)
  const missingGroups = [0, 1].filter(g => !received.includes(g))
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
  const received = [...new Set(input.receivedGroupIndexes)].filter(g => g >= 0 && g <= LAST_GROUP_INDEX).sort((a, b) => a - b)
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
