import LunarJS from 'lunar-javascript'
const STEMS=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
const names:Record<string,string>={'比肩':'비견','劫财':'겁재','食神':'식신','伤官':'상관','偏财':'편재','正财':'정재','七杀':'편관','正官':'정관','偏印':'편인','正印':'정인'}
export function stemRelationship(day:number,target:number){
 const name=names[LunarJS.LunarUtil.SHI_SHEN[STEMS[day]+STEMS[target]]]
 if(!name)throw Error('Invalid heavenly stem')
 return name
}
export function branchRelationship(day:number,branch:number){return stemRelationship(day,[9,5,0,1,4,2,3,5,6,7,4,8][branch])}
export function koreanDate(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now)
 const get=(type:string)=>Number(parts.find(p=>p.type===type)!.value)
 const year=get('year'),month=get('month'),day=get('day')
 return {year,month,day,iso:`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`}
}
export function birthSolarDate(year:number,month:number,day:number,calType='solar',isLeapMonth=false){
 if(!['solar','lunar'].includes(calType)||![year,month,day].every(Number.isInteger))throw Error('Invalid birth date')
 if(calType==='lunar'){
  const solar=LunarJS.Lunar.fromYmd(year,isLeapMonth?-month:month,day).getSolar()
  return {year:solar.getYear() as number,month:solar.getMonth() as number,day:solar.getDay() as number}
 }
 const date=new Date(Date.UTC(year,month-1,day))
 if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)throw Error('Invalid calendar date')
 return {year,month,day}
}
