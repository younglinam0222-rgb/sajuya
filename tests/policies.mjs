import assert from 'node:assert/strict'
import { paymentMatches, validProduct, canonical, lockedResult } from '../lib/access-policy.ts'
import { publicReading } from '../lib/share-projection.ts'
import { decodeGeneration, replayWire } from '../lib/generation-result.ts'
assert.equal(validProduct('__proto__'),false)
assert.equal(validProduct('one'),true)
const order={order_id:'order',amount:1900}
const payment={orderId:'order',totalAmount:1900,currency:'KRW',status:'DONE',paymentKey:'key'}
assert.ok(paymentMatches(order,payment,'key'))
for(const change of [{orderId:'other'},{totalAmount:1},{currency:'USD'},{status:'CANCELED'},{paymentKey:'other'}]) assert.equal(paymentMatches(order,{...payment,...change},'key'),false)
assert.equal(canonical({b:2,a:1}),canonical({a:1,b:2}))
const secretResult={titles:Array.from({length:12},(_,i)=>({id:i,title:`제목${i}`,content:i===0?'샘플본문':`비공개본문${i}`,is_free:true,secret:'내부정보'})),strategy:{warning:'비공개조언'},personalAnswer:{answer:'개인답변'},_meta:{token:'내부토큰'}}
const sample=lockedResult(JSON.stringify(secretResult))
assert.equal(sample.titles.length,1)
assert.equal(sample.titles[0].content,'샘플본문')
for(const secret of ['비공개본문','비공개조언','개인답변','내부정보','내부토큰']) assert.ok(!JSON.stringify(sample).includes(secret))
assert.equal(secretResult.titles.length,12)
for(const raw of [undefined,null,'broken','[]','{"titles":[{}]}'])assert.equal(lockedResult(raw).titles.length,0)
assert.equal(lockedResult({overall:'총평',money:'숨긴재물'}).titles.length,1)
assert.ok(!JSON.stringify(lockedResult({overall:'총평',money:'숨긴재물'})).includes('숨긴재물'))
const shared=publicReading(JSON.stringify({titles:[{title:'제목',content:'본문',secret:'hidden'}],personalAnswer:{question:'private'},user_id:'private',saju_data:{name:'private'}}))
assert.deepEqual(shared,{titles:[{title:'제목',content:'본문'}]})
const wire=events=>events.map(e=>'data: '+(typeof e==='string'?e:JSON.stringify(e))).join('\n\n')+'\n\n'
assert.throws(()=>decodeGeneration('saju',wire([{type:'group',titles:[]},'[DONE]']),false))
assert.throws(()=>decodeGeneration('daily',wire([{text:'{}'},'[DONE]']),false))
assert.throws(()=>decodeGeneration('daily',wire([{type:'error'},'[DONE]']),false))
assert.throws(()=>decodeGeneration('daily',wire([{text:'{}'}]),false))
const events=[{type:'manse',data:{test:true}},{type:'group',titles:Array.from({length:12},(_,i)=>({id:i+1,title:'제목',content:'본문'}))},{type:'strategy',data:{final_word:'조언'}},'[DONE]']
assert.equal(decodeGeneration('saju',wire(events),false).result.titles.length,12)
assert.throws(()=>decodeGeneration('saju',wire(events),true))
assert.ok(replayWire(wire(events),'new-request').includes('new-request'))
console.log('PASS: product allowlist; provider payment verification; cache keys; share redaction; incomplete/error stream rejection; full 12-section result; request replay')
