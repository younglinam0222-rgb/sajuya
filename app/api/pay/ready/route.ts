import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getSalePackage, listSalePackages } from '@/lib/chargePackages'
import { createChargeOrder, packageView } from '@/lib/chargeOrders'
import { rejectCrossSiteCookieMutation } from '@/lib/requestGuard'

export async function GET() {
  return NextResponse.json({ packages: listSalePackages().map(packageView) })
}

export async function POST(req: NextRequest) {
  try {
    const csrf = rejectCrossSiteCookieMutation(req)
    if (csrf) return csrf
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.sub) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }
    const body = await req.json().catch(() => ({}))
    const pkg = getSalePackage(body.packageId)
    if (!pkg) {
      return NextResponse.json({ error: '판매 중인 패키지가 아닙니다' }, { status: 400 })
    }
    if (typeof body.amount === 'number' && body.amount !== pkg.amountKrw) {
      return NextResponse.json({ error: '결제 금액이 올바르지 않습니다' }, { status: 400 })
    }
    if (!process.env.TOSS_SECRET_KEY || !process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY) {
      return NextResponse.json({ error: '결제 설정이 완료되지 않았어요' }, { status: 503 })
    }
    const created = await createChargeOrder(token.sub, pkg.id)
    if (!created.ok) {
      return NextResponse.json({ error: created.error }, { status: created.status })
    }
    return NextResponse.json({
      orderId: created.orderId,
      amount: created.pkg.amountKrw,
      currency: created.pkg.currency,
      package: packageView(created.pkg),
    })
  } catch (e) {
    console.error(JSON.stringify({ tag: 'charge', phase: 'ready', err: e instanceof Error ? e.message : 'error' }))
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
