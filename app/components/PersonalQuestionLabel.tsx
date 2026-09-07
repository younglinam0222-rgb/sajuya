import { PERSONAL_QUESTION_HINT } from '@/lib/contentNotice'

type Props = {
  children: React.ReactNode
}

export default function PersonalQuestionLabel({ children }: Props) {
  return (
    <div className="mb-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <label className="text-xs text-gray-400">{children}</label>
        <p className="text-[11px] text-gray-400 sm:ml-auto max-sm:w-full max-sm:text-right">
          {PERSONAL_QUESTION_HINT}
        </p>
      </div>
    </div>
  )
}
