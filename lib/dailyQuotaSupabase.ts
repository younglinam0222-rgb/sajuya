import { createServerSupabase } from '@/lib/supabase'
import {
  DailyQuotaStore,
  DailyUsageRow,
  UniqueViolationError,
} from '@/lib/dailyQuota'

const UNIQUE_CODES = new Set(['23505'])

function isUniqueError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  if (error.code && UNIQUE_CODES.has(error.code)) return true
  return (error.message || '').toLowerCase().includes('duplicate')
}

function mapRow(data: Record<string, unknown>): DailyUsageRow {
  return {
    id: String(data.id),
    user_id: String(data.user_id),
    usage_date: String(data.usage_date).slice(0, 10),
    kind: data.kind as DailyUsageRow['kind'],
    status: data.status as DailyUsageRow['status'],
    request_id: String(data.request_id),
    reserved_at: String(data.reserved_at),
    expires_at: data.expires_at ? String(data.expires_at) : null,
    completed_at: data.completed_at ? String(data.completed_at) : null,
    failed_at: data.failed_at ? String(data.failed_at) : null,
    nyang_charged: Number(data.nyang_charged ?? 0),
    refunded: Boolean(data.refunded),
    character_id: data.character_id ? String(data.character_id) : null,
    manse_data: data.manse_data ?? null,
    result: data.result ?? null,
  }
}

export function createSupabaseDailyQuotaStore(): DailyQuotaStore {
  const supabase = createServerSupabase()

  return {
    async expireStale(now) {
      const { data, error } = await supabase.rpc('expire_stale_daily_usage', {
        p_now: now.toISOString(),
      })
      if (error) throw error
      return Number(data ?? 0)
    },

    async getByRequestId(requestId) {
      const { data, error } = await supabase
        .from('daily_usage')
        .select('*')
        .eq('request_id', requestId)
        .maybeSingle()
      if (error) throw error
      return data ? mapRow(data) : null
    },

    async getActiveFree(userId, usageDate) {
      const { data, error } = await supabase
        .from('daily_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('usage_date', usageDate)
        .eq('kind', 'free')
        .in('status', ['pending', 'completed'])
        .maybeSingle()
      if (error) throw error
      return data ? mapRow(data) : null
    },

    async insert(row) {
      const { data, error } = await supabase
        .from('daily_usage')
        .insert({
          id: row.id,
          user_id: row.user_id,
          usage_date: row.usage_date,
          kind: row.kind,
          status: row.status,
          request_id: row.request_id,
          reserved_at: row.reserved_at,
          expires_at: row.expires_at,
          completed_at: row.completed_at,
          failed_at: row.failed_at,
          nyang_charged: row.nyang_charged,
          refunded: row.refunded,
          character_id: row.character_id,
          manse_data: row.manse_data,
          result: row.result,
        })
        .select('*')
        .single()
      if (error) {
        if (isUniqueError(error)) throw new UniqueViolationError(error.message)
        throw error
      }
      return mapRow(data)
    },

    async update(id, patch) {
      const { data, error } = await supabase
        .from('daily_usage')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single()
      if (error) {
        if (isUniqueError(error)) throw new UniqueViolationError(error.message)
        throw error
      }
      return mapRow(data)
    },

    async deductNyang(userId, amount) {
      const { data, error } = await supabase.rpc('deduct_yeobjeun', {
        p_user_id: userId,
        p_amount: amount,
      })
      if (error) throw error
      const balance = Number(data)
      if (!Number.isFinite(balance) || balance < 0) return { ok: false }
      return { ok: true, balance }
    },

    async refundNyang(userId, amount) {
      const { error } = await supabase.rpc('refund_yeobjeun', {
        p_user_id: userId,
        p_amount: amount,
      })
      if (error) throw error
    },

    async claimRefund(id) {
      const { data, error } = await supabase.rpc('refund_daily_usage', { p_id: id })
      if (error) throw error
      return Number(data ?? 0)
    },

    async saveFreeReading(input) {
      const { error } = await supabase.from('daily_readings').upsert({
        user_id: input.userId,
        reading_date: input.usageDate,
        character_id: input.characterId,
        manse_data: input.manse,
        result: input.result,
      }, { onConflict: 'user_id,reading_date' })
      if (error) throw error
    },

    async getFreeReading(userId, usageDate) {
      const { data, error } = await supabase
        .from('daily_readings')
        .select('character_id, manse_data, result')
        .eq('user_id', userId)
        .eq('reading_date', usageDate)
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      return {
        characterId: data.character_id,
        manse: data.manse_data,
        result: data.result,
      }
    },
  }
}
