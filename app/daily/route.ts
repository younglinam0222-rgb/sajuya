import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const { date } = await req.json()

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [
        {
          role: 'user',
          content: `오늘 ${date} 일일 운세를 무당 할매 말투로 재미있고 위트있게 알려줘.
전체운 한 문장, 금전운 한 문장, 애정운 한 문장, 오늘의 조언 한 문장으로 총 4문장.
각 항목 앞에 이모지 붙여줘. 너무 길지 않게.`,
        },
      ],
    })

    const result = (msg.content[0] as { type: string; text: string }).text
    return NextResponse.json({ result })
  } catch (error) {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
