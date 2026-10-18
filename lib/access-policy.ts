// Pure policy functions shared by route handlers and regression tests.
export const PRODUCTS = {
  one: { amount: 1900, coins: 1, name: '사주궁 1냥' },
  three: { amount: 4900, coins: 3, name: '사주궁 3냥' },
  unlock: { amount: 4900, coins: 0, name: '사주궁 기존 전체 판결문 열기' },
} as const
export type ProductId = keyof typeof PRODUCTS
export function validProduct(value: unknown): value is ProductId {
  return typeof value === 'string' && Object.hasOwn(PRODUCTS, value)
}
export function paymentMatches(order: {order_id: string; amount: number}, payment: Record<string, unknown>, key?: string) {
  return payment.orderId === order.order_id && payment.totalAmount === order.amount &&
    payment.currency === 'KRW' && payment.status === 'DONE' &&
    typeof payment.paymentKey === 'string' && (!key || payment.paymentKey === key)
}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']'
  if (value && typeof value === 'object') return '{' + Object.entries(value).sort(([a],[b]) => a.localeCompare(b))
    .map(([k,v]) => JSON.stringify(k) + ':' + canonical(v)).join(',') + '}'
  return JSON.stringify(value) ?? 'null'
}
// Never spread AI output: it can contain paid answers and private metadata.
export function lockedResult(raw?: unknown, product = 'saju') {
  const limit = product === 'saju' ? 3 : 1
  const meta = { isComplete: true, locked: true, sampleLimit: limit }
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { titles: [], _meta: meta }
    const value = parsed as Record<string, unknown>
    if (product === 'saju') {
      const categories: Record<string, string> = { '1': '성격', '2': '재물운', '3': '애정운' }
      const titles = Array.isArray(value.titles) ? value.titles : []
      return { titles: ['1','2','3'].flatMap(id => {
        const item = titles.find((t: unknown) => t && typeof t === 'object' && String((t as Record<string, unknown>).id) === id) as Record<string, unknown> | undefined
        if (!item || item.category !== categories[id] || typeof item.content !== 'string' || !item.content.trim()) return []
        return [{ id, category: categories[id], title: typeof item.title === 'string' ? item.title : categories[id],
          teaser: typeof item.teaser === 'string' ? item.teaser : '', content: item.content, is_free: true }]
      }), _meta: meta }
    }
    const first = Array.isArray(value.titles) ? value.titles[0]
      : Array.isArray(value.sections) ? value.sections[0]
      : { title: '총평', content: value.overall ?? value.yearOverall ?? value.current ?? value.intro }
    const content = first?.content ?? first?.body
    if (typeof content !== 'string' || !content.trim()) return { titles: [], _meta: meta }
    return { titles: [{ id: 'sample-1', title: typeof first.title === 'string' ? first.title : '첫 번째 해석',
      content, is_free: true }], _meta: meta }
  } catch { return { titles: [], _meta: meta } }
}
