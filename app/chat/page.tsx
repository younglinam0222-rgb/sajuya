import Conversation from '@/app/components/conversation/Conversation'
type Query = Record<string, string | string[] | undefined>
export default async function Page({ searchParams }: { searchParams: Promise<Query> }) {
  const query = await searchParams
  return <Conversation initialGuide={typeof query.guide === 'string' ? query.guide : undefined} initialSource={typeof query.source === 'string' ? query.source : undefined} />
}
