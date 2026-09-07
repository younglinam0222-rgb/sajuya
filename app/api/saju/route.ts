import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { randomUUID } from 'crypto'
import { getToken } from 'next-auth/jwt'
import { CHARACTERS } from '@/lib/characters'
import { sanitizeJudgmentTitles, sanitizeStrategy, sanitizeText } from '@/lib/sajuSanitize'
import { assertNoElementCitationMismatch } from '@/lib/elementCitationCheck'
import {
  FREE_ID_GROUPS,
  FREE_CATEGORY_GROUPS,
  PAID_ID_GROUPS,
  PAID_CATEGORY_GROUPS,
  mergePaidIntoFree,
} from '@/lib/sajuScope'
import {
  clipSajuInput,
  localBurstGuard,
  rejectCrossSiteCookieMutation,
  rejectOversizedJson,
} from '@/lib/requestGuard'
import { completeFullview, startFullviewJob, tryUserRate } from '@/lib/fullviewDb'
import { createServerSupabase } from '@/lib/supabase'
import {
  CALC_VERSION,
  PROMPT_VERSION,
  SHARED_INTERP_GUARDS,
  calcManse,
  collectGeneratedText,
  formatManseForPrompt,
  formatSeunForPrompt,
  generationClock,
  hourInputToHm,
  normalizeMaritalStatus,
  normalizeOccupation,
  periodGuidance,
} from '@/lib/sajuCalc'

// ✅ 수정(재발): 120초로도 부족해서 타임아웃 발생 (Vercel Runtime Timeout Error, 504)
// 결혼상태 반영 등 프롬프트 지시사항이 늘어나며 Claude 생성 시간이 길어짐 → 300초로 상향
export const maxDuration = 300
export const runtime = 'nodejs'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  maxRetries: 0,
})

function publicErrorMessage(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  if (!msg || msg.length > 180) return '분석 중 오류가 발생했습니다. 다시 시도해주세요.'
  if (/api[_-]?key|sk-ant|bearer|secret|authorization/i.test(msg)) {
    return '분석 서버 설정 오류가 났어요. 다시 시도해주세요.'
  }
  return msg
}

function sseFailure(message: string, requestId?: string, manse?: unknown) {
  const encoder = new TextEncoder()
  const errorStream = new ReadableStream({
    start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ ...event, requestId: requestId ?? null })}\n\n`))
      }
      if (manse) send({ type: 'manse', data: manse })
      send({ type: 'error', part: 'fatal', message, retryable: false, code: 'fatal' })
      controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      controller.close()
    },
  })
  return new NextResponse(errorStream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

function buildLifecycleTemplate(currentAge: number): string {
  const currentDecade = Math.floor(currentAge / 10) * 10
  let offsets: number[]
  if (currentAge < 20) {
    offsets = [0, 10, 20, 30, 40]
  } else if (currentAge >= 70) {
    offsets = [-40, -30, -20, -10, 0]
  } else {
    offsets = [-10, 0, 10, 20, 30]
  }
  const ages = offsets.map(o => currentDecade + o).filter(a => a >= 10 && a <= 90)
  while (ages.length < 5) ages.push(ages[ages.length - 1] + 10)
  return ages
    .map(a => '      ' + JSON.stringify({ age: a + '대', season: '봄/여름/가을/겨울 중 하나', desc: '이 시기 핵심 한 줄 (해석, 점수 없음)' }))
    .join(',\n')
}

// ─── 캐릭터별 말투 ─────────────────────────────────
const CHARACTER_VOICE: Record<string, string> = {
  baekhalma: `
너는 건물주 백할매야. 수십 년 인생 살면서 별 사람 다 봤고, 돈 흐름은 귀신같이 알아.
말투는 직설적이고 쿨한 할머니 스타일. 근데 정이 있어. 쓴소리 뒤에 걱정이 묻어남.
- "야", "이 녀석", "쯧쯧", "봐봐", "솔직히" 이런 말 자주 씀
- 끝에 살짝 걱정해주는 말 한마디 꼭 붙임
- 어렵고 딱딱한 말 절대 금지. 할머니가 손녀딸한테 말하듯이
- 예시: "야 이 녀석, 돈이 없는 게 아니라 새는 구멍이 있는 거야. 그게 뭔지 내가 딱 보여줄게"
`,
  doRyeong: `
너는 근본도령이야. 나이는 젊은데 사주는 진짜 잘 봐. 친한 형/오빠가 솔직하게 얘기해주는 느낌.
- "야", "솔직히", "있잖아", "근데 있지", "형이 보니까" 이런 말 씀
- 딱딱한 설명 말고 드라마나 일상 비유로 쉽게 설명
- 위로도 해주는데 팩트는 팩트로 말함
- 예시: "있잖아, 이 사주 보면 네가 왜 그렇게 힘들었는지 이해가 되거든. 근데 사실 그게 네 가장 큰 무기야"
`,
  gumiho: `
너는 구미호 선생이야. 천 년 살면서 사랑 얘기는 다 들었어. 요염하고 위트 있는 언니/누나 스타일.
- "어머", "있지", "사실은 말이야", "호호", "근데 솔직히" 이런 말 씀
- 연애 얘기할 때 공감 100%. "맞아 그 사람 그럴 것 같았어" 이런 느낌
- 달콤하게 말하다가 핵심은 팩폭으로 날림
- 예시: "어머, 이 사람 겉으로는 차갑게 보이는데 사실 엄청 감성적이잖아? 그래서 상처도 더 잘 받는 타입이야"
`,
  sinRyeong: `
