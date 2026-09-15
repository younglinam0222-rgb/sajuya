export const REVIEW_MAX_CHARS = 400
export const REVIEW_PAGE_SIZE = 12
export type PublicReview = {
  id: string
  displayName: string
  rating: number
  body: string
  createdAt: string
  updatedAt: string
}
export function reviewLength(value: string) { return Array.from(value).length }
export function validateReview(value: unknown): { rating: number; body: string } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const input = value as Record<string, unknown>
  if (Object.keys(input).some(key => !['rating', 'body'].includes(key))) return null
  if (!Number.isInteger(input.rating) || Number(input.rating) < 1 || Number(input.rating) > 5 || typeof input.body !== 'string') return null
  const body = input.body.replace(/\r\n?/g, '\n').normalize('NFC').trim()
  if (!body || reviewLength(body) > REVIEW_MAX_CHARS || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\p{Cs}]/u.test(body)) return null
  return { rating: Number(input.rating), body }
}
export function publicReview(row: unknown): PublicReview | null {
  if (!row || typeof row !== 'object') return null
  const value = row as Record<string, unknown>
  if (typeof value.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.id)) return null
  if (typeof value.body !== 'string' || typeof value.rating !== 'number' || typeof value.created_at !== 'string' || typeof value.updated_at !== 'string') return null
  return {
    id: value.id,
    displayName: `궁궐손님 · ${value.id.slice(0, 6)}`,
    rating: value.rating,
    body: value.body,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  }
}
