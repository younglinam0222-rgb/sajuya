// app/api/saju/route.ts — v3 최종 (HH:MM + 직업 + 캐싱 + 독설)

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { calculateSaju } from '@/lib/manse'
import { CHARACTERS, CharacterId } from '@/lib/characters'
import { OCCUPATIONS, OccupationId, buildOccupationPrompt, generateShareTitle } from '@/lib/occupations'
import { buildCacheHash, getCachedReading, setCachedReading } from '@/lib/cache'
import { createServerSupabase } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      form,
      characterId,
      occupationId = 'general',
    }: {
      form: {
        name: string; year: number; month: number; day: number
        timeStr: string | null   // HH:MM 형식
        gender: 'male' | 'female'; isLunar: boolean
      }
      characterId: CharacterId
      occupationId: OccupationId
    } = body

    if (!form.name || !form.year || !form.month || !form.day || !characterId) {
      return NextResponse.json({ error: '필수 정보가 없습니다' }, { status: 400 })
    }

    const character = CHARACTERS[characterId]
    const occupation = OCCUPATIONS[occupationId]
    if (!character || !occupation) {
      return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
    }

    // 만세력 계산 (HH:MM)
    const saju = calculateSaju(
      form.year, form.month, form.day,
      form.timeStr, form.gender, form.isLunar
    )

    // 캐시 확인
    const cacheHash = buildCacheHash(saju as any, occupationId, characterId)
    const cached = await getCachedReading(cacheHash)

    if (cached) {
      const shareId = uuidv4()
      const encoder = new TextEncoder()
      const readable = new ReadableStream({
        start(controller) {
          const chunks = cached.match(/.{1,50}/g) || [cached]
          let i = 0
          const send = () => {
            if (i < chunks.length) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunks[i] })}\n\n`))
              i++; setTimeout(send, 15)
            } else {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, shareId, fromCache: true, sajuData: saju })}\n\n`))
              controller.close()
            }
          }
          send()
        }
      })
      return new NextResponse(readable, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
      })
    }

    // 프롬프트 구성
    const occupationPrompt = buildOccupationPrompt(occupationId)
    const fullSystemPrompt = `절대로 마크다운 코드블록을 사용하지 마. \`\`\`json 이나 \`\`\` 절대 금지. 순수 JSON만 반환.

` + character.systemPrompt + occupationPrompt
    const sectionList = character.sections.map(s => `[${s.emoji} ${s.title}]`).join(', ')
    const shareTitle = generateShareTitle(occupationId, form.name)

    const userPrompt = `
이름: ${form.name}
성별: ${form.gender === 'male' ? '남성' : '여성'}
직업: ${occupation.label}
생년월일시: ${form.year}년 ${form.month}월 ${form.day}일 ${form.timeStr ? form.timeStr : '(시간 모름)'}
${form.isLunar ? '(음력)' : '(양력)'}
시진: ${saju.sijin}

사주팔자:
- 연주: ${saju.yearPillar.fullName} [${saju.yearPillar.stemElement}+${saju.yearPillar.branchElement}]
- 월주: ${saju.monthPillar.fullName} [${saju.monthPillar.stemElement}+${saju.monthPillar.branchElement}]
- 일주: ${saju.dayPillar.fullName} [${saju.dayPillar.stemElement}+${saju.dayPillar.branchElement}]
- 시주: ${saju.hourPillar.fullName} [${saju.hourPillar.stemElement}+${saju.hourPillar.branchElement}]
- 띠: ${saju.animal}띠
- 오행: 木${saju.elementCount['木']} 火${saju.elementCount['火']} 土${saju.elementCount['土']} 金${saju.elementCount['金']} 水${saju.elementCount['水']}
${saju.currentDaeun ? `- 현재 대운: ${saju.currentDaeun.stem}${saju.currentDaeun.branch} (${saju.currentDaeun.startAge}~${saju.currentDaeun.endAge}세)` : ''}

분석 섹션: ${sectionList}

JSON 형식으로만 반환:
{
  "sections": [
    { "id": "섹션ID", "emoji": "이모지", "title": "캐치프레이즈(15자이내)", "body": "풀이(3~4문장)" }
  ],
  "shareTitle": "${shareTitle}",
  "adContext": "${occupation.adCategory}"
}
`

    const stream = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4000,
      system: fullSystemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      stream: true,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        let fullText = ''
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              fullText += event.delta.text
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`))
            }
          }
          const shareId = uuidv4()
          const supabase = createServerSupabase()
          await Promise.all([
            supabase.from('readings').insert({
              share_id: shareId,
              saju_data: JSON.stringify({ form, saju }),
              character_id: characterId,
              occupation_id: occupationId,
              ai_result: fullText,
              is_paid: false,
            }),
            setCachedReading(cacheHash, fullText, occupationId, characterId),
          ])
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, shareId, sajuData: saju })}\n\n`))
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: '풀이 생성 중 오류' })}\n\n`))
        } finally {
          controller.close()
        }
      }
    })

    return new NextResponse(readable, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
    })

  } catch (error) {
    console.error('Saju API error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
