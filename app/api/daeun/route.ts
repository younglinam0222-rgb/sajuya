import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const { name, year, month, day, hour, gender } = await req.json()

    const currentYear = new Date().getFullYear()
    const age = currentYear - parseInt(year) + 1
    const animals = ['쥐','소','호랑이','토끼','용','뱀','말','양','원숭이','닭','개','돼지']
    const animal = animals[(parseInt(year) - 4) % 12]
    const genderStr = gender === 'male' ? '남성' : '여성'
    const hourStr = hour !== '' ? `${hour}시` : '시간 미상'

    const prompt = `사주명리학 대운 분석을 해줘.

상담자: ${name} (${year}년 ${month}월 ${day}일 ${hourStr}생, ${animal}띠, ${genderStr}, 현재 ${age}세)
현재 연도: ${currentYear}년

반드시 아래 JSON 형식으로만 반환. 마크다운 코드블록 절대 금지.

{
  "current": "현재 대운 분석 (4~5문장, 현재 어떤 대운 기간인지, 에너지 특성, 전반적인 영향)",
  "next10": "향후 10년 흐름 (3~4문장, 구체적 시기별 변화 언급)",
  "career": "직업·재물 대운 (3~4문장)",
  "love": "인연·관계 대운 (3~4문장)",
  "health": "건강 대운 (3~4문장, 주의해야 할 신체 부위 포함)",
  "warning": "⚠️ 조심할 것들 (2~3문장, 이 대운에서 특히 주의할 시기와 이유)",
  "advice": "신령의 핵심 조언 (2문장)"
}`

    const stream = client.messages.stream({
      model: 'claude-sonnet-4-20250514',
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
