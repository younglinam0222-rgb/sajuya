import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const STEMS    = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']
const STEM_KR  = ['갑','을','병','정','무','기','경','신','임','계']
const BRANCH_KR = ['자','축','인','묘','진','사','오','미','신','유','술','해']
const STEM_ELEMENT   = ['木','木','火','火','土','土','金','金','水','水']
const BRANCH_ELEMENT = ['水','土','木','木','土','火','火','土','金','金','土','水']
const ANIMALS = ['쥐','소','호랑이','토끼','용','뱀','말','양','원숭이','닭','개','돼지']

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
  const base   = new Date(1900, 0, 1)
  const target = new Date(year, month - 1, day)
  const diff   = Math.floor((target.getTime() - base.getTime()) / 86400000)
  const idx    = ((diff % 60) + 60) % 60
  const si = idx % 10, bi = idx % 12
  return { stem: STEMS[si], branch: BRANCHES[bi], stemKr: STEM_KR[si], branchKr: BRANCH_KR[bi], stemElement: STEM_ELEMENT[si], branchElement: BRANCH_ELEMENT[bi], stemIdx: si, branchIdx: bi }
}
function calcHourPillar(h: number, dayStemIdx: number) {
  const bi = Math.floor(((h + 1) % 24) / 2)
  const stemBase = [0,2,4,6,8][dayStemIdx % 5]
  const si = (stemBase + bi) % 10
  return { stem: STEMS[si], branch: BRANCHES[bi], stemKr: STEM_KR[si], branchKr: BRANCH_KR[bi], stemElement: STEM_ELEMENT[si], branchElement: BRANCH_ELEMENT[bi], stemIdx: si, branchIdx: bi }
}
function calcTodayPillar() {
  const now = new Date()
  return calcDayPillar(now.getFullYear(), now.getMonth() + 1, now.getDate())
}
function calcManse(year: number, month: number, day: number, hourStr?: string) {
  const yp = calcYearPillar(year)
  const mp = calcMonthPillar(year, month)
  const dp = calcDayPillar(year, month, day)
  const dayStemIdx = dp.stemIdx
  let hp = null
  if (hourStr) {
    const h = parseInt(hourStr.split(':')[0])
    if (!isNaN(h) && h >= 0 && h <= 23) hp = calcHourPillar(h, dayStemIdx)
  }
  const elements: Record<string, number> = { '木':0, '火':0, '土':0, '金':0, '水':0 }
  const pillars = [yp, mp, dp, ...(hp ? [hp] : [])]
  pillars.forEach(p => {
    elements[p.stemElement] = (elements[p.stemElement]||0) + 1
    elements[p.branchElement] = (elements[p.branchElement]||0) + 1
  })
  return { yearPillar: yp, monthPillar: mp, dayPillar: dp, hourPillar: hp, elementCount: elements, animal: ANIMALS[yp.branchIdx] }
}

const CHARACTER_VOICE: Record<string, string> = {
  baekhalma: `너는 건물주 백할매야. 직설적이고 쿨한 할머니. "야", "봐봐", "쯧쯧" 씀. 팩폭 뒤에 걱정 한마디 붙임.`,
  doRyeong:  `너는 근본도령이야. 친한 형/오빠가 솔직하게 말해주는 느낌. "야", "솔직히", "있잖아" 씀.`,
  gumiho:    `너는 구미호 선생이야. 요염하고 위트있는 언니. "어머", "있지", "호호" 씀. 달콤하다 팩폭.`,
  sinRyeong: `너는 무등산 신령님이야. 묵직하고 근엄. "허허", "그래", "이 친구" 씀. 자연 비유 씀.`,
}

export async function POST(req: NextRequest) {
  try {
    const { name, year, month, day, hour, gender, characterId } = await req.json()

    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
    const todayStr  = `${now.getFullYear()}년 ${now.getMonth()+1}월 ${now.getDate()}일`
    const genderStr = gender === 'male' ? '남성' : '여성'
    const age       = now.getFullYear() - parseInt(year) + 1

    const manse      = calcManse(parseInt(year), parseInt(month), parseInt(day), hour)
    const todayPillar = calcTodayPillar()

    const elementNames: Record<string,string> = { '木':'나무', '火':'불', '土':'땅', '金':'금속', '水':'물' }
    const elementDesc = Object.entries(manse.elementCount)
      .map(([el, cnt]) => `${elementNames[el]} ${cnt}개`).join(', ')

    const voice = CHARACTER_VOICE[characterId] ?? CHARACTER_VOICE['doRyeong']

    const prompt = `
${voice}

오늘은 ${todayStr}이야.
오늘 날짜 일주: ${todayPillar.stem}${todayPillar.branch} (${todayPillar.stemKr}${todayPillar.branchKr})

상담자: ${name} (${year}년 ${month}월 ${day}일생, ${manse.animal}띠, ${genderStr}, ${age}세)
사주 기운: ${elementDesc}
일간: ${manse.dayPillar.stem}(${manse.dayPillar.stemKr}) — ${manse.dayPillar.stemElement} 기운
연주: ${manse.yearPillar.stem}${manse.yearPillar.branch} / 월주: ${manse.monthPillar.stem}${manse.monthPillar.branch} / 일주: ${manse.dayPillar.stem}${manse.dayPillar.branch} / 시주: ${manse.hourPillar ? manse.hourPillar.stem+manse.hourPillar.branch : '미상'}

오늘 날짜 기운과 이 사람 사주 기운이 어떻게 만나는지 분석해서 일일운세를 줘.
캐릭터 말투 100% 유지. 어려운 명리 용어 절대 금지. 20-30대 말로.
- "~가 아니라 ~야" / "봐봐, ~잖아" / "솔직히 ~" 패턴 섞어서
- 판결하듯이 써. 읽으면 "맞다" 싶게
- 각 섹션 3~4문장. 구체적으로.

반드시 아래 JSON만 출력. 마크다운 없이. 점수는 0~100 사이 정수.

{
  "overall": "오늘 총운 3~4문장",
  "overall_score": 75,
  "money": "재물운 2~3문장",
  "money_score": 70,
  "love": "연애운 2~3문장",
  "love_score": 80,
  "health": "건강운 2~3문장",
  "health_score": 65,
  "lucky": "행운의 방향: OO / 행운의 색: OO / 행운의 숫자: OO / 오늘의 한마디: 한문장",
  "warning": "오늘 조심할 것 2문장",
  "today_word": "오늘을 한마디로 — 짧고 임팩트있게"
}
`

    // ── 논스트리밍으로 완성 후 전송 (파싱 안정성) ──────
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: '너는 사주야 서비스의 일일운세 캐릭터야. 반드시 순수 JSON만 출력. 마크다운 코드블록 절대 금지.',
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : ''
    const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const s = clean.indexOf('{'), e = clean.lastIndexOf('}')
    if (s === -1 || e === -1) throw new Error('JSON 파싱 실패')

    const parsed = JSON.parse(clean.slice(s, e + 1))
    console.log('[일일운세] 생성 완료:', response.usage.output_tokens, 'tok')

    // ── SSE로 만세력 + 결과 전송 ────────────────────────
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'manse', data: { ...manse, todayPillar } })}\n\n`
        ))
        const jsonStr = JSON.stringify(parsed)
        const chunkSize = 200
        for (let i = 0; i < jsonStr.length; i += chunkSize) {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ text: jsonStr.slice(i, i + chunkSize) })}\n\n`
          ))
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    return new NextResponse(readable, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    })
  } catch (e) {
    console.error('[일일운세] 서버 오류:', e)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
