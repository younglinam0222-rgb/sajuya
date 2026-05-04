import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { CHARACTERS } from '@/lib/characters'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// ─── 만세력 계산 ───────────────────────────────────
const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']
const STEM_KR = ['갑','을','병','정','무','기','경','신','임','계']
const BRANCH_KR = ['자','축','인','묘','진','사','오','미','신','유','술','해']
const STEM_ELEMENT = ['木','木','火','火','土','土','金','金','水','水']
const BRANCH_ELEMENT = ['水','土','木','木','土','火','火','土','金','金','土','水']
const ANIMALS = ['쥐','소','호랑이','토끼','용','뱀','말','양','원숭이','닭','개','돼지']
const SIPSIN = ['비견','겁재','식신','상관','편재','정재','편관','정관','편인','정인']

function getSipsin(dayStemIdx: number, targetStemIdx: number) {
  return SIPSIN[((targetStemIdx - dayStemIdx + 10) % 10)]
}
function getSipsinBranch(dayStemIdx: number, branchIdx: number) {
  const mainStemMap = [9,5,0,1,4,3,2,5,6,7,4,8]
  return SIPSIN[((mainStemMap[branchIdx] - dayStemIdx + 10) % 10)]
}

function calcYearPillar(year: number) {
  const idx = ((year - 4) % 60 + 60) % 60
  const si = idx % 10, bi = idx % 12
  return { stem: STEMS[si], branch: BRANCHES[bi], stemKr: STEM_KR[si], branchKr: BRANCH_KR[bi], stemElement: STEM_ELEMENT[si], branchElement: BRANCH_ELEMENT[bi], stemIdx: si, branchIdx: bi }
}

function calcMonthPillar(year: number, month: number) {
  const yearStemIdx = ((year - 4) % 10 + 10) % 10
  const bi = (month + 1) % 12
  const stemBase = [0,2,4,6,8][Math.floor(yearStemIdx / 2)]
  const si = (stemBase + (month - 1)) % 10
  return { stem: STEMS[si], branch: BRANCHES[bi], stemKr: STEM_KR[si], branchKr: BRANCH_KR[bi], stemElement: STEM_ELEMENT[si], branchElement: BRANCH_ELEMENT[bi], stemIdx: si, branchIdx: bi }
}

function calcDayPillar(year: number, month: number, day: number) {
  const base = new Date(1900, 0, 1)
  const target = new Date(year, month - 1, day)
  const diff = Math.floor((target.getTime() - base.getTime()) / 86400000)
  const idx = ((diff % 60) + 60) % 60
  const si = idx % 10, bi = idx % 12
  return { stem: STEMS[si], branch: BRANCHES[bi], stemKr: STEM_KR[si], branchKr: BRANCH_KR[bi], stemElement: STEM_ELEMENT[si], branchElement: BRANCH_ELEMENT[bi], stemIdx: si, branchIdx: bi }
}

function calcHourPillar(h: number, dayStemIdx: number) {
  const bi = Math.floor(((h + 1) % 24) / 2)
  const stemBase = [0,2,4,6,8][dayStemIdx % 5]
  const si = (stemBase + bi) % 10
  return { stem: STEMS[si], branch: BRANCHES[bi], stemKr: STEM_KR[si], branchKr: BRANCH_KR[bi], stemElement: STEM_ELEMENT[si], branchElement: BRANCH_ELEMENT[bi], stemIdx: si, branchIdx: bi }
}

const HOUR_NAMES: Record<number, string> = {
  23:'자시(子時)', 0:'자시(子時)', 1:'축시(丑時)', 2:'축시(丑時)',
  3:'인시(寅時)', 4:'인시(寅時)', 5:'묘시(卯時)', 6:'묘시(卯時)',
  7:'진시(辰時)', 8:'진시(辰時)', 9:'사시(巳時)', 10:'사시(巳時)',
  11:'오시(午時)', 12:'오시(午時)', 13:'미시(未時)', 14:'미시(未時)',
  15:'신시(申時)', 16:'신시(申時)', 17:'유시(酉時)', 18:'유시(酉時)',
  19:'술시(戌時)', 20:'술시(戌時)', 21:'해시(亥時)', 22:'해시(亥時)',
}

