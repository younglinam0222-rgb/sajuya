import { createServerSupabase } from './supabase'
import { reservationTtlMs } from './reservation'

export async function expireFullviewDue() {
  const supabase = createServerSupabase()
  const { data, error } = await supabase.rpc('expire_fullview_due')
  if (error) {
    console.error(JSON.stringify({ tag: 'reservation', phase: 'expire', code: error.code }))
    return 0
  }
  return typeof data === 'number' ? data : 0
}

export async function reserveFullview(shareId: string, userId: string) {
  const supabase = createServerSupabase()
  await expireFullviewDue()
  const ttlSec = Math.round(reservationTtlMs() / 1000)
  const { data, error } = await supabase.rpc('reserve_fullview', {
    p_share_id: shareId,
    p_user_id: userId,
    p_ttl_seconds: ttlSec,
  })
  if (error) {
    console.error(JSON.stringify({ tag: 'reservation', phase: 'reserve', code: error.code }))
    return { ok: false as const, code: 'rpc_error' }
  }
  return data as { ok?: boolean; code?: string; job_id?: string; expires_at?: string; total?: number }
}

export async function startFullviewJob(shareId: string, userId: string) {
  const supabase = createServerSupabase()
  await expireFullviewDue()
  const { data, error } = await supabase.rpc('start_fullview_job', {
    p_share_id: shareId,
    p_user_id: userId,
  })
  if (error) {
    console.error(JSON.stringify({ tag: 'reservation', phase: 'start_job', code: error.code }))
    return { ok: false as const, code: 'rpc_error' }
  }
  return data as { ok?: boolean; code?: string; job_id?: string; expires_at?: string; prev_job_id?: string }
}

export async function completeFullview(jobId: string, aiResult: string) {
  const supabase = createServerSupabase()
  const { data, error } = await supabase.rpc('complete_fullview', {
    p_job_id: jobId,
    p_ai_result: aiResult,
  })
  if (error) {
    console.error(JSON.stringify({ tag: 'reservation', phase: 'complete', code: error.code }))
    return { ok: false as const, code: 'rpc_error' }
  }
  return data as { ok?: boolean; code?: string }
}

export async function loadOpenReservation(shareId: string, userId: string) {
  const supabase = createServerSupabase()
  await expireFullviewDue()
  const { data, error } = await supabase
    .from('saju_fullview_reservations')
    .select('job_id, status, expires_at, reserved_at, completed_at, released_at, release_reason')
    .eq('share_id', shareId)
    .eq('user_id', userId)
    .in('status', ['reserved', 'generating', 'completed'])
    .maybeSingle()
  if (error) return null
  return data
}

export async function tryUserRate(userId: string, action: string, limit: number, windowSeconds: number) {
  const supabase = createServerSupabase()
  const { data, error } = await supabase.rpc('try_api_rate', {
    p_user_id: userId,
    p_action: action,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  })
  if (error) {
    console.error(JSON.stringify({ tag: 'rate', action, code: error.code }))
    return true
  }
  return data === true
}
