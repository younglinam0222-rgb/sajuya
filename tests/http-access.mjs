import assert from 'node:assert/strict'
const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:3107'
const posts=['saju','daily','gunghap','daeun','yearly','taekil','attendance','readings/save','pay/ready','pay/confirm','readings/known-id/share']
for(const route of posts){
 const r=await fetch(origin+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({isPaid:true,userId:'victim',amount:1})})
 assert.equal(r.status,401,route)
}
for(const route of ['readings/known-id','result/known-id','storage','pay/order/known-id'])assert.equal((await fetch(origin+'/api/'+route)).status,401,route)
assert.equal((await fetch(origin+'/api/internal/reconcile',{method:'POST'})).status,401)
assert.equal((await fetch(origin+'/api/share/not-a-token')).status,404)
for(const route of ['/','/saju','/daily','/gunghap','/daeun','/yearly','/taekil','/checkout/example-order','/result/example-id'])assert.equal((await fetch(origin+route)).status,200,route)
console.log('PASS: 15 real HTTP authentication gates; maintenance secret; invalid share token; 9 page routes')
// Authenticated authorization checks against a deliberately isolated fake REST database.
// Real Supabase/RLS behavior is tested separately in launch-security.mjs.
const {createServer}=await import('node:http')
const {encode}=await import('next-auth/jwt')
let writes=0
const fake=createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost')
 res.setHeader('Content-Type','application/json')
 if(req.method!=='GET'){writes++;res.statusCode=500;res.end('{}');return}
 const owner=url.searchParams.get('user_id')
 const id=url.searchParams.get('share_id')
 if(url.pathname==='/rest/v1/readings' && owner==='eq.buyer' && ['eq.paid','eq.locked'].includes(id)) {
  res.end(JSON.stringify({share_id:id.slice(3),user_id:'buyer',character_id:'doRyeong',saju_data:{form:{name:'owner'}},
   ai_result:JSON.stringify({titles:[{title:'SAMPLE_TITLE',content:'SAMPLE_BODY'},{title:'SECRET',content:'PAID_BODY'}]}),is_paid:true,access_verified:id==='eq.paid',product:'saju'}));return
 }
 res.end('null')
})
await new Promise(resolve=>fake.listen(3110,'127.0.0.1',resolve))
try{
 const cookie=async sub=>'next-auth.session-token='+await encode({token:{sub},secret:'build-placeholder'})
 const buyer={Cookie:await cookie('buyer')},other={Cookie:await cookie('other')}
 const paid=await fetch(origin+'/api/readings/paid',{headers:buyer});assert.equal(paid.status,200)
 assert.ok((await paid.text()).includes('PAID_BODY'))
 const locked=await fetch(origin+'/api/readings/locked',{headers:buyer});assert.equal(locked.status,200)
 const lockedBody=await locked.text();assert.ok(lockedBody.includes('SAMPLE_BODY'));assert.equal(JSON.parse(JSON.parse(lockedBody).ai_result).titles.length,1);assert.ok(!lockedBody.includes('PAID_BODY'));assert.ok(!lockedBody.includes('SECRET'))
 assert.equal((await fetch(origin+'/api/readings/paid',{headers:other})).status,404)
 assert.equal((await fetch(origin+'/api/result/paid',{headers:other})).status,404)
 const save=await fetch(origin+'/api/readings/save',{method:'POST',headers:{...buyer,'Content-Type':'application/json'},body:JSON.stringify({requestId:'forged',isPaid:true,aiResult:'forged'})})
 assert.equal(save.status,404);assert.equal(writes,0)
 const cross=await fetch(origin+'/api/readings/save',{method:'POST',headers:{...buyer,Origin:'https://other.example','Content-Type':'application/json'},body:'{}'})
 assert.equal(cross.status,403)
 console.log('PASS: signed test sessions; owner-paid body; unverified-paid flag stays locked; other-owner denial on both URLs; forged save cannot write; cross-origin rejection')
}finally{await new Promise(resolve=>fake.close(resolve))}
