import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createServerSupabase } from '@/lib/supabase'
import { correctToTrueSolarTime } from '@/lib/solarTime'
import { birthPromptLine, resolveBirthFromRequest } from '@/lib/birthInput'
import { CONSENT_REQUIRED_MESSAGE, hasEntertainmentConsent } from '@/lib/entertainmentConsent'
import { normalizeMaritalStatus, resolveOccupation } from '@/lib/profileOptions'
import { buildServiceContextPrompt } from '@/lib/serviceContextPrompt'
import { kstYmd } from '@/lib/kstDate'
import { isPaymentsEnabled } from '@/lib/paymentFlags'
import { createSupabaseDailyQuotaStore } from '@/lib/dailyQuotaSupabase'
import {
  DAILY_LOGIN_REQUIRED_MESSAGE,
  completeDailyGeneration,
  failDailyGeneration,
  getDailyQuotaStatus,
  reserveDailyGeneration,
  type DailyUsageRow,
} from '@/lib/dailyQuota'
import LunarJS from 'lunar-javascript'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function sessionUserId(session: unknown): string | null {
  const user = (session as { user?: { id?: string } } | null)?.user
  return user?.id ?? null
}

function quotaErrorStatus(code: string): number {
  if (code === 'IN_PROGRESS') return 409
  if (code === 'INVALID_REQUEST') return 400
  return 403
}