function calcManse(year: number, month: number, day: number, hourMinute: string) {
  const yp = calcYearPillar(year)
  const mp = calcMonthPillar(year, month)
  const dp = calcDayPillar(year, month, day)
  const dayStemIdx = dp.stemIdx

  let hp = null
  let hourStr = '시간 미상'

  if (hourMinute) {
    const parts = hourMinute.split(':')
    const h = parseInt(parts[0])
    const m = parts[1] ? parseInt(parts[1]) : 0
    if (!isNaN(h) && h >= 0 && h <= 23) {
      hp = calcHourPillar(h, dayStemIdx)
      hourStr = `${String(h).padStart(2,'0')}시 ${String(m).padStart(2,'0')}분 (${HOUR_NAMES[h] ?? ''})`
    }
  }

  const elements: Record<string, number> = { 木:0, 火:0, 土:0, 金:0, 水:0 }
  const pillars = [yp, mp, dp, ...(hp ? [hp] : [])]
  pillars.forEach(p => {
    if (p.stemElement) elements[p.stemElement] = (elements[p.stemElement]||0) + 1
    if (p.branchElement) elements[p.branchElement] = (elements[p.branchElement]||0) + 1
  })

  return {
    yearPillar: { ...yp, sipsinStem: '편인', sipsinBranch: getSipsinBranch(dayStemIdx, yp.branchIdx) },
    monthPillar: { ...mp, sipsinStem: getSipsin(dayStemIdx, mp.stemIdx), sipsinBranch: getSipsinBranch(dayStemIdx, mp.branchIdx) },
    dayPillar: { ...dp, sipsinStem: '일간', sipsinBranch: getSipsinBranch(dayStemIdx, dp.branchIdx) },
    hourPillar: hp ? { ...hp, sipsinStem: getSipsin(dayStemIdx, hp.stemIdx), sipsinBranch: getSipsinBranch(dayStemIdx, hp.branchIdx) } : null,
    elementCount: elements,
    animal: ANIMALS[yp.branchIdx],
    hourStr,
  }
}

// ─── 캐릭터 말투 ───────────────────────────────────
const CHARACTER_VOICE: Record<string, string> = {
  baekhalma: `호칭 "야","너". 짧고 단정. 팩폭 츤데레. 존댓말 금지. 돈/재물/직업 냉정한 선고.`,
  doRyeong: `호칭 "형이 보니까","있잖아". 다정하지만 직구. 인생 큰 그림.`,
  gumiho: `호칭 "어머","호호","그대". 요염하고 독설적. 연애/인간관계 판결.`,
  sinRyeong: `호칭 "허허","이 사람". 느리고 묵직. 대운/인생 흐름 선고.`,
}

