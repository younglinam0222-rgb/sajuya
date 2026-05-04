import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const { name, year, month, day, gender } = await req.json()

    const today = new Date()
    const todayStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`
    const animals = ['쥐','소','호랑이','토끼','용','뱀','말','양','원숭이','닭','개','돼지']
    const animal = animals[(parseInt(year) - 4) % 12]
    const genderStr = gender === 'male' ? '남성' : '여성'
    const age = today.getFullYear() - parseInt(year) + 1

    const prompt = `오늘은 ${todayStr}이다.
상담자: ${name} (${year}년 ${month}월 ${day}일생, ${animal}띠, ${genderStr}, 현재 ${age}세)

오늘 하루 이 사람의 일일운세를 직설적이고 구체적으로 분석해줘.
정보 나열 말고, 판결하듯이 써줘. 읽으면 "맞다" 싶게.

반드시 아래 JSON 형식으로만 반환. 마크다운 코드블록 절대 금지.

{
  "overall": "오늘의 총운 (3~4문장, 오늘 에너지와 흐름을 직설적으로)",
  "money": "재물운 (2~3문장, 오늘 돈과 관련한 판결)",
  "love": "연애운 (2~3문장, 오늘 인연/관계 판결)",
  "health": "건강운 (2~3문장, 오늘 몸과 마음 상태)",
  "lucky": "행운 포인트 (행운의 방향: OO, 행운의 색: OO, 행운의 숫자: OO, 오늘의 한마디: 한문장)",
  "warning": "오늘 조심할 것 (2문장, 구체적으로)"
}`

    const stream = client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: '너는 직설적인 운세 판결자야. 일일운세를 구체적이고 임팩트 있게 분석한다. 반드시 JSON만 출력.',
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
