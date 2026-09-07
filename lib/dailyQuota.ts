import { kstDateString } from '@/lib/kstDate'

export const DAILY_FREE_USED_MESSAGE =
  '오늘 무료 이용을 완료했어요. 기존 결과를 확인하거나 내일 다시 이용해주세요'

export const DAILY_IN_PROGRESS_MESSAGE = '오늘의 운세를 이미 생성 중이에요. 잠시 후 다시 확인해주세요.'

export const DAILY_LOGIN_REQUIRED_MESSAGE = '로그인 후 이용해주세요.'

export const DAILY_PAID_CONSENT_MESSAGE = '다른 결과로 다시 생성하려면 1냥 사용에 동의해야 합니다.'

export const DAILY_INSUFFICIENT_BALANCE_MESSAGE = '엽전이 부족해요. 1냥이 필요합니다.'

export const PENDING_TTL_MS = 10 * 60 * 1000

export const DAILY_PAID_NYANG = 1

export type DailyUsageKind = 'free' | 'paid'
export type DailyUsageStatus = 'pending' | 'completed' | 'failed'

export type DailyUsageRow = {
  id: string
  user_id: string
  usage_date: string
  kind: DailyUsageKind
  status: DailyUsageStatus
  request_id: string
  reserved_at: string
  expires_at: string | null
  completed_at: string | null
  failed_at: string | null
  nyang_charged: number
  refunded: boolean
  character_id: string | null
  manse_data: unknown | null
  result: unknown | null
}

export class UniqueViolationError extends Error {
  constructor(message = 'unique_violation') {
    super(message)
    this.name = 'UniqueViolationError'
  }
}

export interface DailyQuotaStore {
  expireStale(now: Date): Promise<number>
  getByRequestId(requestId: string): Promise<DailyUsageRow | null>
  getActiveFree(userId: string, usageDate: string): Promise<DailyUsageRow | null>
  insert(row: DailyUsageRow): Promise<DailyUsageRow>
  update(id: string, patch: Partial<DailyUsageRow>): Promise<DailyUsageRow>
  deductNyang(userId: string, amount: number): Promise<{ ok: true; balance: number } | { ok: false }>
  refundNyang(userId: string, amount: number): Promise<void>
  /** refunded=false 인 유료 건만 1회 환급. 이미 환급됐으면 0. */
  claimRefund(id: string): Promise<number>
  saveFreeReading(input: {
    userId: string
    usageDate: string
    characterId: string
    manse: unknown
    result: unknown
  }): Promise<void>
  getFreeReading(userId: string, usageDate: string): Promise<{
    characterId: string
    manse: unknown
    result: unknown
  } | null>
}

export type ReserveOk = { ok: true; usage: DailyUsageRow; reused: boolean }
export type ReserveErr = {
  ok: false
  code: 'IN_PROGRESS' | 'FREE_USED' | 'PAYMENTS_DISABLED' | 'INSUFFICIENT_BALANCE' | 'NO_PAID_CONSENT' | 'INVALID_REQUEST'
  error: string
}
export type ReserveResult = ReserveOk | ReserveErr

function isUuidLike(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 8 && value.length <= 80 && /^[A-Za-z0-9_-]+$/.test(value)
}

function newId(): string {
  return crypto.randomUUID()
}

function iso(d: Date): string {
  return d.toISOString()
}

export function normalizeRequestId(value: unknown): string | null {
  if (!isUuidLike(value)) return null
  return value
}

export async function getDailyQuotaStatus(
  store: DailyQuotaStore,
  userId: string,
  now: Date = new Date(),
): Promise<{
  usageDate: string
  freeStatus: DailyUsageStatus | null
  canGenerateFree: boolean
  hasCachedResult: boolean
  cached: { characterId: string; manse: unknown; result: unknown } | null
}> {
  await store.expireStale(now)
  const usageDate = kstDateString(now)
  const [active, cached] = await Promise.all([
    store.getActiveFree(userId, usageDate),
    store.getFreeReading(userId, usageDate),
  ])
  return {
    usageDate,
    freeStatus: active?.status ?? null,
    canGenerateFree: !active || active.status === 'failed',
    hasCachedResult: !!cached,
    cached: cached ? { characterId: cached.characterId, manse: cached.manse, result: cached.result } : null,
  }
}

