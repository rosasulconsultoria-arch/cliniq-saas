import { TransacaoList } from '../_transacao-list'

interface Props { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function DespesasPage(props: Props) {
  const searchParams = await props.searchParams;
  return <TransacaoList tipo="DESPESA" searchParams={searchParams} />
}
