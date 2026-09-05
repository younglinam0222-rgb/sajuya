function appendSseChunk(buffer, chunk) {
  const combined = buffer + chunk
  const frames = []
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

function parseSseFrame(frame) {
  const lines = frame.replace(/\r/g, '').split('\n')
  const dataLines = []
  for (const line of lines) {
    if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''))
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
    return { kind: 'parse_error', error: e.message, payloadLength: payload.length, head: payload.slice(0, 40) }
  }
}

function sanitizeText(value) {
  if (typeof value !== 'string') return ''
  return value.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

const REQUIRED_TITLE_IDS = ['1','2','3','4','5','6','7','8','9','10','11','12']
function isValidTitle(item) {
  if (!item || typeof item !== 'object') return false
  const id = String(item.id ?? '')
  if (!REQUIRED_TITLE_IDS.includes(id)) return false
  return typeof item.title === 'string' && item.title.trim().length > 0
    && typeof item.content === 'string' && item.content.trim().length >= 50
}
function isValidStrategy(s) {
  if (!s || typeof s !== 'object') return false
  const textOk = (v, min) => typeof v === 'string' && v.trim().length >= min
  return textOk(s.overview, 10) && textOk(s.golden_period, 20) && textOk(s.peak_guide, 20)
    && textOk(s.warning, 10) && textOk(s.final_word, 20) && Array.isArray(s.lifecycle) && s.lifecycle.length >= 3
}
function assessCompletion(input) {
  const byId = new Map()
  for (const item of input.titles) {
    if (item && typeof item === 'object' && 'id' in item) byId.set(String(item.id), item)
  }
  const missingIds = REQUIRED_TITLE_IDS.filter(id => !isValidTitle(byId.get(id)))
  const received = [...new Set(input.receivedGroupIndexes)].filter(g => g >= 0 && g <= 3).sort((a,b)=>a-b)
  const missingGroups = [0,1,2,3].filter(g => !received.includes(g))
  const strategyOk = isValidStrategy(input.strategy)
  const personalOk = !input.requestedPersonal || (input.personal && typeof input.personal.answer === 'string' && input.personal.answer.length >= 50)
  return {
    complete: input.gotDone && missingIds.length === 0 && missingGroups.length === 0 && strategyOk && personalOk,
    missingGroups,
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

const longEvent = `data: ${JSON.stringify({
  type: 'group', requestId: 'r1', groupIndex: 0,
  titles: [{ id: '1', title: 't', teaser: 'x', is_free: true, content: 'A'.repeat(4000) }],
})}\n\n`
const mid = Math.floor(longEvent.length / 2)
const first = appendSseChunk('', longEvent.slice(0, mid))
assert(first.frames.length === 0, 'split chunk must keep incomplete event in buffer')
const second = appendSseChunk(first.buffer, longEvent.slice(mid))
assert(second.frames.length === 1, 'completed event must flush after second chunk')
assert(parseSseFrame(second.frames[0]).data.type === 'group', 'long event must parse')

const combined = [
  `data: ${JSON.stringify({ type: 'manse', requestId: 'r1', data: { animal: '호랑이' } })}\n\n`,
  `data: ${JSON.stringify({ type: 'group', requestId: 'r1', groupIndex: 1, titles: [{ id: '4', title: '직업', content: 'B'.repeat(80) }] })}\n\n`,
  'data: [DONE]\n\n',
].join('')
const multi = appendSseChunk('', combined)
assert(multi.frames.length === 3, 'one chunk may contain multiple events')
assert(parseSseFrame(multi.frames[2]).kind === 'done', 'last combined frame is DONE')

const broken = parseSseFrame('data: {not-json')
assert(broken.kind === 'parse_error', 'invalid JSON must be parse_error, not ignored')

const baseStrategy = {
  overview: 'overview-text',
  golden_period: 'golden-period-text-here',
  lifecycle: [{}, {}, {}],
  peak_guide: 'peak-guide-text-here',
  warning: 'warning-ok',
  final_word: 'final-word-text-here',
}
const titles12 = Array.from({ length: 12 }, (_, i) => ({ id: String(i + 1), title: '제목', content: 'C'.repeat(60) }))
assert(!assessCompletion({ titles: titles12, strategy: baseStrategy, personal: null, requestedPersonal: false, receivedGroupIndexes: [0,1,2,3], gotDone: false }).complete, 'missing [DONE] must not be complete')
const missingGroup = assessCompletion({ titles: titles12, strategy: baseStrategy, personal: null, requestedPersonal: false, receivedGroupIndexes: [0,1,2], gotDone: true })
assert(!missingGroup.complete, '12 titles without 4 groupIndexes must not be complete')
assert(missingGroup.missingGroups.join(',') === '3', 'missing group 3 must be reported')
assert(assessCompletion({ titles: titles12, strategy: baseStrategy, personal: { question: 'Q', answer: 'D'.repeat(60) }, requestedPersonal: true, receivedGroupIndexes: [0,1,2,3], gotDone: true }).complete, 'valid complete payload must pass')

const sanitized = sanitizeText('첫째, 안녕\\n\\n둘째, 세상')
assert(sanitized.includes('\n\n'), 'literal \\n must become real newlines')
assert(!sanitized.includes('\\n'), 'literal \\n must not remain visible')
assert(sanitizeText('정상 문장입니다.') === '정상 문장입니다.', 'normal text must stay intact')
assert(sanitizeText(123) === '', 'non-string must become empty')

console.log('saju sse/contract/sanitize tests passed')
