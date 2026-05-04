import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { CHARACTERS, CharacterId } from '@/lib/characters'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const { name, year, month, day, gender, characterId, today } = await req.json()

    const character = CHARACTERS[characterId as CharacterId]
    if (!character) return NextResponse.json({ error: '잘못된 캐릭터' }, { status: 400 })

    const animals = ['쥐','소','호랑이','토끼','용','뱀','말','양','원숭이','닭','개','돼지']
    const animal = animals[(parseInt(year) - 4) % 12]
    const genderStr = gender === 'male' ? '남성' : '여성'

    const prompt = `
오늘 날짜: ${today}
상담자: ${name} (${year}년 ${month}월 ${day}일생, ${animal}띠, ${genderStr})

위 사람의 오늘 하루 일일 운세를 봐줘.
생년월일 기반으로 이 사람의 기질과 오늘의 기운을 반영해서, 누가 봐도 맞춤형이라고 느낄 수 있게.
같은 날짜라도 생년월일이 다르면 완전히 다른 내용이 나와야 해.

반드시 아래 JSON 형식으로만 반환. 마크다운 코드블록 절대 금지. backtick 절대 금지.

{
  "overall": "전체운 (3~4문장, 생년월일 기반 기질과 오늘 날짜 기운 반영)",
  "money": "금전운 (2~3문장, 구체적 행동 조언 포함)",
  "love": "연애운 (2~3문장)",
  "health": "건강운 (2~3문장, 신체 증상 언급)",
  "advice": "오늘의 핵심 조언 (1~2문장, 단호하게)",
  "luckyColor": "행운의 색 (한 단어)",
  "luckyNumber": "행운의 숫자 (숫자만)"
}
`

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: character.systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = (msg.content[0] as { type: string; text: string }).text
    const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()
    const start = clean.indexOf('{')
    const end = clean.lastIndexOf('}')
    const parsed = JSON.parse(clean.slice(start, end + 1))

    return NextResponse.json(parsed)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
