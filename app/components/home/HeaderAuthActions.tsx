'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import { formatHeldNyang } from '@/lib/nyangDisplay'

export default function HeaderAuthActions({
  onLogin,
  onCharge,
}: {
  onLogin: () => void
  onCharge: () => void
}) {
  const { data: session, status } = useSession()
  const [open, setOpen] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const user = session?.user as { name?: string | null; email?: string | null; image?: string | null; yeobjeun_balance?: number } | undefined
  const balance = user?.yeobjeun_balance ?? 0

  const accountOpen = open && status === 'authenticated'

  useEffect(() => {
    if (accountOpen) dialog.current?.showModal()
    else dialog.current?.close()
  }, [accountOpen])

  return (
    <>
      {status === 'loading' ? (
        <div className="sg-auth-pending" aria-busy="true" aria-live="polite">
          <span className="sg-auth-ghost" />
          <span className="sg-auth-ghost" />
          <span className="sg-sr-only">계정 확인 중</span>
        </div>
      ) : (
        <>
          {status === 'authenticated' ? (
            <button type="button" className="sg-header-account" onClick={() => setOpen(true)}>내 계정</button>
          ) : (
            <button type="button" className="sg-header-login" onClick={onLogin}>로그인</button>
          )}
          <button type="button" className="sg-header-charge" onClick={onCharge}>엽전충전</button>
        </>
      )}
      <dialog
        className="sg-account"
        ref={dialog}
        onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
        aria-labelledby="sg-account-title"
      >
        <button className="sg-close" aria-label="내 계정 닫기" type="button" onClick={() => setOpen(false)}>×</button>
        <p>로그인된 계정</p>
        <h2 id="sg-account-title">{user?.name?.trim() || '사주궁 회원'}</h2>
        {user?.email && <p className="sg-account-email">{user.email}</p>}
        <p className="sg-account-balance">{formatHeldNyang(balance)}</p>
        <div className="sg-account-actions">
          <Link href="/storage" onClick={() => setOpen(false)}>보관함</Link>
          <Link href="/payments" onClick={() => setOpen(false)}>결제·환불 내역</Link>
          <button type="button" onClick={() => void signOut({ callbackUrl: '/' })}>로그아웃</button>
        </div>
      </dialog>
    </>
  )
}
