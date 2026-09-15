import { Suspense } from 'react'
import SampleHome from '@/app/components/home/SampleHome'

export default function HomePage() {
  return (
    <Suspense fallback={<div className="direction direction-b min-h-screen bg-[#141a24]" />}>
      <SampleHome />
    </Suspense>
  )
}
