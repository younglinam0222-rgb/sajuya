import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'

const origin = 'http://127.0.0.1:3137'
const databaseOrigin = 'http://127.0.0.1:3138'
const aiOrigin = 'http://127.0.0.1:3139'
const jobId = '11111111-1111-4111-8111-111111111111'
const attemptId = '22222222-2222-4222-8222-222222222222'
const shareId = 'guest-full-test'
const aiCalls = []
const dbCalls = []
let savedResult = null
let savedManse = null
let savedOwner = null
let failGuestQuota = false

const readJson = async req => {
  let raw = ''
  for await (const chunk of req) raw += chunk
  return raw ? JSON.parse(raw) : {}
}
const json = (res, value, status = 200) => {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(value))
}

const database = createServer(async (req, res) => {
  const url = new URL(req.url, databaseOrigin)
  const body = req.method === 'GET' ? {} : await readJson(req)
  dbCalls.push({ path: url.pathname, body })
  if (url.pathname === '/rest/v1/content_notice_acks') return json(res, { acknowledged_at: '2026-10-18T00:00:00Z', notice_version: 'content-notice-v1-20260908' })
  if (url.pathname === '/rest/v1/generation_requests') return json(res,
    savedResult && url.searchParams.get('user_id') === `eq.${savedOwner}` ? { job_id: jobId } : null)
  if (url.pathname === '/rest/v1/generation_jobs') return json(res, { reading_id: '33333333-3333-4333-8333-333333333333', status: 'done' })
  if (url.pathname === '/rest/v1/rpc/reserve_guest_generation') return failGuestQuota
    ? json(res, {code:'PGRST202',message:'Function is not in the schema cache'}, 404)
    : json(res, { attempts: 1 })
  if (url.pathname === '/rest/v1/rpc/reserve_saju_free') { savedOwner = body.p_user; return json(res, { id: jobId, attempt: attemptId }) }
  if (url.pathname === '/rest/v1/rpc/finish_generation') {
    if (body.p_success) { savedResult = body.p_result; savedManse = body.p_manse }
    return json(res, { shareId })
  }
  if (url.pathname === '/rest/v1/ai_usage') return json(res, {}, 201)
  if (url.pathname === '/rest/v1/readings') {
    if (url.searchParams.get('user_id') !== `eq.${savedOwner}`) return json(res, null)
    return json(res, {
    share_id: shareId, user_id: savedOwner, character_id: 'doRyeong',
    saju_data: { form: { name: '가상 사용자', personalQuestion: '테스트 질문' }, saju: savedManse },
    ai_result: JSON.stringify(savedResult), is_paid: false, access_verified: true, product: 'saju',
  })
  }
  return json(res, null)
})
const ai = createServer(async (req, res) => {
  const body = await readJson(req)
  aiCalls.push(body)
  const toolName = body.tool_choice.name
  const prompt = body.messages[0].content
  const ids = [...prompt.matchAll(/- (\d+)번은 "([^"]+)" 카테고리/g)]
  const titles = ids.map(([, id, category]) => ({ id, category, title: `${category} 풀이`,
    teaser: `${category} 한 줄`, is_free: true, content: `${category}에 관한 가상 해석입니다. `.repeat(8) }))
  const input = toolName === 'submit_judgments' ? { titles }
    : toolName === 'submit_strategy' ? {
      overview: '가상 인물의 전체 흐름을 차분히 살펴봅니다.', golden_period: '지금의 조건을 살펴보고 장기 계획을 세워보세요. '.repeat(4),
      lifecycle: [1,2,3].map(n => ({age: `${n*10}대`,score: 60,season: '봄',desc: '가상 흐름'})),
      peak_guide: '작은 실천을 이어가며 실제 생활의 조건을 확인하세요. '.repeat(4),
      warning: '중요한 결정은 객관적 정보를 함께 확인하세요. '.repeat(3),
      final_word: '가상 인물에게 전하는 응원의 한마디입니다. '.repeat(3),
    } : { answer: '가상 질문에 대한 참고용 답변입니다. '.repeat(6) }
  return json(res, {
    id: 'msg_test', type: 'message', role: 'assistant', model: 'claude-sonnet-4-6',
    content: [{ type: 'tool_use', id: 'toolu_test', name: toolName, input }],
    stop_reason: 'tool_use', stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 100 },
  })
})

