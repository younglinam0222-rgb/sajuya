import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { createServerSupabase } from '@/lib/supabase'
import { assertNoElementCitationMismatch } from '@/lib/elementCitationCheck'
import {
  calcDayPillar,
  calcManse,
  collectGeneratedText,
  formatManseForPrompt,
  generationClock,
  hourInputToHm,
  kstParts,
  SHARED_INTERP_GUARDS,
} from '@/lib/sajuCalc'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// 한국 시간(KST) 기준 오늘 날짜 (YYYY-MM-DD)
function getTodayDateKST() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ✅ 추가: 로그인한 유저의 "오늘자 캐시된 일일운세"와 "마지막 입력 프로필"을 조회
// 로그인 안 한 사용자는 이 라우트를 호출하지 않으므로 기존 무료 이용 흐름은 그대로 유지됨
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ cached: null, birthProfile: null })
    }
    const userId = (session.user as { id?: string }).id
    if (!userId) return NextResponse.json({ cached: null, birthProfile: null })

    const supabase = createServerSupabase()
    const today = getTodayDateKST()

    const [{ data: cached }, { data: userRow }] = await Promise.all([
      supabase.from('daily_readings').select('*').eq('user_id', userId).eq('reading_date', today).maybeSingle(),
      supabase.from('users').select('birth_profile').eq('id', userId).maybeSingle(),
    ])

    return NextResponse.json({
      cached: cached ? { manse: cached.manse_data, result: cached.result, characterId: cached.character_id } : null,
      birthProfile: userRow?.birth_profile ?? null,
    })
  } catch (e) {
    console.error('[사주궁] 일일운세 조회 오류:', e)
    return NextResponse.json({ cached: null, birthProfile: null })
  }
}

const CHARACTER_VOICE: Record<string, string> = {
  baekhalma: `너는 건물주 백할매야. 직설적이고 쿨한 할머니. "야", "봐봐", "쯧쯧" 씀. 팩폭 뒤에 걱정 한마디 붙임.`,
  doRyeong:  `너는 근본도령이야. 친한 형/오빠가 솔직하게 말해주는 느낌. "야", "솔직히", "있잖아" 씀.`,
  gumiho:    `너는 구미호 선생이야. 요염하고 위트있는 언니. "어머", "있지", "호호" 씀. 달콤하다 팩폭.`,
  sinRyeong: `너는 무등산 신령님이야. 묵직하고 근엄. "허허", "그래", "이 친구" 씀. 자연 비유 씀.`,
}

export async function POST(req: NextRequest) {
  try {
    const { name, year, month, day, hour, gender, characterId, calType, longitude, birthPlace } = await req.json()
    // ✅ 추가: 로그인 여부 확인 (비로그인이어도 기존처럼 그대로 무료 이용 가능, 저장만 안 됨)
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string } | undefined)?.id

    const clock = generationClock()
    const todayStr  = `${clock.currentYear}년 ${clock.currentMonth}월 ${clock.currentDay}일`
    const genderStr = gender === 'male' ? '남성' : '여성'
    const calTypeStr = calType === 'lunar' ? '음력' : '양력'
    const age       = clock.currentYear - parseInt(year) + 1

    const manse      = calcManse(parseInt(year), parseInt(month), parseInt(day), hourInputToHm(hour), typeof longitude === 'number' ? longitude : undefined)
    const todayKst = kstParts()
    const todayPillar = calcDayPillar(todayKst.year, todayKst.month, todayKst.day)

    const voice = CHARACTER_VOICE[characterId] ?? CHARACTER_VOICE['doRyeong']

    const prompt = `
${voice}

오늘은 ${todayStr}이야. 생성 기준일 ${clock.generatedDateKST} (Asia/Seoul).
오늘 날짜 일주: ${todayPillar.stem}${todayPillar.branch} (${todayPillar.stemKr}${todayPillar.branchKr})

상담자: ${name} (${year}년 ${month}월 ${day}일생 ${calTypeStr}, ${genderStr}, ${age}세)
${formatManseForPrompt(manse, '상담자')}
${SHARED_INTERP_GUARDS}

오늘 날짜 기운과 이 사람 사주 기운이 어떻게 만나는지 분석해서 일일운세를 줘.
캐릭터 말투 100% 유지. 어려운 명리 용어 절대 금지. 20-30대 말로.
오행 개수는 위에 준 숫자만 인용하고 다시 세지 마라.
점수는 해석용 감각이지 계산표가 아니다. 계산된 사실처럼 단정하지 마라.

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

    let parsed: Record<string, unknown> | null = null
    let lastErr: unknown = null
    for (let attempt = 1; attempt <= 2; attempt++) {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        system: '너는 사주궁 서비스의 일일운세 캐릭터야. 반드시 순수 JSON만 출력. 마크다운 코드블록 절대 금지.',
        messages: [{ role: 'user', content: prompt }],
      })
      try {
        const raw = response.content[0].type === 'text' ? response.content[0].text : ''
        const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
        const s = clean.indexOf('{'), e = clean.lastIndexOf('}')
        if (s === -1 || e === -1) throw new Error('JSON 파싱 실패')
        const next = JSON.parse(clean.slice(s, e + 1))
        assertNoElementCitationMismatch(collectGeneratedText([next]), manse.elementCount)
        parsed = next
        console.log(JSON.stringify({
          tag: '일일운세',
          phase: 'generated',
          attempt,
          calcVersion: manse.calcVersion,
          outputTokens: response.usage.output_tokens,
        }))
        break
      } catch (e) {
        lastErr = e
        console.error(JSON.stringify({
          tag: '일일운세',
          phase: 'validate',
          attempt,
          kind: e instanceof Error && e.message.includes('오행 수치 불일치') ? 'validation' : 'parse',
        }))
      }
    }
    if (!parsed) throw lastErr instanceof Error ? lastErr : new Error('일일운세 생성 실패')

    // ✅ 추가: 로그인 사용자면 오늘자 결과 + 마지막 입력 프로필을 저장 (다음 방문 시 재사용)
    if (userId) {
      try {
        const supabase = createServerSupabase()
        const today = getTodayDateKST()
        const manseWithToday = { ...manse, todayPillar }
        await Promise.all([
          supabase.from('daily_readings').upsert({
            user_id: userId,
            reading_date: today,
            character_id: characterId,
            manse_data: manseWithToday,
            result: parsed,
          }, { onConflict: 'user_id,reading_date' }),
          supabase.from('users').update({
            birth_profile: { name, year, month, day, hour, gender, calType, characterId, birthPlace },
          }).eq('id', userId),
        ])
      } catch (saveErr) {
        // 저장 실패해도 결과 조회 자체는 그대로 진행 (저장은 부가 기능)
        console.error('[사주궁] 일일운세 저장 실패:', saveErr)
      }
    }

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