function sseFromResult(manse: unknown, parsed: unknown) {
  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(
        `data: ${JSON.stringify({ type: 'manse', data: manse })}\n\n`,
      ))
      const jsonStr = JSON.stringify(parsed)
      const chunkSize = 200
      for (let i = 0; i < jsonStr.length; i += chunkSize) {
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ text: jsonStr.slice(i, i + chunkSize) })}\n\n`,
        ))
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })
  return new NextResponse(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  })
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    const userId = sessionUserId(session)
    if (!userId) {
      return NextResponse.json({
        cached: null,
        birthProfile: null,
        quota: null,
        paymentsEnabled: isPaymentsEnabled(),
      })
    }

    const store = createSupabaseDailyQuotaStore()
    const supabase = createServerSupabase()
    const now = new Date()
    const [quota, userRow] = await Promise.all([
      getDailyQuotaStatus(store, userId, now),
      supabase.from('users').select('birth_profile').eq('id', userId).maybeSingle(),
    ])

    return NextResponse.json({
      cached: quota.cached
        ? { manse: quota.cached.manse, result: quota.cached.result, characterId: quota.cached.characterId }
        : null,
      birthProfile: userRow.data?.birth_profile ?? null,
      quota: {
        usageDate: quota.usageDate,
        freeStatus: quota.freeStatus,
        canGenerateFree: quota.canGenerateFree,
        hasCachedResult: quota.hasCachedResult,
        message: quota.canGenerateFree ? null : (quota.freeStatus === 'pending'
          ? '오늘의 운세를 이미 생성 중이에요. 잠시 후 다시 확인해주세요.'
          : '오늘 무료 이용을 완료했어요. 기존 결과를 확인하거나 내일 다시 이용해주세요'),
      },
      paymentsEnabled: isPaymentsEnabled(),
    })
  } catch (e) {
    console.error('[사주궁] 일일운세 조회 오류:', e)
    return NextResponse.json({ cached: null, birthProfile: null, quota: null, paymentsEnabled: isPaymentsEnabled() })
  }
}

const STEMS    = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']
const STEM_KR  = ['갑','을','병','정','무','기','경','신','임','계']
const BRANCH_KR = ['자','축','인','묘','진','사','오','미','신','유','술','해']
const STEM_ELEMENT   = ['木','木','火','火','土','土','金','金','水','水']
const BRANCH_ELEMENT = ['水','土','木','木','土','火','火','土','金','金','土','水']
const ANIMALS = ['쥐','소','호랑이','토끼','용','뱀','말','양','원숭이','닭','개','돼지']

function ganZhiToPillar(ganzhi: string) {
  const stemChar = ganzhi[0], branchChar = ganzhi[1]
  const si = STEMS.indexOf(stemChar), bi = BRANCHES.indexOf(branchChar)
  return { stem: stemChar, branch: branchChar, stemKr: STEM_KR[si], branchKr: BRANCH_KR[bi], stemElement: STEM_ELEMENT[si], branchElement: BRANCH_ELEMENT[bi], stemIdx: si, branchIdx: bi }
}
function calcYearPillar(year: number, month: number, day: number) {
  const lunar = LunarJS.Solar.fromYmd(year, month, day).getLunar()
  return ganZhiToPillar(lunar.getYearInGanZhiByLiChun())
}
function calcMonthPillar(year: number, month: number, day: number) {
  const lunar = LunarJS.Solar.fromYmd(year, month, day).getLunar()
  return ganZhiToPillar(lunar.getMonthInGanZhi())
}
function calcDayPillar(year: number, month: number, day: number) {
  const lunar = LunarJS.Solar.fromYmd(year, month, day).getLunar()
  return ganZhiToPillar(lunar.getDayInGanZhi())
}
function calcHourPillar(year: number, month: number, day: number, h: number, m: number) {
  const lunar = LunarJS.Solar.fromYmdHms(year, month, day, h, m, 0).getLunar()
  return ganZhiToPillar(lunar.getTimeInGanZhi())
}
function calcTodayPillar(now: Date) {
  const { year, month, day } = kstYmd(now)
  return calcDayPillar(year, month, day)
}
function calcManse(year: number, month: number, day: number, hourStr?: string, longitude?: number) {
  let y = year, mo = month, d = day, hm = hourStr
  if (longitude && hourStr) {
    const c = correctToTrueSolarTime(year, month, day, hourStr, longitude)
    y = c.correctedYear; mo = c.correctedMonth; d = c.correctedDay; hm = c.correctedHourMinute
  }
  const yp = calcYearPillar(y, mo, d)
  const mp = calcMonthPillar(y, mo, d)
  const dp = calcDayPillar(y, mo, d)
  let hp = null
  if (hm) {
    const h = parseInt(hm.split(':')[0])
    const m = hm.split(':')[1] ? parseInt(hm.split(':')[1]) : 0
    if (!isNaN(h) && h >= 0 && h <= 23) hp = calcHourPillar(y, mo, d, h, m)
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
  let reservedUsage: DailyUsageRow | null = null
  let store: ReturnType<typeof createSupabaseDailyQuotaStore> | null = null
  try {
    const body = await req.json()
    if (!hasEntertainmentConsent(body.agreedEntertainment)) {
      return NextResponse.json({ error: CONSENT_REQUIRED_MESSAGE }, { status: 400 })
    }
    const { name, gender, characterId } = body
    const birth = resolveBirthFromRequest(body)
    if ('error' in birth) return NextResponse.json({ error: birth.error }, { status: 400 })
    const marital = normalizeMaritalStatus(body.maritalStatus)
    const occupation = resolveOccupation(body.occupation) || '미입력'
    const session = await getServerSession(authOptions)
    const userId = sessionUserId(session)
    if (!userId) {
      return NextResponse.json({ error: DAILY_LOGIN_REQUIRED_MESSAGE }, { status: 401 })
    }

    const now = new Date()
    store = createSupabaseDailyQuotaStore()
    const reserved = await reserveDailyGeneration(store, {
      userId,
      requestId: body.requestId,
      now,
      confirmPaidRegenerate: body.confirmPaidRegenerate,
      paymentsEnabled: isPaymentsEnabled(),
    })
    if (!reserved.ok) {
      return NextResponse.json({ error: reserved.error, code: reserved.code }, { status: quotaErrorStatus(reserved.code) })
    }
    reservedUsage = reserved.usage

    if (reserved.reused) {
      const cached = reserved.usage.result && reserved.usage.manse_data
        ? { manse: reserved.usage.manse_data, result: reserved.usage.result, characterId: reserved.usage.character_id }
        : await store.getFreeReading(userId, reserved.usage.usage_date)
      if (!cached) {
        return NextResponse.json({ error: '저장된 오늘의 운세를 찾지 못했어요. 잠시 후 다시 확인해주세요.' }, { status: 409 })
      }
      return sseFromResult(
        cached.manse,
        cached.result,
      )
    }

    const kst = kstYmd(now)
    const todayStr  = `${kst.year}년 ${kst.month}월 ${kst.day}일`
    const genderStr = gender === 'male' ? '남성' : '여성'
    const age       = kst.year - birth.solarYear + 1

    const manse      = calcManse(birth.solarYear, birth.solarMonth, birth.solarDay, birth.hourMinute, birth.longitude)
    const todayPillar = calcTodayPillar(now)

    const elementNames: Record<string,string> = { '木':'나무', '火':'불', '土':'땅', '金':'금속', '水':'물' }
    const elementDesc = Object.entries(manse.elementCount)
      .map(([el, cnt]) => `${elementNames[el]} ${cnt}개`).join(', ')

    const voice = CHARACTER_VOICE[characterId] ?? CHARACTER_VOICE['doRyeong']

    const prompt = `
