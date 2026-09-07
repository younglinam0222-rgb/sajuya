/** Asia/Seoul 달력 날짜. 서버 로컬 타임존에 의존하지 않는다. */

export function kstDateString(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const year = parts.find(p => p.type === 'year')?.value
  const month = parts.find(p => p.type === 'month')?.value
  const day = parts.find(p => p.type === 'day')?.value
  if (!year || !month || !day) throw new Error('KST date formatting failed')
  return `${year}-${month}-${day}`
}

export function kstYmd(now: Date = new Date()): { year: number; month: number; day: number } {
  const [year, month, day] = kstDateString(now).split('-').map(Number)
  return { year, month, day }
}