너는 무등산 신령님이야. 근데 요즘 20-30대랑 소통하려고 노력하는 스타일. 인생 경험 많은 삼촌/선생님 느낌.
- "허허", "그래", "보아하니", "이 친구" 이런 말 씀
- 무겁게 말하는데 가끔 요즘 표현도 섞음. 근엄하지만 공감됨
- 결론은 묵직하게, 과정은 이해하기 쉽게
- 예시: "허허, 이 친구 보면 알겠어. 빨리빨리 가려고 하는데, 사실 이 사주는 천천히 쌓아야 터지는 타입이야"
`,
}

// ─── 해석 근거 규칙 (다수 유파 합의 기반 — AI가 근거없이 지어내는 것 방지) ──
// ⚠️ 수정: 단순히 "합의된 결론만 써라"라고만 하면, 이 사주처럼 오행 편중이
// 뚜렷한 경우 4개 그룹 전부가 같은 결론(예: "목 과다·수 없음")으로 수렴해서
// 12개 판결문이 실질적으로 3~4가지 얘기의 반복이 되는 부작용 발견됨.
// → 그룹별로 "핵심 근거 도구"를 강제로 다르게 배정해서 이걸 막음.
// ⚠️ 재수정: "4개 이론 관점에서 속으로 따로 판단해봐" 같은 다단계 사고 과정을
// 시켰더니, 그 사고 과정 일부가 JSON 밖으로 새어나오거나 JSON 안에 섞여서
// "N번 그룹 응답 파싱 실패" 에러가 반복 발생함. 다단계 사고 지시를 없애고
// 결과에 직접 적용할 규칙 한두 줄로 단순화 — 파싱 안전성을 우선함.
function getInterpretationRules(primaryTool: string, avoidTools: string) {
  return `
[해석 근거 규칙]
이번 판결문들은 반드시 "${primaryTool}"를 핵심 근거로 삼아서 써라.
${avoidTools ? `"${avoidTools}" 관련 얘기(예: 오행 과다·부족)는 이미 다른 판결문에서 여러 번 나왔을 가능성이 높으니, 여기서는 메인 근거로 쓰지 말고 있어도 1문장 이하로만 스치듯 언급해라.` : ''}
명리학 정통 이론(격국·용신·조후·실전)에서 실제로 통용되는 해석만 써라. 근거 없이 지어낸 억지 해석 금지.
`
}

// ─── 공통 스타일 룰 ────────────────────────────────
function getStyleRules() {
  return `
[말투 생성 엔진 — 100% 적용 필수]
아래 예문들의 말투와 문장 리듬을 그대로 복제해서 작성해. 설명하지 말고, 말투를 따라 써.

예문 (이 말맛을 복제해라):
"돈이 없는 게 아니라, 돈이 머무르질 못하는 사주야."
"연애를 못하는 게 아니라, 아무나 못 만나는 사주야."
"겉으로는 괜찮은 척하는데, 속은 이미 지쳐 있네."
"지금 힘든 이유? 네가 못나서가 아니라, 운이 널 시험 중이라 그래."
"사람들이 널 강하다고 보는데, 사실은 누구보다 예민해."
"넌 게으른 게 아니라, 방향을 못 잡아서 멈춰 있는 거야."
"봐봐, 항상 네가 손해 보고 끝나잖아."
"이거 하나만 고치면 인생 흐름 완전히 달라져."
"솔직히 말하면, 네가 제일 문제인 게 아니라 네 환경이 문제야."
"버는 힘은 좋은데, 모으는 재주가 약해."
"통장은 늘 바쁜데, 잔고는 늘 한가해."

[문장 공식 — 판결문마다 최소 3개 이상 섞어서]
1. "~가 아니라, ~다"
2. "지금 힘든 이유? ~라서 그래"
3. "겉으로는 ~, 속으로는 ~"
4. "사람들이 널 ~라고 보는데, 사실은 ~야"
5. "이거 하나만 고치면 인생 확 달라져"
6. "넌 ~한 게 아니라 ~한 거야"
7. "솔직히 말하면, ~"
8. "봐봐, ~잖아"

[전개 순서 — 판결문마다 아래 중 하나를 무작위로 선택]
A. 공감 → 비유 → 팩폭 → 행동팁 → 걱정
B. 팩폭 → 공감 → 비유 → 경고 → 팁
C. 비유 → 팩폭 → 공감 → 팁
D. 공감 → 경고 → 비유 → 팩폭

[절대 사용 금지]
"~경향이 있다" / "~가능성이 있다" / "~하는 편이다" / "~것이다" / "~좋겠다" / "~추천한다"
한자 명리 용어: 정재, 편재, 갑목, 계해, 일간, 식신, 관살 등 전부 금지
같은 단어 한 문단에서 반복 금지 / 같은 문장 구조 한 문단에서 두 번 이상 반복 금지

[제목 규칙]
읽자마자 "어 이거 나 얘기잖아?" 소름 돋는 상황 묘사. 위트 있게.
예시: "겉으로는 쿨한 척, 속으로는 감성 폭발 이중매력"
예시: "돈 버는 기계인데 왜 통장은 늘 텅텅빌까"
같은 비유·행동 조언("과열", "번아웃", "속도를 줄여라")을 여러 판결문에 복제하지 마라.

