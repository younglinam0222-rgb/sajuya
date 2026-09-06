export type SajuSseFrame =
  | { kind: 'done' }
  | { kind: 'event'; data: Record<string, unknown> }
  | { kind: 'ignore' }
  | { kind: 'parse_error'; error: string; payloadLength: number; head: string }

/** 청크를 이어붙이고, 완성된 SSE 프레임(`\\n\\n`)만 분리한다. */
export function appendSseChunk(buffer: string, chunk: string): { buffer: string; frames: string[] } {
  const combined = buffer + chunk
  const frames: string[] = []
  let start = 0
  while (true) {
    const idxCr = combined.indexOf('\r\n\r\n', start)
    const idxLf = combined.indexOf('\n\n', start)
    let idx = -1
    let sepLen = 2
    if (idxCr !== -1 && (idxLf === -1 || idxCr <= idxLf)) {
      idx = idxCr
      sepLen = 4
    } else if (idxLf !== -1) {
      idx = idxLf
      sepLen = 2
    }
    if (idx === -1) break
    frames.push(combined.slice(start, idx))
    start = idx + sepLen
  }
  return { buffer: combined.slice(start), frames }
}

export function parseSseFrame(frame: string): SajuSseFrame {
  const lines = frame.replace(/\r/g, '').split('\n')
  const dataLines: string[] = []
  for (const line of lines) {
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).replace(/^ /, ''))
    }
  }
  const payload = dataLines.join('\n').trim()
  if (!payload) return { kind: 'ignore' }
  if (payload === '[DONE]') return { kind: 'done' }
  try {
    const data = JSON.parse(payload)
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return { kind: 'parse_error', error: 'event is not an object', payloadLength: payload.length, head: payload.slice(0, 40) }
    }
    return { kind: 'event', data }
  } catch (e) {
    return {
      kind: 'parse_error',
      error: e instanceof Error ? e.message : String(e),
      payloadLength: payload.length,
      head: payload.slice(0, 40),
    }
  }
}
