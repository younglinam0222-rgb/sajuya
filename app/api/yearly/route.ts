import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { rejectCrossSiteCookieMutation } from '@/lib/requestGuard'
import {
  SHARED_INTERP_GUARDS,
  calcManse,
  formatManseForPrompt,
  formatSeunForPrompt,
  generationClock,
  hourInputToHm,
  periodGuidance,
} from '@/lib/sajuCalc'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const csrf = rejectCrossSiteCookieMutation(req)
    if (csrf) return csrf
    const { name, year, month, day, hour, gender, targetYear } = await req.json()

    const clock = generationClock()
    const manse = calcManse(parseInt(year), parseInt(month), parseInt(day), hourInputToHm(hour))
    const genderStr = gender === 'male' ? '남성' : '여성'
    const y = parseInt(targetYear)
    const age = y - parseInt(year) + 1
    const seun = formatSeunForPrompt(manse.dayPillar.stemIdx, y)

    const prompt = `사주명리학으로 ${y}년 연도별 운세를 분석해줘.

상담자: ${name} (${year}년 ${month}월 ${day}일생, ${genderStr}, ${y}년 기준 ${age}세)
${formatManseForPrompt(manse, '상담자')}
${y}년 세운(일간 기준): 연간지 ${seun.ganzhi} (${seun.sipsin}) / 상반기 ${seun.firstHalfGanzhi}(${seun.firstHalfSipsin}) / 하반기 ${seun.secondHalfGanzhi}(${seun.secondHalfSipsin})
띠는 원국 연지(${manse.animal}띠)를 써라. 연도-4 나머지로 띠를 다시 만들지 마라.
${periodGuidance(clock)}
분석 대상이 ${clock.currentYear}년이고 상반기가 이미 지났으면 상반기는 과거로만 정리해라.
${SHARED_INTERP_GUARDS}

반드시 아래 JSON 형식으로만 반환. 마크다운 코드블록 절대 금지.

{
  "yearOverall": "${y}년 총운 (4~5문장, 이 해의 전반적인 기운과 키워드)",
  "firstHalf": "상반기 운세 1~6월 (3~4문장)",
  "secondHalf": "하반기 운세 7~12월 (3~4문장)",
  "money": "재물운 (3~4문장, 수입/지출/투자 관련)",
  "love": "연애·관계운 (3~4문장)",
  "health": "건강운 (2~3문장, 질환 단정 금지)",
  "warning": "⚠️ 조심할 것들 (2~3문장)",
  "advice": "핵심 조언 (2문장, ${y}년을 잘 보내기 위한 핵심)"
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
    console.error(JSON.stringify({ tag: '연도별', phase: 'error', err: e instanceof Error ? e.message : String(e) }))
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
