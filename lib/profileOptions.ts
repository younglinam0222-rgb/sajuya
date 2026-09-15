export const MARITAL_STATUS_VALUES = ['미혼(솔로)', '연애중', '기혼', '이혼/사별'] as const
export type MaritalStatusValue = (typeof MARITAL_STATUS_VALUES)[number]

export const MARITAL_STATUS_OPTIONS: { value: MaritalStatusValue; label: string }[] = [
  { value: '미혼(솔로)', label: '미혼(솔로)' },
  { value: '연애중', label: '연애중' },
  { value: '기혼', label: '기혼' },
  { value: '이혼/사별', label: '이혼·사별' },
]

export const OCCUPATION_PRESETS = ['직장인', '사업가', '학생', '주부', '프리랜서'] as const
export const OCCUPATION_CUSTOM_KEY = '기타'

const MARITAL_ALIASES: Record<string, MaritalStatusValue> = {
  '미혼(솔로)': '미혼(솔로)',
  '미혼': '미혼(솔로)',
  '솔로': '미혼(솔로)',
  '연애중': '연애중',
  '기혼': '기혼',
  '이혼/사별': '이혼/사별',
  '이혼·사별': '이혼/사별',
  '이혼': '이혼/사별',
  '사별': '이혼/사별',
}

export function maritalStatusLabel(value: string): string {
  return MARITAL_STATUS_OPTIONS.find(o => o.value === value)?.label ?? value
}

export function normalizeMaritalStatus(input: unknown): MaritalStatusValue | null {
  if (typeof input !== 'string') return null
  const trimmed = input.trim()
  if (!trimmed) return null
  return MARITAL_ALIASES[trimmed] ?? null
}

export function isOccupationPreset(value: string): boolean {
  return (OCCUPATION_PRESETS as readonly string[]).includes(value)
}

export function resolveOccupation(occupation: unknown, maxLen = 40): string {
  if (typeof occupation !== 'string') return ''
  return occupation.trim().slice(0, maxLen)
}

export const GUNGHAP_RELATIONSHIPS = ['연인', '배우자', '친구', '부모', '자녀', '직장동료', '지인', '기타·미정'] as const
export type GunghapRelationship = (typeof GUNGHAP_RELATIONSHIPS)[number]

const RELATIONSHIP_ALIASES: Record<string, GunghapRelationship> = {
  '연인': '연인',
  '배우자': '배우자',
  '친구': '친구',
  '부모': '부모',
  '자녀': '자녀',
  '직장동료': '직장동료',
  '지인': '지인',
  '기타': '기타·미정',
  '기타·미정': '기타·미정',
  '미정': '기타·미정',
}

export function normalizeRelationship(input: unknown): GunghapRelationship | null {
  if (typeof input !== 'string') return null
  const trimmed = input.trim()
  if (!trimmed) return null
  return RELATIONSHIP_ALIASES[trimmed] ?? null
}
