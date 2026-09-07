import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { rejectCrossSiteCookieMutation } from '@/lib/requestGuard'
import {
  SHARED_INTERP_GUARDS,
  calcManse,
  formatManseForPrompt,
  generationClock,
  hourInputToHm,
  periodGuidance,
} from '@/lib/sajuCalc'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const csrf = rejectCrossSiteCookieMutation(req)
    if (csrf) return csrf
    const { name, year, month, day, hour, gender, eventType, targetMonth, targetYear } = await req.json()

    const clock = generationClock()
    const manse = calcManse(parseInt(year), parseInt(month), parseInt(day), hourInputToHm(hour))
    const genderStr = gender === 'male' ? '남성' : '여성'
    const age = parseInt(targetYear) - parseInt(year) + 1

    const prompt = `사주명리학으로 길일을 선택해줘.

상담자: ${name} (${year}년 ${month}월 ${day}일생, ${genderStr}, ${targetYear}년 기준 ${age}세)
${formatManseForPrompt(manse, '상담자')}
행사 종류: ${eventType}
희망 기간: ${targetYear}년 ${targetMonth}월
${periodGuidance(clock)}
이미 지난 날짜를 앞으로의 택일로 제시하지 마라.
${SHARED_INTERP_GUARDS}

반드시 아래 JSON 형식으로만 반환. 마크다운 코드블록 절대 금지.

{
  "intro": "이 사람의 사주와 행사 성격을 고려한 총평 (2~3문장)",
  "best1": {
    "date": "${targetYear}년 ${targetMonth}월 OO일 (요일)",
    "reason": "이 날이 좋은 이유 (2~3문장, 제공된 사주 근거만)",
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
    console.error(JSON.stringify({ tag: '택일', phase: 'error', err: e instanceof Error ? e.message : String(e) }))
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
