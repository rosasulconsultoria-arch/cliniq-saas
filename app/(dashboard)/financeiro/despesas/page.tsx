import { TransacaoList } from '../_transacao-list'

interface Props { searchParams: Record<string, string | string[] | undefined> }

export default function DespesasPage({ searchParams }: Props) {
  return <TransacaoList tipo="DESPESA" searchParams={searchParams} />
}
