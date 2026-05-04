import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const { name, year, month, day, gender, eventType, targetMonth, targetYear } = await req.json()

    const animals = ['쥐','소','호랑이','토끼','용','뱀','말','양','원숭이','닭','개','돼지']
    const animal = animals[(parseInt(year) - 4) % 12]
    const genderStr = gender === 'male' ? '남성' : '여성'
    const age = parseInt(targetYear) - parseInt(year) + 1

    const prompt = `사주명리학으로 길일을 선택해줘.

상담자: ${name} (${year}년 ${month}월 ${day}일생, ${animal}띠, ${genderStr}, ${age}세)
행사 종류: ${eventType}
희망 기간: ${targetYear}년 ${targetMonth}월

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
