export function validReadingInput(product:string, input:Record<string,unknown>) {
 const date=(suffix='')=>{
  const y=Number(input['year'+suffix]),m=Number(input['month'+suffix]),d=Number(input['day'+suffix])
  const name=input['name'+suffix]
  const calendar=input['calType'+suffix]??'solar',hour=input['hour'+suffix]
  if(input['isLeapMonth'+suffix]===true||input['leapMonth'+suffix]===true)return false
  if(!['solar','lunar'].includes(String(calendar)))return false
  if(hour!==undefined&&hour!==null&&hour!==''&&(typeof hour!=='string'||!/^([01]?\d|2[0-3])(:[0-5]\d)?$/.test(hour)))return false
  if(calendar==='solar'){
   const real=new Date(Date.UTC(y,m-1,d))
   if(real.getUTCFullYear()!==y||real.getUTCMonth()!==m-1||real.getUTCDate()!==d)return false
  }else if(d>30)return false
  return typeof name==='string' && name.trim().length>0 && name.length<=80 &&
   Number.isInteger(y)&&y>=1900&&y<=new Date().getFullYear()&&Number.isInteger(m)&&m>=1&&m<=12&&Number.isInteger(d)&&d>=1&&d<=31
 }
 if(product==='gunghap' ? !date('1')||!date('2') : !date()) return false
 for(const [key,value] of Object.entries(input)) {
  if(typeof value==='string'&&value.length>(key==='personalQuestion'?2000:500)) return false
 }
 if(product==='yearly' && (!Number.isInteger(Number(input.targetYear))||Number(input.targetYear)<1900||Number(input.targetYear)>2200))return false
 if(product==='taekil' && (!Number.isInteger(Number(input.targetMonth))||Number(input.targetMonth)<1||Number(input.targetMonth)>12||!Number.isInteger(Number(input.targetYear))||Number(input.targetYear)<1900||Number(input.targetYear)>2200))return false
 return true
}
