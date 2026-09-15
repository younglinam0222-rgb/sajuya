import { FREE_TITLE_COUNT } from '@/lib/pricing'
import { PAID_TITLE_IDS, FREE_TITLE_IDS, PAID_TITLE_SLOTS, readingPersonalView } from '@/lib/sajuContract'

export type AccessLevel = 'public' | 'owner_free' | 'owner_paid'

export type PaidGenerationStatus = 'pending' | 'completed' | 'failed'

export type PaidGenerationState = {
  status: PaidGenerationStatus
  requestId?: string | null
  startedAt?: number
  updatedAt?: number
  error?: string | null
}

export function viewerAccess(readingUserId: string | null | undefined, viewerId: string | null, isPaid: boolean): AccessLevel {
  const owner = !!readingUserId && !!viewerId && readingUserId === viewerId
  if (owner && isPaid) return 'owner_paid'
  if (owner) return 'owner_free'
  return 'public'
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

export function parseAiResult(aiResult: unknown): Record<string, unknown> | null {
  if (!aiResult) return null
  if (typeof aiResult === 'object' && !Array.isArray(aiResult)) return aiResult as Record<string, unknown>
  if (typeof aiResult !== 'string') return null
  try {
    let clean = aiResult.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
    const s = clean.indexOf('{')
    const e = clean.lastIndexOf('}')
    if (s !== -1 && e !== -1) clean = clean.slice(s, e + 1)
    const parsed = JSON.parse(clean)
    return asRecord(parsed)
  } catch {
    return null
  }
}

export function getPaidGeneration(aiResult: unknown): PaidGenerationState | null {
  const meta = asRecord(parseAiResult(aiResult)?._meta)
  const raw = asRecord(meta?.paidGeneration)
  if (!raw) return null
  const status = raw.status
  if (status !== 'pending' && status !== 'completed' && status !== 'failed') return null
  return {
    status,
    requestId: typeof raw.requestId === 'string' ? raw.requestId : null,
    startedAt: typeof raw.startedAt === 'number' ? raw.startedAt : undefined,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : undefined,
    error: typeof raw.error === 'string' ? raw.error : null,
  }
}

export function withPaidGeneration(aiResult: unknown, state: PaidGenerationState): string {
  const parsed = parseAiResult(aiResult) ?? { titles: [] }
  const prevMeta = asRecord(parsed._meta) ?? {}
  parsed._meta = {
    ...prevMeta,
    paidGeneration: {
      ...state,
      updatedAt: Date.now(),
    },
  }
  return JSON.stringify(parsed)
}

function titleId(item: unknown): string {
  return String((item as { id?: unknown })?.id ?? '')
}

function titleContent(item: unknown): string {
  return typeof (item as { content?: unknown })?.content === 'string'
    ? (item as { content: string }).content.trim()
    : ''
}

export function freeTitlesOf(titles: unknown[]): Record<string, unknown>[] {
  return titles.filter(t => (FREE_TITLE_IDS as readonly string[]).includes(titleId(t))) as Record<string, unknown>[]
}

export function paidTitlesPresent(aiResult: unknown): number {
  const titles = Array.isArray(parseAiResult(aiResult)?.titles) ? parseAiResult(aiResult)!.titles as unknown[] : []
  return titles.filter(t => (PAID_TITLE_IDS as readonly string[]).includes(titleId(t)) && titleContent(t).length >= 50).length
}

export function lockedPaidSlots() {
  return PAID_TITLE_SLOTS.map(slot => ({
    id: slot.id,
    category: slot.category,
    title: '',
    teaser: '',
    is_free: false,
    content: '',
    locked: true,
  }))
}

export function redactSajuData(sajuData: unknown, access: AccessLevel): unknown {
  if (access !== 'public' || sajuData == null) return sajuData
  try {
    const parsed = typeof sajuData === 'string' ? JSON.parse(sajuData) : sajuData
    const root = asRecord(parsed)
    if (!root) return sajuData
    const form = asRecord(root.form)
    if (!form) return parsed
    const { personalQuestion: _drop, ...formRest } = form
    return { ...root, form: formRest }
  } catch {
    return sajuData
  }
}

/** 유료 본문을 응답에서 제거한다. CSS 블러용으로 내용을 남기지 않는다. */
export function redactAiResult(aiResult: unknown, access: AccessLevel, sajuData?: unknown): unknown {
  const parsed = parseAiResult(aiResult)
  if (!parsed) return access === 'owner_paid' ? aiResult : null
  if (access === 'owner_paid') return parsed

  const titles = Array.isArray(parsed.titles) ? parsed.titles : []
  const freeTitles = freeTitlesOf(titles).map(t => ({
    ...t,
    is_free: true,
    content: t.content,
    locked: false,
  }))

  const view = readingPersonalView(parsed, sajuData)
  const question = view.question.trim()

  return {
    titles: [
      ...freeTitles,
      ...(access === 'owner_free' ? lockedPaidSlots() : []),
    ],
    strategy: null,
    personalAnswer: access === 'owner_free' && question
      ? { question, answer: '', locked: true }
      : null,
    _meta: {
      ...(asRecord(parsed._meta) ?? {}),
      access,
      freeTitleCount: FREE_TITLE_COUNT,
      paidTitleCount: PAID_TITLE_IDS.length,
      redacted: true,
    },
    disclaimer: parsed.disclaimer,
  }
}

export function publicReadingPayload(row: Record<string, unknown>, access: AccessLevel) {
  const ai = redactAiResult(row.ai_result, access, row.saju_data)
  return {
    share_id: row.share_id,
    character_id: row.character_id,
    created_at: row.created_at,
    is_paid: access === 'owner_paid',
    access,
    saju_data: redactSajuData(row.saju_data, access),
    ai_result: typeof row.ai_result === 'string' ? JSON.stringify(ai) : ai,
    paid_generation: access === 'owner_paid' || access === 'owner_free'
      ? getPaidGeneration(row.ai_result)
      : null,
  }
}

function mergeTitles(prevTitles: unknown[], nextTitles: unknown[], isPaid: boolean): unknown[] {
  const byId = new Map<string, unknown>()
  for (const item of prevTitles) {
    const id = titleId(item)
    if (!id) continue
    if (!isPaid && !(FREE_TITLE_IDS as readonly string[]).includes(id)) continue
    byId.set(id, item)
  }
  for (const item of nextTitles) {
    const id = titleId(item)
    if (!id) continue
    if (!isPaid && !(FREE_TITLE_IDS as readonly string[]).includes(id)) continue
    const incoming = titleContent(item)
    const existing = titleContent(byId.get(id))
    if (incoming.length >= 50 || incoming.length >= existing.length) byId.set(id, item)
  }
  return [...byId.values()]
}

/** 클라이언트 isPaid를 믿지 않고, 미구매 저장본에 유료 본문이 남지 않게 합친다. */
export function mergeAiResultForSave(existing: unknown, incoming: unknown, isPaid: boolean): Record<string, unknown> {
  const prev = parseAiResult(existing) ?? {}
  const next = parseAiResult(incoming) ?? {}
  const prevTitles = Array.isArray(prev.titles) ? prev.titles : []
  const nextTitles = Array.isArray(next.titles) ? next.titles : []
  const titles = mergeTitles(prevTitles, nextTitles, isPaid)

  const nextPersonal = asRecord(next.personalAnswer)
  const prevPersonal = asRecord(prev.personalAnswer)
  const question = [
    typeof nextPersonal?.question === 'string' ? nextPersonal.question.trim() : '',
    typeof prevPersonal?.question === 'string' ? prevPersonal.question.trim() : '',
  ].find(Boolean) ?? ''
  const nextAnswer = typeof nextPersonal?.answer === 'string' ? nextPersonal.answer.trim() : ''
  const prevAnswer = typeof prevPersonal?.answer === 'string' ? prevPersonal.answer.trim() : ''

  const personalAnswer = !question
    ? null
    : isPaid
      ? { question, answer: nextAnswer || prevAnswer }
      : { question, answer: '' }

  const nextMeta = asRecord(next._meta) ?? {}
  const prevMeta = asRecord(prev._meta) ?? {}

  return {
    titles,
    strategy: isPaid ? (next.strategy ?? prev.strategy ?? null) : null,
    personalAnswer,
    disclaimer: next.disclaimer ?? prev.disclaimer,
    _meta: {
      ...prevMeta,
      ...nextMeta,
      paidGeneration: nextMeta.paidGeneration ?? prevMeta.paidGeneration ?? null,
    },
  }
}
