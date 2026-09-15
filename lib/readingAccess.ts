import { FREE_TITLE_COUNT } from './pricing'
import { isFreeCategory, isFreeTitleId } from './sajuScope'

type TitleLike = {
  id?: unknown
  is_free?: unknown
  title?: unknown
  teaser?: unknown
  content?: unknown
  category?: unknown
}

export function titleIsFree(title: TitleLike, index: number, titles: TitleLike[]) {
  if (isFreeCategory(title.category) || isFreeTitleId(title.id)) return true
  const flagged = titles
    .map((t, i) => ({ i, free: t.is_free === true }))
    .filter(t => t.free)
    .map(t => t.i)
  if (flagged.length > 0) {
    const capped = flagged.slice(0, FREE_TITLE_COUNT)
    return capped.includes(index)
  }
  return index < FREE_TITLE_COUNT
}

function parseAiResult(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null
  let text = typeof raw === 'string' ? raw : JSON.stringify(raw)
  text = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
  const s = text.indexOf('{')
  const e = text.lastIndexOf('}')
  if (s !== -1 && e !== -1) text = text.slice(s, e + 1)
  try {
    const parsed = JSON.parse(text)
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null
  } catch {
    return null
  }
}

function redactTitle(t: TitleLike, index: number, titles: TitleLike[]): TitleLike {
  if (titleIsFree(t, index, titles)) return t
  return {
    ...t,
    content: '',
    teaser: typeof t.teaser === 'string' ? t.teaser : '',
  }
}

/** 미결제 응답에서 유료 본문을 제거한다. 로그인만으로 전체 본문이 나가지 않게 한다. */
export function redactUnpaidReading<T extends { is_paid?: boolean; ai_result?: unknown }>(row: T): T {
  if (row.is_paid) return row
  const parsed = parseAiResult(row.ai_result)
  if (!parsed) {
    return { ...row, ai_result: row.ai_result ? '{"titles":[]}' : row.ai_result }
  }
  const titles = Array.isArray(parsed.titles) ? parsed.titles as TitleLike[] : []
  parsed.titles = titles.map((t, i) => redactTitle(t, i, titles))
  if (parsed.strategy && typeof parsed.strategy === 'object') {
    const strategy = parsed.strategy as Record<string, unknown>
    parsed.strategy = {
      overview: typeof strategy.overview === 'string' ? strategy.overview.slice(0, 80) : '',
      locked: true,
    }
  }
  if (parsed.personalAnswer && typeof parsed.personalAnswer === 'object') {
    const pa = parsed.personalAnswer as Record<string, unknown>
    parsed.personalAnswer = {
      question: typeof pa.question === 'string' ? pa.question : '',
      answer: '',
      locked: true,
    }
  }
  if (Array.isArray(parsed.sections)) {
    parsed.sections = (parsed.sections as { id?: string; title?: string; body?: string }[]).map((sec, i) => (
      i < FREE_TITLE_COUNT
        ? sec
        : { ...sec, body: '' }
    ))
  }
  return { ...row, ai_result: JSON.stringify(parsed) }
}

export function readingHasDeliverableResult(aiResult: unknown) {
  const parsed = parseAiResult(aiResult)
  if (!parsed) return false
  const titles = Array.isArray(parsed.titles) ? parsed.titles : []
  const sections = Array.isArray(parsed.sections) ? parsed.sections : []
  return titles.length > 0 || sections.length > 0 || !!parsed.strategy
}
