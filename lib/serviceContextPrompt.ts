import { maritalStatusLabel, type MaritalStatusValue } from '@/lib/profileOptions'

export type FortuneService = 'daily' | 'gunghap' | 'daeun' | 'taekil' | 'saju'

function maritalBlock(marital: MaritalStatusValue | null, service: FortuneService): string {
  if (!marital) return '- 결혼 상태가 없으면 개인 중심으로만 풀어라. 관계를 추측하지 마라.'
  const label = maritalStatusLabel(marital)
  const shared = [
    `- 결혼 상태 서버값: ${marital} (화면 표시: ${label})`,
    '- 결혼 상태만으로 불륜·외도를 추정하지 마라.',
    '- 과거 이혼/사별을 원인·책임으로 단정하지 마라.',
  ]
  if (service === 'taekil') {
    if (marital === '기혼') {
      return [...shared, '- 기혼: 가정 일정·배우자 일정과 겹칠 수 있다는 현실만 참고하고, 행사 종류가 결혼이어도 본인 재혼이라고 단정하지 마라.'].join('\n')
    }
    if (marital === '연애중') {
      return [...shared, '- 연애중: 행사 종류가 결혼/여행 등일 때만 현재 관계를 참고하고, 일괄 연애 문구를 넣지 마라.'].join('\n')
    }
    if (marital === '미혼(솔로)') {
      return [...shared, '- 미혼(솔로): 새로운 인연 멘트를 택일 결과에 억지로 넣지 마라. 선택한 행사 일정에 집중하라.'].join('\n')
    }
    return [...shared, '- 이혼·사별: 과거 관계를 단정하지 말고, 지금 치르려는 행사의 현실 준비에 집중하라.'].join('\n')
  }
  if (service === 'daily') {
    if (marital === '기혼') {
      return [...shared, '- 기혼: 오늘 하루는 배우자·가정·부부 소통 중심으로. 소개팅/썸/이상형 탐색 금지.'].join('\n')
    }
    if (marital === '연애중') {
      return [...shared, '- 연애중: 오늘 현재 관계의 분위기·배려 포인트 중심. 새로운 사람 탐색 금지.'].join('\n')
    }
    if (marital === '미혼(솔로)') {
      return [...shared, '- 미혼(솔로): 오늘 연애 기운·새로운 인연 흐름 중심. 배우자/부부 전제 금지.'].join('\n')
    }
    return [...shared, '- 이혼·사별: 오늘 컨디션·현재 고민 중심. 과거 관계를 임의로 재구성하지 마라.'].join('\n')
  }
  if (service === 'daeun') {
    if (marital === '기혼') {
      return [...shared, '- 기혼: 대운의 인연 항목은 배우자·가정·부부 소통의 10년 흐름으로. 연애 탐색 금지.'].join('\n')
    }
    if (marital === '연애중') {
      return [...shared, '- 연애중: 현재 관계가 이 대운에서 어떻게 깊어지거나 흔들리는지에 집중. 새 이상형 탐색 금지.'].join('\n')
    }
    if (marital === '미혼(솔로)') {
      return [...shared, '- 미혼(솔로): 인연의 큰 시기·경향만. 특정 만남을 확정처럼 말하지 마라.'].join('\n')
    }
    return [...shared, '- 이혼·사별: 관계 대운은 현재 삶의 안정·회복 흐름 중심. 과거를 단정하지 마라.'].join('\n')
  }
  if (marital === '기혼') {
    return [...shared, '- 기혼: 배우자·가정·부부 소통 중심. 미혼 대상 연애 표현 금지.'].join('\n')
  }
  if (marital === '연애중') {
    return [...shared, '- 연애중: 현재 관계 중심. 곧 만날 사람/소개팅 표현 금지.'].join('\n')
  }
  if (marital === '미혼(솔로)') {
    return [...shared, '- 미혼(솔로): 연애 성향·새로운 인연 중심. 배우자 전제 금지.'].join('\n')
  }
  return [...shared, '- 이혼·사별: 과거를 단정하지 말고 현재 고민 중심.'].join('\n')
}

export function occupationPromptLine(occupation: string): string {
  const job = occupation.trim() || '미입력'
  return `- 직업: ${job}. 사례와 조언은 이 직업의 실제 일상(근무 형태, 수입 구조, 현장)에 맞춰라. 동떨어진 직종 예시는 금지.`
}

export function gunghapRelationshipPrompt(relationship: string, marital1: string, marital2: string): string {
  return [
    `[서로의 관계] 이용자가 선택한 관계: ${relationship || '미입력'}`,
    `- 이 선택값을 해석 기준으로 삼아라. 두 사람 결혼 상태가 모두 기혼(${marital1} / ${marital2})이어도, 관계가 '배우자'가 아니면 부부로 단정하지 마라.`,
    '- 결혼 상태만으로 불륜·외도 관계를 추정하지 마라.',
    "- 관계가 '기타·미정'이면 연인/부부 전제를 넣지 말고 사람 대 사람의 궁합으로 풀어라.",
  ].join('\n')
}

export function buildServiceContextPrompt(input: {
  service: FortuneService
  maritalStatus?: MaritalStatusValue | null
  occupation?: string
  relationship?: string
  partnerMaritalStatus?: MaritalStatusValue | null
  partnerOccupation?: string
}): string {
  const lines = ['[이용자 현실 정보 — 추측 금지, 입력값만 반영]']
  if (input.service === 'gunghap') {
    lines.push(gunghapRelationshipPrompt(input.relationship ?? '', input.maritalStatus ?? '', input.partnerMaritalStatus ?? ''))
    lines.push(`- 질문자 결혼 상태: ${input.maritalStatus ?? '미입력'} / 직업: ${input.occupation?.trim() || '미입력'}`)
    lines.push(`- 상대 결혼 상태: ${input.partnerMaritalStatus ?? '미입력'} / 직업: ${input.partnerOccupation?.trim() || '미입력'}`)
    lines.push(occupationPromptLine(input.occupation ?? ''))
    if (input.partnerOccupation) lines.push(occupationPromptLine(input.partnerOccupation))
  } else {
    lines.push(maritalBlock(input.maritalStatus ?? null, input.service))
    lines.push(occupationPromptLine(input.occupation ?? ''))
  }
  return lines.join('\n')
}