[판결문 형식 규칙]
- 500자 이상, 700자 이하. 800자를 넘기지 마라. 군더더기 없이 알찬 내용으로 채워라
- 문단마다 빈 줄 하나 넣어라 (\\n\\n)
- ⚠️ 조심할 것들은 맨 마지막에, 본문과 빈 줄 띄고 써라
- ⚠️를 본문 중간에 절대 넣지 마라
- 각 문단 3~5문장으로 구성
`
}

export async function POST(req: NextRequest) {
  let setupRequestId: string | undefined
  let setupManse: unknown = null
  try {
    const csrf = rejectCrossSiteCookieMutation(req)
    if (csrf) return csrf
    const oversized = rejectOversizedJson(req)
    if (oversized) return oversized

    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.sub) {
      return sseFailure('로그인 후 이용할 수 있어요.')
    }
    if (!localBurstGuard(`saju:${token.sub}`, 4, 60_000)) {
      return sseFailure('요청이 잦아요. 잠시 후 다시 시도해주세요.')
    }
    const rateOk = await tryUserRate(token.sub, 'saju', 8, 600)
    if (!rateOk) {
      return sseFailure('요청이 잦아요. 잠시 후 다시 시도해주세요.')
    }

    const raw = await req.text()
    if (raw.length > 40_000) {
      return sseFailure('요청이 너무 큽니다.')
    }
    let parsedBody: Record<string, unknown>
    try {
      parsedBody = JSON.parse(raw) as Record<string, unknown>
    } catch {
      return sseFailure('요청을 읽지 못했어요.')
    }
    const body = clipSajuInput(parsedBody) as {
      name?: string
      year?: string
      month?: string
      day?: string
      hour?: string | number | null
      gender?: string
      characterId?: string
      occupation?: string
      maritalStatus?: string
      questionIntent?: string
      partnerInfo?: {
        name?: string
        year?: string
        month?: string
        day?: string
        hour?: string | number | null
        gender?: string
      }
      longitude?: number
      personalQuestion?: string
      requestId?: string
      retry?: { groups?: number[]; strategy?: boolean; personal?: boolean }
      phase?: string
      shareId?: string
    }
    const {
      name, year, month, day, hour, gender, characterId, occupation,
      maritalStatus, questionIntent, partnerInfo, longitude, personalQuestion,
      requestId: clientRequestId, retry, phase: rawPhase, shareId: rawShareId,
    } = body
    const phase = rawPhase === 'paid' ? 'paid' : 'free'
    const shareId = typeof rawShareId === 'string' ? rawShareId : ''
    const characterKey = typeof characterId === 'string' ? characterId : 'doRyeong'
    const yearStr = String(year ?? '')
    const monthStr = String(month ?? '')
    const dayStr = String(day ?? '')
    let activeJobId: string | null = null
    const requestId = typeof clientRequestId === 'string' && clientRequestId.length > 0 && clientRequestId.length < 80
      ? clientRequestId
      : randomUUID()
    setupRequestId = requestId

    const character = CHARACTERS[characterKey] ?? CHARACTERS['doRyeong']
    if (!character) {
      return sseFailure('선택한 신령 정보를 찾지 못했어요.', requestId)
    }
    const genderStr = gender === 'male' ? '남성' : '여성'
    const voiceGuide = CHARACTER_VOICE[characterKey] ?? CHARACTER_VOICE['doRyeong']
    const styleRules = getStyleRules()

    const marital = normalizeMaritalStatus(maritalStatus)
    const job = normalizeOccupation(occupation)
    const clock = generationClock()
    const manse = calcManse(parseInt(yearStr), parseInt(monthStr), parseInt(dayStr), hourInputToHm(hour), typeof longitude === 'number' ? longitude : undefined)
    setupManse = manse
    if (!process.env.ANTHROPIC_API_KEY) {
      return sseFailure('분석 서버 설정이 없어 풀이를 만들 수 없어요.', requestId, manse)
    }

    if (phase === 'paid') {
      if (!shareId || shareId.length < 8) {
        return sseFailure('예약된 풀이를 찾을 수 없어요.', requestId, manse)
      }
      const started = await startFullviewJob(shareId, token.sub)
      if (!started.ok || !started.job_id) {
        const msg = started.code === 'expired' || started.code === 'no_reservation'
          ? '예약이 만료되었어요. 전체보기를 다시 눌러주세요.'
          : '유료 생성을 시작할 수 없어요.'
        return sseFailure(msg, requestId, manse)
      }
      activeJobId = started.job_id
    }

    const currentYear = clock.currentYear
    const currentAge = currentYear - parseInt(yearStr) + 1
    const thisYearSeun = formatSeunForPrompt(manse.dayPillar.stemIdx, currentYear)
    const nextYearSeun = formatSeunForPrompt(manse.dayPillar.stemIdx, currentYear + 1)
    const seunInfo = `
[올해·내년 세운(歲運) — 코드 계산값, 일간 기준 십성. 재계산 금지]
${thisYearSeun.year}년(올해): 연간지 ${thisYearSeun.ganzhi} (십성: ${thisYearSeun.sipsin}) / 상반기 월기운 ${thisYearSeun.firstHalfGanzhi}(${thisYearSeun.firstHalfSipsin}) / 하반기 월기운 ${thisYearSeun.secondHalfGanzhi}(${thisYearSeun.secondHalfSipsin})
${nextYearSeun.year}년(내년): 연간지 ${nextYearSeun.ganzhi} (십성: ${nextYearSeun.sipsin}) / 상반기 월기운 ${nextYearSeun.firstHalfGanzhi}(${nextYearSeun.firstHalfSipsin}) / 하반기 월기운 ${nextYearSeun.secondHalfGanzhi}(${nextYearSeun.secondHalfSipsin})
이번 계산에는 대운 시작 나이·순행/역행·대운 간지 목록이 없다. 특정 나이를 계산된 대운·전성기처럼 쓰지 마라. 점수도 만들지 마라.
`

    const lifecycleRows = buildLifecycleTemplate(currentAge)

    let partnerDesc = ''
    if (partnerInfo?.year && partnerInfo?.month && partnerInfo?.day) {
      const partnerManse = calcManse(
        parseInt(String(partnerInfo.year), 10),
        parseInt(String(partnerInfo.month), 10),
        parseInt(String(partnerInfo.day), 10),
        hourInputToHm(partnerInfo.hour),
      )
      partnerDesc = `\n${formatManseForPrompt(partnerManse, '상대방')}
