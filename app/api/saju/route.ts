import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { CHARACTERS } from '@/lib/characters'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const {
      name, year, month, day, hour, gender,
      characterId, occupation, questionIntent, sajuData,
    } = await req.json()

    const character = CHARACTERS[characterId] ?? CHARACTERS['doRyeong']
    const genderStr = gender === 'male' ? '남성' : '여성'
    const hourStr = hour ? `${hour}시` : '시간 미상'

    // 사주팔자 데이터 포맷
    const sajuInfo = sajuData
      ? `
[사주팔자 - 이 데이터를 그대로 사용, 재계산 금지]
연주: ${sajuData.yearPillar?.stem ?? ''}${sajuData.yearPillar?.branch ?? ''} / 월주: ${sajuData.monthPillar?.stem ?? ''}${sajuData.monthPillar?.branch ?? ''} / 일주: ${sajuData.dayPillar?.stem ?? ''}${sajuData.dayPillar?.branch ?? ''} / 시주: ${sajuData.hourPillar ? `${sajuData.hourPillar.stem}${sajuData.hourPillar.branch}` : '미상'}
오행: 목${sajuData.elements?.wood ?? 0} 화${sajuData.elements?.fire ?? 0} 토${sajuData.elements?.earth ?? 0} 금${sajuData.elements?.metal ?? 0} 수${sajuData.elements?.water ?? 0}
일간: ${sajuData.dayPillar?.stem ?? ''} / 직업: ${occupation ?? '일반인'}
`
      : `생년월일시: ${year}년 ${month}월 ${day}일 ${hourStr} / 성별: ${genderStr} / 직업: ${occupation ?? '일반인'}`

    const intentGuide: Record<string, string> = {
      '돈/재물': '돈, 재물운, 사업, 투자, 부의 흐름 관점에서 제목을 뽑아라',
      '연애/결혼': '연애, 결혼, 이성, 인연, 궁합 관점에서 제목을 뽑아라',
      '직업/진로': '직업, 진로, 커리어, 사업, 적성 관점에서 제목을 뽑아라',
      '인생 전반': '인생 전체 흐름, 성격, 운명, 전성기, 위기 관점에서 제목을 뽑아라',
      '건강': '건강, 체력, 스트레스, 주의해야 할 신체 부위 관점에서 제목을 뽑아라',
    }

    const intentInstruction = intentGuide[questionIntent] ?? '사용자에게 가장 임팩트 있는 다양한 관점에서 제목을 뽑아라'

    const prompt = `
너는 ${character.name}이다. ${character.systemPrompt}

상담자: ${name} (${year}년 ${month}월 ${day}일 ${hourStr}생, ${genderStr})
${sajuInfo}
사용자 질문 의도: "${questionIntent}"
→ ${intentInstruction}

[임무]
위 사주팔자를 분석하여, 사용자의 질문 의도에 맞는
"사람이 결제하고 싶어지는 콘텐츠 구조"를 만들어라.

[제목 12개 생성 규칙]
- 고정 카테고리(성격/재물/직업)로 나누지 마라
- 반드시 "사람이 내 얘기다"라고 느끼는 상황형 문장으로 만들어라
- 명리 용어 사용 금지. 인간 언어로 번역해라
- 호기심, 공감, 의외성, 궁금증을 유발하는 표현
- 질문 의도에 맞는 관점에서 12개 모두 다른 각도
- 첫 3개는 가장 임팩트 강하고 사람이 제일 끌리는 것으로 배치

[각 제목 설명 규칙]
- is_free: true인 3개는 content에 600자 이상 스토리형 설명
- is_free: false인 9개는 teaser에 50자 이내 궁금증 유발 한 줄
- 설명은 반드시 실제 사주 근거(간지, 오행, 십성 등)를 포함
- ${character.name}의 말투로 자연스럽게 작성

[전략가 섹션 규칙]
- 20대~60대 각 연령대의 운 점수를 0~100으로 계산
- 4계절(봄=성장기, 여름=전성기, 가을=수확기, 겨울=준비기)로 분류
- 황금기와 위기 시기를 구체적 나이/연도로 명시
- 전성기 활용 실행 가이드는 구체적 행동 전략으로

반드시 아래 JSON 형식으로만 출력. 마크다운 코드블록 절대 금지.

{
  "titles": [
    {
      "id": "1",
      "title": "상황형 제목 (명리 용어 없이 인간 언어로)",
      "teaser": "결제 욕구를 자극하는 한 줄 (50자 이내)",
      "is_free": true,
      "content": "600자 이상 스토리형 설명. ${character.name} 말투로. 사주 근거 포함."
    },
    {
      "id": "2",
      "title": "상황형 제목",
      "teaser": "결제 욕구를 자극하는 한 줄",
      "is_free": true,
      "content": "600자 이상 스토리형 설명"
    },
    {
      "id": "3",
      "title": "상황형 제목",
      "teaser": "결제 욕구를 자극하는 한 줄",
      "is_free": true,
      "content": "600자 이상 스토리형 설명"
    },
    {"id": "4", "title": "상황형 제목", "teaser": "궁금증 한 줄", "is_free": false, "content": ""},
    {"id": "5", "title": "상황형 제목", "teaser": "궁금증 한 줄", "is_free": false, "content": ""},
    {"id": "6", "title": "상황형 제목", "teaser": "궁금증 한 줄", "is_free": false, "content": ""},
    {"id": "7", "title": "상황형 제목", "teaser": "궁금증 한 줄", "is_free": false, "content": ""},
    {"id": "8", "title": "상황형 제목", "teaser": "궁금증 한 줄", "is_free": false, "content": ""},
    {"id": "9", "title": "상황형 제목", "teaser": "궁금증 한 줄", "is_free": false, "content": ""},
    {"id": "10", "title": "상황형 제목", "teaser": "궁금증 한 줄", "is_free": false, "content": ""},
    {"id": "11", "title": "상황형 제목", "teaser": "궁금증 한 줄", "is_free": false, "content": ""},
    {"id": "12", "title": "상황형 제목", "teaser": "궁금증 한 줄", "is_free": false, "content": ""}
  ],
  "strategy": {
    "overview": "이 사주의 인생 전체 흐름 핵심 요약 (3~4문장, ${character.name} 말투)",
    "golden_period": "전성기 시기와 특징 설명 (2~3문장, 구체적 나이대 포함)",
    "lifecycle": [
      {"age": "20대", "score": 0~100, "season": "봄/여름/가을/겨울 중 하나", "desc": "이 시기 핵심 특징 한 줄"},
      {"age": "30대", "score": 0~100, "season": "봄/여름/가을/겨울 중 하나", "desc": "이 시기 핵심 특징 한 줄"},
      {"age": "40대", "score": 0~100, "season": "봄/여름/가을/겨울 중 하나", "desc": "이 시기 핵심 특징 한 줄"},
      {"age": "50대", "score": 0~100, "season": "봄/여름/가을/겨울 중 하나", "desc": "이 시기 핵심 특징 한 줄"},
      {"age": "60대", "score": 0~100, "season": "봄/여름/가을/겨울 중 하나", "desc": "이 시기 핵심 특징 한 줄"}
    ],
    "peak_guide": "전성기 1000% 활용 실행 가이드 (사람/직업/돈/행동 전략 중심, 3~4문장)",
    "warning": "가장 조심해야 할 시기와 이유, 대처법 (2문장)"
  },
  "disclaimer": "본 풀이는 참고용이며 중요한 결정은 전문가와 상담하세요."
}
`

    const stream = client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: `너는 ${character.name}이다. 전통 명리학 전문가이자 콘텐츠 설계자로서 사주를 분석한다. 반드시 JSON만 출력한다.`,
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