await new Promise(resolve => database.listen(3138, '127.0.0.1', resolve))
await new Promise(resolve => ai.listen(3139, '127.0.0.1', resolve))
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', process.env.GUEST_HTTP_DEV ? 'dev' : 'start', '-H', '127.0.0.1', '-p', '3137'], {
  env: {
    PATH: process.env.PATH, NEXTAUTH_URL: origin, NEXTAUTH_SECRET: 'build-placeholder',
    SUPABASE_URL: databaseOrigin, NEXT_PUBLIC_SUPABASE_URL: databaseOrigin,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'build-placeholder', SUPABASE_SERVICE_ROLE_KEY: 'build-placeholder',
    ANTHROPIC_API_KEY: 'test-placeholder', ANTHROPIC_BASE_URL: aiOrigin,
  }, stdio: ['ignore', 'pipe', 'pipe'],
})
let logs = ''
server.stdout.on('data', chunk => { logs = (logs + chunk).slice(-15000) })
server.stderr.on('data', chunk => { logs = (logs + chunk).slice(-15000) })
try {
  let ready = false
  let readyDiagnostic = ''
  for (let i = 0; i < 150; i++) {
    try { const probe = await fetch(origin + '/api/saju/guest'); if (probe.status === 204) { ready = true; break } readyDiagnostic = `status ${probe.status}` } catch (error) { readyDiagnostic = String(error) }
    if (server.exitCode !== null) throw Error('Next server exited: ' + logs)
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  assert.ok(ready, 'Next server did not start: ' + readyDiagnostic + ' ' + logs)
  const headers = { Origin: origin, 'Content-Type': 'application/json' }
  const prepared = await fetch(origin + '/api/saju/guest', {cache:'no-store'})
  assert.equal(prepared.status,204)
  const cookie = prepared.headers.get('set-cookie')?.split(';')[0]
  assert.match(cookie ?? '', /^sajuya_guest=[a-f0-9]{32}\.[a-f0-9]{64}$/)
  const requestId = 'guest-full-request-2026'
  const input = { name: '가상 사용자', year: '1990', month: '1', day: '1', hour: '09:30',
    gender: 'female', characterId: 'doRyeong', calType: 'solar', personalQuestion: '테스트 질문', requestId }
  const response = await fetch(origin + '/api/saju', { method: 'POST', headers: {...headers,Cookie:cookie}, body: JSON.stringify(input) })
  assert.equal(response.status, 200, await response.clone().text())
  const wire = await response.text()
  assert.ok(wire.includes('data: [DONE]'))
  const events = wire.split('\n').filter(line => line.startsWith('data: ') && !line.includes('[DONE]')).map(line => JSON.parse(line.slice(6)))
  const groups = events.filter(event => event.type === 'group')
  assert.equal(groups.length, 6)
  assert.deepEqual(groups.flatMap(group => group.titles.map(title => title.id)).sort((a,b)=>Number(a)-Number(b)), Array.from({length:12},(_,i)=>String(i+1)))
  assert.equal(events.filter(event => event.type === 'strategy').length, 1)
  assert.equal(events.filter(event => event.type === 'personal').length, 1)
  assert.equal(aiCalls.length, 8)
  assert.equal(aiCalls.find(call => call.tool_choice.name === 'submit_judgments').tools[0].input_schema.properties.titles.maxItems, 2)
  assert.equal(dbCalls.filter(call => call.path === '/rest/v1/rpc/reserve_saju_free').length, 1)
  assert.equal(dbCalls.filter(call => call.path === '/rest/v1/rpc/reserve_guest_generation').length, 1)
  assert.match(savedOwner, /^guest-[a-f0-9]{32}$/)
  assert.equal(dbCalls.some(call => call.path === '/rest/v1/rpc/reserve_generation'), false)
  assert.deepEqual(savedResult.titles.map(title => title.id), Array.from({length:12},(_,i)=>String(i+1)))
  assert.ok(savedResult.strategy)
  assert.equal(savedResult.personalAnswer.question, '테스트 질문')
  assert.equal(savedResult._meta.accessScope, 'free_full_v1')
  const save = await fetch(origin + '/api/readings/save', { method: 'POST', headers: { ...headers, Cookie: cookie }, body: JSON.stringify({ requestId }) })
  assert.equal(save.status, 200, await save.clone().text())
  assert.equal((await save.json()).shareId, shareId)
  const result = await fetch(origin + '/api/readings/' + shareId, { headers: { Cookie: cookie } })
  assert.equal(result.status, 200, await result.clone().text())
  const resultBody = await result.json()
  assert.deepEqual(JSON.parse(resultBody.ai_result).titles.map(title => title.id), Array.from({length:12},(_,i)=>String(i+1)))
  assert.equal(resultBody.is_paid, false)
  assert.equal(resultBody.full_access, true)
  assert.equal((await fetch(origin + '/api/readings/' + shareId)).status, 401)
  assert.equal((await fetch(origin + '/api/readings/' + shareId, {headers:{Cookie:cookie.replace(/.$/,'0')}})).status, 401)
  const otherPrepared = await fetch(origin + '/api/saju/guest', {cache:'no-store'})
  const otherCookie = otherPrepared.headers.get('set-cookie')?.split(';')[0]
  assert.ok(otherCookie && otherCookie !== cookie)
  assert.equal((await fetch(origin + '/api/readings/' + shareId, {headers:{Cookie:otherCookie}})).status, 404)
  assert.equal(JSON.stringify(resultBody).includes('toolu_test'), false)
  failGuestQuota = true
  const missingRpc = await fetch(origin + '/api/saju', {method:'POST',headers:{...headers,Cookie:otherCookie},
    body:JSON.stringify({...input,requestId:'guest-missing-rpc-2026'})})
  assert.equal(missingRpc.status,503)
  assert.equal((await missingRpc.json()).error,'처리하지 못했습니다. 잠시 후 다시 시도해주세요.')
  assert.match(logs,/guest_quota/)
  assert.match(logs,/PGRST202/)
  console.log('PASS: anonymous Next HTTP generation saves twelve titles without debit; signed browser cookie permits private reread; missing/tampered/other visitor cookie denied')
} finally {
  server.kill('SIGTERM')
  if (server.exitCode === null) await new Promise(resolve => server.once('exit', resolve))
  await new Promise(resolve => ai.close(resolve))
  await new Promise(resolve => database.close(resolve))
}
