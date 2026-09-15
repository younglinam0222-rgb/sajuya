import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { reviewLength, validateReview, publicReview } from '../lib/reviews-policy.ts'

assert.equal(reviewLength('가😀'), 2)
assert.equal(validateReview({ rating: 5, body: '😀'.repeat(400) }).body.length, 800)
assert.equal(validateReview({ rating: 5, body: '😀'.repeat(401) }), null)
assert.equal(validateReview({ rating: 5, body: '가'.repeat(401) }), null)
for (const value of [null, [], {}, { rating: 0, body: '후기' }, { rating: 6, body: '후기' }, { rating: 1.5, body: '후기' }, { rating: '5', body: '후기' }, { rating: 5, body: ' \n ' }, { rating: 5, body: '\ud800' }, { rating: 5, body: 'bad\u0000text' }, { rating: 5, body: '글', user_id: 'victim' }, { rating: 5, body: '글', displayName: '관리자' }]) assert.equal(validateReview(value), null)
assert.deepEqual(validateReview({ rating: 1, body: '  아쉬워요\r\n다음에는 개선되길.  ' }), { rating: 1, body: '아쉬워요\n다음에는 개선되길.' })
assert.equal(validateReview({ rating: 5, body: 'e\u0301' }).body, 'é')
const projected = publicReview({ id: '11111111-1111-4111-8111-111111111111', rating: 1, body: '<script>alert(1)</script>', created_at: '2026-09-15T00:00:00Z', updated_at: '2026-09-15T00:00:00Z', user_id: 'secret-user', email: 'secret@example.com', name: 'Private name', birth: '1986-04-19' })
assert.deepEqual(Object.keys(projected), ['id', 'displayName', 'rating', 'body', 'createdAt', 'updatedAt'])
assert.ok(!JSON.stringify(projected).includes('secret'))

const db = new PGlite()
try {
  await db.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;')
  for (const file of ['supabase-schema.sql', 'supabase-schema-upgrade.sql', 'supabase-schema-upgrade-3-daily.sql', 'supabase-launch-security.sql', 'supabase-refunds.sql', 'supabase-chat.sql', 'supabase-conversation.sql', 'supabase-reviews.sql']) await db.exec(readFileSync(file, 'utf8'))
  const value = async (sql, args = []) => (await db.query(sql, args)).rows[0]?.value
  const save = (user, rating = 5, body = '잘 읽었습니다.') => value('SELECT save_my_review($1,$2,$3) value', [user, rating, body])
  const status = user => value('SELECT my_review_status($1) value', [user])
  const eligible = async user => {
    await db.query('INSERT INTO users(id,email,name) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [user, `${user}@private.example`, '개인 이름'])
    await db.query("INSERT INTO readings(user_id,share_id,saju_data,character_id,ai_result,access_verified) VALUES($1,$1,'{}','baekhalma','complete-result',true)", [user])
  }
  assert.equal((await value('SELECT list_public_reviews() value')).items.length, 0, 'No fake reviews seeded')
  await db.exec("INSERT INTO users(id) VALUES('new'),('unverified')")
  await db.exec("INSERT INTO readings(user_id,share_id,saju_data,character_id,ai_result,access_verified) VALUES('unverified','unverified','{}','baekhalma','preview only',false)")
  assert.equal((await save('new')).error, 'ineligible')
  assert.equal((await save('unverified')).error, 'ineligible')
  assert.equal((await save('missing')).error, 'ineligible')
  await eligible('owner'); await eligible('other')
  const first = (await save('owner', 1, '아쉬웠던 부분이 있습니다.')).review
  assert.equal((await status('owner')).eligible, true)
  assert.equal((await status('other')).review, null)
  assert.deepEqual((await save('owner', 1, first.body)).review, first, 'Identical request retry is idempotent')
  assert.equal((await save('owner', 2, '곧바로 수정')).error, 'rate_limited')
  assert.equal(await value("SELECT count(*)::int value FROM reviews WHERE user_id='owner'"), 1)
  await db.exec("UPDATE review_write_limits SET last_written=now()-interval '11 seconds' WHERE user_id='owner'")
  const changed = (await save('owner', 2, '수정한 후기')).review
  assert.equal(changed.id, first.id); assert.equal(changed.created_at, first.created_at)
  const list = await value('SELECT list_public_reviews() value')
  assert.equal(list.items[0].rating, 2, 'Low ratings remain public')
  assert.ok(!JSON.stringify(list).includes('user_id')); assert.ok(!JSON.stringify(list).includes('private.example'))
  await assert.rejects(() => save('other', 5, '😀'.repeat(401)))
  await assert.rejects(() => save('other', 0, '잘못된 별점'))
  const emoji = (await save('other', 5, '😀'.repeat(400))).review
  assert.equal(Array.from(emoji.body).length, 400)
  await value("SELECT delete_my_review('owner') value")
  assert.equal((await status('owner')).review, null)
  assert.equal((await status('other')).review.id, emoji.id, 'Deleting my review leaves other accounts intact')
  assert.equal((await save('owner')).error, 'rate_limited', 'Delete/recreate cannot bypass cooldown')
  await db.exec("UPDATE review_write_limits SET last_written=now()-interval '11 seconds' WHERE user_id='owner'")
  await save('owner')
  await db.exec("UPDATE readings SET access_verified=false WHERE user_id='owner'; UPDATE review_write_limits SET last_written=now()-interval '11 seconds' WHERE user_id='owner'")
  assert.equal((await status('owner')).eligible, true)
  assert.equal((await save('owner', 1, '환불 후 수정하는 솔직한 후기')).review.rating, 1, 'Refunded owner can still edit criticism')
  for (let i = 0; i < 25; i++) { await eligible('page-' + i); await save('page-' + i) }
  await db.exec("UPDATE reviews SET created_at='2026-09-15T00:00:00Z'")
  let cursor = [null, null], ids = []
  do {
    const page = await value('SELECT list_public_reviews($1,$2,12) value', cursor)
    ids.push(...page.items.map(item => item.id))
    if (!page.hasMore) break
    const last = page.items.at(-1); cursor = [last.created_at, last.id]
  } while (true)
  assert.equal(ids.length, 27); assert.equal(new Set(ids).size, 27, 'Timestamp ties page without duplicates or omissions')
  await assert.rejects(() => value('SELECT list_public_reviews(NULL,NULL,999) value'))
  await assert.rejects(() => value('SELECT list_public_reviews(now(),NULL,12) value'))
  await db.exec(readFileSync('supabase-reviews.sql', 'utf8'))
  assert.equal(await value('SELECT count(*)::int value FROM reviews'), 27, 'Migration is safe to reapply')
  for (const role of ['anon', 'authenticated']) {
    await db.exec('SET ROLE ' + role)
    for (const sql of ["SELECT * FROM reviews", "SELECT * FROM review_write_limits", "SELECT list_public_reviews()", "SELECT my_review_status('owner')", "SELECT save_my_review('owner',5,'spoof')", "SELECT delete_my_review('owner')"]) await assert.rejects(() => db.exec(sql), role + ': ' + sql)
    await db.exec('RESET ROLE')
  }
  console.log('PASS reviews: Unicode 400 limit; malformed/spoofed inputs; no fake data; verified use eligibility; one per user; idempotent save; rate-limit and delete/recreate; owner-only edits/deletes; criticism after refund; safe public fields; timestamp-tie pagination; migration replay; direct-client table/RPC denial')
} finally { await db.close() }
