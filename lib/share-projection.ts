export function publicReading(raw:string) {
 const parsed=JSON.parse(raw)
 // Explicit allowlist: no input profile, identifiers, personal questions, metadata or internal fields.
 if(Array.isArray(parsed.titles)) return {titles:parsed.titles.map((t:Record<string,unknown>)=>({
  title:typeof t.title==='string'?t.title:'',content:typeof t.content==='string'?t.content:'',
 }))}
 const labels:Record<string,string>={overall:'총운',money:'재물',love:'관계',health:'건강',warning:'조심할 것',advice:'조언',yearOverall:'연간 총운',current:'현재 대운',intro:'총평'}
 return {titles:Object.entries(labels).filter(([key])=>typeof parsed[key]==='string').map(([key,title])=>({title,content:parsed[key]}))}
}
