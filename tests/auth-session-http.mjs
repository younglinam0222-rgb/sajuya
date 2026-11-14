import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { encode } from 'next-auth/jwt'

const origin = 'http://127.0.0.1:3141'
const dbOrigin = 'http://127.0.0.1:3142'
const secret = 'local-auth-test-secret'
let available = false
let inserts = 0
const database = createServer(async (req, res) => {
  const url = new URL(req.url, dbOrigin)
  const send = (status, body) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)) }
  if (!available) return send(503, { code: 'PGRST000', message: 'database unavailable' })
  if (url.pathname === '/rest/v1/users' && req.method === 'POST') {
    inserts++
    return send(201, null)
  }
  if (url.pathname === '/rest/v1/users' && url.searchParams.get('select') === 'id') return send(200, [])
  if (url.pathname === '/rest/v1/users' && url.searchParams.get('select') === 'yeobjeun_balance') return send(200, { yeobjeun_balance: 0 })
  if (url.pathname === '/rest/v1/content_notice_acks') return send(200, [])
  return send(404, { code: 'PGRST205', message: 'not found' })
})
await new Promise(resolve => database.listen(3142, '127.0.0.1', resolve))

const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', '3141'], {
  env: {
    PATH: process.env.PATH, NEXTAUTH_URL: origin, NEXTAUTH_SECRET: secret,
    SUPABASE_URL: dbOrigin, NEXT_PUBLIC_SUPABASE_URL: dbOrigin,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'build-placeholder', SUPABASE_SERVICE_ROLE_KEY: 'build-placeholder',
    KAKAO_CLIENT_ID: 'test', KAKAO_CLIENT_SECRET: 'test', GOOGLE_CLIENT_ID: 'test', GOOGLE_CLIENT_SECRET: 'test',
    NAVER_CLIENT_ID: 'test', NAVER_CLIENT_SECRET: 'test',
  }, stdio: ['ignore', 'pipe', 'pipe'],
})
let output = ''
for (const stream of [server.stdout, server.stderr]) stream.on('data', chunk => { output = (output + chunk).slice(-4000) })
try {
  let ready = false
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(origin + '/api/auth/providers')).ok) { ready = true; break } } catch {}
    if (server.exitCode !== null) throw Error('Next server stopped: ' + output)
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  assert.ok(ready, 'Next auth server did not start: ' + output)
  const session = async checkedAt => {
    const token = await encode({ token: { sub: 'social-test', name: '가상 계정', email: null,
      accountReady: false, accountSyncCheckedAt: checkedAt }, secret })
    const response = await fetch(origin + '/api/auth/session', { headers: { Cookie: `next-auth.session-token=${token}` } })
    assert.equal(response.status, 200)
    return response.json()
  }
  const unavailable = await session(Date.now() - 31_000)
  assert.equal(unavailable.user.id, 'social-test')
  assert.equal(unavailable.user.accountReady, false)
  assert.equal(unavailable.user.yeobjeun_balance, undefined)
  available = true
  const recovered = await session(Date.now() - 31_000)
  assert.equal(recovered.user.id, 'social-test')
  assert.equal(recovered.user.accountReady, true)
  assert.equal(recovered.user.yeobjeun_balance, 0)
  assert.equal(inserts, 1)
  console.log('PASS: signed OAuth session survives account DB outage; later request provisions account without granting a balance')
} finally {
  server.kill('SIGTERM')
  if (server.exitCode === null) await new Promise(resolve => server.once('exit', resolve))
  await new Promise(resolve => database.close(resolve))
}
