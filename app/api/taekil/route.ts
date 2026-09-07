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
    const { name, gender, eventType, targetMonth, targetYear } = body
    const birth = resolveBirthFromRequest(body)
    if ('error' in birth) return NextResponse.json({ error: birth.error }, { status: 400 })
    const marital = normalizeMaritalStatus(body.maritalStatus)
    const occupation = resolveOccupation(body.occupation) || '미입력'

    const genderStr = gender === 'male' ? '남성' : '여성'
    const age = parseInt(String(targetYear), 10) - birth.solarYear + 1

    const prompt = `사주명리학으로 길일을 선택해줘.

상담자: ${name} (${genderStr}, ${age}세)
${birthPromptLine(birth)}
행사 종류: ${eventType}
희망 기간: ${targetYear}년 ${targetMonth}월
(희망 기간은 출생정보가 아니라 행사 검색 기간이다. 음력 출생 변환과 섞지 마라.)

${buildServiceContextPrompt({ service: 'taekil', maritalStatus: marital, occupation })}

준비사항은 직업(${occupation})과 행사(${eventType})에 맞는 실질 조언으로.
연애 문구를 일괄 삽입하지 마라.

반드시 아래 JSON 형식으로만 반환. 마크다운 코드블록 절대 금지.

{
  "intro": "이 사람의 사주와 행사 성격을 고려한 총평 (2~3문장)",
  "best1": {
    "date": "${targetYear}년 ${targetMonth}월 OO일 (요일)",
    "reason": "이 날이 좋은 이유 (2~3문장, 구체적 사주 근거 포함)",
    "time": "최적 시간대 (예: 오전 10시~12시)"
  },
  "best2": {
    "date": "${targetYear}년 ${targetMonth}월 OO일 (요일)",
    "reason": "이 날이 좋은 이유 (2~3문장)",
    "time": "최적 시간대"
  },
  "best3": {
    "date": "${targetYear}년 ${targetMonth}월 OO일 (요일)",
    "reason": "이 날이 좋은 이유 (2~3문장)",
    "time": "최적 시간대"
  },
  "avoid": "피해야 할 날짜와 이유 (2~3문장, 구체적 날짜 언급)",
  "preparation": "준비사항과 주의점 (2~3문장, ${eventType}에 맞는 실질적 조언)",
  "warning": "⚠️ 조심할 것들 (2문장)"
}`

    const stream = client.messages.stream({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      system: '너는 한국 전통 역법 택일 전문가야. 사주와 날짜의 상성을 분석하여 최길일을 선정한다. 구체적인 날짜를 반드시 제시한다. 반드시 JSON만 출력.',
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
