import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const { name, year, month, day, gender, targetYear } = await req.json()

    const animals = ['쥐','소','호랑이','토끼','용','뱀','말','양','원숭이','닭','개','돼지']
    const animal = animals[(parseInt(year) - 4) % 12]
    const genderStr = gender === 'male' ? '남성' : '여성'
    const age = parseInt(targetYear) - parseInt(year) + 1

    const prompt = `사주명리학으로 ${targetYear}년 연도별 운세를 분석해줘.

상담자: ${name} (${year}년 ${month}월 ${day}일생, ${animal}띠, ${genderStr}, ${targetYear}년 기준 ${age}세)
분석 년도: ${targetYear}년

반드시 아래 JSON 형식으로만 반환. 마크다운 코드블록 절대 금지.

{
  "yearOverall": "${targetYear}년 총운 (4~5문장, 이 해의 전반적인 기운과 키워드)",
  "firstHalf": "상반기 운세 1~6월 (3~4문장, 월별 흐름 언급)",
  "secondHalf": "하반기 운세 7~12월 (3~4문장, 월별 흐름 언급)",
  "money": "재물운 (3~4문장, 수입/지출/투자 관련)",
  "love": "연애·관계운 (3~4문장)",
  "health": "건강운 (2~3문장, 주의 시기 포함)",
  "warning": "⚠️ 조심할 것들 (2~3문장, 이 해에 특히 주의할 것)",
  "advice": "핵심 조언 (2문장, ${targetYear}년을 잘 보내기 위한 핵심)"
}`

    const stream = client.messages.stream({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      system: '너는 한국 전통 사주명리학 전문가야. 연도별 세운을 구체적이고 실질적으로 분석한다. 반드시 JSON만 출력.',
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
