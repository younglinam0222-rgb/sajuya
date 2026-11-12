import { NextRequest, NextResponse } from 'next/server'
import { failure } from '@/lib/server-access'
import { sajuOwner, withGuestCookie } from '@/lib/guest-access'

export async function GET(req: NextRequest) {
  try {
    const owner = await sajuOwner(req, true)
    return withGuestCookie(new NextResponse(null, { status: 204,
      headers: { 'Cache-Control': 'private, no-store' } }), req, owner)
  } catch (error) { return failure(error) }
}
