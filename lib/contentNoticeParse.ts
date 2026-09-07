export type ParseAckResult =
  | { ok: true }
  | { ok: false; code: 'invalid_body' | 'missing' | 'not_true' }

/** 실제 boolean true만 허용. 누락·false·"true" 문자열은 거절. */
export function parseAckBody(body: unknown): ParseAckResult {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, code: 'invalid_body' }
  }
  if (!Object.prototype.hasOwnProperty.call(body, 'acknowledged')) {
    return { ok: false, code: 'missing' }
  }
  const value = (body as { acknowledged: unknown }).acknowledged
  if (value !== true) return { ok: false, code: 'not_true' }
  return { ok: true }
}