상대방 표시명: ${partnerInfo.name || '이름 미상'} / ${partnerInfo.gender === 'male' ? '남성' : '여성'}
상대방 십성은 상대방 일간 기준이다. 질문자 일간을 상대방에게 재사용하지 마라.`
    } else if (partnerInfo) {
      partnerDesc = `\n상대방 정보: ${partnerInfo.name || '이름 미상'} / ${partnerInfo.year ?? '?'}년 ${partnerInfo.month ?? '?'}월 ${partnerInfo.day ?? '?'}일생 / ${partnerInfo.gender === 'male' ? '남성' : '여성'}${partnerInfo.hour ? ` / 태어난 시간: ${partnerInfo.hour}` : ''}
생년월일이 불완전하면 상대방 사주를 만들어내지 마라.`
    }

    const maritalRules =
      marital === '기혼'
        ? `- 결혼 상태: 기혼. 연애 탐색·이상형·썸·소개팅·솔로·"나중에 가정을 꾸리면" 금지. 배우자·부부 관계, 결혼생활, 가정 내 재물/소통으로 풀어라.`
        : marital === '연애중'
        ? `- 결혼 상태: 연애중. 미래 배우자 탐색 대신 지금 만나는 사람과의 감정 표현·관계 흐름으로 풀어라. "곧 만날 사람" 금지.`
        : marital === '미혼(솔로)'
        ? `- 결혼 상태: 미혼(솔로). 배우자/부부 단정 대신 연애 스타일·맞는 사람·인연 흐름으로 풀어라.`
        : marital === '이혼/사별'
        ? `- 결혼 상태: 이혼/사별. 과거를 단정하지 말고, 현재의 안정·새 인연 흐름을 조심스럽게 풀어라.`
        : `- 결혼 상태: 미상(미입력). 결혼 여부·솔로 여부를 만들어내지 마라. 관계 조언은 일반론으로만.`

    const sajuInfo = `
[이 사람 사주 정보]
이름: ${name} / 생년월일: ${year}년 ${month}월 ${day}일 / 성별: ${genderStr} / 결혼 상태: ${marital} / 직업: ${job}
현재 나이: ${currentAge}세 (${currentYear}년 기준, 생성일 ${clock.generatedDateKST})
${periodGuidance(clock)}
${formatManseForPrompt(manse, '질문자')}
${seunInfo}
[시기 언급 규칙]
계산된 연도와 상·하반기를 쓰되, 이미 지난 구간은 과거로만 짧게. 특정 사건(합격, 이별, 사고 등)을 반드시 일어난다고 단정하지 마라.
점수, 52세 같은 세부 전성기 나이를 계산된 사실처럼 쓰지 마라.
${partnerDesc}

[결혼 상태 반영 규칙]
${maritalRules}
직업은 입력값 "${job}"만 사용해라. 직업을 지어내지 마라.
${SHARED_INTERP_GUARDS}
`

    const intentGuide: Record<string, string> = {
      '돈/재물':   '이 사람이 돈이 잘 모이는 타입인지, 어디서 새는지, 어떻게 하면 돈이 더 들어오는지 알려줘',
      '연애/결혼':
        marital === '기혼'
          ? '이 부부가 서로 어떻게 다른지, 갈등이 생기면 왜 생기는지, 관계를 어떻게 풀어가면 좋은지 알려줘'
          : marital === '연애중'
          ? '지금 만나는 사람이랑 어떤 감정 표현을 주고받는지, 관계에서 앞으로 조심할 건 뭔지 알려줘'
          : marital === '미상'
          ? '관계를 단정하지 말고, 이 사주에서 보이는 관계 태도만 일반론으로 알려줘'
          : '이 사람이 연애할 때 어떤 스타일인지, 어떤 사람이랑 잘 맞는지 알려줘',
      '직업/진로': '이 사람한테 맞는 업무 방식이 뭔지, 지금 방향이 맞는지 알려줘. 직업을 새로 지어내지 마라',
      '인생 전반': '이 사람 사주에서 가장 특징적인 게 뭔지, 어떤 인생 흐름인지 알려줘. 점수나 세부 전성기 나이는 쓰지 마라',
      '건강':      '생활 리듬과 컨디션 관리 조언만. 질환·증상을 겪는다고 단정하거나 치료·처방처럼 말하지 마라',
    }
    const intentInstruction = intentGuide[typeof questionIntent === 'string' ? questionIntent : ''] ?? '이 사람 사주에서 가장 중요한 걸 찾아서 알려줘'

    const CATEGORY_ROLES: Record<string, string> = {
      '성격': '판단·감정 반응에만 집중. 재물·직업 조언 반복 금지.',
      '재물운': '돈 관리 습관·새는 구멍에만 집중.',
      '애정운': '감정 표현 방식에만 집중. 결혼·장기 계약 얘기는 결혼운에 맡겨라.',
      '직업운': '업무 방식·일하는 리듬에만 집중. 입력 직업을 바꿔 쓰지 마라.',
      '건강운': '생활 리듬·컨디션 조언만. 질환·증상 단정·치료 금지.',
      '인간관계': '소통·경계 설정에만 집중.',
      '대운': '정성 설명만. 점수·구체 나이를 계산된 사실처럼 쓰지 마라.',
      '인생흐름': '큰 흐름만. 다른 판결문과 같은 행동 조언 반복 금지.',
      '어울리는 지역': '겉글자 오행 숫자만 인용. 0개를 지장간까지 전무로 확대하지 마라.',
      '올해 총운': `${clock.currentYear}년 기준. 지난 상반기를 앞으로 할 일처럼 쓰지 마라.`,
      '위기관리': '리스크 대응 습관만.',
      '결혼운': marital === '기혼'
        ? '배우자·부부 장기 관계에만 집중. 솔로·이상형 금지.'
        : marital === '연애중'
        ? '현재 관계의 장기화·약속에 집중. 새 사람 탐색 금지.'
        : marital === '미상'
        ? '결혼 여부를 만들어내지 마라. 장기 관계 태도만 일반론으로.'
        : '장기 관계 태도에 집중. 애정운과 같은 문장 반복 금지.',
    }

    const systemPrompt = `너는 ${character.name}이야. 사주를 쉽고 재미있게 풀어주는 캐릭터. 한자나 어려운 명리 용어는 절대 쓰지 않고, 20-30대가 바로 이해할 수 있는 말로만 설명해. 반드시 제공된 도구(tool)를 호출해서 결과를 제출해라 — 그 외의 텍스트 설명은 필요 없다.`
    const sharedContext = `${voiceGuide}\n${sajuInfo}\n${styleRules}`
    const cachedSystem: Anthropic.TextBlockParam[] = [
      { type: 'text', text: systemPrompt },
      { type: 'text', text: sharedContext, cache_control: { type: 'ephemeral' } },
    ]

    const makeJudgmentPrompt = (ids: number[], isFreeIds: number[], categoryHints: readonly string[], primaryTool: string, avoidTools: string) => `
