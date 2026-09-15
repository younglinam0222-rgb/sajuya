// Real local Next route tests, with a fake database transport; real SQL is
// exercised separately by reviews.mjs. No real Supabase or AI calls are made.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { encode } from 'next-auth/jwt'

const origin = 'http://127.0.0.1:3123'
const calls = []
let unavailable = false
let review = { id: '11111111-1111-4111-8111-111111111111', rating: 1, body: '솔직한 이용 후기', created_at: '2026-09-15T00:00:00.123456+00:00', updated_at: '2026-09-15T00:00:00.123456+00:00', user_id: 'owner', email: 'PRIVATE_EMAIL@example.com' }
const db = createServer(async (req, res) => {
  let raw = ''; for await (const chunk of req) raw += chunk
  const body = JSON.parse(raw || '{}'), url = new URL(req.url, 'http://localhost')
  calls.push({ path: url.pathname, body }); res.setHeader('Content-Type', 'application/json')
  if (unavailable) { res.statusCode = 503; return res.end(JSON.stringify({ message: 'DATABASE_SECRET_FAILURE' })) }
  if (url.pathname === '/rest/v1/rpc/list_public_reviews') return res.end(JSON.stringify({ items: review ? [review] : [], hasMore: !!review }))
  if (url.pathname === '/rest/v1/rpc/my_review_status') return res.end(JSON.stringify({ eligible: body.p_user === 'owner', review: body.p_user === 'owner' ? review : null }))
  if (url.pathname === '/rest/v1/rpc/save_my_review') {
    if (body.p_user !== 'owner') return res.end(JSON.stringify({ error: 'ineligible' }))
    review = { ...review, rating: body.p_rating, body: body.p_body }; return res.end(JSON.stringify({ review }))
  }
  if (url.pathname === '/rest/v1/rpc/delete_my_review') { if (body.p_user === 'owner') review = null; return res.end(JSON.stringify({ deleted: true })) }
  return res.end('null')
})
await new Promise(resolve => db.listen(3124, '127.0.0.1', resolve))
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', '3123'], {
  env: { PATH: process.env.PATH, NEXTAUTH_URL: origin, NEXTAUTH_SECRET: 'build-placeholder', SUPABASE_URL: 'http://127.0.0.1:3124', NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:3124', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'build-placeholder', SUPABASE_SERVICE_ROLE_KEY: 'build-placeholder' }, stdio: 'ignore',
})
try {
  let ready = false
  for (let i = 0; i < 80; i++) { try { if ((await fetch(origin + '/reviews')).status === 200) { ready = true; break } } catch {} await new Promise(resolve => setTimeout(resolve, 200)) }
  assert.ok(ready, 'Review page starts in production Next server')
  const auth = async user => ({ Cookie: 'next-auth.session-token=' + await encode({ token: { sub: user }, secret: 'build-placeholder' }), Origin: origin, 'Content-Type': 'application/json' })
  const owner = await auth('owner'), stranger = await auth('other')
  const send = (method, body, headers = owner) => fetch(origin + '/api/reviews/me', { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const first = await fetch(origin + '/api/reviews'), listing = await first.json()
  assert.equal(first.status, 200); assert.equal(first.headers.get('cache-control'), 'no-store')
  assert.ok(!JSON.stringify(listing).includes('PRIVATE_EMAIL')); assert.ok(!JSON.stringify(listing).includes('user_id'))
  assert.equal(listing.items[0].rating, 1)
  assert.equal((await fetch(origin + '/api/reviews?cursor=' + listing.nextCursor)).status, 200)
  assert.equal(calls.at(-1).body.p_before_time, review.created_at, 'Microseconds preserved in stable pagination cursor')
  const beforeInvalid = calls.length
  for (const cursor of ['garbage', 'x'.repeat(241), Buffer.from(JSON.stringify({ time: '2026-09-15', id: "x),owner.eq.victim" })).toString('base64url')]) assert.equal((await fetch(origin + '/api/reviews?cursor=' + cursor)).status, 400)
  assert.equal(calls.length, beforeInvalid)
  for (const method of ['GET', 'PUT', 'DELETE']) assert.equal((await send(method, method === 'PUT' ? { rating: 5, body: '후기' } : undefined, {})).status, 401)
  assert.equal((await send('PUT', { rating: 5, body: '후기' }, { ...owner, Origin: 'https://foreign.example' })).status, 403)
  assert.equal((await send('DELETE', undefined, { ...owner, 'Sec-Fetch-Site': 'cross-site' })).status, 403)
  assert.equal((await send('GET', undefined, stranger)).status, 200)
  assert.equal((await send('PUT', { rating: 5, body: '권한 없음' }, stranger)).status, 403)
  const beforeBadBodies = calls.length
  for (const body of [{ rating: 5, body: 'a'.repeat(401) }, { rating: 5, body: '😀'.repeat(401) }, { rating: 6, body: '별점 오류' }, { rating: 5, body: '위조', user_id: 'victim' }, { rating: 5, body: '위조', displayName: '운영자' }]) assert.equal((await send('PUT', body)).status, 400)
  assert.equal((await send('PUT', { rating: 5, body: 'x'.repeat(10000) })).status, 413)
  assert.equal((await fetch(origin + '/api/reviews/me', { method: 'PUT', headers: owner, body: '{bad' })).status, 400)
  assert.equal((await fetch(origin + '/api/reviews/me', { method: 'PUT', headers: { ...owner, 'Content-Type': 'text/plain' }, body: 'x' })).status, 415)
  assert.equal(calls.length, beforeBadBodies, 'Invalid input is denied before database writes')
  assert.equal((await send('PUT', { rating: 2, body: '😀'.repeat(400) })).status, 200)
  assert.equal(calls.at(-1).body.p_user, 'owner'); assert.equal(Array.from(calls.at(-1).body.p_body).length, 400)
  assert.equal((await send('DELETE', { user_id: 'owner' }, stranger)).status, 200)
  assert.equal(calls.at(-1).body.p_user, 'other', 'Delete always binds JWT subject, never submitted user ID')
  assert.equal((await fetch(origin + '/api/reviews').then(response => response.json())).items.length, 1)
  assert.equal((await send('DELETE')).status, 200)
  assert.equal((await fetch(origin + '/api/reviews').then(response => response.json())).items.length, 0)
  unavailable = true
  const failure = await fetch(origin + '/api/reviews'), failureBody = await failure.text()
  assert.equal(failure.status, 503); assert.ok(!failureBody.includes('DATABASE_SECRET'))
  console.log('PASS reviews HTTP: production page; public safe projection; Unicode boundary; size/malformed/type validation; origin and JWT protection; owner binding; ineligible denial; cursor validation/microsecond preservation; delete isolation; safe unavailable response')
} finally {
  server.kill('SIGTERM')
  await new Promise(resolve => { db.close(resolve); db.closeAllConnections() })
}
