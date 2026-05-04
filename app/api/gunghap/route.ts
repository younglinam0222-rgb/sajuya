import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const { name1, year1, month1, day1, gender1, name2, year2, month2, day2, gender2 } = await req.json()

    const animals = ['쥐','소','호랑이','토끼','용','뱀','말','양','원숭이','닭','개','돼지']
    const animal1 = animals[(parseInt(year1) - 4) % 12]
    const animal2 = animals[(parseInt(year2) - 4) % 12]
    const gStr1 = gender1 === 'male' ? '남성' : '여성'
    const gStr2 = gender2 === 'male' ? '남성' : '여성'

    const prompt = `두 사람의 궁합을 사주명리학으로 심층 분석해줘.

사람1: ${name1} (${year1}년 ${month1}월 ${day1}일생, ${animal1}띠, ${gStr1})
사람2: ${name2} (${year2}년 ${month2}월 ${day2}일생, ${animal2}띠, ${gStr2})

반드시 아래 JSON 형식으로만 반환. 마크다운 코드블록 절대 금지.

{
  "score": 궁합점수(0~100 숫자만),
  "overall": "종합 궁합 (4~5문장, 두 사람의 전반적인 궁합과 에너지 흐름)",
  "love": "연애 궁합 (3~4문장, 연애할 때 두 사람의 케미와 갈등 포인트)",
  "personality": "성격 궁합 (3~4문장, 성격 차이와 보완점)",
  "money": "재물 궁합 (2~3문장, 함께할 때 돈과 관련된 운)",
  "longterm": "장기 궁합 (3~4문장, 오래 함께할수록 어떻게 되는지)",
  "warning": "⚠️ 조심할 것들 (2~3문장, 두 사람이 주의해야 할 점)",
  "advice": "신령의 최종 조언 (2문장, 핵심 메시지)"
}`

    const stream = client.messages.stream({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      system: '너는 구미호 선생이야. 천 년의 연애 경험으로 궁합을 꿰뚫어본다. 요염하면서도 날카롭게, 현실적으로 분석한다. 반드시 JSON만 출력.',
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
