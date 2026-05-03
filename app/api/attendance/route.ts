// app/api/attendance/route.ts
// 7일 출석 엽전 시스템

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

    const supabase = createServerSupabase()
    const today = new Date().toISOString().split('T')[0]

    // 현재 사용자 정보 조회
    const { data: user, error } = await supabase
      .from('users')
      .select('yeobjeun_balance, streak_days, last_visit')
      .eq('id', userId)
      .single()

    if (error || !user) return NextResponse.json({ error: '사용자 없음' }, { status: 404 })

    const lastVisit = user.last_visit?.split('T')[0]

    // 오늘 이미 출석했으면 스킵
    if (lastVisit === today) {
      return NextResponse.json({
        message: '오늘 이미 출석했습니다',
        streak: user.streak_days,
        balance: user.yeobjeun_balance,
        alreadyChecked: true,
      })
    }

    // 연속 출석 계산
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    const isConsecutive = lastVisit === yesterdayStr
    const newStreak = isConsecutive ? user.streak_days + 1 : 1

    // 7일 달성 시 엽전 +1
    let rewardMessage = ''
    let yeobjeunReward = 0
    if (newStreak % 7 === 0) {
      yeobjeunReward = 1
      rewardMessage = `🎉 ${newStreak}일 연속 출석! 엽전 1냥 지급!`
    }

    const newBalance = user.yeobjeun_balance + yeobjeunReward

    // 업데이트
    await supabase.from('users').update({
      streak_days: newStreak,
      last_visit: today,
      yeobjeun_balance: newBalance,
    }).eq('id', userId)

    return NextResponse.json({
      success: true,
      streak: newStreak,
      balance: newBalance,
      reward: yeobjeunReward,
      message: rewardMessage || `${newStreak}일 연속 출석! ${7 - (newStreak % 7)}일 더 오면 엽전 1냥!`,
    })

  } catch (err) {
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