${voice}

오늘은 ${todayStr}이야.
오늘 날짜 일주: ${todayPillar.stem}${todayPillar.branch} (${todayPillar.stemKr}${todayPillar.branchKr})

상담자: ${name} (${genderStr}, ${age}세, ${manse.animal}띠)
${birthPromptLine(birth)}
사주 기운: ${elementDesc}
일간: ${manse.dayPillar.stem}(${manse.dayPillar.stemKr}) — ${manse.dayPillar.stemElement} 기운
연주: ${manse.yearPillar.stem}${manse.yearPillar.branch} / 월주: ${manse.monthPillar.stem}${manse.monthPillar.branch} / 일주: ${manse.dayPillar.stem}${manse.dayPillar.branch} / 시주: ${manse.hourPillar ? manse.hourPillar.stem+manse.hourPillar.branch : '미상'}

${buildServiceContextPrompt({ service: 'daily', maritalStatus: marital, occupation })}

오늘 날짜 기운과 이 사람 사주 기운이 어떻게 만나는지 분석해서 일일운세를 줘.
캐릭터 말투 100% 유지. 어려운 명리 용어 절대 금지. 20-30대 말로.
- "~가 아니라 ~야" / "봐봐, ~잖아" / "솔직히 ~" 패턴 섞어서
- 판결하듯이 써. 읽으면 "맞다" 싶게
- 각 섹션 3~4문장. 구체적으로.
- 연애운 항목은 위 결혼 상태에 맞게만 쓰고, 대운·택일용 연애 문구를 복붙하지 마라.
- 재물운은 입력된 직업(${occupation})의 오늘 현장 기준으로.

반드시 아래 JSON만 출력. 마크다운 없이. 점수는 0~100 사이 정수.

{
  "overall": "오늘 총운 3~4문장",
  "overall_score": 75,
  "money": "재물운 2~3문장",
  "money_score": 70,
  "love": "관계/인연 운 2~3문장 (결혼 상태에 맞게)",
  "love_score": 80,
  "health": "건강운 2~3문장",
  "health_score": 65,
  "lucky": "행운의 방향: OO / 행운의 색: OO / 행운의 숫자: OO / 오늘의 한마디: 한문장",
  "warning": "오늘 조심할 것 2문장",
  "today_word": "오늘을 한마디로 — 짧고 임팩트있게"
}
`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: '너는 사주궁 서비스의 일일운세 캐릭터야. 반드시 순수 JSON만 출력. 마크다운 코드블록 절대 금지.',
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : ''
    const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const s = clean.indexOf('{'), e = clean.lastIndexOf('}')
    if (s === -1 || e === -1) throw new Error('JSON 파싱 실패')

    const parsed = JSON.parse(clean.slice(s, e + 1))
    console.log('[일일운세] 생성 완료:', response.usage.output_tokens, 'tok')

    const manseWithToday = { ...manse, todayPillar }
    if (!store || !reservedUsage) throw new Error('quota store missing')
    await completeDailyGeneration(store, reservedUsage, {
      characterId: characterId || 'doRyeong',
      manse: manseWithToday,
      result: parsed,
    }, now)

    if (reservedUsage.kind === 'free') {
      try {
        const supabase = createServerSupabase()
        await supabase.from('users').update({
          birth_profile: {
            name, gender, characterId,
            year: body.year, month: body.month, day: body.day, hour: body.hour,
            calType: body.calType, isLeapMonth: body.isLeapMonth,
            timeMode: body.timeMode, timePeriod: body.timePeriod, birthPlace: body.birthPlace,
            maritalStatus: marital, occupation,
          },
        }).eq('id', userId)
      } catch (saveErr) {
        console.error('[사주궁] 일일운세 프로필 저장 실패:', saveErr)
      }
    }

    return sseFromResult(manseWithToday, parsed)
  } catch (e) {
    console.error('[일일운세] 서버 오류:', e)
    if (store && reservedUsage) {
      try { await failDailyGeneration(store, reservedUsage) } catch (failErr) {
        console.error('[일일운세] 실패 처리 오류:', failErr)
      }
    }
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
