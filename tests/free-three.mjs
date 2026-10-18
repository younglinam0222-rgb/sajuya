import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const db = new PGlite()
await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;`)
for (const name of [
  'supabase-schema.sql', 'supabase-schema-upgrade.sql', 'supabase-schema-upgrade-3-daily.sql',
  'supabase-launch-security.sql', 'supabase-refunds.sql', 'supabase-chat.sql',
  'supabase-conversation.sql', 'supabase-restore-saju-free-three.sql',
]) await db.exec(readFileSync(name, 'utf8'))
await db.exec(readFileSync('supabase-restore-saju-free-three.sql', 'utf8'))

const value = async (sql, args = []) => (await db.query(sql, args)).rows[0]?.value
const free = (user, hash, request = hash) => value(
  'SELECT reserve_saju_free($1,$2,$3,$4) value',
  [user, hash, request, { name: '가상 사용자', characterId: 'doRyeong' }],
)
const result = { titles: [
  { id: '1', category: '성격', content: '무료 성격 풀이' },
  { id: '2', category: '재물운', content: '무료 재물 풀이' },
  { id: '3', category: '애정운', content: '무료 애정 풀이' },
] }
const finish = (job, success, payload = result) => value(
  'SELECT finish_generation($1,$2,$3,$4,$5,$6) value',
  [job.id, job.attempt, success, success ? 'data: [DONE]\n\n' : null, success ? payload : null, {}],
)
try {
  await db.exec("INSERT INTO users(id,yeobjeun_balance) VALUES ('free',0),('buyer',2)")
  const first = await free('free', 'fingerprint-1')
  assert.ok(first.id)
  assert.equal((await free('free', 'fingerprint-1')).error, 'busy')
  assert.equal((await free('free', 'fingerprint-2')).error, 'busy')
  assert.equal(await value("SELECT yeobjeun_balance value FROM users WHERE id='free'"), 0)
  await assert.rejects(() => finish(first, true, { ...result, strategy: { secret: 'paid' } }))
  assert.equal((await finish(first, true)).shareId?.length, 32)
  assert.equal((await free('free', 'fingerprint-1', 'duplicate-request')).cached, true)
  assert.equal((await free('free', 'fingerprint-2', 'duplicate-request')).error, 'conflict')
  assert.equal(await value("SELECT yeobjeun_balance value FROM users WHERE id='free'"), 0)
  assert.equal(await value("SELECT daily_trial_used value FROM users WHERE id='free'"), false)
  assert.equal(await value("SELECT is_paid value FROM readings WHERE user_id='free'"), false)
  assert.equal(await value("SELECT access_verified value FROM readings WHERE user_id='free'"), true)

  const failed = await free('free', 'fingerprint-fail')
  await finish(failed, false)
  const retried = await free('free', 'fingerprint-fail')
  assert.notEqual(retried.attempt, failed.attempt)
  assert.equal((await finish(failed, true)).error, 'stale')
  await finish(retried, true)
  assert.equal(await value("SELECT count(*)::int value FROM readings WHERE user_id='free'"), 2)

  const stale = await free('free', 'fingerprint-stale')
  await db.query("UPDATE generation_jobs SET updated_at=now()-interval '21 minutes' WHERE id=$1", [stale.id])
  const afterRestart = await free('free', 'fingerprint-next')
  assert.ok(afterRestart.id)
  assert.equal((await finish(stale, true)).error, 'stale')
  await finish(afterRestart, false)

  const paid = await value('SELECT reserve_generation($1,$2,$3,$4,$5) value',
    ['buyer', 'paid-generation', 'saju', 'paid-generation', { name: '가상 사용자' }])
  assert.ok(paid.id)
  assert.equal(await value("SELECT yeobjeun_balance value FROM users WHERE id='buyer'"), 1)
  await finish(paid, false)
  assert.equal(await value("SELECT yeobjeun_balance value FROM users WHERE id='buyer'"), 2)

  await db.exec('SET ROLE anon')
  await assert.rejects(() => db.query("SELECT reserve_saju_free('free','x','x','{}')"))
  await db.exec('RESET ROLE; SET ROLE authenticated')
  await assert.rejects(() => db.query("SELECT reserve_saju_free('free','x','x','{}')"))
  console.log('PASS: three-free reservation, no debit, idempotence, failure retry, stale recovery, paid flow preservation, restricted RPC')
} finally {
  await db.close()
}
