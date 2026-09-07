import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { birthPromptLine, resolveBirthFromRequest } from '@/lib/birthInput'
import { CONSENT_REQUIRED_MESSAGE, hasEntertainmentConsent } from '@/lib/entertainmentConsent'
import { normalizeMaritalStatus, resolveOccupation } from '@/lib/profileOptions'
import { buildServiceContextPrompt } from '@/lib/serviceContextPrompt'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!hasEntertainmentConsent(body.agreedEntertainment)) {
      return NextResponse.json({ error: CONSENT_REQUIRED_MESSAGE }, { status: 400 })
    }
    const { name, gender } = body
    const birth = resolveBirthFromRequest(body)
    if ('error' in birth) return NextResponse.json({ error: birth.error }, { status: 400 })
    const marital = normalizeMaritalStatus(body.maritalStatus)
    const occupation = resolveOccupation(body.occupation) || '미입력'

    const currentYear = new Date().getFullYear()
    const age = currentYear - birth.solarYear + 1
    const genderStr = gender === 'male' ? '남성' : '여성'

    const prompt = `사주명리학 대운 분석을 해줘.

상담자: ${name} (${genderStr}, 현재 ${age}세)
${birthPromptLine(birth)}
현재 연도: ${currentYear}년

${buildServiceContextPrompt({ service: 'daeun', maritalStatus: marital, occupation })}

인연·관계 대운은 위 결혼 상태에 맞게만 쓰고, 오늘의 운세/택일용 연애 문구를 복붙하지 마라.
직업·재물 대운은 실제 직업(${occupation}) 사례로.

반드시 아래 JSON 형식으로만 반환. 마크다운 코드블록 절대 금지.

{
  "current": "현재 대운 분석 (4~5문장, 현재 어떤 대운 기간인지, 에너지 특성, 전반적인 영향)",
  "next10": "향후 10년 흐름 (3~4문장, 구체적 시기별 변화 언급)",
  "career": "직업·재물 대운 (3~4문장)",
  "love": "인연·관계 대운 (3~4문장, 결혼 상태에 맞게)",
  "health": "건강 대운 (3~4문장, 주의해야 할 신체 부위 포함)",
  "warning": "⚠️ 조심할 것들 (2~3문장, 이 대운에서 특히 주의할 시기와 이유)",
  "advice": "신령의 핵심 조언 (2문장)"
}`

    const stream = client.messages.stream({
      model:  'claude-sonnet-4-5',
      max_tokens: 1500,
      system: '너는 무등산 신령님이야. 수천 년의 수련으로 대운의 흐름을 꿰뚫어본다. "허허..." 특유의 묵직하고 깊이 있는 말투로 분석한다. 반드시 JSON만 출력.',
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
    console.error(e)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
