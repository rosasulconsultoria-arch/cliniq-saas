import { TransacaoList } from '../_transacao-list'

interface Props { searchParams: Record<string, string | string[] | undefined> }

export default function InvestimentosPage({ searchParams }: Props) {
  return <TransacaoList tipo="INVESTIMENTO" searchParams={searchParams} />
}