[현재 상황] 이 사람은 지금 ${currentAge}세야. 이미 지난 나이대는 과거로만 짧게, 지금과 앞으로에 집중.

[궁금한 것]: ${questionIntent}
→ ${intentInstruction}

${getInterpretationRules(primaryTool, avoidTools)}

판결문 ${ids.join('번, ')}번을 작성해. 서로 겹치지 않게 각각 새로운 각도로 파고들어.
각 판결문은 500자 이상 700자 이하. 800자를 넘기면 실격.

[소제목(category) 규칙 — 반드시 지킬 것]
각 판결문마다 이게 어떤 주제를 다루는지 짧은 소제목(2~5글자)을 붙여라.
${ids.map((id, i) => `- ${id}번은 "${categoryHints[i]}" 카테고리로 써라. ${CATEGORY_ROLES[categoryHints[i]] ?? ''}`).join('\n')}
카테고리 이름은 위에 지정된 것과 똑같이 정확히 써라(예: "재물운"이면 "재물운"이라고, "돈운" 같은 변형 금지).
${categoryHints.includes('어울리는 지역') ? '["어울리는 지역" 카테고리 전용 지침] 겉글자 오행 개수는 위에 주어진 숫자만 써라. 개수 0을 지장간까지 포함해 "전혀 없다"고 확대하지 마라. 방향성 조언은 이유와 함께, 실제 지명을 단정하지 마라.' : ''}

오행 개수를 말할 때는 제공된 숫자와 다르게 쓰지 마라. 제공된 숫자를 다시 세지 마라.
반드시 위에서 지정한 카테고리대로, 판결문 ${ids.join('번, ')}번 내용을 만들어서 도구를 호출해.
`

    const prompt3 = `
[현재 상황] 이 사람은 지금 ${currentAge}세야.

${getInterpretationRules('오행 균형과 십성 구조를 종합한 전체 흐름', '')}

이 사람의 인생 전략을 작성해서 도구를 호출해. 판결문이 아니라 전체 인생 로드맵이야. 각 문단은 핵심만 간결하게.
대운 간지·시작 나이·나이대 점수·세부 전성기 나이(예: 52~58세)는 계산되어 있지 않다. 만들지 말고, 일반적인 흐름 설명만 해라.
오행 개수는 위에 준 숫자만 인용해라.

