import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { createServerSupabase } from '@/lib/supabase'
import { rejectCrossSiteCookieMutation } from '@/lib/requestGuard'

export async function POST(req: NextRequest) {
  try {
    const csrf = rejectCrossSiteCookieMutation(req)
    if (csrf) return csrf
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token?.sub) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

    const supabase = createServerSupabase()
    const today = new Date().toISOString().split('T')[0]

    const { data: user, error } = await supabase
      .from('users')
      .select('yeobjeun_balance, streak_days, last_visit')
      .eq('id', token.sub)
      .single()

    if (error || !user) return NextResponse.json({ error: '사용자 없음' }, { status: 404 })

    const lastVisit = user.last_visit?.split('T')[0]

    if (lastVisit === today) {
      return NextResponse.json({
        message: '오늘 이미 출석했습니다',
        streak: user.streak_days,
        balance: user.yeobjeun_balance,
        alreadyChecked: true,
      })
    }

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    const isConsecutive = lastVisit === yesterdayStr
    const newStreak = isConsecutive ? user.streak_days + 1 : 1

    let rewardMessage = ''
    let yeobjeunReward = 0
    if (newStreak % 7 === 0) {
      yeobjeunReward = 1
      rewardMessage = `🎉 ${newStreak}일 연속 출석! 엽전 1냥 지급!`
    }

    const newBalance = user.yeobjeun_balance + yeobjeunReward

    await supabase.from('users').update({
      streak_days: newStreak,
      last_visit: today,
      yeobjeun_balance: newBalance,
    }).eq('id', token.sub)

    return NextResponse.json({
      success: true,
      streak: newStreak,
      balance: newBalance,
      reward: yeobjeunReward,
      message: rewardMessage || `${newStreak}일 연속 출석! ${7 - (newStreak % 7)}일 더 오면 엽전 1냥!`,
    })
  } catch {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
