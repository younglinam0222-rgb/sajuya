import LegalTermsView from '@/app/components/LegalTermsView'
import { getLegalTermsMode } from '@/lib/legalConfig'

export const dynamic = 'force-dynamic'

export default function TermsPage() {
  return <LegalTermsView mode={getLegalTermsMode()} />
}