[lifecycle 배열은 반드시 이 나이대들로 채우되 score 필드는 넣지 마라]
${lifecycleRows}
`

    const FREE_IDS = [1, 2, 3]
    const idGroups = (phase === 'paid' ? PAID_ID_GROUPS : FREE_ID_GROUPS).map(g => [...g])
    const categoryGroups = [...(phase === 'paid' ? PAID_CATEGORY_GROUPS : FREE_CATEGORY_GROUPS)]
    const lastGroupIndex = idGroups.length - 1
    const toolPool = [
      '오행 균형(목·화·토·금·수 과다·부족)',
      '십성 구조(비겁·식상·재성·관성·인성의 조합과 힘)',
      '신살과 특이 조합(지장간, 12운성 포함)',
      '대운·세운의 시기별 흐름',
    ]
    const toolGroups = idGroups.map((_, gi) => toolPool[gi % toolPool.length])

    const makeJudgmentTool = (count: number) => ({
      name: 'submit_judgments',
      description: '작성한 사주 판결문들을 제출한다.',
      input_schema: {
        type: 'object' as const,
        properties: {
          titles: {
            type: 'array' as const,
            minItems: count,
            maxItems: count,
            items: {
              type: 'object' as const,
              properties: {
                id: { type: 'string' as const },
                category: { type: 'string' as const, description: '지정된 카테고리명 그대로' },
                title: { type: 'string' as const, description: '읽자마자 "어 내 얘기잖아" 싶은 소름 돋는 상황 묘사 제목' },
                teaser: { type: 'string' as const, description: '클릭하고 싶어지는 한 줄 훅' },
                is_free: { type: 'boolean' as const },
                content: { type: 'string' as const, description: '500~700자. 800자 금지. 공감+비유+팩폭+행동팁 포함, 문단 사이 빈줄(\\n\\n). 마지막에 "⚠️ 조심할 것들: " 로 시작하는 구체적 2~3가지' },
              },
              required: ['id', 'category', 'title', 'teaser', 'is_free', 'content'],
            },
          },
        },
        required: ['titles'],
      },
    })

    const strategyTool = {
      name: 'submit_strategy',
      description: '작성한 인생 전략을 제출한다.',
      input_schema: {
        type: 'object' as const,
        properties: {
          overview: { type: 'string' as const, minLength: 30, description: '이 사람 사주 전체 핵심 3~4문장, 쉬운 말로' },
          golden_period: { type: 'string' as const, minLength: 80, description: '기운이 잘 쓰이는 방향과 준비할 것. 구체 나이 구간(예: 52~58세)이나 점수를 계산된 사실처럼 쓰지 말 것' },
          lifecycle: {
            type: 'array' as const,
            items: {
              type: 'object' as const,
              properties: {
                age: { type: 'string' as const },
                season: { type: 'string' as const, description: '봄/여름/가을/겨울 중 하나' },
                desc: { type: 'string' as const, description: '이 시기 핵심 한 줄. 해석이지 계산 점수가 아님' },
              },
              required: ['age', 'season', 'desc'],
            },
          },
          peak_guide: { type: 'string' as const, minLength: 80, description: '전성기 활용법. "첫째, ~ \\n\\n둘째, ~ \\n\\n셋째, ~" 형식으로, 항목마다 빈 줄로 구분하고 각 항목 1~2문장.' },
          warning: { type: 'string' as const, minLength: 40, description: '가장 조심해야 할 것들. "⚠️ 첫째, ~ \\n\\n⚠️ 둘째, ~" 형식으로, 2~3개 항목을 \\n\\n으로 구분해서 각각 1~2문장씩 써라.' },
          final_word: { type: 'string' as const, minLength: 30, description: '캐릭터가 마지막으로 건네는 진심 어린 한마디 3~4문장, 감정과 응원 위주, 반말. 절대 비워두거나 생략하지 마라 — 필수 항목이다.' },
        },
        required: ['overview', 'golden_period', 'lifecycle', 'peak_guide', 'warning', 'final_word'],
      },
    }

    // ✅ 신규: 사용자가 자유 입력으로 남긴 "콕 집어 궁금한 거"에 전용으로 답하는 도구.
    // personalQuestion이 비어있으면 이 호출 자체를 안 하도록 아래 Promise.all에서 조건부 처리.
    const personalAnswerTool = {
      name: 'submit_personal_answer',
      description: '사용자가 직접 남긴 개인 질문에 대한 답변을 제출한다.',
      input_schema: {
        type: 'object' as const,
        properties: {
          answer: { type: 'string' as const, description: '500~700자. 이 사람의 질문에 사주 근거를 들어 직접 답해라. 공감+비유+팩폭+행동팁 포함. 확정짓지 말고 확률적으로("~할 가능성이 높아") 답해라.' },
        },
        required: ['answer'],
      },
    }
    const makePersonalPrompt = (q: string) => `
[이 사람이 직접 남긴 질문 — 이것에 집중해서 답해라]
"${q}"

${getInterpretationRules('이 질문과 가장 직접적으로 관련된 명리 요소(질문 내용에 맞춰 오행/십성/신살/대운 중 적절한 것)', '')}

