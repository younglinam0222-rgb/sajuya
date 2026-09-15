export function decodeGeneration(product: string, wire: string, needsQuestion: boolean) {
  let text = '', done = false
  const titles: Record<string, unknown>[] = []
  let manse: unknown = null, strategy: unknown = null, personal: unknown = null
  for (const line of wire.split('\n')) {
    if (!line.startsWith('data: ')) continue
    const raw = line.slice(6).trim()
    if (raw === '[DONE]') { done = true; continue }
    const event = JSON.parse(raw)
    if (event.type === 'error') throw new Error('Incomplete generation')
    if (event.type === 'manse') manse = event.data
    if (event.type === 'group') titles.push(...event.titles)
    if (event.type === 'strategy') strategy = event.data
    if (event.type === 'personal') personal = event.data
    if (typeof event.text === 'string') text += event.text
  }
  if (!done) throw new Error('Stream interrupted')
  if (product === 'saju') {
    if (titles.length !== 12 || new Set(titles.map(t => t.id)).size !== 12 || !strategy || !manse || (needsQuestion && !personal)) throw new Error('Incomplete saju')
    return { manse, result: { titles: titles.sort((a,b) => Number(a.id)-Number(b.id)), strategy, personalAnswer: personal, _meta: { isComplete: true } } }
  }
  const clean = text.replace(/```json|```/g,'').trim()
  const result = JSON.parse(clean.slice(clean.indexOf('{'), clean.lastIndexOf('}')+1))
  const required: Record<string,string[]> = {
    conversation:['memo'],
    chat:['summary','interpretation','action','caution','nextQuestion'],
    daily:['overall','money','love','health','lucky','warning','today_word'],
    daeun:['current','next10','career','love','health','warning','advice'],
    yearly:['yearOverall','firstHalf','secondHalf','money','love','health','warning','advice'],
    gunghap:['overall','love','personality','money','longterm','warning','advice'], taekil:['intro','avoid','preparation','warning'],
  }
  if (!result || typeof result !== 'object' || Array.isArray(result) || !Object.keys(result).length ||
      (required[product] ?? []).some(k => typeof result[k] !== 'string' || !result[k].trim())) throw new Error('Incomplete result')
  if(product==='taekil' && ['best1','best2','best3'].some(k=>!result[k] || ['date','reason','time'].some(f=>typeof result[k][f]!=='string'||!result[k][f].trim())))throw new Error('Incomplete dates')
  if(product==='conversation' && (!Array.isArray(result.paragraphs)||result.paragraphs.length<2||result.paragraphs.some((p:unknown)=>typeof p!=='string'||!p.trim())||!Array.isArray(result.suggestions)||result.suggestions.length!==2))throw new Error('Incomplete conversation')
  return { manse, result }
}
export function replayWire(wire: string, requestId: string) {
  return wire.split('\n').map(line => {
    if (!line.startsWith('data: ') || line.slice(6).trim() === '[DONE]') return line
    return 'data: '+JSON.stringify({...JSON.parse(line.slice(6)),requestId})
  }).join('\n')
}
