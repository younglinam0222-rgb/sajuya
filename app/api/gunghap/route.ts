import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { birthPromptLine, pickPrefixedBirth, resolveBirthFromRequest } from '@/lib/birthInput'
import { CONSENT_REQUIRED_MESSAGE, hasEntertainmentConsent } from '@/lib/entertainmentConsent'
import { normalizeMaritalStatus, normalizeRelationship, resolveOccupation } from '@/lib/profileOptions'
import { buildServiceContextPrompt } from '@/lib/serviceContextPrompt'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!hasEntertainmentConsent(body.agreedEntertainment)) {
      return NextResponse.json({ error: CONSENT_REQUIRED_MESSAGE }, { status: 400 })
    }

    const { name1, gender1, name2, gender2 } = body
    const birth1 = resolveBirthFromRequest(pickPrefixedBirth(body, '1'))
    const birth2 = resolveBirthFromRequest(pickPrefixedBirth(body, '2'))
    if ('error' in birth1) return NextResponse.json({ error: `질문자: ${birth1.error}` }, { status: 400 })
    if ('error' in birth2) return NextResponse.json({ error: `상대방: ${birth2.error}` }, { status: 400 })

    const relationship = normalizeRelationship(body.relationship) ?? '기타·미정'
    const marital1 = normalizeMaritalStatus(body.maritalStatus1)
    const marital2 = normalizeMaritalStatus(body.maritalStatus2)
    const occupation1 = resolveOccupation(body.occupation1) || '미입력'
    const occupation2 = resolveOccupation(body.occupation2) || '미입력'

    const gStr1 = gender1 === 'male' ? '남성' : '여성'
    const gStr2 = gender2 === 'male' ? '남성' : '여성'

    const prompt = `두 사람의 궁합을 사주명리학으로 심층 분석해줘.

사람1(질문자): ${name1} (${gStr1})
${birthPromptLine(birth1)}
결혼 상태: ${marital1 ?? '미입력'} / 직업: ${occupation1}

사람2(상대): ${name2} (${gStr2})
${birthPromptLine(birth2)}
결혼 상태: ${marital2 ?? '미입력'} / 직업: ${occupation2}

${buildServiceContextPrompt({
  service: 'gunghap',
  maritalStatus: marital1,
  occupation: occupation1,
  relationship,
  partnerMaritalStatus: marital2,
  partnerOccupation: occupation2,
})}

love 항목은 선택한 관계(${relationship}) 기준으로 풀어라. 연인이 아니면 연애 케미만 전제하지 마라.

반드시 아래 JSON 형식으로만 반환. 마크다운 코드블록 절대 금지.

{
  "score": 궁합점수(0~100 숫자만),
  "overall": "종합 궁합 (4~5문장, 두 사람의 전반적인 궁합과 에너지 흐름)",
  "love": "관계 궁합 (3~4문장, 선택한 관계 기준의 케미와 갈등 포인트)",
  "personality": "성격 궁합 (3~4문장, 성격 차이와 보완점)",
  "money": "재물 궁합 (2~3문장, 두 사람 직업 현실을 반영)",
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