이 사람의 질문에 사주를 근거로 직접 답하는 도구를 호출해. 500~700자로, 질문과 상관없는 일반론 늘어놓지 말고 정확히 이 질문에 대한 답을 해라.
${partnerInfo ? '위 [이 사람 사주 정보]에 상대방 정보도 함께 들어있다 — 질문이 그 사람과의 관계·궁합에 관한 것이라면, 반드시 두 사람의 사주를 같이 놓고 궁합 관점에서 답해라.' : ''}
`

    const trimmedPersonalQ = typeof personalQuestion === 'string' ? personalQuestion.trim().slice(0, 200) : ''
    console.log(JSON.stringify({
      tag: '사주궁:personal',
      phase: 'request',
      requestId,
      calcVersion: CALC_VERSION,
      promptVersion: PROMPT_VERSION,
      maritalPresent: marital !== '미상',
      occupationPresent: job !== '미입력',
      hasPersonalQuestion: trimmedPersonalQ.length > 0,
      personalQuestionChars: trimmedPersonalQ.length,
    }))
    const retryAll = !retry || typeof retry !== 'object'
    const retryGroups: number[] = retryAll
      ? idGroups.map((_, i) => i)
      : (Array.isArray(retry.groups) ? retry.groups.filter((g: unknown) => typeof g === 'number' && g >= 0 && g <= lastGroupIndex) : [])
    const retryStrategy = phase === 'paid' && (retryAll || retry.strategy === true)
    const retryPersonal = phase === 'paid' && (retryAll ? !!trimmedPersonalQ : retry.personal === true) && !!trimmedPersonalQ

    type ErrorKind = 'fatal' | 'transient' | 'validation' | 'truncation'

    function classifyError(e: unknown): ErrorKind {
      const status = (e as { status?: number; statusCode?: number }).status
        ?? (e as { status?: number; statusCode?: number }).statusCode
      const type = (e as { error?: { type?: string }; type?: string }).error?.type
        ?? (e as { type?: string }).type
      const msg = e instanceof Error ? e.message : String(e)
      if (status === 400 || status === 401 || status === 403 || status === 404) return 'fatal'
      if (type === 'authentication_error' || type === 'invalid_request_error' || type === 'permission_error') return 'fatal'
      if (msg.includes('max_tokens') || msg.includes('토큰 한도')) return 'truncation'
      if (
        msg.includes('도구 호출 결과 없음')
        || msg.includes('개수 불일치')
        || msg.includes('ID 불일치')
        || msg.includes('내용 부족')
        || msg.includes('누락')
        || msg.includes('너무 짧음')
        || msg.includes('오행 수치 불일치')
      ) return 'validation'
      return 'transient'
    }

    function sleep(ms: number) {
      return new Promise(resolve => setTimeout(resolve, ms))
    }

    const workAbort = new AbortController()
    const onClientAbort = () => workAbort.abort()
    const followClientAbort = phase !== 'paid'
    if (followClientAbort) {
      if (req.signal.aborted) workAbort.abort()
      else req.signal.addEventListener('abort', onClientAbort)
    }

    const deadlineAt = Date.now() + 270_000

    async function callWithRetry(
      params: Anthropic.MessageCreateParamsNonStreaming,
      label: string,
      validate?: (result: Record<string, unknown>) => void,
    ) {
      let lastErr: unknown = null
      let lastKind: ErrorKind = 'transient'
      const maxAttempts = 2

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (workAbort.signal.aborted) throw new Error('aborted')
        const remaining = deadlineAt - Date.now()
        if (remaining < 8_000) {
          throw lastErr instanceof Error ? lastErr : new Error('전체 제한시간 부족')
        }

        const callMaxTokens = attempt > 1 && lastKind === 'truncation'
          ? Math.min((params.max_tokens ?? 6000) + 2000, 8192)
          : params.max_tokens
        const started = Date.now()

        try {
          const res = await client.messages.create(
            { ...params, max_tokens: callMaxTokens },
            { signal: workAbort.signal, maxRetries: 0 },
          )
          const stopReason = res.stop_reason
          console.log(JSON.stringify({
            tag: '사주궁',
            requestId,
            call: label,
            attempt,
            durationMs: Date.now() - started,
            inputTokens: res.usage?.input_tokens,
            outputTokens: res.usage?.output_tokens,
            cacheCreation: res.usage?.cache_creation_input_tokens ?? 0,
            cacheRead: res.usage?.cache_read_input_tokens ?? 0,
            stopReason,
            retries: attempt - 1,
            ok: stopReason !== 'max_tokens',
          }))

          if (stopReason === 'max_tokens') {
            lastKind = 'truncation'
            throw new Error('토큰 한도(max_tokens)로 응답이 잘림')
          }

          const toolUse = res.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
          if (!toolUse) throw new Error('도구 호출 결과 없음')
          const result = toolUse.input as Record<string, unknown>
          if (validate) validate(result)
          return result
        } catch (e) {
          lastErr = e
          if (workAbort.signal.aborted) throw e
          lastKind = classifyError(e)
          console.error(JSON.stringify({
            tag: '사주궁',
            requestId,
            call: label,
            attempt,
            durationMs: Date.now() - started,
            kind: lastKind,
            retries: attempt - 1,
            ok: false,
            err: e instanceof Error ? e.message : String(e),
          }))
          if (lastKind === 'fatal') break
          if (attempt < maxAttempts && lastKind === 'transient') {
            const status = (e as { status?: number; statusCode?: number }).status
              ?? (e as { status?: number; statusCode?: number }).statusCode
            await sleep(status === 429 ? 1600 : 800)
          }
        }
      }

      throw new Error(`${label} 생성 실패: ${lastErr instanceof Error ? lastErr.message : lastErr}`)
    }

    const encoder = new TextEncoder()
    const sseHeaders = {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    }

    const readable = new ReadableStream({
      async start(controller) {
        let closed = false
        const send = (event: Record<string, unknown>) => {
          if (closed || workAbort.signal.aborted) return
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ ...event, requestId })}\n\n`))
        }
        const finish = (withDone: boolean) => {
          if (closed) return
          closed = true
          try {
            if (withDone && !workAbort.signal.aborted) {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            }
            controller.close()
          } catch { /* already closed */ }
          req.signal.removeEventListener('abort', onClientAbort)
        }

        const paidAcc: { titles: unknown[]; strategy: unknown; personalAnswer: unknown } = {
          titles: [],
          strategy: null,
          personalAnswer: null,
        }

        try {
          send({ type: 'meta', startedAt: Date.now(), retryAll, retryGroups, retryStrategy, retryPersonal })
          try {
            send({ type: 'manse', data: manse })
          } catch (e) {
            send({ type: 'error', part: 'fatal', message: publicErrorMessage(e), retryable: false, code: 'fatal' })
          }

          const tasks: Promise<void>[] = []
          const runGroup = async (gi: number) => {
            const ids = idGroups[gi]
            if (!ids) {
              send({ type: 'error', part: 'group', groupIndex: gi, message: '알 수 없는 그룹입니다.', retryable: false, code: 'fatal' })
              return
            }
            try {
                const result = await callWithRetry({
                  model: 'claude-sonnet-4-6',
                  max_tokens: 3200,
                  system: cachedSystem,
                  tools: [makeJudgmentTool(ids.length)],
                  tool_choice: { type: 'tool', name: 'submit_judgments' },
                  messages: [{
                    role: 'user',
                    content: makeJudgmentPrompt(ids, FREE_IDS, categoryGroups[gi], toolGroups[gi], gi === 0 ? '' : toolPool[(gi - 1) % toolPool.length]),
                  }],
                }, `group${gi}`, (result) => {
                  const titles = result.titles
                  if (!Array.isArray(titles) || titles.length !== ids.length) {
                    throw new Error(`판결문 개수 불일치 — 기대: ${ids.length}개, 실제: ${Array.isArray(titles) ? titles.length : '배열 아님'}개`)
                  }
                  const got = titles.map((t: { id?: unknown }) => String(t?.id ?? '')).sort()
                  const expected = ids.map(String).sort()
                  if (got.join(',') !== expected.join(',')) {
                    throw new Error(`판결문 ID 불일치 — 기대: ${expected.join(',')}, 실제: ${got.join(',')}`)
                  }
                  for (const t of titles as Array<{ id?: unknown; title?: unknown; content?: unknown }>) {
                    if (typeof t?.title !== 'string' || !t.title.trim() || typeof t.content !== 'string' || t.content.trim().length < 50) {
                      throw new Error(`판결문 내용 부족 id=${t?.id}`)
                    }
                    assertNoElementCitationMismatch(String(t.content), manse.elementCount)
                  }
                })
                const titles = sanitizeJudgmentTitles(result.titles)
                paidAcc.titles.push(...titles)
                send({ type: 'group', groupIndex: gi, titles })
              } catch (e) {
                if (workAbort.signal.aborted) return
                const kind = classifyError(e)
                send({
                  type: 'error',
                  part: 'group',
                  groupIndex: gi,
                  message: e instanceof Error ? e.message : String(e),
                  retryable: kind !== 'fatal',
                  code: kind,
                })
            }
          }
          const groupQueue = retryGroups.filter(gi => Array.isArray(idGroups[gi]))
          const groupWorkers = Array.from({ length: Math.min(4, groupQueue.length) }, async () => {
            while (groupQueue.length) {
              const gi = groupQueue.shift()
              if (gi === undefined) break
              await runGroup(gi)
            }
          })
          tasks.push(...groupWorkers)

          if (retryStrategy) {
            tasks.push((async () => {
              try {
                const result = await callWithRetry({
                  model: 'claude-sonnet-4-6',
                  max_tokens: 2800,
                  system: cachedSystem,
                  tools: [strategyTool],
                  tool_choice: { type: 'tool', name: 'submit_strategy' },
                  messages: [{ role: 'user', content: prompt3 }],
                }, 'strategy', (result) => {
                  const fw = result.final_word
                  if (typeof fw !== 'string' || fw.trim().length < 20) {
                    throw new Error(`final_word 누락 또는 너무 짧음 (${typeof fw === 'string' ? fw.length : 'undefined'}자)`)
                  }
                  assertNoElementCitationMismatch(collectGeneratedText([result]), manse.elementCount)
                })
                const strategy = sanitizeStrategy(result)
                paidAcc.strategy = strategy
                send({ type: 'strategy', data: strategy })
              } catch (e) {
                if (workAbort.signal.aborted) return
                const kind = classifyError(e)
                send({
                  type: 'error',
                  part: 'strategy',
                  message: e instanceof Error ? e.message : String(e),
                  retryable: kind !== 'fatal',
                  code: kind,
                })
              }
            })())
          }

          if (retryPersonal) {
            tasks.push((async () => {
              try {
                const result = await callWithRetry({
                  model: 'claude-sonnet-4-6',
                  max_tokens: 1600,
                  system: cachedSystem,
                  tools: [personalAnswerTool],
                  tool_choice: { type: 'tool', name: 'submit_personal_answer' },
                  messages: [{ role: 'user', content: makePersonalPrompt(trimmedPersonalQ) }],
                }, 'personal', (result) => {
                  if (typeof result.answer !== 'string' || result.answer.trim().length < 50) {
                    throw new Error('개인질문 답변 누락 또는 너무 짧음')
                  }
                  assertNoElementCitationMismatch(String(result.answer), manse.elementCount)
                })
                const personal = {
                  question: trimmedPersonalQ,
                  answer: sanitizeText(result.answer),
                }
                paidAcc.personalAnswer = personal
                send({
                  type: 'personal',
                  question: trimmedPersonalQ,
                  data: personal,
                })
                console.log(JSON.stringify({
                  tag: '사주궁:personal',
                  phase: 'event_sent',
                  requestId,
                  answerChars: typeof result.answer === 'string' ? result.answer.length : 0,
                }))
              } catch (e) {
                if (workAbort.signal.aborted) return
                const kind = classifyError(e)
                send({
                  type: 'error',
                  part: 'personal',
                  message: e instanceof Error ? e.message : String(e),
                  retryable: kind !== 'fatal',
                  code: kind,
                })
              }
            })())
          }

          await Promise.allSettled(tasks)
          if (phase === 'paid' && activeJobId) {
            const paidTitleCount = paidAcc.titles.length
            const paidReady = paidTitleCount >= 9 && !!paidAcc.strategy && (!retryPersonal || !!paidAcc.personalAnswer)
            if (paidReady) {
              const supabase = createServerSupabase()
              const { data: reading } = await supabase
                .from('readings')
                .select('ai_result, user_id')
                .eq('share_id', shareId)
                .maybeSingle()
              if (reading && reading.user_id === token.sub) {
                const merged = mergePaidIntoFree(String(reading.ai_result ?? ''), paidAcc)
                const done = await completeFullview(activeJobId, merged)
                send({ type: 'paid_status', code: done.code })
                if (done.code !== 'completed' && done.code !== 'already_completed') {
                  workAbort.abort()
                }
              } else {
                send({ type: 'paid_status', code: 'discarded' })
              }
            } else {
              send({ type: 'paid_status', code: 'incomplete' })
            }
          }
          finish(!workAbort.signal.aborted)
        } catch (e) {
          if (!workAbort.signal.aborted) {
            send({
              type: 'error',
              part: 'fatal',
              message: publicErrorMessage(e),
              retryable: false,
              code: 'fatal',
            })
          }
          finish(!workAbort.signal.aborted)
        }
      },
      cancel() {
        workAbort.abort()
        req.signal.removeEventListener('abort', onClientAbort)
      },
    })

    return new NextResponse(readable, { headers: sseHeaders })

  } catch (e) {
    console.error(JSON.stringify({
      tag: '사주궁',
      phase: 'setup',
      requestId: setupRequestId ?? null,
      err: e instanceof Error ? e.message : String(e),
    }))
    return sseFailure(publicErrorMessage(e), setupRequestId, setupManse)
  }
}
