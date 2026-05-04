import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { calculateSaju } from '@/lib/manse'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const {
      name1, year1, month1, day1, hour1, gender1,
      name2, year2, month2, day2, hour2, gender2,
      relationship,
    } = await req.json()

    // 실제 사주 계산
    const saju1 = calculateSaju(
      parseInt(year1), parseInt(month1), parseInt(day1),
      hour1 !== '' ? parseInt(hour1) : null,
      gender1
    )
    const saju2 = calculateSaju(
      parseInt(year2), parseInt(month2), parseInt(day2),
      hour2 !== '' ? parseInt(hour2) : null,
      gender2
    )

    const gStr1 = gender1 === 'male' ? '남성' : '여성'
    const gStr2 = gender2 === 'male' ? '남성' : '여성'
    const relLabel = relationship || '지인'

    const formatSaju = (s: ReturnType<typeof calculateSaju>, name: string) => `
[${name}의 사주팔자]
- 연주: ${s.yearPillar?.heavenlyStem ?? ''}${s.yearPillar?.earthlyBranch ?? ''} (${s.yearPillar?.tenGod ?? ''})
- 월주: ${s.monthPillar?.heavenlyStem ?? ''}${s.monthPillar?.earthlyBranch ?? ''} (${s.monthPillar?.tenGod ?? ''})
- 일주: ${s.dayPillar?.heavenlyStem ?? ''}${s.dayPillar?.earthlyBranch ?? ''} (일간)
- 시주: ${s.hourPillar ? `${s.hourPillar.heavenlyStem}${s.hourPillar.earthlyBranch} (${s.hourPillar.tenGod})` : '미상'}
- 오행: 목${s.elements?.wood ?? 0} 화${s.elements?.fire ?? 0} 토${s.elements?.earth ?? 0} 금${s.elements?.metal ?? 0} 수${s.elements?.water ?? 0}
- 일간: ${s.dayPillar?.heavenlyStem ?? ''} (${s.dayMaster ?? ''})
`

    const prompt = `두 사람의 궁합을 사주명리학으로 심층 분석해줘.
관계: ${relLabel}

${formatSaju(saju1, name1)} (${year1}년 ${month1}월 ${day1}일 ${hour1 ? hour1 + '시' : '시간미상'}생, ${gStr1})
${formatSaju(saju2, name2)} (${year2}년 ${month2}월 ${day2}일 ${hour2 ? hour2 + '시' : '시간미상'}생, ${gStr2})

위 실제 사주팔자 데이터를 바탕으로 정확하게 분석해. 반드시 위 천간/지지/오행 데이터를 근거로 설명해야 해.

반드시 아래 JSON 형식으로만 반환. 마크다운 코드블록 절대 금지.

{
  "score": 궁합점수(0~100 숫자만),
  "overall": "종합 궁합 (4~5문장, 두 사람의 일간과 오행을 근거로 전반적인 궁합과 에너지 흐름 설명)",
  "love": "연애·관계 궁합 (3~4문장, ${relLabel} 관계에 맞는 케미와 갈등 포인트)",
  "personality": "성격 궁합 (3~4문장, 일간과 십신 기반 성격 차이와 보완점)",
  "money": "재물 궁합 (2~3문장, 함께할 때 돈과 관련된 운)",
  "longterm": "장기 궁합 (3~4문장, 오래 함께할수록 어떻게 되는지)",
  "warning": "⚠️ 조심할 것들 (2~3문장, 두 사람이 주의해야 할 점)",
  "advice": "신령의 최종 조언 (2문장, 핵심 메시지)"
}`

    const stream = client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: `너는 구미호 선생이야. 천 년의 연애 경험으로 궁합을 꿰뚫어본다. 
반드시 제공된 실제 사주팔자(천간/지지/오행) 데이터를 근거로 분석해야 한다.
생년월일만으로 추측하지 말고, 주어진 사주 데이터에서 구체적 근거를 들어 설명한다.
요염하면서도 날카롭게, 현실적으로 분석한다. 반드시 JSON만 출력.`,
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
