import { TransacaoList } from '../_transacao-list'

interface Props { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function ReceitasPage(props: Props) {
  const searchParams = await props.searchParams;
  return <TransacaoList tipo="RECEITA" searchParams={searchParams} />
}
