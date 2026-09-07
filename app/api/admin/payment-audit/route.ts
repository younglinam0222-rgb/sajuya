import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { adminAuditAuthorized } from '@/lib/paymentAudit'

export async function GET(req: NextRequest) {
  const envKey = process.env.ADMIN_AUDIT_KEY
  const headerKey = req.headers.get('x-admin-audit-key')
  if (!adminAuditAuthorized(headerKey, envKey)) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }
  const orderId = req.nextUrl.searchParams.get('orderId')
  const supabase = createServerSupabase()
  let query = supabase
    .from('payment_audit_events')
    .select('id, received_at, source, event_id, order_id, payment_key, payment_status, amount, currency, verification_ok, verification_method, process_result, failure_reason')
    .order('received_at', { ascending: false })
    .limit(100)
  if (orderId) query = query.eq('order_id', orderId)
  const { data, error } = await query
  if (error) {
    return NextResponse.json({ error: '조회 실패' }, { status: 500 })
  }
  return NextResponse.json({ events: data ?? [] })
}
