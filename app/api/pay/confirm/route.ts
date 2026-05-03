// app/api/pay/confirm/route.ts
// 토스페이먼츠 결제 확인 API

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { paymentKey, orderId, amount } = await req.json()

    // 금액 검증
    if (amount !== 990) {
      return NextResponse.json({ error: '결제 금액이 올바르지 않습니다' }, { status: 400 })
    }

    // 토스페이먼츠 결제 확인 요청
    const tossResponse = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.TOSS_SECRET_KEY}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    })

    const tossData = await tossResponse.json()

    if (!tossResponse.ok) {
      console.error('Toss payment error:', tossData)
      return NextResponse.json({ error: tossData.message || '결제 확인 실패' }, { status: 400 })
    }

    // DB에 결제 기록 저장 (idempotency: orderId 중복 방지)
    const supabase = createServerSupabase()

    // 중복 결제 체크
    const { data: existing } = await supabase
      .from('payments')
      .select('id')
      .eq('order_id', orderId)
      .eq('status', 'done')
      .single()

    if (existing) {
      return NextResponse.json({ success: true, message: '이미 처리된 결제입니다' })
    }

    // 결제 기록 저장
    const { error: payError } = await supabase.from('payments').insert({
      order_id: orderId,
      toss_payment_key: paymentKey,
      amount: 990,
      status: 'done',
    })

    if (payError) {
      console.error('Payment DB error:', payError)
      return NextResponse.json({ error: 'DB 저장 실패' }, { status: 500 })
    }

    // reading 잠금 해제 (orderId에서 shareId 추출)
    const shareId = orderId.split('_')[1]
    if (shareId) {
      await supabase.from('readings').update({ is_paid: true }).eq('share_id', shareId)
    }

    return NextResponse.json({ success: true, tossData })

  } catch (error) {
    console.error('Payment confirm error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
