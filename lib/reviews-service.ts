import { NextRequest } from 'next/server'
import { AccessError } from './server-access'

export async function readReviewBody(req: NextRequest): Promise<unknown> {
  if (!req.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new AccessError(415, 'JSON 형식으로 요청해주세요.')
  if (Number(req.headers.get('content-length')) > 8192) throw new AccessError(413, '후기는 400자까지 작성할 수 있어요.')
  if (!req.body) throw new AccessError(400, '후기 내용을 입력해주세요.')
  const reader = req.body.getReader()
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let size = 0, body = ''
  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      size += chunk.value.byteLength
      if (size > 8192) { await reader.cancel(); throw new AccessError(413, '후기는 400자까지 작성할 수 있어요.') }
      body += decoder.decode(chunk.value, { stream: true })
    }
    body += decoder.decode()
    return JSON.parse(body)
  } catch (error) {
    if (error instanceof AccessError) throw error
    throw new AccessError(400, '후기 내용을 확인해주세요.')
  } finally { reader.releaseLock() }
}

export function parseReviewCursor(cursor: string | null): { time: string | null; id: string | null } {
  if (cursor === null) return { time: null, id: null }
  try {
    if (!cursor || cursor.length > 240 || !/^[A-Za-z0-9_-]+$/.test(cursor)) throw new Error()
    const value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'))
    if (typeof value.time !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|\+00:00)$/.test(value.time) || !Number.isFinite(Date.parse(value.time))) throw new Error()
    if (typeof value.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.id)) throw new Error()
    return { time: value.time, id: value.id }
  } catch { throw new AccessError(400, '후기 목록을 새로고침해주세요.') }
}
export function encodeReviewCursor(time: string, id: string) { return Buffer.from(JSON.stringify({ time, id })).toString('base64url') }
