/**
 * 사업자정보 — 미등록. 값을 채워도 개정 약관이 자동 게시되지 않는다.
 * TODO: 사업자등록 후 운영자가 입력하고, LEGAL_TERMS_PUBLICATION_APPROVED를 별도로 확인한다.
 */
export const BUSINESS_INFO = {
  companyName: '', // TODO: 상호
  representativeName: '', // TODO: 대표자명
  businessRegistrationNumber: '', // TODO: 사업자등록번호
  mailOrderReportNumber: '', // TODO: 통신판매업신고번호
  businessAddress: '', // TODO: 영업소 주소
} as const

/**
 * 개정 이용약관(환불 조항 초안 포함)의 Production 게시 승인.
 * 사업자정보 입력만으로 true가 되지 않는다. 운영자가 코드/환경으로 명시 승인하기 전엔 항상 false.
 */
export const LEGAL_TERMS_PUBLICATION_APPROVED = false

export type LegalTermsMode = 'published' | 'draft_preview'

export function isBusinessInfoFilled(): boolean {
  return Object.values(BUSINESS_INFO).every((value) => value.trim().length > 0)
}

export function getLegalTermsMode(): LegalTermsMode {
  if (process.env.VERCEL_ENV === 'production') return 'published'
  if (LEGAL_TERMS_PUBLICATION_APPROVED) return 'published'
  if (process.env.LEGAL_DRAFT_PREVIEW === 'true') return 'draft_preview'
  if (process.env.VERCEL_ENV === 'preview') return 'draft_preview'
  if (process.env.NODE_ENV === 'development') return 'draft_preview'
  return 'published'
}

export function isLegalDraftPreview(): boolean {
  return getLegalTermsMode() === 'draft_preview'
}
