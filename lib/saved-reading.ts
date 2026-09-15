/** The persisted form shared by results and their follow-up conversations. */
export type SavedReadingData = {
  form: {
    name: string
    year: string | number
    month: string | number
    day: string | number
    calType?: string
    chat?: {topicId: string; answers: string[]; note: string}
    conversation?: {roomId: string; sourceId: string; message: string}
  }
  saju: unknown
}

export function readSavedReading(raw: unknown): SavedReadingData {
  const value: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid saved reading')
  const form = (value as Record<string, unknown>).form
  if (!form || typeof form !== 'object' || Array.isArray(form)) throw Error('Invalid saved profile')
  const fields = form as Record<string, unknown>
  if (typeof fields.name !== 'string' || !fields.name.trim() ||
      ['year', 'month', 'day'].some(key =>
        !['string', 'number'].includes(typeof fields[key]) || !Number.isFinite(Number(fields[key])))) {
    throw Error('Incomplete saved profile')
  }
  for (const [key, strings] of [['chat', ['topicId', 'note']], ['conversation', ['roomId', 'sourceId', 'message']]] as const) {
    const nested = fields[key]
    if (nested === undefined) continue
    if (!nested || typeof nested !== 'object' || Array.isArray(nested) ||
        strings.some(name => typeof (nested as Record<string, unknown>)[name] !== 'string')) {
      throw Error('Invalid saved conversation')
    }
    if (key === 'chat') {
      const answers = (nested as Record<string, unknown>).answers
      if (!Array.isArray(answers) || answers.some(answer => typeof answer !== 'string')) throw Error('Invalid saved choices')
    }
  }
  return value as SavedReadingData
}
