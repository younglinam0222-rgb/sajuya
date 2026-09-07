import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
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
    const {
      name1, year1, month1, day1, hour1, gender1,
      name2, year2, month2, day2, hour2, gender2,
      relationship,
    } = await req.json()

    const clock = generationClock()
    const manse1 = calcManse(parseInt(year1), parseInt(month1), parseInt(day1), hourInputToHm(hour1))
    const manse2 = calcManse(parseInt(year2), parseInt(month2), parseInt(day2), hourInputToHm(hour2))
    const gStr1 = gender1 === 'male' ? '남성' : '여성'
    const gStr2 = gender2 === 'male' ? '남성' : '여성'
    const relation = typeof relationship === 'string' && relationship.trim() ? relationship.trim() : '미입력'

    const prompt = `두 사람의 궁합을 사주명리학으로 심층 분석해줘.

사람1: ${name1} (${year1}년 ${month1}월 ${day1}일생, ${gStr1})
${formatManseForPrompt(manse1, '사람1')}

사람2: ${name2} (${year2}년 ${month2}월 ${day2}일생, ${gStr2})
${formatManseForPrompt(manse2, '사람2')}

입력된 관계: ${relation}
두 사람 모두 기혼처럼 보여도, 입력된 관계가 배우자가 아니면 서로 배우자라고 추정하지 마라.
사람2의 십성은 사람2 일간 기준이다. 사람1 일간을 사람2에 재사용하지 마라.
${periodGuidance(clock)}
${SHARED_INTERP_GUARDS}
점수는 해석용 감각이지 계산표가 아니다. 계산된 만점처럼 단정하지 마라.

반드시 아래 JSON 형식으로만 반환. 마크다운 코드블록 절대 금지.

{
  "score": 궁합점수(0~100 숫자만),
  "overall": "종합 궁합 (4~5문장, 두 사람의 전반적인 궁합과 에너지 흐름)",
  "love": "관계 궁합 (3~4문장, 입력된 관계 기준으로)",
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
    console.error(JSON.stringify({ tag: '궁합', phase: 'error', err: e instanceof Error ? e.message : String(e) }))
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
