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
  'supabase-saju-temporary-full-free.sql',
]) await db.exec(readFileSync(name, 'utf8'))

const value = async (sql, args = []) => (await db.query(sql, args)).rows[0]?.value
const reserve = (user, hash, input = {}) => value('SELECT reserve_saju_free($1,$2,$3,$4) value',
  [user, hash, hash, {name:'가상 사용자', characterId:'doRyeong', ...input}])
const complete = (job, result) => value('SELECT finish_generation($1,$2,true,$3,$4,$5) value',
  [job.id, job.attempt, 'data: [DONE]\n\n', result, {}])
const titles = Array.from({length:12},(_,i)=>({id:String(i+1),category:`가상${i+1}`,content:'가상 해석'}))
const result = {titles, strategy:{overview:'가상 전략'}, personalAnswer:{question:'가상 질문',answer:'가상 답변'},
  _meta:{isComplete:true,accessScope:'free_full_v1'}}
try {
  await db.exec("INSERT INTO users(id,yeobjeun_balance) VALUES ('free',0),('buyer',2)")
  const job = await reserve('free','full-free-1',{personalQuestion:'가상 질문'})
  assert.ok(job.id)
  await assert.rejects(()=>complete(job,{...result,titles:titles.slice(0,3)}))
  assert.equal((await complete(job,result)).shareId?.length,32)
  assert.equal(await value("SELECT yeobjeun_balance value FROM users WHERE id='free'"),0)
  assert.equal(await value("SELECT is_paid value FROM readings WHERE user_id='free'"),false)
  assert.equal((await reserve('free','full-free-1')).cached,true)
  const rows = await db.query("SELECT ai_result FROM readings WHERE user_id='free'")
  assert.equal(JSON.parse(rows.rows[0].ai_result).titles.length,12)

  const guestId = `guest-${'a'.repeat(32)}`
  const guest = await reserve(guestId,'guest-full-1')
  assert.ok(guest.id)
  assert.equal(await value('SELECT yeobjeun_balance value FROM users WHERE id=$1',[guestId]),0)
  assert.equal((await complete(guest,{...result,personalAnswer:undefined})).shareId?.length,32)
  const ipHash = 'b'.repeat(64)
  for (let i=1;i<=3;i++) assert.equal((await value('SELECT reserve_guest_generation($1) value',[ipHash])).attempts,i)
  assert.equal((await value('SELECT reserve_guest_generation($1) value',[ipHash])).error,'rate')
  await db.exec('SET ROLE anon')
  await assert.rejects(()=>db.query('SELECT reserve_guest_generation($1)',[ipHash]))
  await db.exec('RESET ROLE')

  const paid = await value('SELECT reserve_generation($1,$2,$3,$4,$5) value',
    ['buyer','paid-generation','saju','paid-generation',{name:'가상 사용자'}])
  assert.ok(paid.id)
  assert.equal(await value("SELECT yeobjeun_balance value FROM users WHERE id='buyer'"),1)
  await value('SELECT finish_generation($1,$2,false) value',[paid.id,paid.attempt])
  assert.equal(await value("SELECT yeobjeun_balance value FROM users WHERE id='buyer'"),2)
  console.log('PASS: full free saju and guest identity have no debit; incomplete result denied; DB guest IP quota is atomic; paid reservation unchanged')
} finally { await db.close() }