async function refundPaidOnce(store: DailyQuotaStore, row: DailyUsageRow): Promise<void> {
  if (row.kind !== 'paid' || row.nyang_charged <= 0 || row.refunded) return
  await store.claimRefund(row.id)
}

export async function failDailyGeneration(
  store: DailyQuotaStore,
  usage: DailyUsageRow,
  now: Date = new Date(),
): Promise<DailyUsageRow> {
  const latest = await store.getByRequestId(usage.request_id) ?? usage
  if (latest.status === 'completed') return latest
  let current = latest
  if (current.status === 'pending') {
    current = await store.update(usage.id, {
      status: 'failed',
      failed_at: iso(now),
      expires_at: null,
    })
  }
  await refundPaidOnce(store, current)
  return store.getByRequestId(usage.request_id).then(row => row ?? current)
}

export async function completeDailyGeneration(
  store: DailyQuotaStore,
  usage: DailyUsageRow,
  payload: { characterId: string; manse: unknown; result: unknown },
  now: Date = new Date(),
): Promise<DailyUsageRow> {
  if (usage.kind === 'free') {
    await store.saveFreeReading({
      userId: usage.user_id,
      usageDate: usage.usage_date,
      characterId: payload.characterId,
      manse: payload.manse,
      result: payload.result,
    })
  }
  return store.update(usage.id, {
    status: 'completed',
    completed_at: iso(now),
    expires_at: null,
    character_id: payload.characterId,
    manse_data: payload.manse,
    result: payload.result,
  })
}

function pendingRow(input: {
  userId: string
  usageDate: string
  kind: DailyUsageKind
  requestId: string
  now: Date
  nyangCharged: number
}): DailyUsageRow {
  const reservedAt = iso(input.now)
  return {
    id: newId(),
    user_id: input.userId,
    usage_date: input.usageDate,
    kind: input.kind,
    status: 'pending',
    request_id: input.requestId,
    reserved_at: reservedAt,
    expires_at: iso(new Date(input.now.getTime() + PENDING_TTL_MS)),
    completed_at: null,
    failed_at: null,
    nyang_charged: input.nyangCharged,
    refunded: false,
    character_id: null,
    manse_data: null,
    result: null,
  }
}

async function reactivateFailed(
  store: DailyQuotaStore,
  existing: DailyUsageRow,
  now: Date,
): Promise<DailyUsageRow> {
  return store.update(existing.id, {
    status: 'pending',
    reserved_at: iso(now),
    expires_at: iso(new Date(now.getTime() + PENDING_TTL_MS)),
    completed_at: null,
    failed_at: null,
    refunded: false,
  })
}

