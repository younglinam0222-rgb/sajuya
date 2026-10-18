import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { encode } from 'next-auth/jwt'

const origin = 'http://127.0.0.1:3117'
const databaseOrigin = 'http://127.0.0.1:3118'
const aiOrigin = 'http://127.0.0.1:3119'
const jobId = '11111111-1111-4111-8111-111111111111'
const attemptId = '22222222-2222-4222-8222-222222222222'
const shareId = 'free-three-test'
const categories = ['성격', '재물운', '애정운']
const aiCalls = []
const dbCalls = []
let savedResult = null
let savedManse = null

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
  if (url.pathname === '/rest/v1/generation_requests') return json(res, savedResult ? { job_id: jobId } : null)
  if (url.pathname === '/rest/v1/generation_jobs') return json(res, { reading_id: '33333333-3333-4333-8333-333333333333', status: 'done' })
  if (url.pathname === '/rest/v1/rpc/reserve_saju_free') return json(res, { id: jobId, attempt: attemptId })
  if (url.pathname === '/rest/v1/rpc/finish_generation') {
    if (body.p_success) { savedResult = body.p_result; savedManse = body.p_manse }
    return json(res, { shareId })
  }
  if (url.pathname === '/rest/v1/ai_usage') return json(res, {}, 201)
  if (url.pathname === '/rest/v1/readings') return json(res, {
    share_id: shareId, user_id: 'free-user', character_id: 'doRyeong',
    saju_data: { form: { name: '가상 사용자', personalQuestion: '테스트 질문' }, saju: savedManse },
    ai_result: JSON.stringify(savedResult), is_paid: false, access_verified: true, product: 'saju',
  })
  return json(res, null)
})
const ai = createServer(async (req, res) => {
  const body = await readJson(req)
  aiCalls.push(body)
  const titles = categories.map((category, index) => ({
    id: String(index + 1), category, title: `${category} 풀이`, teaser: `${category} 한 줄`,
    is_free: true, content: `${category}에 관한 가상 해석입니다. `.repeat(8),
  }))
  return json(res, {
    id: 'msg_test', type: 'message', role: 'assistant', model: 'claude-sonnet-4-6',
    content: [{ type: 'tool_use', id: 'toolu_test', name: 'submit_judgments', input: { titles } }],
    stop_reason: 'tool_use', stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 100 },
  })
})

await new Promise(resolve => database.listen(3118, '127.0.0.1', resolve))
await new Promise(resolve => ai.listen(3119, '127.0.0.1', resolve))
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', '3117'], {
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
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(origin)).status === 200) { ready = true; break } } catch {}
    if (server.exitCode !== null) throw Error('Next server exited: ' + logs)
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  assert.ok(ready, 'Next server did not start: ' + logs)
  const cookie = 'next-auth.session-token=' + await encode({ token: { sub: 'free-user' }, secret: 'build-placeholder' })
  const headers = { Cookie: cookie, Origin: origin, 'Content-Type': 'application/json' }
  const requestId = 'free-three-request-2026'
  const input = { name: '가상 사용자', year: '1990', month: '1', day: '1', hour: '09:30',
    gender: 'female', characterId: 'doRyeong', calType: 'solar', personalQuestion: '테스트 질문', requestId }
  const response = await fetch(origin + '/api/saju', { method: 'POST', headers, body: JSON.stringify(input) })
  assert.equal(response.status, 200, await response.clone().text())
  const wire = await response.text()
  assert.ok(wire.includes('data: [DONE]'))
  const events = wire.split('\n').filter(line => line.startsWith('data: ') && !line.includes('[DONE]')).map(line => JSON.parse(line.slice(6)))
  const groups = events.filter(event => event.type === 'group')
  assert.equal(groups.length, 1)
  assert.deepEqual(groups[0].titles.map(title => title.id), ['1', '2', '3'])
  assert.equal(events.some(event => ['strategy', 'personal'].includes(event.type)), false)
  assert.equal(aiCalls.length, 1)
  assert.equal(aiCalls[0].tools[0].input_schema.properties.titles.maxItems, 3)
  assert.equal(dbCalls.filter(call => call.path === '/rest/v1/rpc/reserve_saju_free').length, 1)
  assert.equal(dbCalls.some(call => call.path === '/rest/v1/rpc/reserve_generation'), false)
  assert.deepEqual(savedResult.titles.map(title => title.id), ['1', '2', '3'])
  assert.equal(savedResult.strategy, undefined)
  assert.equal(savedResult.personalAnswer, undefined)
  const save = await fetch(origin + '/api/readings/save', { method: 'POST', headers, body: JSON.stringify({ requestId }) })
  assert.equal(save.status, 200, await save.clone().text())
  assert.equal((await save.json()).shareId, shareId)
  const result = await fetch(origin + '/api/readings/' + shareId, { headers: { Cookie: cookie } })
  assert.equal(result.status, 200, await result.clone().text())
  const resultBody = await result.json()
  assert.deepEqual(JSON.parse(resultBody.ai_result).titles.map(title => title.id), ['1', '2', '3'])
  assert.equal(resultBody.is_paid, false)
  assert.equal(JSON.stringify(resultBody).includes('toolu_test'), false)
  console.log('PASS: real Next HTTP free generation uses one AI group, no paid answer/strategy, no paid reservation, saved owner view has three free titles')
} finally {
  server.kill('SIGTERM')
  if (server.exitCode === null) await new Promise(resolve => server.once('exit', resolve))
  await new Promise(resolve => ai.close(resolve))
  await new Promise(resolve => database.close(resolve))
}