export async function POST(req: NextRequest) {
  try {
    const { name, year, month, day, hour, gender, characterId, occupation, questionIntent } = await req.json()

    const character = CHARACTERS[characterId] ?? CHARACTERS['doRyeong']
    const genderStr = gender === 'male' ? '남성' : '여성'
    const voiceGuide = CHARACTER_VOICE[characterId] ?? CHARACTER_VOICE['doRyeong']

    // 만세력 계산
    const manse = calcManse(parseInt(year), parseInt(month), parseInt(day), hour ?? '')

    const sajuInfo = `
[사주팔자]
연주: ${manse.yearPillar.stem}${manse.yearPillar.branch} / 월주: ${manse.monthPillar.stem}${manse.monthPillar.branch} / 일주: ${manse.dayPillar.stem}${manse.dayPillar.branch} / 시주: ${manse.hourPillar ? manse.hourPillar.stem+manse.hourPillar.branch : '미상'}
오행: 木${manse.elementCount['木']} 火${manse.elementCount['火']} 土${manse.elementCount['土']} 金${manse.elementCount['金']} 水${manse.elementCount['水']}
일간: ${manse.dayPillar.stem} / ${manse.animal}띠 / 직업: ${occupation ?? '일반인'}
태어난 시간: ${manse.hourStr}
`

    const intentGuide: Record<string, string> = {
      '돈/재물': '돈이 막힌 이유, 돈 새는 구조, 재물운 열리는 시점을 판결하라',
      '연애/결혼': '연애가 안 되는 진짜 이유, 인연 오는 시점을 판결하라',
      '직업/진로': '지금 방향이 맞는지 틀린지, 커리어 전환 시점을 판결하라',
      '인생 전반': '지금 인생이 어디쯤인지, 전성기는 언제인지 판결하라',
      '건강': '몸 어디가 약한지, 지금 당장 뭘 조심해야 하는지 판결하라',
    }
    const intentInstruction = intentGuide[questionIntent] ?? '이 사람 인생에서 가장 중요한 것을 판결하라'

    const prompt = `
너는 ${character.name}이다. 말투: ${voiceGuide}

상담자: ${name} (${year}년 ${month}월 ${day}일 ${manse.hourStr}생, ${genderStr})
${sajuInfo}
판결 주제: "${questionIntent}" → ${intentInstruction}

❌ 금지: "재물운이 상승하는 시기입니다" 같은 정보형
⭕ 필수: "야. 지금 돈 못 모으는 거 운 탓 아니야. 네 사주에 돈 새는 구조가 있어." 같은 판결형

무료 3개: 판결선고→간지근거→행동처방→⚠️조심할것들 (600자 이상)
유료 9개: 결제 안 하면 손해인 teaser (50자 이내)

반드시 아래 JSON만 출력. 마크다운 코드블록 절대 금지.

{
  "titles": [
    {"id":"1","title":"판결 제목","teaser":"한 줄","is_free":true,"content":"600자 이상"},
    {"id":"2","title":"판결 제목","teaser":"한 줄","is_free":true,"content":"600자 이상"},
    {"id":"3","title":"판결 제목","teaser":"한 줄","is_free":true,"content":"600자 이상"},
    {"id":"4","title":"판결 제목","teaser":"한 줄","is_free":false,"content":""},
    {"id":"5","title":"판결 제목","teaser":"한 줄","is_free":false,"content":""},
    {"id":"6","title":"판결 제목","teaser":"한 줄","is_free":false,"content":""},
    {"id":"7","title":"판결 제목","teaser":"한 줄","is_free":false,"content":""},
    {"id":"8","title":"판결 제목","teaser":"한 줄","is_free":false,"content":""},
    {"id":"9","title":"판결 제목","teaser":"한 줄","is_free":false,"content":""},
    {"id":"10","title":"판결 제목","teaser":"한 줄","is_free":false,"content":""},
    {"id":"11","title":"판결 제목","teaser":"한 줄","is_free":false,"content":""},
    {"id":"12","title":"판결 제목","teaser":"한 줄","is_free":false,"content":""}
  ],
  "strategy": {
    "overview": "인생 핵심 판결 3~4문장",
    "golden_period": "전성기 2~3문장",
    "lifecycle": [
      {"age":"20대","score":0,"season":"봄/여름/가을/겨울","desc":"핵심 한 줄"},
      {"age":"30대","score":0,"season":"봄/여름/가을/겨울","desc":"핵심 한 줄"},
      {"age":"40대","score":0,"season":"봄/여름/가을/겨울","desc":"핵심 한 줄"},
      {"age":"50대","score":0,"season":"봄/여름/가을/겨울","desc":"핵심 한 줄"},
      {"age":"60대","score":0,"season":"봄/여름/가을/겨울","desc":"핵심 한 줄"}
    ],
    "peak_guide": "전성기 행동 전략 3~4문장",
    "warning": "조심할 함정 2문장"
  },
  "disclaimer": "본 풀이는 엔터테인먼트 및 참고 목적이며, 중요한 결정은 전문가와 상담하세요."
}
`

    const stream = client.messages.stream({
      model: 'claude-sonnet-4-5',
      max_tokens: 4000,
      system: `너는 ${character.name}이다. 직설적 판결자. 반드시 JSON만 출력. 마크다운 없이.`,
      messages: [{ role: 'user', content: prompt }],
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        // 만세력 먼저 전송
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'manse', data: manse })}\n\n`
        ))

        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`
            ))
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    return new NextResponse(readable, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
