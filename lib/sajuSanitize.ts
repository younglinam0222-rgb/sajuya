/** 파싱된 사용자 표시용 문자열만 정리한다. JSON 원문에는 적용하지 않는다. */
export function sanitizeText(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
}

export function sanitizeJudgment(item: Record<string, unknown> | null | undefined) {
  if (!item || typeof item !== 'object') return item
  return {
    ...item,
    title: sanitizeText(item.title),
    teaser: sanitizeText(item.teaser),
    content: sanitizeText(item.content),
    category: typeof item.category === 'string' ? item.category : item.category,
  }
}

export function sanitizeJudgmentTitles(titles: unknown): unknown[] {
  if (!Array.isArray(titles)) return []
  return titles.map(t => sanitizeJudgment(t as Record<string, unknown>))
}

export function sanitizeStrategy(strategy: unknown) {
  if (!strategy || typeof strategy !== 'object') return strategy
  const s = strategy as Record<string, unknown>
  return {
    ...s,
    overview: sanitizeText(s.overview),
    golden_period: sanitizeText(s.golden_period),
    peak_guide: sanitizeText(s.peak_guide),
    warning: sanitizeText(s.warning),
    final_word: sanitizeText(s.final_word),
    lifecycle: Array.isArray(s.lifecycle)
      ? s.lifecycle.map((row) => {
          if (!row || typeof row !== 'object') return row
          const r = row as Record<string, unknown>
          return {
            ...r,
            desc: sanitizeText(r.desc),
          }
        })
      : s.lifecycle,
  }
}
