import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireContentNotice } from '@/lib/contentNoticeGuard'
import { rejectCrossSiteCookieMutation } from '@/lib/requestGuard'
import {
  SHARED_INTERP_GUARDS,
  calcManse,
  formatManseForPrompt,
  formatSeunForPrompt,
  generationClock,
  periodGuidance,
} from '@/lib/sajuCalc'
import { birthPromptLine, resolveBirthFromRequest } from '@/lib/birthInput'
import { normalizeMaritalStatus, resolveOccupation } from '@/lib/profileOptions'
import { buildServiceContextPrompt } from '@/lib/serviceContextPrompt'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const csrf = rejectCrossSiteCookieMutation(req)
    if (csrf) return csrf
    const notice = await requireContentNotice()
    if (!notice.ok) return notice.response
    const body = await req.json()
    const { name, gender } = body
    const birth = resolveBirthFromRequest(body)
    if ('error' in birth) return NextResponse.json({ error: birth.error }, { status: 400 })
    const marital = normalizeMaritalStatus(body.maritalStatus)
    const occupation = resolveOccupation(body.occupation) || '미입력'

    const clock = generationClock()
    const manse = calcManse(birth.solarYear, birth.solarMonth, birth.solarDay, birth.hourMinute, birth.longitude)
    const age = clock.currentYear - birth.solarYear + 1
    const genderStr = gender === 'male' ? '남성' : '여성'
    const thisYearSeun = formatSeunForPrompt(manse.dayPillar.stemIdx, clock.currentYear)

    const prompt = `사주명리학 대운 분석을 해줘.

상담자: ${name} (${genderStr}, 현재 ${age}세)
${birthPromptLine(birth)}
${formatManseForPrompt(manse, '상담자')}
올해 세운(일간 기준): ${thisYearSeun.year} ${thisYearSeun.ganzhi} (${thisYearSeun.sipsin})
${periodGuidance(clock)}

이번 계산에는 대운 시작 나이, 순행/역행, 대운 간지 목록이 없다.
특정 나이를 계산된 대운 시작·전성기처럼 쓰지 마라. 점수도 만들지 마라.
대운을 계산했다고 미래 사건 예측이 검증된 것처럼 말하지 마라.
질환·증상을 겪는다고 단정하거나 치료처럼 안내하지 마라.
${SHARED_INTERP_GUARDS}

${buildServiceContextPrompt({ service: 'daeun', maritalStatus: marital, occupation })}

인연·관계 대운은 위 결혼 상태에 맞게만 쓰고, 오늘의 운세/택일용 연애 문구를 복붙하지 마라.
직업·재물 대운은 실제 직업(${occupation}) 사례로.

반드시 아래 JSON 형식으로만 반환. 마크다운 코드블록 절대 금지.

{
  "current": "현재 흐름 분석 (4~5문장, 원국·세운 기준으로. 없는 대운 나이를 만들지 말 것)",
  "next10": "향후 흐름 (3~4문장, 구체 나이를 계산된 사실처럼 쓰지 말 것)",
  "career": "직업·재물 흐름 (3~4문장)",
  "love": "인연·관계 흐름 (3~4문장, 결혼 상태에 맞게)",
  "health": "생활 리듬 조언 (3~4문장, 질환 단정 금지)",
  "warning": "⚠️ 조심할 것들 (2~3문장)",
  "advice": "신령의 핵심 조언 (2문장)"
}`

    const stream = client.messages.stream({
      model:  'claude-sonnet-4-5',
      max_tokens: 1500,
      system: '너는 무등산 신령님이야. 수천 년의 수련으로 흐름을 꿰뚫어본다. "허허..." 특유의 묵직하고 깊이 있는 말투로 분석한다. 반드시 JSON만 출력.',
      messages: [{ role: 'user', content: prompt }],
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`))
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    return new NextResponse(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (e) {
    console.error(JSON.stringify({ tag: '대운', phase: 'error', err: e instanceof Error ? e.message : String(e) }))
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
