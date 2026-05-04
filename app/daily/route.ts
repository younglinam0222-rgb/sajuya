import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { date } = await req.json()
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `오늘 ${date} 일일 운세를 재미있고 위트있게 3~4문장으로 알려줘. 전체운, 금전운, 애정운 간단히 포함해서.`
    }]
  })
  const result = (msg.content[0] as any).text
  return NextResponse.json({ result })
}
