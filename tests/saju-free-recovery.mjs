import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

const db = new PGlite()
const sql = path => readFileSync(path, 'utf8')
const value = async (statement, args = []) => (await db.query(statement, args)).rows[0]?.value
const reserve = (user, hash, request = hash) => value(
  'SELECT public.reserve_generation($1,$2,$3,$4,$5) value',
  [user, hash, 'saju', request, { characterId: 'baekhalma', occupation: 'student' }],
)
const finish = (job, success) => value(
  'SELECT public.finish_generation($1,$2,$3,$4,$5,$6) value',
  [job.id, job.attempt, success, success ? 'data: [DONE]\n\n' : null,
    success ? { titles: [{ id: '1', content: 'fictional test' }] } : null,
    success ? { yearPillar: {} } : null],
)

try {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;`)
  await db.exec(sql('supabase-schema.sql'))
  await db.exec(sql('supabase-schema-upgrade.sql'))
  await db.exec("INSERT INTO users(id,yeobjeun_balance) VALUES ('free',0),('other',4)")
  await db.exec("INSERT INTO readings(share_id,user_id,character_id,saju_data,ai_result,is_paid) VALUES ('legacy','other','baekhalma','{}','{}',true)")
  await db.exec(sql('supabase-saju-free-recovery.sql'))
  await db.exec(sql('supabase-saju-free-recovery.sql'))
  assert.equal(await value("SELECT access_verified AS value FROM readings WHERE share_id='legacy'"), false)
  assert.equal(await value("SELECT yeobjeun_balance AS value FROM users WHERE id='free'"), 0)

  const first = await reserve('free', 'same', 'same-request')
  assert.ok(first.id && first.attempt)
  assert.equal((await reserve('free', 'same', 'same-request')).error, 'busy')
  assert.equal((await reserve('free', 'other', 'same-request')).error, 'conflict')
  assert.equal((await reserve('free', 'other', 'other-request')).error, 'busy')
  assert.deepEqual(await finish(first, false), { released: true })
  assert.equal((await finish(first, true)).error, 'stale')
  assert.equal(await value("SELECT yeobjeun_balance AS value FROM users WHERE id='free'"), 0)

  const retry = await reserve('free', 'same', 'same-request')
  assert.notEqual(retry.attempt, first.attempt)
  const saved = await finish(retry, true)
  assert.ok(saved.shareId)
  assert.equal((await finish(retry, true)).error, 'stale')
  const cached = await reserve('free', 'same', 'another-request')
  assert.equal(cached.cached, true)
  assert.equal(cached.response, 'data: [DONE]\n\n')
  assert.equal(await value("SELECT count(*)::integer AS value FROM readings WHERE user_id='free'"), 1)
  assert.equal(await value("SELECT is_paid AS value FROM readings WHERE share_id=$1", [saved.shareId]), false)
  assert.equal(await value("SELECT access_verified AS value FROM readings WHERE share_id=$1", [saved.shareId]), true)
  assert.equal(await value("SELECT yeobjeun_balance AS value FROM users WHERE id='free'"), 0)
  assert.equal(await value("SELECT yeobjeun_balance AS value FROM users WHERE id='other'"), 4)

  const stale = await reserve('other', 'stale')
  await db.query("UPDATE generation_jobs SET updated_at=now()-interval '21 minutes' WHERE id=$1", [stale.id])
  const recovered = await reserve('other', 'new')
  assert.ok(recovered.id)
  assert.equal((await finish(stale, true)).error, 'stale')
  await finish(recovered, false)
  assert.equal((await value("SELECT public.reserve_generation('free','x','daily','x','{}') value")).error, 'unavailable')

  await db.exec('SET ROLE anon')
  await assert.rejects(() => db.query('SELECT * FROM users'))
  await assert.rejects(() => db.query('SELECT * FROM payments'))
  await assert.rejects(() => db.query('SELECT * FROM readings'))
  await assert.rejects(() => db.query('SELECT * FROM generation_jobs'))
  await assert.rejects(() => db.query("SELECT reserve_generation('free','hack','saju','hack','{}')"))
  await db.exec('RESET ROLE; SET ROLE authenticated')
  await assert.rejects(() => db.query('SELECT * FROM users'))
  await assert.rejects(() => db.query('SELECT * FROM payments'))
  await assert.rejects(() => db.query('SELECT * FROM readings'))
  await assert.rejects(() => db.query('SELECT * FROM generation_requests'))
  await db.exec('RESET ROLE')
  console.log('PASS: free saju schema twice; no balance mutation; complete result; idempotence; failed/stale recovery; legacy result unchanged; client roles denied')
} finally {
  await db.close()
}
