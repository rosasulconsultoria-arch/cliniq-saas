import { TransacaoList } from '../_transacao-list'

interface Props { searchParams: Record<string, string | string[] | undefined> }

export default function ReceitasPage({ searchParams }: Props) {
  return <TransacaoList tipo="RECEITA" searchParams={searchParams} />
}
