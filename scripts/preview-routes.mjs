import fs from 'node:fs/promises'
const html=await fs.readFile('dist/index.html','utf8')
const routes=['reviews','notebook','payments','admin/refunds','saju','daily','gunghap','daeun','taekil','yearly','characters','storage','login','chat','consultation','terms','privacy','refund','pay/success','pay/fail','result/demo-current','pay/demo-current',...['baekhalma','doRyeong','gumiho','sinRyeong'].map(id=>'characters/'+id)]
for(const route of routes){await fs.mkdir('dist/'+route,{recursive:true});await fs.writeFile('dist/'+route+'/index.html',html)}
await fs.writeFile('dist/404.html',html)
console.log('Created direct-entry previews:',routes.length)
