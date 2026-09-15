import assert from 'node:assert/strict'
import LunarJS from 'lunar-javascript'
import {stemRelationship,branchRelationship,koreanDate,birthSolarDate} from '../lib/manse-facts.ts'
import {validReadingInput} from '../lib/input-validation.ts'
// Independent element / polarity derivation, including every yin day stem.
const byElement=[['비견','겁재'],['식신','상관'],['편재','정재'],['편관','정관'],['편인','정인']]
for(let d=0;d<10;d++)for(let t=0;t<10;t++)assert.equal(stemRelationship(d,t),byElement[(Math.floor(t/2)-Math.floor(d/2)+5)%5][(d%2)===(t%2)?0:1])
const branches='子丑寅卯辰巳午未申酉戌亥',stems='甲乙丙丁戊己庚辛壬癸'
for(let d=0;d<10;d++)for(let b=0;b<12;b++)assert.equal(branchRelationship(d,b),stemRelationship(d,stems.indexOf(LunarJS.LunarUtil.ZHI_HIDE_GAN[branches[b]][0])))
assert.deepEqual([stemRelationship(9,2),stemRelationship(9,8),stemRelationship(9,3)],['정재','겁재','편재'])
assert.equal(branchRelationship(9,5),'정재');assert.equal(branchRelationship(9,6),'편재')
for(const [utc,date,pillar] of [['2026-09-13T14:59:59Z','2026-09-13','庚寅'],['2026-09-13T15:00:00Z','2026-09-14','辛卯'],['2026-09-13T23:59:59Z','2026-09-14','辛卯'],['2026-12-31T15:00:00Z','2027-01-01',null]]){
 const k=koreanDate(new Date(utc));assert.equal(k.iso,date);if(pillar)assert.equal(LunarJS.Solar.fromYmd(k.year,k.month,k.day).getLunar().getDayInGanZhi(),pillar)
}
assert.deepEqual(birthSolarDate(1986,4,19,'lunar'),{year:1986,month:5,day:27})
assert.deepEqual(birthSolarDate(2023,2,1,'lunar'),{year:2023,month:2,day:20})
assert.deepEqual(birthSolarDate(2023,2,1,'lunar',true),{year:2023,month:3,day:22})
for(const args of [[1986,2,31],[2025,2,29],[2026,2,31,'lunar'],[2026,13,1],[2026,1,1,'invalid']])assert.throws(()=>birthSolarDate(...args))
const base={name:'검증',year:'1986',month:'4',day:'19',hour:'09:35'}
assert.ok(validReadingInput('saju',base));assert.ok(validReadingInput('saju',{...base,hour:''}))
for(const change of [{month:'2',day:'31'},{hour:'24:80'},{hour:'-1'},{calType:'invalid'},{calType:'lunar',isLeapMonth:true}])assert.equal(validReadingInput('saju',{...base,...change}),false)
console.log('PASS: 100 stem relationships; 120 branch main-stem relationships; KST midnight/year boundary; lunar conversion; leap-month distinction; invalid dates/times rejected')
