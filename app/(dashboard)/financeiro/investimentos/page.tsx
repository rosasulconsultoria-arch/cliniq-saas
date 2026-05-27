import { TransacaoList } from '../_transacao-list'

interface Props { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function InvestimentosPage(props: Props) {
  const searchParams = await props.searchParams;
  return <TransacaoList tipo="INVESTIMENTO" searchParams={searchParams} />
}
