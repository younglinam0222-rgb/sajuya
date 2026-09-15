import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {PGlite} from '@electric-sql/pglite'
import {validConversation,readConversation,compactConversation} from '../lib/conversation.ts'
import {readSavedReading} from '../lib/saved-reading.ts'
const savedProfile={form:{name:'본인',year:'1986',month:4,day:19},saju:{}}
assert.deepEqual(readSavedReading(JSON.stringify(savedProfile)),savedProfile)
for(const bad of [null,{form:{}},{...savedProfile,form:{...savedProfile.form,conversation:{message:42}}},{...savedProfile,form:{...savedProfile.form,chat:{topicId:'business',note:'',answers:[42]}}}])assert.throws(()=>readSavedReading(bad))
const input={sourceId:'mine',characterId:'baekhalma',message:'매장을 확장해도 될까요?',previousId:null,requestId:'request-1234',maxCoins:0,consent:true}
assert.ok(validConversation(input))
for(const change of [{message:''},{message:' '},{message:'a'.repeat(801)},{characterId:'hamster'},{maxCoins:-1},{consent:false},{previousId:{id:'bad'}}])assert.equal(validConversation({...input,...change}),false)
const answer={memo:'메모',paragraphs:['첫 문단','둘째 문단'],suggestions:['이어서 물을 질문','다른 질문'],recommendation:null}
assert.deepEqual(readConversation({...answer,secret:'hidden'}),answer)
assert.throws(()=>readConversation({...answer,paragraphs:['truncated']}))
assert.equal(compactConversation(Array.from({length:20},()=>({message:'x'.repeat(800),answer}))).length,3)
const db=new PGlite()
await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;CREATE SCHEMA auth;CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;`)
for(const f of ['supabase-schema.sql','supabase-schema-upgrade.sql','supabase-schema-upgrade-3-daily.sql','supabase-launch-security.sql','supabase-refunds.sql','supabase-chat.sql','supabase-conversation.sql','supabase-conversation.sql'])await db.exec(readFileSync(f,'utf8'))
await db.exec("INSERT INTO users(id,yeobjeun_balance) VALUES('buyer',2),('other',0),('rate',20)")
const value=async(sql,args=[])=>(await db.query(sql,args)).rows[0]?.v
const reserve=(u,hash,room='mine--baekhalma',previous=null,max=0)=>value('SELECT reserve_generation($1,$2,\'conversation\',$2,$3) v',[u,hash,{name:'예시',characterId:'baekhalma',conversation:{roomId:room,message:'질문',previousId:previous,maxCoins:max}}])
const finish=(r,success=true)=>value('SELECT finish_generation($1,$2,$3,$4,$5,$6) v',[r.id,r.attempt,success,success?'wire':null,success?answer:null,{}])
const balance=u=>value('SELECT yeobjeun_balance v FROM users WHERE id=$1',[u])
const flags=u=>value('SELECT jsonb_build_array(daily_trial_used,conversation_trial_used) v FROM users WHERE id=$1',[u])
const fail=await reserve('buyer','fail');assert.ok(fail.id);await finish(fail,false);await finish(fail,false);assert.equal(await balance('buyer'),2);assert.deepEqual(await flags('buyer'),[false,false])
const first=await reserve('buyer','first');assert.equal((await reserve('buyer','parallel','other-room')).error,'busy');const firstDone=await finish(first);assert.equal(await balance('buyer'),2);assert.deepEqual(await flags('buyer'),[false,true]);assert.equal((await reserve('buyer','first')).cached,true)
assert.equal((await reserve('buyer','switched','mine--gumiho')).error,'price_changed')
assert.equal((await reserve('buyer','stale','mine--baekhalma',null,1)).error,'conversation_changed')
const paid=await reserve('buyer','paid','mine--baekhalma',firstDone.shareId,1);assert.ok(paid.id);assert.equal(await balance('buyer'),1);await finish(paid,false);assert.equal(await balance('buyer'),2)
const retried=await reserve('buyer','paid','mine--baekhalma',firstDone.shareId,1);await finish(retried);assert.equal(await balance('buyer'),1);assert.equal((await reserve('buyer','paid','mine--baekhalma',firstDone.shareId,1)).cached,true);assert.equal(await balance('buyer'),1)
const other=await reserve('other','first');assert.ok(other.id);await finish(other);assert.equal((await reserve('other','next','mine--gumiho',null,1)).error,'balance')
// Separate daily fortune trial remains available after the conversation trial.
await db.exec("UPDATE generation_attempts SET created_at=now()-interval '11 minutes'")
const daily=await value("SELECT reserve_generation('buyer','daily','daily','daily','{}') v");assert.ok(daily.id);await finish(daily);assert.deepEqual(await flags('buyer'),[true,true])
// Failed free reservations never return later and overwrite a consumed trial.
const old=await reserve('rate','old');await finish(old,false);const free2=await reserve('rate','new','second-room');await finish(free2);assert.equal((await reserve('rate','old')).error,'price_changed')
for(let i=1;i<=9;i++){await db.exec("UPDATE generation_attempts SET created_at=now()-interval '11 minutes'");const r=await reserve('rate','paid-'+i,'room-'+i,null,1);assert.ok(r.id);await finish(r)}
assert.equal((await reserve('rate','cap','room-cap',null,1)).error,'conversation_limit')
assert.equal((await reserve('rate','new','second-room')).cached,true)
await db.exec('SET ROLE authenticated');await assert.rejects(()=>db.query("UPDATE users SET conversation_trial_used=false"));await assert.rejects(()=>db.query("SELECT reserve_generation('buyer','hack','conversation','hack','{}')"));await db.exec('RESET ROLE')
await db.close()
console.log('PASS conversation: free question validation; output validation; 3-turn context cap; SQL replay; failed free recovery; one free across guides; separate daily trial; consent quote race; stale thread; paid retry/deduplication; owner isolation; no balance; daily cap; RLS')