export async function reserveDailyGeneration(
  store: DailyQuotaStore,
  input: {
    userId: string
    requestId: unknown
    now?: Date
    confirmPaidRegenerate: unknown
    paymentsEnabled: boolean
  },
): Promise<ReserveResult> {
  const requestId = normalizeRequestId(input.requestId)
  if (!requestId) {
    return { ok: false, code: 'INVALID_REQUEST', error: '요청을 확인할 수 없어요. 다시 시도해주세요.' }
  }
  const now = input.now ?? new Date()
  const usageDate = kstDateString(now)
  const wantPaid = input.confirmPaidRegenerate === true

  await store.expireStale(now)

  const existing = await store.getByRequestId(requestId)
  if (existing) {
    if (existing.user_id !== input.userId) {
      return { ok: false, code: 'INVALID_REQUEST', error: '요청을 확인할 수 없어요. 다시 시도해주세요.' }
    }
    if (existing.status === 'pending') {
      return { ok: false, code: 'IN_PROGRESS', error: DAILY_IN_PROGRESS_MESSAGE }
    }
    if (existing.status === 'completed') {
      return { ok: true, usage: existing, reused: true }
    }
    // failed: same request may retry without a second charge/slot if unique allows
    if (existing.kind === 'paid') {
      if (!wantPaid) {
        return { ok: false, code: 'NO_PAID_CONSENT', error: DAILY_PAID_CONSENT_MESSAGE }
      }
      if (!input.paymentsEnabled) {
        return { ok: false, code: 'PAYMENTS_DISABLED', error: DAILY_FREE_USED_MESSAGE }
      }
      const deducted = await store.deductNyang(input.userId, DAILY_PAID_NYANG)
      if (!deducted.ok) return { ok: false, code: 'INSUFFICIENT_BALANCE', error: DAILY_INSUFFICIENT_BALANCE_MESSAGE }
      const revived = await store.update(existing.id, {
        status: 'pending',
        reserved_at: iso(now),
        expires_at: iso(new Date(now.getTime() + PENDING_TTL_MS)),
        completed_at: null,
        failed_at: null,
        nyang_charged: DAILY_PAID_NYANG,
        refunded: false,
      })
      return { ok: true, usage: revived, reused: false }
    }
    const activeFree = await store.getActiveFree(input.userId, usageDate)
    if (activeFree && activeFree.id !== existing.id) {
      if (activeFree.status === 'pending') {
        return { ok: false, code: 'IN_PROGRESS', error: DAILY_IN_PROGRESS_MESSAGE }
      }
      if (!wantPaid) return { ok: false, code: 'FREE_USED', error: DAILY_FREE_USED_MESSAGE }
    }
    const revived = await reactivateFailed(store, existing, now)
    return { ok: true, usage: revived, reused: false }
  }

  const activeFree = await store.getActiveFree(input.userId, usageDate)
  if (activeFree?.status === 'pending') {
    return { ok: false, code: 'IN_PROGRESS', error: DAILY_IN_PROGRESS_MESSAGE }
  }

  if (!activeFree || activeFree.status !== 'completed') {
    try {
      const usage = await store.insert(pendingRow({
        userId: input.userId,
        usageDate,
        kind: 'free',
        requestId,
        now,
        nyangCharged: 0,
      }))
      return { ok: true, usage, reused: false }
    } catch (err) {
      if (!(err instanceof UniqueViolationError)) throw err
      const raced = await store.getByRequestId(requestId)
      if (raced?.status === 'completed') return { ok: true, usage: raced, reused: true }
      if (raced?.status === 'pending') return { ok: false, code: 'IN_PROGRESS', error: DAILY_IN_PROGRESS_MESSAGE }
      const other = await store.getActiveFree(input.userId, usageDate)
      if (other?.status === 'pending') return { ok: false, code: 'IN_PROGRESS', error: DAILY_IN_PROGRESS_MESSAGE }
      return { ok: false, code: 'FREE_USED', error: DAILY_FREE_USED_MESSAGE }
    }
  }

  if (!wantPaid) {
    return { ok: false, code: 'FREE_USED', error: DAILY_FREE_USED_MESSAGE }
  }
  if (!input.paymentsEnabled) {
    return { ok: false, code: 'PAYMENTS_DISABLED', error: DAILY_FREE_USED_MESSAGE }
  }

  const deducted = await store.deductNyang(input.userId, DAILY_PAID_NYANG)
  if (!deducted.ok) return { ok: false, code: 'INSUFFICIENT_BALANCE', error: DAILY_INSUFFICIENT_BALANCE_MESSAGE }
  try {
    const usage = await store.insert(pendingRow({
      userId: input.userId,
      usageDate,
      kind: 'paid',
      requestId,
      now,
      nyangCharged: DAILY_PAID_NYANG,
    }))
    return { ok: true, usage, reused: false }
  } catch (err) {
    await store.refundNyang(input.userId, DAILY_PAID_NYANG)
    if (err instanceof UniqueViolationError) {
      const raced = await store.getByRequestId(requestId)
      if (raced?.status === 'completed') return { ok: true, usage: raced, reused: true }
      return { ok: false, code: 'IN_PROGRESS', error: DAILY_IN_PROGRESS_MESSAGE }
    }
    throw err
  }
}
